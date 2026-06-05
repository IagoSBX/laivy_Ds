package br.com.gerenciador.projeto.DAO;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import br.com.gerenciador.projeto.model.Calendario;

public interface CalendarioDAO extends JpaRepository<Calendario, Integer> {

    @Query("SELECT c FROM Calendario c WHERE c.usuario.id_usuario = :id")
    List<Calendario> buscarPorUsuario(@Param("id") Integer id);

    @Query("SELECT c FROM Calendario c WHERE c.atividade.id_atividade = :id")
    List<Calendario> buscarPorAtividade(@Param("id") Integer id);
}
