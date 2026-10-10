package br.com.gerenciador.projeto.DAO;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import br.com.gerenciador.projeto.model.Escalacao;

public interface EscalacaoDAO extends JpaRepository<Escalacao, Integer> {

    @Query("SELECT e FROM Escalacao e WHERE e.atividade.id_atividade = :id")
    List<Escalacao> buscarPorAtividade(@Param("id") Integer id);

    @Query("SELECT e FROM Escalacao e WHERE e.usuario.id_usuario = :id ORDER BY e.atividade.data_atividade DESC")
    List<Escalacao> buscarPorUsuario(@Param("id") Integer id);

    @Query("SELECT COUNT(e) FROM Escalacao e WHERE e.atividade.id_atividade = :atividade AND e.numero_camisa = :camisa AND (:ignorar IS NULL OR e.id_escalacao <> :ignorar)")
    long contarCamisa(@Param("atividade") Integer atividade, @Param("camisa") Integer camisa, @Param("ignorar") Integer ignorar);

    @Query("SELECT COUNT(e) FROM Escalacao e WHERE e.atividade.id_atividade = :atividade AND e.titular = 1 AND LOWER(e.posicao) = LOWER(:posicao) AND (:ignorar IS NULL OR e.id_escalacao <> :ignorar)")
    long contarPosicao(@Param("atividade") Integer atividade, @Param("posicao") String posicao, @Param("ignorar") Integer ignorar);
}
