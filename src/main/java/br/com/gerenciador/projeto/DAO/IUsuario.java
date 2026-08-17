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
    @Query("SELECT u FROM Usuario u WHERE u.login_usuario = :login AND u.tipo_usuario = :tipo")
    Optional<Usuario> buscarPorLoginTipo(
        @Param("login") String login,
        @Param("tipo")  Integer tipo
    );

    @Query("SELECT u FROM Usuario u WHERE u.time.id_time = :idTime")
    List<Usuario> buscarPorTime(@Param("idTime") Integer idTime);

    @Query("SELECT u FROM Usuario u WHERE u.time.id_time = :idTime AND u.tipo_usuario = :tipo")
    List<Usuario> buscarPorTimeTipo(@Param("idTime") Integer idTime, @Param("tipo") Integer tipo);
}
