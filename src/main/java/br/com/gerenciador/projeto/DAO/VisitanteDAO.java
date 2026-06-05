package br.com.gerenciador.projeto.DAO;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import br.com.gerenciador.projeto.model.Visitante;

public interface VisitanteDAO extends JpaRepository<Visitante, Integer> {

    @Query("SELECT v FROM Visitante v WHERE v.calendario.id_calendario = :id")
    List<Visitante> buscarPorCalendario(@Param("id") Integer id);

    @Query("SELECT v FROM Visitante v WHERE v.calendario.atividade.time.id_time = :idTime")
    List<Visitante> buscarPorTime(@Param("idTime") Integer idTime);
}
