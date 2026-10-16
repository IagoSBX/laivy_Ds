package br.com.gerenciador.projeto.DAO;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import br.com.gerenciador.projeto.model.Assinatura;

public interface AssinaturaDAO extends JpaRepository<Assinatura, Integer> {

    /** Mês pago que ainda vale agora, o que vence por último primeiro. */
    @Query("SELECT a FROM Assinatura a WHERE a.usuario.id_usuario = :idUsuario AND a.status = 'PAGA' AND a.valida_ate > :agora ORDER BY a.valida_ate DESC")
    List<Assinatura> buscarVigentes(@Param("idUsuario") Integer idUsuario, @Param("agora") LocalDateTime agora);

    @Query("SELECT a FROM Assinatura a WHERE a.usuario.id_usuario = :idUsuario AND a.status = 'PENDENTE' ORDER BY a.criada_em DESC")
    List<Assinatura> buscarPendentes(@Param("idUsuario") Integer idUsuario);

    @Query("SELECT a FROM Assinatura a WHERE a.id_pagamento = :idPagamento")
    Optional<Assinatura> buscarPorPagamento(@Param("idPagamento") String idPagamento);
}
