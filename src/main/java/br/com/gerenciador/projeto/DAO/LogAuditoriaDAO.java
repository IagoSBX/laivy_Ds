package br.com.gerenciador.projeto.DAO;

import java.time.LocalDateTime;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import br.com.gerenciador.projeto.model.LogAuditoria;

public interface LogAuditoriaDAO extends JpaRepository<LogAuditoria, Long>, JpaSpecificationExecutor<LogAuditoria> {

    /** Retenção: apaga em lote os registros mais antigos que o limite. */
    @Modifying
    @Transactional
    @Query("DELETE FROM LogAuditoria l WHERE l.data_hora < :limite")
    int apagarAntesDe(@Param("limite") LocalDateTime limite);
}
