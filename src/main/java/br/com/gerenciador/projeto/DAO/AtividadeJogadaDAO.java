package br.com.gerenciador.projeto.DAO;

import br.com.gerenciador.projeto.model.AtividadeJogada;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * Consultas explícitas em vez de derivação por nome de método: o campo PK de
 * Atividade no LAIVY é id_atividade (não id), então "findByAtividadeId..."
 * não seria resolvido pelo Spring Data.
 */
public interface AtividadeJogadaDAO extends JpaRepository<AtividadeJogada, AtividadeJogada.Id> {

    @Query("SELECT aj FROM AtividadeJogada aj WHERE aj.atividade.id_atividade = :idAtividade ORDER BY aj.ordem ASC")
    List<AtividadeJogada> findByAtividadeIdOrderByOrdemAsc(@Param("idAtividade") Integer idAtividade);

    @Query("SELECT aj FROM AtividadeJogada aj WHERE aj.jogada.id = :idJogada")
    List<AtividadeJogada> findByJogadaId(@Param("idJogada") Integer idJogada);

    @Modifying
    @Query("DELETE FROM AtividadeJogada aj WHERE aj.atividade.id_atividade = :idAtividade AND aj.jogada.id = :idJogada")
    void deleteByAtividadeIdAndJogadaId(@Param("idAtividade") Integer idAtividade, @Param("idJogada") Integer idJogada);
}
