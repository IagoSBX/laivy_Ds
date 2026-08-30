package br.com.gerenciador.projeto.DAO;

import br.com.gerenciador.projeto.model.JogadaVisualizacao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface JogadaVisualizacaoDAO
        extends JpaRepository<JogadaVisualizacao, JogadaVisualizacao.Id> {

    @Query("""
        SELECT v FROM JogadaVisualizacao v
         WHERE v.id.idJogada = :idJogada AND v.id.idAtividade = :idAtividade
        """)
    List<JogadaVisualizacao> daJogadaNaAtividade(@Param("idJogada") Integer idJogada,
                                                 @Param("idAtividade") Integer idAtividade);
}
