package br.com.gerenciador.projeto.DAO;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import br.com.gerenciador.projeto.model.Escalacao;

public interface EscalacaoDAO extends JpaRepository<Escalacao, Integer> {

    @Query("SELECT e FROM Escalacao e WHERE e.atividade.id_atividade = :id")
    List<Escalacao> buscarPorAtividade(@Param("id") Integer id);
}