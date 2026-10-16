package br.com.gerenciador.projeto.security;

import br.com.gerenciador.projeto.DAO.IUsuario;
import br.com.gerenciador.projeto.model.Time;
import br.com.gerenciador.projeto.model.Usuario;

/**
 * Regras de autorização por papel/time, compartilhadas pelos controllers de domínio.
 * Papel (tipo_usuario): 1=Admin (acesso total), 2=Treinador (restrito ao próprio time), 3=Atleta,
 * 4=Preparador Físico (no próprio time: atividades, exames, desempenho e convite de atletas).
 */
public class AuthUtil {

    private AuthUtil() {}

    public static boolean ehAdmin(Integer authTipo) {
        return authTipo != null && authTipo == 1;
    }

    public static boolean ehTreinador(Integer authTipo) {
        return authTipo != null && authTipo == 2;
    }

    public static boolean ehPreparador(Integer authTipo) {
        return authTipo != null && authTipo == 4;
    }

    /**
     * Id do time do usuário autenticado, ou null se não tiver time vinculado.
     * Treinador em período de teste ainda sem time próprio enxerga o time de
     * demonstração (só leitura: o JwtFilter barra a escrita e
     * {@link #podeGerenciarTime} só vale para o time próprio).
     */
    public static Integer timeDoUsuario(Integer authId, IUsuario usuarioDAO) {
        Usuario u = authId != null ? usuarioDAO.findById(authId).orElse(null) : null;
        if (u == null) return null;
        if (u.getTime() != null) return u.getTime().getId_time();
        if (ehTreinador(u.getTipo_usuario()) && u.emTeste())
            return usuarioDAO.idsTimesDemo().stream().findFirst().orElse(null);
        return null;
    }

    /** Time de que o usuário é membro de fato (sem o time de demonstração do teste). */
    private static Integer timeProprio(Integer authId, IUsuario usuarioDAO) {
        if (authId == null) return null;
        return usuarioDAO.findById(authId)
            .map(Usuario::getTime)
            .map(Time::getId_time)
            .orElse(null);
    }

    /**
     * Admin gerencia qualquer time; Treinador só o seu próprio; qualquer outro papel, nenhum.
     * idTimeAlvo == null (time não determinável) é negado para Treinador, por segurança.
     */
    public static boolean podeGerenciarTime(Integer authTipo, Integer authId, Integer idTimeAlvo, IUsuario usuarioDAO) {
        if (ehAdmin(authTipo)) return true;
        if (!ehTreinador(authTipo) || idTimeAlvo == null) return false;
        Integer meuTime = timeProprio(authId, usuarioDAO);
        return meuTime != null && meuTime.equals(idTimeAlvo);
    }

    /**
     * Atividades, exames e desempenho: além de quem gerencia o time, o
     * Preparador Físico do próprio time.
     */
    public static boolean podeGerenciarPreparo(Integer authTipo, Integer authId, Integer idTimeAlvo, IUsuario usuarioDAO) {
        if (podeGerenciarTime(authTipo, authId, idTimeAlvo, usuarioDAO)) return true;
        if (!ehPreparador(authTipo) || idTimeAlvo == null) return false;
        Integer meuTime = timeProprio(authId, usuarioDAO);
        return meuTime != null && meuTime.equals(idTimeAlvo);
    }

    /**
     * Leitura: Admin vê qualquer time; Treinador ou Atleta só o próprio time
     * (diferente de {@link #podeGerenciarTime}, que nega Atleta mesmo no
     * próprio time). idTimeAlvo == null é sempre negado.
     */
    public static boolean ehMembroDoTime(Integer authTipo, Integer authId, Integer idTimeAlvo, IUsuario usuarioDAO) {
        if (ehAdmin(authTipo)) return true;
        if (idTimeAlvo == null) return false;
        Integer meuTime = timeDoUsuario(authId, usuarioDAO);
        return meuTime != null && meuTime.equals(idTimeAlvo);
    }
}
