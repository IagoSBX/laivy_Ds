package br.com.gerenciador.projeto.DAO;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import br.com.gerenciador.projeto.model.Usuario;

public interface IUsuario extends JpaRepository<Usuario, Integer> {

    @Query("SELECT u FROM Usuario u WHERE u.login_usuario = :login AND u.senha_usuario = :senha AND u.tipo_usuario = :tipo")
    Optional<Usuario> autenticar(
        @Param("login") String login,
        @Param("senha") String senha,
        @Param("tipo")  Integer tipo
    );

    @Query("SELECT u FROM Usuario u WHERE u.time.id_time = :idTime")
    List<Usuario> buscarPorTime(@Param("idTime") Integer idTime);

    @Query("SELECT u FROM Usuario u WHERE u.time.id_time = :idTime AND u.tipo_usuario = :tipo")
    List<Usuario> buscarPorTimeTipo(@Param("idTime") Integer idTime, @Param("tipo") Integer tipo);
}
