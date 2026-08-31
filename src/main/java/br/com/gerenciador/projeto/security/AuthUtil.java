package br.com.gerenciador.projeto.security;

import br.com.gerenciador.projeto.DAO.IUsuario;
import br.com.gerenciador.projeto.model.Time;
import br.com.gerenciador.projeto.model.Usuario;

/**
 * Regras de autorização por papel/time, compartilhadas pelos controllers de domínio.
 * Papel (tipo_usuario): 1=Admin (acesso total), 2=Treinador (restrito ao próprio time), 3=Atleta.
 */
public class AuthUtil {

    private AuthUtil() {}

    public static boolean ehAdmin(Integer authTipo) {
        return authTipo != null && authTipo == 1;
    }

    public static boolean ehTreinador(Integer authTipo) {
        return authTipo != null && authTipo == 2;
    }

    /** Id do time do usuário autenticado, ou null se não tiver time vinculado. */
    public static Integer timeDoUsuario(Integer authId, IUsuario usuarioDAO) {
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
        Integer meuTime = timeDoUsuario(authId, usuarioDAO);
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
