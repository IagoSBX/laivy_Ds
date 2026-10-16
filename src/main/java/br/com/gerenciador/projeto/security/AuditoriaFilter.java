package br.com.gerenciador.projeto.security;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.util.ContentCachingResponseWrapper;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import br.com.gerenciador.projeto.service.AuditoriaService;
import br.com.gerenciador.projeto.service.AuditoriaService.Evento;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Registra no log de atividades tudo que altera dados (POST/PUT/PATCH/DELETE
 * na API) e os acessos negados (403). Fica por fora do JwtFilter: depois que a
 * requisição termina, a identidade que ele deixou nos atributos já está lá.
 *
 * Só olha método, caminho e status — o corpo da requisição (senhas, dados de
 * saúde, CPF) nunca é lido nem gravado. A única leitura de corpo é a da
 * RESPOSTA de uma criação, para anotar o id do item criado.
 *
 * Login, logout, tentativas com senha errada e o "esqueci minha senha" são registrados no
 * UsuarioService/UsuarioController, que sabem quem tentou entrar.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 100)
public class AuditoriaFilter implements Filter {

    @Autowired private AuditoriaService auditoria;
    @Autowired private ObjectMapper json;

    /** prefixo da API → nome legível do item */
    private static final Map<String, String> RECURSOS = Map.ofEntries(
        Map.entry("usuarios", "usuário"), Map.entry("times", "time"), Map.entry("atividades", "atividade"),
        Map.entry("calendarios", "evento do calendário"), Map.entry("desempenhos", "desempenho"),
        Map.entry("exames", "exame"), Map.entry("escalacoes", "escalação"), Map.entry("visitantes", "visitante"),
        Map.entry("assistente", "assistente IA"), Map.entry("auditoria", "o log de atividades"),
        Map.entry("jogadas", "jogada"));

    /** campo do id na resposta de uma criação, por recurso */
    private static final Map<String, String> CAMPO_ID = Map.of(
        "usuarios", "id_usuario", "times", "id_time", "atividades", "id_atividade",
        "calendarios", "id_calendario", "desempenhos", "id_desempenho", "exames", "id_exame",
        "escalacoes", "id_escalacao", "visitantes", "id_visitante", "jogadas", "id");

    private static final Map<String, String[]> FERRAMENTAS_IA = Map.of(
        "sugerir-jogada", new String[]{"sugeriu", "sugerir", "uma jogada"},
        "editar-jogada", new String[]{"editou", "editar", "uma jogada"},
        "cadastrar-atletas", new String[]{"cadastrou", "cadastrar", "atletas"});

    /** O que a requisição faz, já em português: "Editou" / "editar" + "atividade". */
    private record Alvo(String acao, String passado, String infinitivo, String complemento,
                        String recurso, Integer idRecurso, String detalhe, String nomeFixo) {}

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse res = (HttpServletResponse) response;
        String path = req.getRequestURI().substring(req.getContextPath().length());
        String metodo = req.getMethod().toUpperCase();
        String[] seg = Arrays.stream(path.split("/")).filter(s -> !s.isEmpty()).toArray(String[]::new);

        boolean ehApi = seg.length > 0 && RECURSOS.containsKey(seg[0]) && !seg[0].equals("jogadas");
        boolean altera = metodo.equals("POST") || metodo.equals("PUT") || metodo.equals("PATCH") || metodo.equals("DELETE");
        if (!ehApi || ignorar(seg)) {
            chain.doFilter(request, response);
            return;
        }

        Alvo alvo = descrever(metodo, seg, req);
        // criação sem id no caminho: guarda a resposta para descobrir o id criado
        boolean lerIdCriado = altera && metodo.equals("POST") && alvo.idRecurso() == null && CAMPO_ID.containsKey(alvo.recurso());
        ContentCachingResponseWrapper copia = lerIdCriado ? new ContentCachingResponseWrapper(res) : null;

        int status = 500;
        try {
            chain.doFilter(request, copia != null ? copia : response);
            status = (copia != null ? copia : res).getStatus();
        } finally {
            try {
                Integer idUsuario = (Integer) req.getAttribute(JwtFilter.ATTR_ID);
                boolean ferramentaIa = alvo.nomeFixo() != null;
                boolean registrar = altera ? (idUsuario != null || (ferramentaIa && status != 401))
                                           : (status == 403 && idUsuario != null);
                if (registrar) {
                    Integer idRecurso = alvo.idRecurso();
                    if (copia != null && status < 300) idRecurso = idCriado(copia, CAMPO_ID.get(alvo.recurso()));
                    auditoria.registrar(montar(alvo, metodo, path, status, idUsuario, idRecurso, req.getRemoteAddr()));
                }
            } finally {
                if (copia != null) copia.copyBodyToResponse();
            }
        }
    }

    /** Rotas que não entram no log: login/logout (registrados à parte) e a contagem de visualizações. */
    private static boolean ignorar(String[] seg) {
        if (seg[0].equals("usuarios") && seg.length == 2
            && java.util.Set.of("login", "logout", "esqueci-senha", "redefinir-senha").contains(seg[1])) return true;
        return seg[seg.length - 1].equals("visualizacao");
    }

    private static Evento montar(Alvo a, String metodo, String path, int status, Integer idUsuario, Integer idRecurso, String ip) {
        boolean sucesso = status < 400;
        String acao = status == 403 ? "ACESSO_NEGADO" : a.acao();
        String descricao = sucesso ? a.passado() + " " + a.complemento()
            : status == 403 ? "Sem permissão para " + a.infinitivo() + " " + a.complemento()
            : "Falhou ao " + a.infinitivo() + " " + a.complemento();
        return new Evento(LocalDateTime.now(), idUsuario, a.nomeFixo(), acao, primeiraMaiuscula(descricao),
            a.recurso(), idRecurso, a.detalhe(), metodo, path, status, sucesso, ip);
    }

    private static Alvo descrever(String metodo, String[] seg, HttpServletRequest req) {
        String raiz = seg[0];
        Integer id1 = numero(seg, 1);

        if (raiz.equals("assistente")) {
            String[] ferramenta = seg.length > 1 ? FERRAMENTAS_IA.get(seg[1]) : null;
            if (ferramenta != null)   // chamada feita pelo n8n em nome do assistente
                return new Alvo("IA", ferramenta[0], ferramenta[1], ferramenta[2], "assistente", null, null, "Assistente IA");
            return new Alvo("IA", "usou", "usar", "o assistente IA", "assistente", null, null, null);
        }

        if (raiz.equals("times") && seg.length >= 3 && seg[2].equals("jogadas")) {
            String noTime = "time #" + id1;
            Integer idJogada = numero(seg, 3);
            boolean vinculo = seg.length >= 5 && seg[4].equals("vinculos");
            if (seg.length >= 5 && seg[4].equals("duplicar"))
                return new Alvo("CRIAR", "duplicou", "duplicar", "jogada", "jogadas", null, "a partir da jogada #" + idJogada + ", " + noTime, null);
            if (vinculo && metodo.equals("DELETE"))
                return new Alvo("EDITAR", "desvinculou", "desvincular", "jogada de atividade", "jogadas", idJogada, "atividade #" + numero(seg, 5) + ", " + noTime, null);
            if (vinculo)
                return new Alvo("EDITAR", "vinculou", "vincular", "jogada a atividade", "jogadas", idJogada, noTime, null);
            if (metodo.equals("DELETE"))
                return new Alvo("EXCLUIR", "arquivou", "arquivar", "jogada", "jogadas", idJogada, noTime, null);
            return generico(metodo, "jogadas", idJogada, noTime);
        }

        if (raiz.equals("times") && seg.length >= 4 && seg[2].equals("membros")) {
            String detalhe = "usuário #" + numero(seg, 3);
            return metodo.equals("DELETE")
                ? new Alvo("EDITAR", "removeu", "remover", "membro do time", "times", id1, detalhe, null)
                : new Alvo("EDITAR", "adicionou", "adicionar", "membro ao time", "times", id1, detalhe, null);
        }

        if (raiz.equals("usuarios") && seg.length >= 3 && seg[2].equals("reenviar-acesso"))
            return new Alvo("SENHA", "reenviou", "reenviar", "o acesso de usuário (nova senha temporária por e-mail)", "usuarios", id1, null, null);

        if (raiz.equals("usuarios") && seg.length >= 3 && seg[2].equals("senha")) {
            boolean propria = id1 != null && id1.equals(req.getAttribute(JwtFilter.ATTR_ID));
            return propria
                ? new Alvo("SENHA", "trocou", "trocar", "a própria senha", "usuarios", id1, null, null)
                : new Alvo("SENHA", "redefiniu", "redefinir", "a senha de usuário", "usuarios", id1, null, null);
        }

        String resto = seg.length > 2 ? String.join("/", Arrays.copyOfRange(seg, 2, seg.length)) : null;
        return generico(metodo, raiz, id1, resto);
    }

    private static Alvo generico(String metodo, String recurso, Integer id, String detalhe) {
        String nome = RECURSOS.getOrDefault(recurso, recurso);
        return switch (metodo) {
            case "POST"          -> new Alvo("CRIAR", "cadastrou", "cadastrar", nome, recurso, id, detalhe, null);
            case "PUT", "PATCH"  -> new Alvo("EDITAR", "editou", "editar", nome, recurso, id, detalhe, null);
            case "DELETE"        -> new Alvo("EXCLUIR", "excluiu", "excluir", nome, recurso, id, detalhe, null);
            default              -> new Alvo("ACESSO_NEGADO", "acessou", "acessar", nome, recurso, id, detalhe, null);
        };
    }

    private Integer idCriado(ContentCachingResponseWrapper copia, String campo) {
        byte[] corpo = copia.getContentAsByteArray();
        if (corpo.length == 0 || corpo.length > 256 * 1024) return null;
        try {
            JsonNode no = json.readTree(corpo).get(campo);
            return no != null && no.canConvertToInt() ? no.asInt() : null;
        } catch (IOException e) {
            return null;
        }
    }

    private static Integer numero(String[] seg, int i) {
        if (i >= seg.length) return null;
        try { return Integer.valueOf(seg[i]); } catch (NumberFormatException e) { return null; }
    }

    private static String primeiraMaiuscula(String s) {
        return s.isEmpty() ? s : Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }
}
