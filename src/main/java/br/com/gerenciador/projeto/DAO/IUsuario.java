package br.com.gerenciador.projeto.DAO;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import br.com.gerenciador.projeto.model.Usuario;

public interface IUsuario extends JpaRepository<Usuario, Integer> {

    /**
     * Busca por login + tipo sem checar senha.
     * Usado pelo novo fluxo JWT: a senha é verificada no controller via BCrypt.
     */
    // Entra pelo login ou pelo e-mail (o e-mail é único).
    @Query("SELECT u FROM Usuario u WHERE (u.login_usuario = :login OR LOWER(u.email_usuario) = LOWER(:login)) AND u.tipo_usuario = :tipo")
    Optional<Usuario> buscarPorLoginTipo(
        @Param("login") String login,
        @Param("tipo")  Integer tipo
    );

    @Query("SELECT u FROM Usuario u WHERE u.time.id_time = :idTime")
    List<Usuario> buscarPorTime(@Param("idTime") Integer idTime);

    @Query("SELECT u FROM Usuario u WHERE u.time.id_time = :idTime AND u.tipo_usuario = :tipo")
    List<Usuario> buscarPorTimeTipo(@Param("idTime") Integer idTime, @Param("tipo") Integer tipo);

    @Query("SELECT COUNT(u) > 0 FROM Usuario u WHERE LOWER(u.email_usuario) = LOWER(:email)")
    boolean existeEmail(@Param("email") String email);

    @Query("SELECT COUNT(u) > 0 FROM Usuario u WHERE u.login_usuario = :login")
    boolean existeLogin(@Param("login") String login);

    /** "Esqueci minha senha": o usuário pode informar o login ou o e-mail. */
    @Query("SELECT u FROM Usuario u WHERE u.login_usuario = :valor OR LOWER(u.email_usuario) = LOWER(:valor)")
    List<Usuario> buscarPorLoginOuEmail(@Param("valor") String valor);

    @Query("SELECT u FROM Usuario u WHERE u.reset_senha_hash = :hash")
    Optional<Usuario> buscarPorResetHash(@Param("hash") String hash);

    @Query("SELECT u FROM Usuario u WHERE u.cpf_usuario = :cpf")
    List<Usuario> buscarPorCpf(@Param("cpf") String cpf);

    @Query("SELECT u FROM Usuario u WHERE u.confirmacao_hash = :hash")
    Optional<Usuario> buscarPorConfirmacaoHash(@Param("hash") String hash);

    @Query("SELECT u FROM Usuario u WHERE LOWER(u.email_usuario) = LOWER(:email)")
    Optional<Usuario> buscarPorEmail(@Param("email") String email);

    /** Time(s) de demonstração — o que o treinador em período de teste enxerga. */
    @Query("SELECT t.id_time FROM Time t WHERE t.demo_time = 1 ORDER BY t.id_time")
    List<Integer> idsTimesDemo();
}
