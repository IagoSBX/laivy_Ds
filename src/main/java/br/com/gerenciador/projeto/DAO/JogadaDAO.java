package br.com.gerenciador.projeto.DAO;

import br.com.gerenciador.projeto.model.Jogada;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface JogadaDAO extends JpaRepository<Jogada, Integer> {

    /**
     * Listagem da biblioteca. NÃO traz o conteúdo inteiro: só o primeiro frame,
     * extraído pelo MySQL, que é o suficiente para o navegador desenhar a
     * miniatura na hora. Assim não existe miniatura armazenada para manter em
     * sincronia — e a lista não arrasta 20 KB por jogada.
     *
     * Filtro por tipo usa a coluna GERADA, coberta por idx_biblioteca.
     */
    @Query(value = """
        SELECT j.id                                   AS id,
               j.nome                                 AS nome,
               j.tipo                                 AS tipo,
               j.qtd_frames                           AS qtdFrames,
               j.atualizado_em                        AS atualizadoEm,
               JSON_EXTRACT(j.conteudo, '$.frames[0]') AS primeiroFrame,
               JSON_UNQUOTE(JSON_EXTRACT(j.conteudo, '$.enquadramento')) AS enquadramento
          FROM jogada j
         WHERE j.id_time = :idTime
           AND j.arquivada_em IS NULL
           AND (:tipo IS NULL OR j.tipo = :tipo)
           AND (:busca IS NULL OR j.nome LIKE CONCAT('%', :busca, '%'))
         ORDER BY j.atualizado_em DESC
        """,
        countQuery = """
        SELECT COUNT(*) FROM jogada j
         WHERE j.id_time = :idTime AND j.arquivada_em IS NULL
           AND (:tipo IS NULL OR j.tipo = :tipo)
           AND (:busca IS NULL OR j.nome LIKE CONCAT('%', :busca, '%'))
        """,
        nativeQuery = true)
    Page<JogadaResumoProjection> listarBiblioteca(@Param("idTime") Integer idTime,
                                                  @Param("tipo") String tipo,
                                                  @Param("busca") String busca,
                                                  Pageable pageable);

    /**
     * Escrita explícita em vez de derivação por nome de método: o campo PK de
     * Time no LAIVY é id_time (não id), e o derivador do Spring Data resolveria
     * "TimeId" como a propriedade "id" de Time, que não existe.
     */
    @Query("SELECT j FROM Jogada j WHERE j.id = :id AND j.time.id_time = :idTime")
    Optional<Jogada> findByIdAndTimeId(@Param("id") Integer id, @Param("idTime") Integer idTime);

    /** Usado quando uma nova schemaVersion for lançada: acha o que falta migrar. */
    @Query("SELECT j FROM Jogada j WHERE j.schemaVer < :versao")
    List<Jogada> comSchemaAnteriorA(@Param("versao") int versao);

    interface JogadaResumoProjection {
        Integer getId();
        String getNome();
        String getTipo();
        Integer getQtdFrames();
        java.time.LocalDateTime getAtualizadoEm();
        String getPrimeiroFrame();
        String getEnquadramento();
    }
}
