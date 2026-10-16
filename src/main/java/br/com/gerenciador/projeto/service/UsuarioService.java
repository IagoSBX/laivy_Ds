package br.com.gerenciador.projeto.service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.mindrot.jbcrypt.BCrypt;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import br.com.gerenciador.projeto.DAO.IUsuario;
import br.com.gerenciador.projeto.DAO.TimeDAO;
import br.com.gerenciador.projeto.exception.BadRequestException;
import br.com.gerenciador.projeto.exception.ForbiddenException;
import br.com.gerenciador.projeto.exception.NotFoundException;
import br.com.gerenciador.projeto.exception.UnauthorizedException;
import br.com.gerenciador.projeto.model.Exame;
import br.com.gerenciador.projeto.model.Usuario;
import br.com.gerenciador.projeto.security.AuthUtil;
import br.com.gerenciador.projeto.security.JwtUtil;

@Service
public class UsuarioService {

    @Autowired private IUsuario  dao;
    @Autowired private TimeDAO   timeDAO;
    @Autowired private JwtUtil   jwtUtil;
    @Autowired private AuditoriaService auditoria;
    @Autowired private AcessoService acesso;
    @Autowired private AssinaturaService assinaturas;
    @PersistenceContext private EntityManager entityManager;

    /** Gera hash BCrypt, evitando re-hashear algo que já é um hash BCrypt. */
    private static String hashSenha(String senha) {
        if (senha == null) return null;
        if (senha.startsWith("$2a$") || senha.startsWith("$2b$") || senha.startsWith("$2y$"))
            return senha; // já é hash BCrypt — não hashear de novo
        return BCrypt.hashpw(senha, BCrypt.gensalt(12));
    }

    private static final String ERRO_SENHA_FRACA =
        "A senha deve ter pelo menos 8 caracteres, incluindo letras e números.";

    /** Política mínima: 8+ caracteres, com pelo menos uma letra e um número. */
    private static boolean senhaFraca(String senha) {
        if (senha == null || senha.length() < 8) return true;
        boolean temLetra  = senha.chars().anyMatch(Character::isLetter);
        boolean temDigito = senha.chars().anyMatch(Character::isDigit);
        return !temLetra || !temDigito;
    }

    /** Nascimento aceito: não futuro e no máximo 100 anos atrás (a idade é calculada a partir dele). */
    private static void validarNascimento(LocalDate nasc) {
        if (nasc == null) return;
        LocalDate hoje = LocalDate.now();
        if (nasc.isAfter(hoje) || nasc.isBefore(hoje.minusYears(100)))
            throw new BadRequestException("Data de nascimento invalida.");
    }

    /** Remove dados sensíveis (CPF, endereço, dados de responsáveis, etc.)
     *  para quem não é Admin/Treinador nem o próprio usuário. */
    /**
     * Dados pessoais (e-mail, login, CPF, endereço, responsáveis...) só para:
     * Admin, o próprio usuário, ou o Treinador do MESMO time do usuário.
     * meuTime = time de quem pede (AuthUtil.timeDoUsuario). Os demais veem só
     * nome, perfil, time e foto — o que as telas de time precisam pra listar.
     */
    public static Usuario sanitizarParaListagem(Usuario u, Integer authId, Integer authTipo, Integer meuTime) {
        boolean ehDono = authId != null && authId.equals(u.getId_usuario());
        Integer timeDoAlvo = u.getTime() != null ? u.getTime().getId_time() : null;
        boolean treinadorDoTime = (AuthUtil.ehTreinador(authTipo) || AuthUtil.ehPreparador(authTipo))
            && meuTime != null && meuTime.equals(timeDoAlvo);
        if (AuthUtil.ehAdmin(authTipo) || ehDono || treinadorDoTime) return u;

        u.setEmail_usuario(null);
        u.setLogin_usuario(null);
        u.setData_nasc_usuario(null);
        u.setEndereco_usuario(null);
        u.setNumero_usuario(null);
        u.setComplemento_usuario(null);
        u.setBairro_usuario(null);
        u.setCep_usuario(null);
        u.setCidade_usuario(null);
        u.setEstado_usuario(null);
        u.setCel_usuario(null);
        u.setCpf_usuario(null);
        u.setRg_responsavel_1(null);
        u.setRg_responsavel_2(null);
        u.setCpf_responsavel_1(null);
        u.setCpf_responsavel_2(null);
        u.setCel_responsavel_1(null);
        u.setCel_responsavel_2(null);
        return u;
    }

    public List<Usuario> listarTodos(Integer idTime, Integer authId, Integer authTipo) {
        Integer meuTime = AuthUtil.timeDoUsuario(authId, dao);
        // Só o Admin lista pessoas de outros times (com o autocadastro, qualquer um tem conta).
        if (!AuthUtil.ehAdmin(authTipo)) {
            if (meuTime == null || (idTime != null && !idTime.equals(meuTime))) return new java.util.ArrayList<>();
            idTime = meuTime;
        }
        List<Usuario> lista = idTime != null ? dao.buscarPorTime(idTime) : dao.findAll();
        lista.forEach(u -> sanitizarParaListagem(u, authId, authTipo, meuTime));
        return lista;
    }

    public Usuario buscarPorId(Integer id, Integer authId, Integer authTipo) {
        Usuario u = dao.findById(id)
            .orElseThrow(() -> new NotFoundException("Usuario nao encontrado."));
        return sanitizarParaListagem(u, authId, authTipo, AuthUtil.timeDoUsuario(authId, dao));
    }

    public List<Exame> listarExames(Integer id, Integer authId, Integer authTipo) {
        Usuario u = dao.findById(id)
            .orElseThrow(() -> new NotFoundException("Usuario nao encontrado."));
        boolean ehDono = authId != null && authId.equals(id);
        Integer idTimeAlvo = u.getTime() != null ? u.getTime().getId_time() : null;
        boolean autorizado = ehDono || AuthUtil.ehAdmin(authTipo)
            || AuthUtil.podeGerenciarTime(authTipo, authId, idTimeAlvo, dao);
        if (!autorizado)
            throw new ForbiddenException("Sem permissao para ver exames deste usuario.");
        return u.getExames();
    }

    public List<Usuario> listarTreinadores(Integer authId, Integer authTipo) {
        Integer meuTime = AuthUtil.timeDoUsuario(authId, dao);
        return dao.findAll().stream()
            .filter(u -> u.getTipo_usuario() != null && u.getTipo_usuario() <= 2)
            .map(u -> sanitizarParaListagem(u, authId, authTipo, meuTime))
            .collect(Collectors.toList());
    }

    // Somente Admin ou Treinador podem cadastrar novos usuarios.
    @Transactional
    public Usuario criar(Usuario usuario, Integer authId, Integer authTipo) {
        if (!AuthUtil.ehAdmin(authTipo) && !AuthUtil.ehTreinador(authTipo))
            throw new ForbiddenException("Somente Admin ou Treinador podem cadastrar usuarios.");

        // a senha temporária vai para o e-mail, então ele é obrigatório
        String email = usuario.getEmail_usuario() != null ? usuario.getEmail_usuario().trim() : "";
        if (!email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$"))
            throw new BadRequestException("Informe um e-mail válido: a senha temporária é enviada para ele.");
        if (dao.existeEmail(email))
            throw new BadRequestException("Este e-mail já está cadastrado.");
        usuario.setEmail_usuario(email);
        usuario.setId_usuario(null); // cadastro nunca sobrescreve um usuário existente
        validarNascimento(usuario.getData_nasc_usuario());

        // Somente Admin pode definir o perfil (tipo_usuario) do novo cadastro —
        // Treinador sempre cadastra Atleta, evitando autopromoção/promoção indevida.
        if (!AuthUtil.ehAdmin(authTipo) || usuario.getTipo_usuario() == null)
            usuario.setTipo_usuario(3);
        // situação da conta é do sistema, nunca do JSON
        usuario.setAutocadastro(0);
        usuario.setEmail_confirmado(1);
        usuario.setCadastro_completo(1);
        usuario.setTeste_inicio(null);
        usuario.setTeste_fim(null);

        if (AuthUtil.ehTreinador(authTipo)) {
            // Treinador só pode vincular o novo cadastro ao próprio time.
            Integer meuTime = AuthUtil.timeDoUsuario(authId, dao);
            usuario.setTime(meuTime != null ? timeDAO.findById(meuTime).orElse(null) : null);
        } else if (usuario.getTime() != null && usuario.getTime().getId_time() != null) {
            timeDAO.findById(usuario.getTime().getId_time()).ifPresent(usuario::setTime);
        }

        if (usuario.getTipo_usuario() == 3 && usuario.getTime() != null)
            assinaturas.exigirVagas(usuario.getTime().getId_time(), 1);

        usuario.setCpf_usuario(normalizarCpf(usuario.getCpf_usuario()));
        substituirCpfAnterior(usuario.getCpf_usuario(), null);
        // O login também é do sistema (nome + dígitos do celular/CPF) e vai junto no e-mail.
        String login = gerarLogin(usuario);
        usuario.setLogin_usuario(login);
        // Quem cadastra nunca define nem vê a senha: o sistema gera uma temporária,
        // manda para o e-mail do usuário, e ele cria a dele no primeiro acesso.
        String senhaTemporaria = AcessoService.gerarSenhaTemporaria();
        usuario.setSenha_usuario(hashSenha(senhaTemporaria));
        usuario.setPrimeiro_login(1);
        usuario.setReset_senha_hash(null);
        usuario.setReset_senha_expira(null);
        Usuario salvo = dao.saveAndFlush(usuario); // erro de banco aparece antes do e-mail sair
        salvo.setAcesso_enviado(acesso.enviarSenhaTemporaria(salvo, senhaTemporaria, true));
        return salvo;
    }

    // ── Login gerado pelo sistema ────────────────────────────────────────
    // primeiro.ultimo nome (sem acento, sem "da/de/dos") + 4 últimos dígitos do
    // celular — ou do CPF, ou 4 números aleatórios. Ex.: "joao.silva4821".
    // Fácil de lembrar sem ser escolhido por quem cadastra. Se já existir, ganha sufixo _2, _3...
    private static final java.util.Set<String> PARTICULAS = java.util.Set.of("da", "de", "do", "das", "dos", "e", "di", "du");

    private String gerarLogin(Usuario u) {
        String nome = java.text.Normalizer.normalize(u.getNome_usuario() == null ? "" : u.getNome_usuario(), java.text.Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "").toLowerCase().replaceAll("[^a-z ]", " ");
        List<String> partes = java.util.Arrays.stream(nome.trim().split("\\s+"))
            .filter(p -> !p.isEmpty() && !PARTICULAS.contains(p)).toList();
        String base = partes.isEmpty() ? "usuario"
            : partes.size() == 1 ? partes.get(0)
            : partes.get(0) + "." + partes.get(partes.size() - 1);
        if (base.length() > 34) base = base.substring(0, 34);

        String cel = u.getCel_usuario() == null ? "" : u.getCel_usuario().replaceAll("\\D", "");
        String cpf = u.getCpf_usuario() == null ? "" : u.getCpf_usuario().replaceAll("\\D", "");
        String digitos;
        if (cel.length() >= 4) digitos = cel.substring(cel.length() - 4);
        else if (cpf.length() >= 4) digitos = cpf.substring(cpf.length() - 4);
        else digitos = String.format("%04d", RANDOM.nextInt(10_000));

        String login = base + digitos;
        for (int i = 2; dao.existeLogin(login); i++) login = base + digitos + "_" + i;
        return login;
    }

    /**
     * "Reenviar acesso": gera uma nova senha temporária e manda para o e-mail do
     * usuário (a anterior e as sessões abertas deixam de valer). Admin para
     * qualquer um; Treinador só para atletas do próprio time. Quem pede não vê a senha.
     */
    @Transactional
    public Usuario reenviarAcesso(Integer id, Integer authId, Integer authTipo) {
        Usuario alvo = dao.findById(id)
            .orElseThrow(() -> new NotFoundException("Usuario nao encontrado."));
        Integer idTimeAlvo = alvo.getTime() != null ? alvo.getTime().getId_time() : null;
        Integer tipoAlvo = alvo.getTipo_usuario();
        boolean treinadorDoAtleta = (Integer.valueOf(3).equals(tipoAlvo) || Integer.valueOf(4).equals(tipoAlvo))
            && AuthUtil.podeGerenciarTime(authTipo, authId, idTimeAlvo, dao)
            || Integer.valueOf(3).equals(tipoAlvo) && AuthUtil.podeGerenciarPreparo(authTipo, authId, idTimeAlvo, dao);
        if (!AuthUtil.ehAdmin(authTipo) && !treinadorDoAtleta)
            throw new ForbiddenException("Sem permissao para reenviar o acesso deste usuario.");
        if (alvo.getEmail_usuario() == null || alvo.getEmail_usuario().isBlank())
            throw new BadRequestException("Este usuário não tem e-mail cadastrado. Edite o cadastro e informe um e-mail.");

        String senhaTemporaria = AcessoService.gerarSenhaTemporaria();
        alvo.setSenha_usuario(hashSenha(senhaTemporaria));
        alvo.setPrimeiro_login(1);
        alvo.setToken_version(alvo.getToken_version() + 1);
        alvo.setReset_senha_hash(null);
        alvo.setReset_senha_expira(null);
        dao.saveAndFlush(alvo);
        // e-mail falhou: a exceção desfaz a troca, e a senha antiga continua valendo
        if (!acesso.enviarSenhaTemporaria(alvo, senhaTemporaria, false))
            throw new BadRequestException("Não consegui enviar o e-mail para " + alvo.getEmail_usuario()
                + ". Confira o endereço e tente de novo.");
        alvo.setAcesso_enviado(true);
        return alvo;
    }

    // ── Esqueci minha senha ──────────────────────────────────────────────
    // Link por e-mail com token aleatório de uso único; no banco fica só o
    // hash dele. A resposta é sempre a mesma, exista o login/e-mail ou não.
    private static final int  VALIDADE_LINK_MIN = 30;
    private static final int  MAX_PEDIDOS_POR_IP = 10;     // por hora
    private static final int  MAX_PEDIDOS_POR_CONTA = 3;   // a cada 15 min
    private static final java.security.SecureRandom RANDOM = new java.security.SecureRandom();
    private final java.util.concurrent.ConcurrentHashMap<String, long[]> pedidosRedefinicao = new java.util.concurrent.ConcurrentHashMap<>();

    @Transactional
    public void solicitarRedefinicao(String loginOuEmail, String ip) {
        if (excedeuPedidos("ip|" + ip, MAX_PEDIDOS_POR_IP, 60 * 60 * 1000L))
            throw new TooManyRequestsException("Muitos pedidos de redefinição. Tente novamente mais tarde.");
        String valor = loginOuEmail != null ? loginOuEmail.trim() : "";
        if (valor.isEmpty() || valor.length() > 255) return;

        for (Usuario u : dao.buscarPorLoginOuEmail(valor)) {
            if (u.getEmail_usuario() == null || u.getEmail_usuario().isBlank()) continue;
            if (excedeuPedidos("conta|" + u.getId_usuario(), MAX_PEDIDOS_POR_CONTA, 15 * 60 * 1000L)) continue;
            byte[] bytes = new byte[32];
            RANDOM.nextBytes(bytes);
            String token = java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
            u.setReset_senha_hash(sha256(token));
            u.setReset_senha_expira(java.time.LocalDateTime.now().plusMinutes(VALIDADE_LINK_MIN));
            dao.save(u);
            acesso.enviarLinkRedefinicao(u, token, VALIDADE_LINK_MIN);
            registrarLogin(u.getId_usuario(), "SENHA", "Pediu redefinição de senha por e-mail", 200, ip);
        }
    }

    @Transactional
    public void redefinirSenha(String token, String nova, String ip) {
        String erro = "Link inválido ou expirado. Peça um novo em \"Esqueci minha senha\".";
        if (token == null || token.length() != 43) throw new BadRequestException(erro);
        Usuario u = dao.buscarPorResetHash(sha256(token)).orElseThrow(() -> new BadRequestException(erro));
        if (u.getReset_senha_expira() == null || u.getReset_senha_expira().isBefore(java.time.LocalDateTime.now())) {
            u.setReset_senha_hash(null);
            u.setReset_senha_expira(null);
            dao.save(u);
            throw new BadRequestException(erro);
        }
        if (senhaFraca(nova)) throw new BadRequestException(ERRO_SENHA_FRACA);

        u.setSenha_usuario(hashSenha(nova));
        u.setPrimeiro_login(0);
        u.setToken_version(u.getToken_version() + 1); // derruba sessões abertas com a senha antiga
        u.setReset_senha_hash(null);                  // uso único
        u.setReset_senha_expira(null);
        dao.save(u);
        registrarLogin(u.getId_usuario(), "SENHA", "Redefiniu a senha pelo link do e-mail", 200, ip);
    }

    private boolean excedeuPedidos(String chave, int max, long janelaMs) {
        long agora = System.currentTimeMillis();
        if (pedidosRedefinicao.size() > 10_000) pedidosRedefinicao.values().removeIf(p -> agora - p[1] > janelaMs);
        long[] p = pedidosRedefinicao.compute(chave, (k, v) ->
            v == null || agora - v[1] > janelaMs ? new long[]{1, agora} : new long[]{v[0] + 1, v[1]});
        return p[0] > max;
    }

    private static String sha256(String texto) {
        try {
            byte[] h = java.security.MessageDigest.getInstance("SHA-256")
                .digest(texto.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(h);
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    public static class LoginResultado {
        public final Usuario usuario;
        public final String token;
        public LoginResultado(Usuario usuario, String token) {
            this.usuario = usuario;
            this.token = token;
        }
    }

    public LoginResultado login(String login, String senha, String tipoStr, String ip) {
        if (login == null || senha == null || tipoStr == null)
            throw new BadRequestException("Campos obrigatorios ausentes.");

        Integer tipo;
        try { tipo = Integer.parseInt(tipoStr); }
        catch (NumberFormatException e) {
            throw new BadRequestException("tipo_usuario invalido.");
        }

        // Bloqueio por login+IP (errar a senha de alguém não trava o dono da
        // conta, que entra de outro IP) e teto por IP (um IP não fica testando
        // senhas em todas as contas).
        String chave = login.trim().toLowerCase() + "|" + ip;
        String chaveIp = "ip|" + ip;
        Usuario u = dao.buscarPorLoginTipo(login, tipo).orElse(null);
        Integer idTentado = u != null ? u.getId_usuario() : null;
        try {
            exigirNaoBloqueado(chave, MAX_FALHAS);
            exigirNaoBloqueado(chaveIp, MAX_FALHAS_POR_IP);
        } catch (TooManyRequestsException e) {
            registrarLogin(idTentado, "LOGIN_BLOQUEADO", "Login bloqueado por excesso de tentativas", 429, ip);
            throw e;
        }

        String hash = u != null ? u.getSenha_usuario() : null;
        // Sempre roda um BCrypt, exista o login ou não: o tempo de resposta
        // não pode revelar quais logins existem. Senhas em texto puro não são
        // aceitas (o SenhasPadraoGuard migra as antigas para BCrypt na subida).
        boolean hashValido = hash != null && hash.startsWith("$2");
        boolean senhaOk = BCrypt.checkpw(senha, hashValido ? hash : HASH_FALSO) && hashValido;

        if (!senhaOk) {
            registrarFalha(chave);
            registrarFalha(chaveIp);
            // o login digitado não vai para o log: às vezes é a senha digitada no campo errado
            registrarLogin(idTentado, "LOGIN_FALHA",
                u != null ? "Errou a senha ao entrar" : "Tentativa de login com usuário ou perfil inexistente", 401, ip);
            throw new UnauthorizedException(ERRO_LOGIN);
        }
        falhasLogin.remove(chave);
        if (u.getEmail_confirmado() == 0)
            throw new ForbiddenException("Confirme seu e-mail antes de entrar: enviamos um link para " + u.getEmail_usuario() + ".");
        registrarLogin(u.getId_usuario(), "LOGIN", "Entrou no sistema", 200, ip);
        AssinaturaService.Situacao situacao = assinaturas.situacao(u);
        u.setSituacao(situacao != null ? situacao.name() : null);

        String token = jwtUtil.gerarToken(u.getId_usuario(), u.getLogin_usuario(), u.getTipo_usuario(), u.getToken_version());
        u.setSenha_usuario(null);
        return new LoginResultado(u, token);
    }

    // ── Autocadastro do treinador ────────────────────────────────────────
    // Ele escolhe a própria senha, mas só entra depois de clicar no link do
    // e-mail (prova que o e-mail é dele). Depois do login vai para os planos.
    private static final int VALIDADE_CONFIRMACAO_HORAS = 24;
    private static final String EMAIL_REGEX = "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$";

    @Transactional
    public Map<String, Object> cadastrarTreinador(Map<String, String> dados, String ip) {
        if (excedeuPedidos("cadastro|" + ip, 5, 60 * 60 * 1000L))
            throw new TooManyRequestsException("Muitos cadastros a partir desta rede. Tente novamente mais tarde.");
        String nome  = texto(dados, "nome_usuario");
        String email = texto(dados, "email_usuario").toLowerCase();
        String cel   = texto(dados, "cel_usuario");
        String senha = dados.get("senha_usuario");
        if (nome.length() < 3 || nome.length() > 100) throw new BadRequestException("Informe seu nome completo.");
        if (!email.matches(EMAIL_REGEX) || email.length() > 100) throw new BadRequestException("Informe um e-mail válido.");
        if (senhaFraca(senha)) throw new BadRequestException(ERRO_SENHA_FRACA);

        Usuario u = dao.buscarPorEmail(email).orElse(null);
        boolean refazendo = u != null && u.getAutocadastro() == 1 && u.getEmail_confirmado() == 0;
        if (u != null && !refazendo)
            throw new BadRequestException("Este e-mail já tem conta no LAIVY. Entre com ele ou use \"Esqueci minha senha\".");
        if (u == null) {
            u = new Usuario();
            u.setEmail_usuario(email);
            u.setTipo_usuario(2);
            u.setAutocadastro(1);
            u.setEmail_confirmado(0);
            u.setPrimeiro_login(0); // a senha já é dele
        }
        u.setNome_usuario(nome);
        u.setCel_usuario(cel.isEmpty() ? null : cel);
        if (u.getLogin_usuario() == null) u.setLogin_usuario(gerarLogin(u));
        u.setSenha_usuario(hashSenha(senha));
        String token = novoToken();
        u.setConfirmacao_hash(sha256(token));
        u.setConfirmacao_expira(java.time.LocalDateTime.now().plusHours(VALIDADE_CONFIRMACAO_HORAS));
        Usuario salvo = dao.saveAndFlush(u);
        // e-mail falhou: a exceção desfaz o cadastro, e a pessoa tenta de novo
        if (!acesso.enviarConfirmacaoEmail(salvo, token, VALIDADE_CONFIRMACAO_HORAS))
            throw new BadRequestException("Não consegui enviar o e-mail de confirmação para " + email + ". Confira o endereço e tente de novo.");
        registrarLogin(salvo.getId_usuario(), "CADASTRO", "Treinador se cadastrou (aguardando confirmação do e-mail)", 201, ip);
        return Map.of("email", email, "login", salvo.getLogin_usuario());
    }

    @Transactional
    public Map<String, Object> confirmarEmail(String token, String ip) {
        String erro = "Link de confirmação inválido ou expirado. Peça um novo na tela de login.";
        if (token == null || token.length() != 43) throw new BadRequestException(erro);
        Usuario u = dao.buscarPorConfirmacaoHash(sha256(token)).orElseThrow(() -> new BadRequestException(erro));
        if (u.getConfirmacao_expira() == null || u.getConfirmacao_expira().isBefore(java.time.LocalDateTime.now()))
            throw new BadRequestException(erro);
        u.setEmail_confirmado(1);
        u.setConfirmacao_hash(null);
        u.setConfirmacao_expira(null);
        dao.save(u);
        registrarLogin(u.getId_usuario(), "CADASTRO", "Confirmou o e-mail", 200, ip);
        return Map.of("login", u.getLogin_usuario());
    }

    /** Resposta sempre igual, exista o e-mail ou não. */
    @Transactional
    public void reenviarConfirmacao(String email, String ip) {
        if (excedeuPedidos("ip|" + ip, MAX_PEDIDOS_POR_IP, 60 * 60 * 1000L))
            throw new TooManyRequestsException("Muitos pedidos. Tente novamente mais tarde.");
        if (email == null || email.isBlank() || email.length() > 255) return;
        dao.buscarPorEmail(email.trim()).ifPresent(u -> {
            if (u.getEmail_confirmado() != 0) return;
            if (excedeuPedidos("conta|" + u.getId_usuario(), MAX_PEDIDOS_POR_CONTA, 15 * 60 * 1000L)) return;
            String token = novoToken();
            u.setConfirmacao_hash(sha256(token));
            u.setConfirmacao_expira(java.time.LocalDateTime.now().plusHours(VALIDADE_CONFIRMACAO_HORAS));
            dao.save(u);
            acesso.enviarConfirmacaoEmail(u, token, VALIDADE_CONFIRMACAO_HORAS);
        });
    }

    private static String texto(Map<String, String> dados, String campo) {
        String v = dados.get(campo);
        return v == null ? "" : v.trim();
    }

    private static String novoToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    // ── Convite por e-mail ───────────────────────────────────────────────
    // O treinador (ou o preparador, só para atletas) informa os e-mails; cada
    // um recebe login + senha temporária já ligados ao time. No primeiro
    // acesso a pessoa troca a senha e completa os próprios dados.
    private static final int MAX_CONVITES = 50;

    @Transactional
    public List<Map<String, Object>> convidar(List<String> emails, Integer tipo, Integer idTimeAdmin, Integer authId, Integer authTipo) {
        int perfil = tipo == null ? 3 : tipo;
        if (perfil != 3 && perfil != 4) throw new BadRequestException("Perfil inválido: convide Atleta ou Preparador Físico.");

        Integer idTime = AuthUtil.ehAdmin(authTipo) ? idTimeAdmin : AuthUtil.timeDoUsuario(authId, dao);
        if (idTime == null) throw new BadRequestException("Selecione o time antes de convidar.");
        boolean pode = perfil == 4
            ? AuthUtil.podeGerenciarTime(authTipo, authId, idTime, dao)      // preparador: só o treinador convida
            : AuthUtil.podeGerenciarPreparo(authTipo, authId, idTime, dao);  // atleta: treinador ou preparador
        if (!pode) throw new ForbiddenException(perfil == 4
            ? "Somente o treinador do time pode convidar preparadores físicos."
            : "Sem permissao para convidar para este time.");
        var time = timeDAO.findById(idTime).orElseThrow(() -> new NotFoundException("Time nao encontrado."));

        java.util.LinkedHashSet<String> unicos = new java.util.LinkedHashSet<>();
        for (String e : emails == null ? List.<String>of() : emails)
            if (e != null && !e.isBlank()) unicos.add(e.trim().toLowerCase());
        if (unicos.isEmpty()) throw new BadRequestException("Informe pelo menos um e-mail.");
        if (unicos.size() > MAX_CONVITES) throw new BadRequestException("Convide no máximo " + MAX_CONVITES + " e-mails por vez.");

        List<Map<String, Object>> resultado = new java.util.ArrayList<>();
        List<String> novos = new java.util.ArrayList<>();
        for (String email : unicos) {
            if (!email.matches(EMAIL_REGEX) || email.length() > 100) resultado.add(Map.of("email", email, "status", "invalido"));
            else if (dao.existeEmail(email)) resultado.add(Map.of("email", email, "status", "ja_cadastrado"));
            else novos.add(email);
        }
        if (perfil == 3) assinaturas.exigirVagas(idTime, novos.size());

        for (String email : novos) {
            Usuario u = new Usuario();
            u.setEmail_usuario(email);
            u.setNome_usuario(email.substring(0, email.indexOf('@'))); // provisório, até completar o cadastro
            u.setTipo_usuario(perfil);
            u.setTime(time);
            u.setCadastro_completo(0);
            u.setLogin_usuario(gerarLogin(u));
            String senhaTemporaria = AcessoService.gerarSenhaTemporaria();
            u.setSenha_usuario(hashSenha(senhaTemporaria));
            u.setPrimeiro_login(1);
            Usuario salvo = dao.saveAndFlush(u);
            boolean enviado = acesso.enviarSenhaTemporaria(salvo, senhaTemporaria, true);
            resultado.add(Map.of("email", email, "status", enviado ? "enviado" : "falha_email", "id_usuario", salvo.getId_usuario()));
        }
        return resultado;
    }

    /** Primeiro acesso do convidado: preenche os dados pessoais (os mesmos do cadastro completo). */
    private static final String[][] OBRIGATORIOS_CADASTRO = {
        {"nome_usuario", "nome"}, {"cel_usuario", "celular"}, {"cpf_usuario", "CPF"},
        {"data_nasc_usuario", "data de nascimento"}, {"cep_usuario", "CEP"}, {"endereco_usuario", "endereço"},
        {"numero_usuario", "número"}, {"bairro_usuario", "bairro"}, {"cidade_usuario", "cidade"}, {"estado_usuario", "estado"},
    };

    @Transactional
    public Usuario completarCadastro(Integer id, Usuario dados, Integer authId, Integer authTipo) {
        if (authId == null || !authId.equals(id))
            throw new ForbiddenException("Sem permissao para completar este cadastro.");
        dados.setEmail_usuario(null); // o e-mail do convite fica (é o login de recuperação)
        dados.setTime(null);
        Usuario u = atualizar(id, dados, authId, authTipo);
        java.util.Map<String, Object> valores = new java.util.HashMap<>();
        valores.put("nome_usuario", u.getNome_usuario());
        valores.put("cel_usuario", u.getCel_usuario());
        valores.put("cpf_usuario", u.getCpf_usuario());
        valores.put("data_nasc_usuario", u.getData_nasc_usuario());
        valores.put("cep_usuario", u.getCep_usuario());
        valores.put("endereco_usuario", u.getEndereco_usuario());
        valores.put("numero_usuario", u.getNumero_usuario());
        valores.put("bairro_usuario", u.getBairro_usuario());
        valores.put("cidade_usuario", u.getCidade_usuario());
        valores.put("estado_usuario", u.getEstado_usuario());
        List<String> faltando = java.util.Arrays.stream(OBRIGATORIOS_CADASTRO)
            .filter(c -> valores.get(c[0]) == null || valores.get(c[0]).toString().isBlank())
            .map(c -> c[1]).toList();
        if (!faltando.isEmpty())
            throw new BadRequestException("Preencha: " + String.join(", ", faltando) + ".");
        u.setCadastro_completo(1);
        return dao.save(u);
    }

    /** Login, logout e tentativas com erro vão para o log de atividades. */
    public void registrarLogin(Integer idUsuario, String acao, String descricao, int status, String ip) {
        auditoria.registrar(new AuditoriaService.Evento(java.time.LocalDateTime.now(), idUsuario, null,
            acao, descricao, "usuarios", idUsuario, null, "POST", null, status, status < 400, ip));
    }

    /** Logout: invalida todos os tokens já emitidos para este usuário. */
    public void encerrarSessoes(Integer idUsuario) {
        if (idUsuario == null) return;
        dao.findById(idUsuario).ifPresent(u -> {
            u.setToken_version(u.getToken_version() + 1);
            dao.save(u);
        });
    }

    // ── Limite de tentativas de login ────────────────────────────────────
    // Mesma mensagem para "usuário não existe" e "senha errada" (não revela
    // quais logins existem). Após MAX_FALHAS erros seguidos para o mesmo
    // login a partir do mesmo IP, ou MAX_FALHAS_POR_IP erros de um IP em
    // qualquer login, novas tentativas ficam bloqueadas por BLOQUEIO_MS.
    // shortcut: em memória — some no restart e não vale entre várias
    // instâncias; mover pra banco/Redis se o sistema rodar em mais de uma.
    private static final String ERRO_LOGIN = "Login, senha ou perfil incorretos.";
    private static final int  MAX_FALHAS        = 5;
    private static final int  MAX_FALHAS_POR_IP = 20;
    private static final long BLOQUEIO_MS = 15 * 60 * 1000L;
    /** Hash BCrypt (custo 12) de um valor aleatório, só para igualar o tempo do login inexistente. */
    private static final String HASH_FALSO = BCrypt.hashpw(java.util.UUID.randomUUID().toString(), BCrypt.gensalt(12));
    private final java.util.concurrent.ConcurrentHashMap<String, long[]> falhasLogin = new java.util.concurrent.ConcurrentHashMap<>();

    private void exigirNaoBloqueado(String chave, int maximo) {
        long[] f = falhasLogin.get(chave); // {quantidade, instante da última falha}
        if (f == null) return;
        if (System.currentTimeMillis() - f[1] > BLOQUEIO_MS) { falhasLogin.remove(chave); return; }
        if (f[0] >= maximo)
            throw new TooManyRequestsException("Muitas tentativas. Tente novamente em 15 minutos.");
    }

    private void registrarFalha(String chave) {
        long agora = System.currentTimeMillis();
        // limpa entradas vencidas para o mapa não crescer sem limite (chave inclui o IP)
        if (falhasLogin.size() > 10_000) falhasLogin.values().removeIf(f -> agora - f[1] > BLOQUEIO_MS);
        falhasLogin.merge(chave, new long[]{1, agora}, (a, b) -> new long[]{a[0] + 1, b[1]});
    }

    public static class TooManyRequestsException extends RuntimeException {
        public TooManyRequestsException(String m) { super(m); }
    }

    public long getExpirationSegundos() {
        return jwtUtil.getExpirationSegundos();
    }

    @Transactional
    public Usuario atualizar(Integer id, Usuario dados, Integer authId, Integer authTipo) {
        Usuario alvo = dao.findById(id)
            .orElseThrow(() -> new NotFoundException("Usuario nao encontrado."));

        boolean ehDono  = authId != null && authId.equals(id);
        boolean ehAdmin = AuthUtil.ehAdmin(authTipo);
        Integer idTimeAlvo = alvo.getTime() != null ? alvo.getTime().getId_time() : null;
        // Treinador só pode editar cadastros do próprio time — nunca de outro time ou sem time.
        boolean ehTreinadorDoTime = AuthUtil.podeGerenciarTime(authTipo, authId, idTimeAlvo, dao);

        // Só o próprio usuário, um Admin ou o Treinador do time deste usuário podem editar este cadastro
        if (!ehDono && !ehAdmin && !ehTreinadorDoTime)
            throw new ForbiddenException("Sem permissao para editar este usuario.");

        // A senha não muda por aqui (nem para Admin): o dono troca no primeiro
        // acesso ou em "Esqueci minha senha"; quem gerencia só pode reenviar o acesso.

        Usuario u = alvo;
        if (dados.getNome_usuario()      != null) u.setNome_usuario(dados.getNome_usuario());
        if (dados.getEmail_usuario()     != null) u.setEmail_usuario(dados.getEmail_usuario());
        // login é gerado pelo sistema no cadastro e não muda na edição
        // Somente Admin pode alterar o perfil (tipo_usuario) de um cadastro —
        // evita que o próprio usuário ou um Treinador se autopromovam.
        if (dados.getTipo_usuario() != null && ehAdmin) u.setTipo_usuario(dados.getTipo_usuario());
        if (dados.getCel_usuario()       != null) u.setCel_usuario(dados.getCel_usuario());
        if (dados.getCpf_usuario()       != null && !dados.getCpf_usuario().isBlank()) {
            String cpf = normalizarCpf(dados.getCpf_usuario());
            substituirCpfAnterior(cpf, id);
            u.setCpf_usuario(cpf);
        }
        if (dados.getEndereco_usuario()  != null) u.setEndereco_usuario(dados.getEndereco_usuario());
        if (dados.getNumero_usuario()    != null) u.setNumero_usuario(dados.getNumero_usuario());
        if (dados.getComplemento_usuario() != null) u.setComplemento_usuario(dados.getComplemento_usuario());
        if (dados.getData_nasc_usuario() != null) {
            validarNascimento(dados.getData_nasc_usuario());
            u.setData_nasc_usuario(dados.getData_nasc_usuario());
        }
        if (dados.getBairro_usuario()    != null) u.setBairro_usuario(dados.getBairro_usuario());
        if (dados.getCep_usuario()       != null && !dados.getCep_usuario().isBlank()) u.setCep_usuario(dados.getCep_usuario());
        if (dados.getCidade_usuario()    != null) u.setCidade_usuario(dados.getCidade_usuario());
        if (dados.getEstado_usuario()    != null) u.setEstado_usuario(dados.getEstado_usuario());
        if (dados.getFoto_usuario()      != null) u.setFoto_usuario(dados.getFoto_usuario());
        if (dados.getCpf_responsavel_1() != null) u.setCpf_responsavel_1(dados.getCpf_responsavel_1());
        if (dados.getCpf_responsavel_2() != null) u.setCpf_responsavel_2(dados.getCpf_responsavel_2());
        if (dados.getCel_responsavel_1() != null) u.setCel_responsavel_1(dados.getCel_responsavel_1());
        if (dados.getCel_responsavel_2() != null) u.setCel_responsavel_2(dados.getCel_responsavel_2());
        // Admin move para qualquer time; Treinador só pode vincular ao próprio time.
        if (dados.getTime() != null && dados.getTime().getId_time() != null) {
            Integer novoTime = dados.getTime().getId_time();
            boolean podeVincular = ehAdmin
                || (ehTreinadorDoTime && novoTime.equals(AuthUtil.timeDoUsuario(authId, dao)));
            if (podeVincular) timeDAO.findById(novoTime).ifPresent(u::setTime);
        }
        return dao.save(u);
    }

    private static String normalizarCpf(String cpf) {
        if (cpf == null || cpf.isBlank()) return null;
        String digitos = cpf.replaceAll("\\D", "");
        return digitos.isEmpty() ? null : digitos;
    }

    /** O cadastro mais novo mantém o CPF; o registro anterior fica sem CPF. */
    private void substituirCpfAnterior(String cpf, Integer idAtual) {
        if (cpf == null) return;
        entityManager.createNativeQuery("INSERT IGNORE INTO tbl_cpf_lock (cpf) VALUES (?1)")
            .setParameter(1, cpf).executeUpdate();
        entityManager.createNativeQuery("SELECT cpf FROM tbl_cpf_lock WHERE cpf = ?1 FOR UPDATE")
            .setParameter(1, cpf).getSingleResult();
        for (Usuario anterior : dao.buscarPorCpf(cpf)) {
            if (idAtual == null || !idAtual.equals(anterior.getId_usuario())) {
                anterior.setCpf_usuario(null);
                dao.save(anterior);
            }
        }
    }

    public LoginResultado trocarSenha(Integer id, String nova, Integer authId, Integer authTipo) {
        // Só o próprio usuário do token troca a sua senha — nem o Admin troca a de outra pessoa.
        if (authId == null || !authId.equals(id))
            throw new ForbiddenException("Sem permissao para alterar a senha deste usuario.");

        if (senhaFraca(nova))
            throw new BadRequestException(ERRO_SENHA_FRACA);

        Usuario u = dao.findById(id)
            .orElseThrow(() -> new NotFoundException("Usuario nao encontrado."));
        u.setSenha_usuario(BCrypt.hashpw(nova, BCrypt.gensalt(12)));
        u.setPrimeiro_login(0);
        u.setToken_version(u.getToken_version() + 1); // derruba sessões abertas com a senha antiga
        u.setReset_senha_hash(null);
        u.setReset_senha_expira(null);
        dao.save(u);
        String token = jwtUtil.gerarToken(u.getId_usuario(), u.getLogin_usuario(), u.getTipo_usuario(), u.getToken_version());
        u.setSenha_usuario(null);
        return new LoginResultado(u, token);
    }

    public void excluir(Integer id, Integer authId, Integer authTipo) {
        Usuario alvo = dao.findById(id)
            .orElseThrow(() -> new NotFoundException("Usuario nao encontrado."));

        boolean ehAdmin = AuthUtil.ehAdmin(authTipo);
        // Treinador só pode excluir Atleta/Treinador do próprio time — nunca um Admin.
        Integer idTimeAlvo = alvo.getTime() != null ? alvo.getTime().getId_time() : null;
        boolean ehTreinadorDoTime = alvo.getTipo_usuario() != null && alvo.getTipo_usuario() != 1
            && AuthUtil.podeGerenciarTime(authTipo, authId, idTimeAlvo, dao);

        if (!ehAdmin && !ehTreinadorDoTime)
            throw new ForbiddenException("Sem permissao para excluir este usuario.");

        dao.deleteById(id);
    }
}
