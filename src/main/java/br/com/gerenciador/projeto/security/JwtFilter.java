package br.com.gerenciador.projeto.security;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.beans.factory.annotation.Autowired;
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
 * Rotas públicas: POST /usuarios/login, POST /usuarios/logout
 *
 * Após validar o token, o filtro expõe a identidade do usuário
 * autenticado como atributos da requisição:
 *   authId    → id_usuario   (Integer)
 *   authTipo  → tipo_usuario (Integer: 1=Admin, 2=Treinador, 3=Atleta)
 *   authLogin → login_usuario(String)
 */
@Component
public class JwtFilter implements Filter {

    public static final String ATTR_ID    = "authId";
    public static final String ATTR_TIPO  = "authTipo";
    public static final String ATTR_LOGIN = "authLogin";

    @Autowired
    private JwtUtil jwtUtil;

    private static final List<String> API_PREFIXOS = List.of(
        "/usuarios", "/times", "/atividades", "/calendarios",
        "/desempenhos", "/exames", "/escalacoes", "/visitantes",
        "/assistente"
    );

    private static final List<String> API_PUBLICAS = List.of(
        "/usuarios/login",
        "/usuarios/logout"
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

        // É rota pública de API → passa direto
        boolean ehPublica = API_PUBLICAS.stream().anyMatch(prefixo -> casaComPrefixo(path, prefixo));
        if (ehPublica) {
            chain.doFilter(req, res);
            return;
        }

        // É rota protegida → exige token válido no cookie HttpOnly
        String token = extrairTokenDoCookie(req);
        if (token != null && jwtUtil.validar(token)) {
            // Disponibiliza a identidade para os controllers
            req.setAttribute(ATTR_ID,    jwtUtil.getId(token));
            req.setAttribute(ATTR_TIPO,  jwtUtil.getTipo(token));
            req.setAttribute(ATTR_LOGIN, jwtUtil.getLogin(token));
            chain.doFilter(req, res);
            return;
        }

        // Sem token ou token inválido/expirado → 401
        res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        res.setContentType("application/json;charset=UTF-8");
        res.getWriter().write("{\"erro\":\"Token ausente, invalido ou expirado.\"}");
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
