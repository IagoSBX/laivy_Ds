package br.com.gerenciador.projeto.DAO;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import br.com.gerenciador.projeto.model.Exame;

public interface ExameDAO extends JpaRepository<Exame, Integer> {

    @Query("SELECT e FROM Exame e WHERE e.usuario.id_usuario = :id ORDER BY e.data_inicio_exame DESC")
    List<Exame> buscarPorUsuario(@Param("id") Integer id);

    @Query("SELECT e FROM Exame e WHERE e.usuario.time.id_time = :idTime ORDER BY e.data_inicio_exame DESC")
    List<Exame> buscarPorTime(@Param("idTime") Integer idTime);
}
