package br.com.gerenciador.projeto.service;

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

    private List<Map<String, Object>> montarRankingDesempenho(Integer idTime) {
        List<Desempenho> lista = desempenhoDAO.buscarPorTime(idTime);
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
        return montarRankingDesempenho(idTime);
    }

    public List<Map<String, Object>> rankingPontos(Integer idAtividade, Integer idUsuario) {
        Integer idTimeDaAtividade = atividadeDAO.findById(idAtividade)
            .map(a -> a.getTime() != null ? a.getTime().getId_time() : null)
            .orElse(null);
        exigirAutorizacaoParaTime(idTimeDaAtividade, idUsuario);

        return escalacaoDAO.buscarPorAtividade(idAtividade).stream()
            .filter(e -> e.getPontos_jogo() != null)
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
        Usuario criador = usuarioDAO.findById(idUsuarioCriador)
            .orElseThrow(() -> new ForbiddenException("Usuário não encontrado."));

        boolean autorizado = AuthUtil.ehAdmin(criador.getTipo_usuario())
            || (AuthUtil.ehTreinador(criador.getTipo_usuario())
                && criador.getTime() != null && idTime.equals(criador.getTime().getId_time()));
        if (!autorizado) {
            throw new ForbiddenException("Somente o treinador do time pode criar jogadas.");
        }

        Time time = timeDAO.findById(idTime)
            .orElseThrow(() -> new ForbiddenException("Time não encontrado."));

        String nomeMarcado = "[Sugestão IA] " + nome;
        return jogadaService.criar(new SalvarJogadaRequest(nomeMarcado, conteudo), time, criador);
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

        r.put("ranking_desempenho", montarRankingDesempenho(idTime));
        r.put("proximas_atividades", montarProximasAtividades(idTime));
        r.put("jogadas", montarJogadas(idTime));

        return r;
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
