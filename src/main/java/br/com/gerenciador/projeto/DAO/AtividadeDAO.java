package br.com.gerenciador.projeto.DAO;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import br.com.gerenciador.projeto.model.Atividade;

public interface AtividadeDAO extends JpaRepository<Atividade, Integer> {

    @Query("SELECT a FROM Atividade a WHERE a.usuario.id_usuario = :id ORDER BY a.data_atividade DESC")
    List<Atividade> buscarPorUsuario(@Param("id") Integer id);

    @Query("SELECT a FROM Atividade a WHERE a.tipo_atividade = :tipo")
    List<Atividade> buscarPorTipo(@Param("tipo") Integer tipo);

    @Query("SELECT a FROM Atividade a WHERE a.time.id_time = :idTime ORDER BY a.data_atividade DESC")
    List<Atividade> buscarPorTime(@Param("idTime") Integer idTime);
}
