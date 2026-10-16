package br.com.gerenciador.projeto.security;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

/**
 * Filtro JWT puro — Jakarta Servlet Filter, sem Spring Security.
 *
 * Rotas de API (/usuarios, /times, etc.) exigem o token no cookie
 * HttpOnly "jwtToken", enviado automaticamente pelo navegador.
 *
 * Tudo mais (arquivos estáticos, favicon, /error) passa direto.
 * Rotas públicas: POST /usuarios/login, /logout, /esqueci-senha, /redefinir-senha,
 * /cadastro, /confirmar-email, /reenviar-confirmacao e o webhook do PIX.
 *
 * Depois do token, barreiras por situação da conta (resposta 403 com "codigo"):
 *   SENHA           senha temporária: só a troca da própria senha
 *   CADASTRO        convidado por e-mail: só completar os próprios dados
 *   PLANO           treinador autocadastrado sem plano nem teste: só /assinaturas
 *   SOMENTE_LEITURA treinador em período de teste: só leitura (GET) e /assinaturas
 *
 * Após validar o token, o filtro expõe a identidade do usuário
 * autenticado como atributos da requisição:
 *   authId    → id_usuario   (Integer)
 *   authTipo  → tipo_usuario (Integer: 1=Admin, 2=Treinador, 3=Atleta, 4=Preparador Físico)
 *   authLogin → login_usuario(String)
 */
@Component
public class JwtFilter implements Filter {

    public static final String ATTR_ID    = "authId";
    public static final String ATTR_TIPO  = "authTipo";
    public static final String ATTR_LOGIN = "authLogin";

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private br.com.gerenciador.projeto.DAO.IUsuario usuarioDAO;

    @Autowired
    private br.com.gerenciador.projeto.service.AssinaturaService assinaturas;

    /** Maior corpo aceito nas rotas de API (anexo de 5 MB do chat vira ~6,7 MB em base64). */
    private static final long MAX_CORPO_BYTES = 8L * 1024 * 1024;

    /** Mesmo segredo que o AssistenteService manda no header X-Token ao chamar o n8n. */
    @Value("${assistente.n8n.token}")
    private String assistenteToken;

    private static final List<String> API_PREFIXOS = List.of(
        "/usuarios", "/times", "/atividades", "/calendarios",
        "/desempenhos", "/exames", "/escalacoes", "/visitantes",
        "/assistente", "/auditoria", "/assinaturas"
    );

    private static final List<String> API_PUBLICAS = List.of(
        "/usuarios/login",
        "/usuarios/logout",
        "/usuarios/esqueci-senha",
        "/usuarios/redefinir-senha",
        "/usuarios/cadastro",
        "/usuarios/confirmar-email",
        "/usuarios/reenviar-confirmacao",
        "/assinaturas/webhook"
    );

    // Casa o path com o prefixo respeitando limite de segmento:
    // "/atividades.html" NÃO deve casar com "/atividades" (só "/atividades" ou "/atividades/...").
    private static boolean casaComPrefixo(String path, String prefixo) {
        return path.equals(prefixo) || path.startsWith(prefixo + "/");
    }

    @Override
    public void doFilter(ServletRequest servletRequest,
                         ServletResponse servletResponse,
                         FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest  req = (HttpServletRequest)  servletRequest;
        HttpServletResponse res = (HttpServletResponse) servletResponse;

        // Remove o context path: em deploy WAR (ex.: /projeto/usuarios)
        // o getRequestURI() inclui o contexto e quebraria o startsWith.
        String path = req.getRequestURI().substring(req.getContextPath().length());

        // Preflight CORS (OPTIONS) nunca carrega Authorization → passa direto
        if ("OPTIONS".equalsIgnoreCase(req.getMethod())) {
            chain.doFilter(req, res);
            return;
        }

        // Não é rota de API → passa direto (estáticos, favicon, /error, etc.)
        // Ex.: "/atividades.html" não deve casar com o prefixo "/atividades".
        boolean ehApi = API_PREFIXOS.stream().anyMatch(prefixo -> casaComPrefixo(path, prefixo));
        if (!ehApi) {
            chain.doFilter(req, res);
            return;
        }

        // A API é só para o app: abrir /usuarios, /exames etc. direto na barra
        // de endereço (navegação de página, Sec-Fetch-Dest=document) não mostra
        // o JSON. As exportações da prancheta (.png/.pdf/.svg) abrem em aba
        // nova de propósito, então continuam liberadas.
        // shortcut: navegadores sem Sec-Fetch (muito antigos) não são barrados —
        // não é um controle de acesso, a autorização continua logo abaixo.
        if ("document".equals(req.getHeader("Sec-Fetch-Dest")) && !path.matches(".*\\.(png|pdf|svg)$")) {
            responderErro(res, 404, "Pagina nao encontrada.");
            return;
        }

        // Corpo grande demais é recusado antes de ser lido pra memória.
        // ponytail: só olha o Content-Length; upload "chunked" sem tamanho declarado passa.
        if (req.getContentLengthLong() > MAX_CORPO_BYTES) {
            responderErro(res, 413, "Requisição grande demais.");
            return;
        }

        // É rota pública de API → passa direto
        boolean ehPublica = API_PUBLICAS.stream().anyMatch(prefixo -> casaComPrefixo(path, prefixo));
        if (ehPublica) {
            chain.doFilter(req, res);
            return;
        }

        // Tools do agente de IA (/assistente/* menos /assistente/chat): rodam no
        // container do n8n, sem cookie, e autorizam a partir do idUsuario que vem
        // no corpo/query. Por isso SÓ o serviço confiável (X-Token) pode chamá-las —
        // nunca um cookie de usuário: senão qualquer conta logada forjaria o
        // idUsuario (ex.: o do admin) e leria/alteraria dados de qualquer time.
        // O /assistente/chat é o único que o navegador chama e segue como rota
        // protegida normal (cookie), que injeta a identidade real abaixo.
        boolean ferramentaN8n = casaComPrefixo(path, "/assistente")
            && !casaComPrefixo(path, "/assistente/chat");
        if (ferramentaN8n) {
            String xToken = req.getHeader("X-Token");
            // comparação em tempo constante: não vaza o token por timing
            if (xToken != null && !xToken.isBlank() && java.security.MessageDigest.isEqual(
                    xToken.getBytes(java.nio.charset.StandardCharsets.UTF_8),
                    assistenteToken.getBytes(java.nio.charset.StandardCharsets.UTF_8))) {
                req.setAttribute(ATTR_TIPO, 1); // trata como Admin: leitura liberada para qualquer time
                chain.doFilter(req, res);
                return;
            }
            responderErro(res, 401, "Requer token de servico.");
            return;
        }

        // É rota protegida → exige token válido no cookie HttpOnly
        String token = extrairTokenDoCookie(req);
        if (token != null && jwtUtil.validar(token)) {
            // O usuário ainda existe e o token não foi invalidado (logout/troca de senha)?
            Integer id = jwtUtil.getId(token);
            var usuario = id != null ? usuarioDAO.findById(id).orElse(null) : null;
            if (usuario == null || !usuario.getToken_version().equals(jwtUtil.getTokenVersion(token))) {
                responderErro(res, 401, "Sessao encerrada. Entre novamente.");
                return;
            }
            // Senha temporária: até trocar, só a troca da própria senha é permitida.
            boolean trocandoPropriaSenha = "PUT".equalsIgnoreCase(req.getMethod())
                && path.equals("/usuarios/" + id + "/senha");
            if (Integer.valueOf(1).equals(usuario.getPrimeiro_login()) && !trocandoPropriaSenha) {
                responderErro(res, 403, "Troque sua senha temporaria antes de continuar.", "SENHA");
                return;
            }
            // Convidado por e-mail: antes de usar o sistema, preenche os próprios dados.
            boolean completandoCadastro = path.equals("/usuarios/" + id + "/completar-cadastro")
                || ("GET".equalsIgnoreCase(req.getMethod()) && path.equals("/usuarios/" + id));
            if (usuario.getCadastro_completo() == 0 && !completandoCadastro && !trocandoPropriaSenha) {
                responderErro(res, 403, "Complete seu cadastro antes de continuar.", "CADASTRO");
                return;
            }
            // Treinador autocadastrado: sem plano só a tela de planos; no teste, só leitura.
            var situacao = assinaturas.situacao(usuario);
            boolean rotaDePlano = casaComPrefixo(path, "/assinaturas");
            if (situacao == br.com.gerenciador.projeto.service.AssinaturaService.Situacao.SEM_PLANO && !rotaDePlano) {
                responderErro(res, 403, "Escolha um plano para continuar.", "PLANO");
                return;
            }
            if (situacao == br.com.gerenciador.projeto.service.AssinaturaService.Situacao.TESTE
                    && !"GET".equalsIgnoreCase(req.getMethod()) && !rotaDePlano && !trocandoPropriaSenha) {
                responderErro(res, 403, "Periodo de teste: somente visualizacao. Assine um plano para editar.", "SOMENTE_LEITURA");
                return;
            }

            // Disponibiliza a identidade para os controllers
            req.setAttribute(ATTR_ID,    id);
            req.setAttribute(ATTR_TIPO,  jwtUtil.getTipo(token));
            req.setAttribute(ATTR_LOGIN, jwtUtil.getLogin(token));
            chain.doFilter(req, res);
            return;
        }

        // Sem token ou token inválido/expirado → 401
        responderErro(res, 401, "Token ausente, invalido ou expirado.");
    }

    private static void responderErro(HttpServletResponse res, int status, String msg) throws IOException {
        responderErro(res, status, msg, null);
    }

    /** codigo: diz ao front para onde mandar o usuário (ver authFetch). Mensagens sem aspas/acentos. */
    private static void responderErro(HttpServletResponse res, int status, String msg, String codigo) throws IOException {
        res.setStatus(status);
        res.setContentType("application/json;charset=UTF-8");
        res.getWriter().write("{\"erro\":\"" + msg + "\"" + (codigo != null ? ",\"codigo\":\"" + codigo + "\"" : "") + "}");
    }

    private static String extrairTokenDoCookie(HttpServletRequest req) {
        Cookie[] cookies = req.getCookies();
        if (cookies == null) return null;
        return Arrays.stream(cookies)
            .filter(c -> "jwtToken".equals(c.getName()))
            .map(Cookie::getValue)
            .findFirst()
            .orElse(null);
    }
}
