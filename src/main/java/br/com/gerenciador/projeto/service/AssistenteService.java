package br.com.gerenciador.projeto.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Pageable;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import br.com.gerenciador.projeto.DAO.*;
import br.com.gerenciador.projeto.dto.JogadaDTOs.JogadaResponse;
import br.com.gerenciador.projeto.dto.JogadaDTOs.SalvarJogadaRequest;
import br.com.gerenciador.projeto.exception.ForbiddenException;
import br.com.gerenciador.projeto.model.*;
import br.com.gerenciador.projeto.model.json.JogadaConteudo;
import br.com.gerenciador.projeto.security.AuthUtil;

@Service
public class AssistenteService {

    @Value("${assistente.n8n.webhook-url}")
    private String webhookUrl;

    @Value("${assistente.n8n.token}")
    private String token;

    @Autowired private IUsuario usuarioDAO;
    @Autowired private AtividadeDAO atividadeDAO;
    @Autowired private DesempenhoDAO desempenhoDAO;
    @Autowired private EscalacaoDAO escalacaoDAO;
    @Autowired private TimeDAO timeDAO;
    @Autowired private JogadaDAO jogadaDAO;
    @Autowired private JogadaService jogadaService;
    @Autowired private UsuarioService usuarioService;
    @Autowired private ExameDAO exameDAO;

    private final RestTemplate restTemplate = new RestTemplate();

    private static final Map<Integer, String> TIPOS_ATIVIDADE = Map.of(
        1, "Treino", 2, "Jogo", 3, "Evento", 4, "Competição");

    /**
     * Reautoriza a partir do idUsuario real, buscado no banco — nunca do
     * authTipo que o JwtFilter injeta nas chamadas do n8n, que é sempre
     * "Admin" (bypass de serviço só pra autenticar o n8n, sem identidade de
     * usuário nenhuma — ver JwtFilter). Se essas leituras confiassem nesse
     * authTipo, um prompt injection no agente de IA (ou uma chamada forjada
     * direto pro endpoint com o idTime de outro time) vazaria dados de
     * qualquer time pra qualquer usuário. Admin real acessa qualquer time;
     * demais papéis, somente o próprio — igual ao resto do sistema.
     */
    private boolean autorizadoParaTime(Integer idTimeAlvo, Integer idUsuario) {
        Usuario u = idUsuario != null ? usuarioDAO.findById(idUsuario).orElse(null) : null;
        if (u == null) return false;
        if (AuthUtil.ehAdmin(u.getTipo_usuario())) return true;
        Integer meuTime = u.getTime() != null ? u.getTime().getId_time() : null;
        return meuTime != null && idTimeAlvo != null && meuTime.equals(idTimeAlvo);
    }

    private void exigirAutorizacaoParaTime(Integer idTime, Integer idUsuario) {
        if (!autorizadoParaTime(idTime, idUsuario))
            throw new ForbiddenException("Sem permissao para ver este time.");
    }

    /**
     * Dados individuais (desempenho, pontos) pela IA: Admin e Treinador veem
     * o time inteiro (retorna null); Atleta — ou qualquer outro papel — só os
     * próprios (retorna o idUsuario dele, usado como filtro).
     */
    private Integer somenteDoUsuario(Integer idUsuario) {
        Usuario u = idUsuario != null ? usuarioDAO.findById(idUsuario).orElse(null) : null;
        boolean veTimeInteiro = u != null
            && (AuthUtil.ehAdmin(u.getTipo_usuario()) || AuthUtil.ehTreinador(u.getTipo_usuario()));
        return veTimeInteiro ? null : idUsuario;
    }

    private static String nomePerfil(Integer tipo) {
        if (AuthUtil.ehAdmin(tipo)) return "Admin";
        if (AuthUtil.ehTreinador(tipo)) return "Treinador";
        return "Atleta";
    }

    /**
     * idUsuario/tipo_usuario/idTime no corpo vêm do JS do navegador — nunca
     * confiáveis, poderiam ser forjados numa chamada direta ao endpoint. A
     * identidade real só existe no cookie JWT validado nesta própria
     * requisição (authTipo/authId), então ela substitui o que o corpo alega
     * antes de repassar pro n8n: é esse idUsuario que as tools de leitura do
     * agente vão revalidar no banco (ver autorizadoParaTime), fechando a
     * brecha de um prompt injection pedir dados de outro time.
     */
    public Map chat(Map<String, Object> body, Integer authTipo, Integer authId) {
        Map<String, Object> payload = new HashMap<>(body);
        // Anexo vira texto aqui no backend e vai junto da pergunta: o n8n só
        // recebe texto, e o arquivo bruto não sai do servidor.
        Object anexo = payload.remove("anexoBase64");
        Object anexoNome = payload.remove("anexoNome");
        if (anexo instanceof String b64 && !b64.isBlank()) {
            String nome = anexoNome != null ? anexoNome.toString() : "arquivo";
            payload.put("pergunta", String.valueOf(payload.getOrDefault("pergunta", ""))
                + "\n\n[Arquivo anexado: " + nome + "]\n" + textoDoAnexo(nome, b64));
        }
        payload.put("idUsuario", authId);
        payload.put("tipo_usuario", authTipo);
        if (!AuthUtil.ehAdmin(authTipo))
            payload.put("idTime", AuthUtil.timeDoUsuario(authId, usuarioDAO));
        Object idAtleta = payload.get("idAtleta");
        if (idAtleta != null) {
            try {
                payload.put("contextoAtleta", dadosAtleta(Integer.valueOf(idAtleta.toString()), authId));
                String pergunta = Objects.toString(payload.get("pergunta"), "");
                String contexto = new com.fasterxml.jackson.databind.ObjectMapper().findAndRegisterModules()
                    .writeValueAsString(payload.get("contextoAtleta"));
                payload.put("pergunta", pergunta + "\n\nContexto autorizado do atleta para esta recomendação (use os registros sem inferir diagnósticos). Se houver exame inapto, não prescreva exercícios até liberação profissional:\n" + contexto);
            } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
                throw new IllegalStateException("Não foi possível preparar o contexto do atleta.", e);
            } catch (NumberFormatException e) {
                throw new ForbiddenException("Atleta inválido para recomendação.");
            }
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-Token", token);
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
        ResponseEntity<Map> response = restTemplate.postForEntity(webhookUrl, request, Map.class);
        return response.getBody();
    }

    public Map<String, Object> resumoGeral(Integer idUsuario) {
        Usuario chamador = idUsuario != null ? usuarioDAO.findById(idUsuario).orElse(null) : null;
        if (chamador == null || !AuthUtil.ehAdmin(chamador.getTipo_usuario()))
            throw new ForbiddenException("Somente Admin pode ver o resumo geral.");
        List<Usuario> todos = usuarioDAO.findAll();
        long atletas     = todos.stream().filter(u -> u.getTipo_usuario() == 3).count();
        long treinadores = todos.stream().filter(u -> u.getTipo_usuario() == 2).count();
        long admins      = todos.stream().filter(u -> u.getTipo_usuario() == 1).count();

        Map<String, Object> r = new HashMap<>();
        r.put("total_usuarios",    todos.size());
        r.put("total_atletas",     atletas);
        r.put("total_treinadores", treinadores);
        r.put("total_admins",      admins);
        r.put("total_times",       timeDAO.count());
        r.put("total_atividades",  atividadeDAO.count());
        r.put("total_desempenhos", desempenhoDAO.count());
        return r;
    }

    /** @Transactional: t.getMembros() é @OneToMany LAZY e open-in-view está desligado. */
    @Transactional(readOnly = true)
    public Map<String, Object> resumoTime(Integer idTime, Integer idUsuario) {
        exigirAutorizacaoParaTime(idTime, idUsuario);
        Map<String, Object> r = new HashMap<>();
        timeDAO.findById(idTime).ifPresent(t -> {
            r.put("time",       t.getNome_time());
            r.put("modalidade", t.getModalidade_time());
            r.put("categoria",  t.getCategoria_time());
            r.put("cor",        t.getCor_time());
            r.put("descricao",  t.getDescricao_time());
            r.put("ativo",      t.getAtivo_time());
            r.put("treinador",  t.getTreinador() != null
                ? t.getTreinador().getNome_usuario() : "Não definido");
            r.put("total_membros", t.getMembros() != null
                ? t.getMembros().size() : 0);
        });
        if (r.isEmpty()) r.put("erro", "Time não encontrado.");
        return r;
    }

    /** somenteUsuario != null restringe aos desempenhos desse atleta. */
    private List<Map<String, Object>> montarRankingDesempenho(Integer idTime, Integer somenteUsuario) {
        List<Desempenho> lista = desempenhoDAO.buscarPorTime(idTime).stream()
            .filter(d -> somenteUsuario == null || somenteUsuario.equals(d.getUsuario().getId_usuario()))
            .collect(Collectors.toList());
        Map<String, List<Desempenho>> porAtleta = lista.stream()
            .collect(Collectors.groupingBy(d -> d.getUsuario().getNome_usuario()));

        return porAtleta.entrySet().stream()
            .map(e -> {
                Map<String, Object> m = new HashMap<>();
                m.put("atleta", e.getKey());
                double media = e.getValue().stream()
                    .mapToInt(d -> d.getPontuacao() != null ? d.getPontuacao() : 0)
                    .average().orElse(0);
                m.put("media_pontuacao", Math.round(media * 10.0) / 10.0);
                m.put("total_avaliacoes", e.getValue().size());
                return m;
            })
            .sorted((a, b) -> Double.compare(
                (Double) b.get("media_pontuacao"),
                (Double) a.get("media_pontuacao")))
            .collect(Collectors.toList());
    }

    public List<Map<String, Object>> rankingDesempenho(Integer idTime, Integer idUsuario) {
        exigirAutorizacaoParaTime(idTime, idUsuario);
        return montarRankingDesempenho(idTime, somenteDoUsuario(idUsuario));
    }

    public List<Map<String, Object>> rankingPontos(Integer idAtividade, Integer idUsuario) {
        Integer idTimeDaAtividade = atividadeDAO.findById(idAtividade)
            .map(a -> a.getTime() != null ? a.getTime().getId_time() : null)
            .orElse(null);
        exigirAutorizacaoParaTime(idTimeDaAtividade, idUsuario);
        Integer somente = somenteDoUsuario(idUsuario);

        return escalacaoDAO.buscarPorAtividade(idAtividade).stream()
            .filter(e -> e.getPontos_jogo() != null)
            .filter(e -> somente == null || somente.equals(e.getUsuario().getId_usuario()))
            .sorted((a, b) -> b.getPontos_jogo() - a.getPontos_jogo())
            .map(e -> {
                Map<String, Object> m = new HashMap<>();
                m.put("atleta",  e.getUsuario().getNome_usuario());
                m.put("pontos",  e.getPontos_jogo());
                m.put("posicao", e.getPosicao() != null ? e.getPosicao() : "");
                m.put("titular", e.getTitular() == 1 ? "Titular" : "Reserva");
                return m;
            })
            .collect(Collectors.toList());
    }

    private List<Map<String, Object>> montarProximasAtividades(Integer idTime) {
        LocalDateTime agora = LocalDateTime.now();
        return atividadeDAO.buscarPorTime(idTime).stream()
            .filter(a -> a.getData_atividade() != null
                && a.getData_atividade().isAfter(agora)
                && a.getStatus_atividade() == 1)
            .sorted(Comparator.comparing(Atividade::getData_atividade))
            .limit(5)
            .map(a -> {
                Map<String, Object> m = new HashMap<>();
                m.put("nome",  a.getNome_atividade());
                m.put("tipo",  TIPOS_ATIVIDADE.getOrDefault(a.getTipo_atividade(), "Outro"));
                m.put("data",  a.getData_atividade().toString());
                m.put("local", a.getLugar_atividade() != null
                    ? a.getLugar_atividade() : "Não definido");
                return m;
            })
            .collect(Collectors.toList());
    }

    public List<Map<String, Object>> proximasAtividades(Integer idTime, Integer idUsuario) {
        exigirAutorizacaoParaTime(idTime, idUsuario);
        return montarProximasAtividades(idTime);
    }

    /** Biblioteca de jogadas do time, resumida para a IA: sem o conteúdo bruto (frames/coordenadas). */
    private List<Map<String, Object>> montarJogadas(Integer idTime) {
        return jogadaDAO.listarBiblioteca(idTime, null, null, Pageable.unpaged())
            .stream()
            .map(j -> {
                Map<String, Object> m = new HashMap<>();
                m.put("nome",          j.getNome());
                m.put("tipo",          j.getTipo());
                m.put("qtd_frames",    j.getQtdFrames());
                m.put("enquadramento", j.getEnquadramento());
                m.put("atualizado_em", j.getAtualizadoEm() != null ? j.getAtualizadoEm().toString() : null);
                return m;
            })
            .collect(Collectors.toList());
    }

    public List<Map<String, Object>> jogadasTime(Integer idTime, Integer idUsuario) {
        exigirAutorizacaoParaTime(idTime, idUsuario);
        return montarJogadas(idTime);
    }

    /**
     * Cria uma jogada sugerida pela IA na biblioteca do time.
     *
     * A chamada chega do n8n autenticada só pelo X-Token do JwtFilter (ver
     * bypass de serviço), que não carrega identidade de usuário nenhuma —
     * authTipo vem sempre "Admin" nesse caminho. Por isso a autorização de
     * ESCRITA aqui não pode se apoiar nisso: ela é recalculada a partir do
     * idUsuario que o próprio corpo da chamada informa (o mesmo idUsuario já
     * confiado no restante do fluxo do chat), buscando o papel real dele no
     * banco. Só treinador do próprio time ou admin pode criar.
     */
    @Transactional
    public JogadaResponse sugerirJogada(Integer idTime, Integer idUsuarioCriador, String nome, JogadaConteudo conteudo) {
        Usuario criador = exigirEscritaNoTime(idTime, idUsuarioCriador);

        Time time = timeDAO.findById(idTime)
            .orElseThrow(() -> new ForbiddenException("Time não encontrado."));

        String nomeMarcado = "[Sugestão IA] " + nome;
        return jogadaService.criar(new SalvarJogadaRequest(nomeMarcado, conteudo), time, criador);
    }

    /** Só treinador do próprio time ou admin pode escrever jogadas (mesma regra de sugerirJogada). */
    private Usuario exigirEscritaNoTime(Integer idTime, Integer idUsuario) {
        // Admin não pertence a time: o time vem do que está selecionado na tela.
        if (idTime == null)
            throw new br.com.gerenciador.projeto.exception.BadRequestException(
                "Nenhum time selecionado. Selecione um time no sistema antes de fazer essa alteração.");
        Usuario u = idUsuario != null ? usuarioDAO.findById(idUsuario).orElse(null) : null;
        boolean autorizado = u != null && (AuthUtil.ehAdmin(u.getTipo_usuario())
            || (AuthUtil.ehTreinador(u.getTipo_usuario())
                && u.getTime() != null && idTime.equals(u.getTime().getId_time())));
        if (!autorizado) {
            throw new ForbiddenException("Somente o treinador do time (ou um admin) pode fazer essa alteração.");
        }
        return u;
    }

    /** Conteúdo completo de uma jogada do time, pra IA ler antes de editar. */
    public JogadaResponse verJogada(Integer idTime, Integer idUsuario, Integer idJogada) {
        exigirAutorizacaoParaTime(idTime, idUsuario);
        return jogadaService.buscar(idJogada, idTime);
    }

    /** Reescreve uma jogada existente. Autorização igual à de sugerirJogada. */
    @Transactional
    public JogadaResponse editarJogada(Integer idTime, Integer idUsuario, Integer idJogada, String nome, JogadaConteudo conteudo) {
        exigirEscritaNoTime(idTime, idUsuario);
        return jogadaService.atualizar(idJogada, idTime, new SalvarJogadaRequest(nome, conteudo), null);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> dadosTime(Integer idTime, Integer idUsuario) {
        exigirAutorizacaoParaTime(idTime, idUsuario);

        Map<String, Object> r = new HashMap<>();

        // Dados do time
        timeDAO.findById(idTime).ifPresent(t -> {
            r.put("time",          t.getNome_time());
            r.put("modalidade",    t.getModalidade_time());
            r.put("categoria",     t.getCategoria_time());
            r.put("treinador",     t.getTreinador() != null
                ? t.getTreinador().getNome_usuario() : "Não definido");
            r.put("total_membros", t.getMembros() != null
                ? t.getMembros().size() : 0);
        });

        // Atletas do time
        List<String> nomes = usuarioDAO.buscarPorTimeTipo(idTime, 3)
            .stream()
            .map(Usuario::getNome_usuario)
            .collect(Collectors.toList());
        r.put("atletas", nomes);
        r.put("total_atletas", nomes.size());

        Integer somente = somenteDoUsuario(idUsuario);
        Integer tipo = usuarioDAO.findById(idUsuario).map(Usuario::getTipo_usuario).orElse(null);
        r.put("perfil_de_quem_pergunta", nomePerfil(tipo));
        if (somente == null) {
            r.put("ranking_desempenho", montarRankingDesempenho(idTime, null));
        } else {
            // Atleta não vê avaliação dos colegas — só a própria.
            r.put("meu_desempenho", montarRankingDesempenho(idTime, somente));
            r.put("observacao", "Quem pergunta é atleta: desempenho, ranking e avaliações dos "
                + "outros atletas são restritos ao treinador. Não invente esses dados.");
        }
        r.put("proximas_atividades", montarProximasAtividades(idTime));
        r.put("jogadas", montarJogadas(idTime));

        return r;
    }

    // ── Cadastro de atletas em lote (tool "Cadastrar Atletas" do n8n) ──────

    private static final int MAX_ATLETAS_POR_LOTE = 50;
    /** Teto diário de cadastros (= e-mails enviados) por treinador/admin: evita spam pelo Brevo. */
    private static final int MAX_ATLETAS_POR_DIA = 100;
    // ponytail: contador em memória (zera no restart); mover pro banco se precisar de auditoria.
    private final java.util.concurrent.ConcurrentHashMap<String, Integer> cadastrosHoje = new java.util.concurrent.ConcurrentHashMap<>();

    /** Um atleta extraído pela IA (de um PDF ou da mensagem do treinador). */
    public record NovoAtleta(String nome, String email, String dataNascimento, String celular, String cpf) {}

    /**
     * Cadastra atletas no time a pedido da IA. A autorização é a mesma das
     * jogadas: recalculada a partir do idUsuario real (treinador do próprio
     * time ou admin). O cadastro em si passa pelo UsuarioService.criar, então
     * valem as mesmas regras da tela: Treinador só cadastra Atleta, no próprio
     * time, e o próprio criar gera a senha temporária, manda por e-mail direto
     * pro atleta e exige a troca no primeiro acesso. A senha nunca volta na
     * resposta (nem pra IA, nem pro treinador): se o e-mail falhar, o treinador
     * usa "Reenviar acesso" na tela de usuários.
     *
     * Cada linha é independente: um e-mail repetido não derruba o lote inteiro,
     * só entra em "ignorados" com o motivo.
     */
    public Map<String, Object> cadastrarAtletas(Integer idTime, Integer idUsuario, List<NovoAtleta> atletas) {
        Usuario chamador = exigirEscritaNoTime(idTime, idUsuario);
        if (atletas == null || atletas.isEmpty())
            throw new br.com.gerenciador.projeto.exception.BadRequestException("Nenhum atleta informado.");
        if (atletas.size() > MAX_ATLETAS_POR_LOTE)
            throw new br.com.gerenciador.projeto.exception.BadRequestException(
                "Máximo de " + MAX_ATLETAS_POR_LOTE + " atletas por vez.");

        String chaveDia = chamador.getId_usuario() + ":" + LocalDate.now();
        int usadosHoje = cadastrosHoje.getOrDefault(chaveDia, 0);
        if (usadosHoje + atletas.size() > MAX_ATLETAS_POR_DIA)
            throw new br.com.gerenciador.projeto.exception.BadRequestException(
                "Limite diário de " + MAX_ATLETAS_POR_DIA + " cadastros pela IA atingido ("
                + usadosHoje + " hoje). Tente amanhã ou cadastre pela tela de usuários.");

        Time time = timeDAO.findById(idTime)
            .orElseThrow(() -> new ForbiddenException("Time não encontrado."));

        List<Map<String, Object>> criados = new ArrayList<>();
        List<Map<String, Object>> ignorados = new ArrayList<>();
        Set<String> emailsDoLote = new HashSet<>();

        for (NovoAtleta a : atletas) {
            String nome  = a.nome()  != null ? a.nome().trim() : "";
            String email = a.email() != null ? a.email().trim().toLowerCase() : "";
            String motivo = null;
            if (nome.isEmpty() || nome.length() > 100)               motivo = "Nome ausente ou muito longo.";
            else if (!email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$") || email.length() > 100)
                                                                      motivo = "E-mail ausente ou inválido.";
            else if (!emailsDoLote.add(email))                        motivo = "E-mail repetido na lista.";
            else if (usuarioDAO.existeEmail(email))                   motivo = "E-mail já cadastrado no sistema.";

            LocalDate nascimento = null;
            if (motivo == null && a.dataNascimento() != null && !a.dataNascimento().isBlank()) {
                try { nascimento = LocalDate.parse(a.dataNascimento().trim()); }
                catch (Exception e) { motivo = "Data de nascimento inválida (use AAAA-MM-DD)."; }
            }

            if (motivo != null) {
                ignorados.add(Map.of("nome", nome, "email", email, "motivo", motivo));
                continue;
            }

            Usuario u = new Usuario();
            u.setNome_usuario(nome);
            u.setEmail_usuario(email);
            u.setTipo_usuario(3);
            u.setData_nasc_usuario(nascimento);
            u.setCel_usuario(limitar(a.celular(), 20));
            u.setCpf_usuario(limitar(a.cpf(), 20));
            u.setTime(time);

            try {
                Usuario salvo = usuarioService.criar(u, chamador.getId_usuario(), chamador.getTipo_usuario());
                Map<String, Object> m = new HashMap<>();
                m.put("nome", salvo.getNome_usuario());
                m.put("email", salvo.getEmail_usuario());
                m.put("login", salvo.getLogin_usuario());
                boolean enviado = Boolean.TRUE.equals(salvo.getAcesso_enviado());
                m.put("email_enviado", enviado);
                if (!enviado) m.put("aviso", "O e-mail não foi enviado. Confira o endereço e use \"Reenviar acesso\" na tela de Usuários.");
                criados.add(m);
            } catch (Exception e) {
                ignorados.add(Map.of("nome", nome, "email", email, "motivo", "Erro ao salvar: " + e.getMessage()));
            }
        }

        cadastrosHoje.merge(chaveDia, criados.size(), Integer::sum);

        Map<String, Object> r = new HashMap<>();
        r.put("time", time.getNome_time());
        r.put("total_criados", criados.size());
        r.put("criados", criados);
        r.put("ignorados", ignorados);
        return r;
    }

    private static String limitar(String s, int max) {
        if (s == null || s.isBlank()) return null;
        s = s.trim();
        return s.length() > max ? s.substring(0, max) : s;
    }

    // ── Anexo do chat (PDF/TXT/CSV) ─────────────────────────────────────

    private static final int MAX_ANEXO_BYTES = 5 * 1024 * 1024;
    private static final int MAX_ANEXO_CHARS = 20_000;

    /** Extrai o texto do anexo em base64. PDF via PDFBox; .txt/.csv como UTF-8. */
    private String textoDoAnexo(String nome, String base64) {
        byte[] bytes;
        try { bytes = Base64.getDecoder().decode(base64); }
        catch (IllegalArgumentException e) {
            throw new br.com.gerenciador.projeto.exception.BadRequestException("Anexo inválido.");
        }
        if (bytes.length > MAX_ANEXO_BYTES)
            throw new br.com.gerenciador.projeto.exception.BadRequestException("Anexo maior que 5 MB.");

        String n = nome != null ? nome.toLowerCase() : "";
        String texto;
        if (n.endsWith(".pdf")) {
            try (org.apache.pdfbox.pdmodel.PDDocument doc = org.apache.pdfbox.pdmodel.PDDocument.load(bytes)) {
                var stripper = new org.apache.pdfbox.text.PDFTextStripper();
                // Ordem visual (linha a linha): sem isso, tabelas saem com as colunas embaralhadas.
                stripper.setSortByPosition(true);
                texto = stripper.getText(doc);
            } catch (java.io.IOException e) {
                throw new br.com.gerenciador.projeto.exception.BadRequestException("Não consegui ler o PDF.");
            }
        } else if (n.endsWith(".txt") || n.endsWith(".csv")) {
            texto = new String(bytes, java.nio.charset.StandardCharsets.UTF_8);
        } else {
            throw new br.com.gerenciador.projeto.exception.BadRequestException("Envie um arquivo PDF, TXT ou CSV.");
        }
        texto = texto.strip();
        if (texto.isEmpty())
            throw new br.com.gerenciador.projeto.exception.BadRequestException(
                "O arquivo não tem texto legível (PDF escaneado como imagem não é suportado).");
        return texto.length() > MAX_ANEXO_CHARS ? texto.substring(0, MAX_ANEXO_CHARS) + "\n[...texto cortado...]" : texto;
    }

    /** Contexto autorizado para recomendações individuais feitas pelo treinador. */
    @Transactional(readOnly = true)
    public Map<String, Object> dadosAtleta(Integer idAtleta, Integer idUsuarioSolicitante) {
        Usuario atleta = usuarioDAO.findById(idAtleta)
            .orElseThrow(() -> new ForbiddenException("Atleta não encontrado."));
        Integer timeId = atleta.getTime() != null ? atleta.getTime().getId_time() : null;
        Usuario solicitante = usuarioDAO.findById(idUsuarioSolicitante)
            .orElseThrow(() -> new ForbiddenException("Usuário solicitante não encontrado."));
        if (!AuthUtil.ehAdmin(solicitante.getTipo_usuario())
                && (!AuthUtil.ehTreinador(solicitante.getTipo_usuario())
                    || !AuthUtil.podeGerenciarTime(solicitante.getTipo_usuario(), idUsuarioSolicitante, timeId, usuarioDAO)))
            throw new ForbiddenException("Somente o treinador do time pode solicitar recomendações individuais.");
        if (atleta.getTipo_usuario() == null || atleta.getTipo_usuario() != 3)
            throw new ForbiddenException("O usuário informado não é atleta.");

        Map<String, Object> resposta = new HashMap<>();
        resposta.put("atleta", atleta.getNome_usuario());
        resposta.put("data_nascimento", atleta.getData_nasc_usuario());
        resposta.put("desempenhos", desempenhoDAO.buscarPorUsuario(idAtleta).stream().map(d -> {
            Map<String, Object> item = new HashMap<>();
            item.put("data", d.getData_desempenho()); item.put("posicao", d.getPosicao_usuario());
            item.put("salto_horizontal", d.getSalto_horizontal()); item.put("salto_vertical", d.getSalto_vertical());
            item.put("pontuacao", d.getPontuacao()); return item;
        }).toList());
        resposta.put("exames_e_observacoes_de_saude", exameDAO.buscarPorUsuario(idAtleta).stream().map(e -> {
            Map<String, Object> item = new HashMap<>();
            item.put("inicio", e.getData_inicio_exame()); item.put("fim", e.getData_fim_exame());
            item.put("observacoes", e.getObservacoes_exame()); item.put("status_apto", e.getStatus_usuario());
            return item;
        }).toList());
        resposta.put("atividades", atividadeDAO.buscarPorUsuario(idAtleta).stream().map(a -> {
            Map<String, Object> item = new HashMap<>();
            item.put("nome", a.getNome_atividade()); item.put("tipo", a.getTipo_atividade());
            item.put("data", a.getData_atividade()); item.put("status", a.getStatus_atividade());
            return item;
        }).toList());
        resposta.put("escalacoes_e_pontos", escalacaoDAO.buscarPorUsuario(idAtleta).stream()
            .map(e -> {
                Map<String, Object> item = new HashMap<>();
                item.put("atividade", e.getAtividade() != null ? e.getAtividade().getNome_atividade() : null);
                item.put("data", e.getAtividade() != null ? e.getAtividade().getData_atividade() : null);
                item.put("adversario", e.getAtividade() != null ? e.getAtividade().getTime_oponente() : null);
                item.put("placar_pro", e.getAtividade() != null ? e.getAtividade().getPlacar_pro() : null);
                item.put("placar_contra", e.getAtividade() != null ? e.getAtividade().getPlacar_contra() : null);
                item.put("posicao", e.getPosicao()); item.put("pontos", e.getPontos_jogo());
                item.put("titular", e.getTitular() != null && e.getTitular() == 1);
                return item;
            })
            .toList());
        resposta.put("nota_historico_lesoes", "Não existe campo estruturado de lesões; considere apenas observações clínicas registradas nos exames e não infira diagnósticos.");
        return resposta;
    }
}
