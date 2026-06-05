package br.com.gerenciador.projeto.DAO;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import br.com.gerenciador.projeto.model.Desempenho;

public interface DesempenhoDAO extends JpaRepository<Desempenho, Integer> {

    @Query("SELECT d FROM Desempenho d WHERE d.usuario.id_usuario = :id ORDER BY d.data_desempenho DESC")
    List<Desempenho> buscarPorUsuario(@Param("id") Integer id);

    @Query("SELECT d FROM Desempenho d WHERE d.usuario.time.id_time = :idTime ORDER BY d.data_desempenho DESC")
    List<Desempenho> buscarPorTime(@Param("idTime") Integer idTime);
}
