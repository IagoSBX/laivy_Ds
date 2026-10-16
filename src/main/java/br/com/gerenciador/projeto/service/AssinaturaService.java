package br.com.gerenciador.projeto.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.gerenciador.projeto.DAO.AssinaturaDAO;
import br.com.gerenciador.projeto.DAO.IUsuario;
import br.com.gerenciador.projeto.DAO.TimeDAO;
import br.com.gerenciador.projeto.exception.BadRequestException;
import br.com.gerenciador.projeto.exception.ForbiddenException;
import br.com.gerenciador.projeto.exception.NotFoundException;
import br.com.gerenciador.projeto.model.Assinatura;
import br.com.gerenciador.projeto.model.Plano;
import br.com.gerenciador.projeto.model.Time;
import br.com.gerenciador.projeto.model.Usuario;
import br.com.gerenciador.projeto.security.AuthUtil;

/**
 * Planos do treinador que se cadastrou sozinho (autocadastro = 1):
 *   TESTE     — 7 dias, uma vez por conta, só visualização do time demo;
 *   SEM_PLANO — teste acabou ou nunca começou: só a tela de planos;
 *   ATIVO     — tem um mês pago valendo (cria o time, convida atletas até o limite).
 * Times criados pelo Admin (treinador sem autocadastro) não têm plano nem limite.
 */
@Service
public class AssinaturaService {

    public static final int DIAS_TESTE = 7;
    public static final int DIAS_PLANO = 30;

    public enum Situacao { TESTE, SEM_PLANO, ATIVO }

    @Autowired private AssinaturaDAO dao;
    @Autowired private IUsuario usuarioDAO;
    @Autowired private TimeDAO timeDAO;
    @Autowired private PixGateway pix;

    /** null = usuário que não paga plano (Admin, atleta, preparador, treinador criado pelo Admin). */
    public Situacao situacao(Usuario u) {
        if (u == null || !AuthUtil.ehTreinador(u.getTipo_usuario()) || u.getAutocadastro() != 1) return null;
        if (vigente(u.getId_usuario()) != null) return Situacao.ATIVO;
        return u.emTeste() ? Situacao.TESTE : Situacao.SEM_PLANO;
    }

    public Assinatura vigente(Integer idUsuario) {
        return dao.buscarVigentes(idUsuario, LocalDateTime.now()).stream().findFirst().orElse(null);
    }

    // ── Limites do plano no time ─────────────────────────────────────────

    /** Treinador autocadastrado responsável pelo time, ou null se o time não é de plano pago. */
    private Usuario donoPagante(Integer idTime) {
        if (idTime == null) return null;
        Time t = timeDAO.findById(idTime).orElse(null);
        Usuario dono = t != null ? t.getTreinador() : null;
        return dono != null && dono.getAutocadastro() == 1 ? dono : null;
    }

    /** Barra o cadastro de mais `novos` atletas além do que o plano do time permite. */
    public void exigirVagas(Integer idTime, int novos) {
        Usuario dono = donoPagante(idTime);
        if (dono == null || novos <= 0) return;
        Assinatura a = vigente(dono.getId_usuario());
        if (a == null)
            throw new BadRequestException("O plano deste time venceu. Renove o plano para cadastrar atletas.");
        int atuais = usuarioDAO.buscarPorTimeTipo(idTime, 3).size();
        int limite = a.getPlano().limiteAtletas;
        if (atuais + novos > limite)
            throw new BadRequestException("O plano " + a.getPlano().nome + " permite até " + limite
                + " atletas e o time já tem " + atuais + ". Restam " + Math.max(0, limite - atuais)
                + " vagas. Troque de plano para cadastrar mais.");
    }

    /** IA só nos planos Pro e Full; times sem plano (criados pelo Admin) continuam com IA. */
    public boolean iaLiberada(Integer idTime) {
        Usuario dono = donoPagante(idTime);
        if (dono == null) return true;
        Assinatura a = vigente(dono.getId_usuario());
        return a != null && a.getPlano().ia;
    }

    // ── Teste e pagamento ────────────────────────────────────────────────

    private Usuario exigirTreinadorPagante(Integer authId) {
        Usuario u = usuarioDAO.findById(authId).orElseThrow(() -> new NotFoundException("Usuario nao encontrado."));
        if (situacao(u) == null)
            throw new ForbiddenException("Planos são só para o treinador que criou a própria conta.");
        return u;
    }

    @Transactional
    public Map<String, Object> iniciarTeste(Integer authId) {
        Usuario u = exigirTreinadorPagante(authId);
        if (u.getTeste_inicio() != null)
            throw new BadRequestException("O período de teste já foi usado nesta conta.");
        if (vigente(authId) != null)
            throw new BadRequestException("Você já tem um plano ativo.");
        LocalDateTime agora = LocalDateTime.now();
        u.setTeste_inicio(agora);
        u.setTeste_fim(agora.plusDays(DIAS_TESTE));
        usuarioDAO.save(u);
        return minha(authId);
    }

    /** Gera (ou reaproveita, se ainda vale) o PIX de um mês do plano escolhido. */
    @Transactional
    public Map<String, Object> gerarPix(Integer authId, String nomePlano) {
        Usuario u = exigirTreinadorPagante(authId);
        Plano plano = Arrays.stream(Plano.values())
            .filter(p -> p.name().equalsIgnoreCase(nomePlano == null ? "" : nomePlano.trim()))
            .findFirst().orElseThrow(() -> new BadRequestException("Plano inválido."));

        LocalDateTime agora = LocalDateTime.now();
        for (Assinatura p : dao.buscarPendentes(authId)) {
            boolean aindaVale = p.getPix_expira() != null && p.getPix_expira().isAfter(agora.plusMinutes(2));
            if (p.getPlano() == plano && aindaVale) return minha(authId);
            if (!aindaVale) { p.setStatus(Assinatura.CANCELADA); dao.save(p); }
        }

        Assinatura a = new Assinatura();
        a.setUsuario(u);
        a.setPlano(plano);
        a.setValor_centavos(plano.valorCentavos);
        a.setStatus(Assinatura.PENDENTE);
        a.setCriada_em(agora);
        dao.saveAndFlush(a); // o id vira a referência da cobrança
        PixGateway.Cobranca c = pix.criar(plano.valorCentavos, "LAIVY - Plano " + plano.nome + " (30 dias)",
            u.getEmail_usuario(), referencia(a));
        a.setId_pagamento(c.idPagamento());
        a.setPix_copia_cola(c.copiaCola());
        a.setPix_qr_base64(c.qrBase64());
        a.setPix_expira(c.expira().atZoneSameInstant(java.time.ZoneId.systemDefault()).toLocalDateTime());
        dao.save(a);
        return minha(authId);
    }

    private static String referencia(Assinatura a) { return "laivy-assinatura-" + a.getId_assinatura(); }

    /** Aviso do Mercado Pago: nunca confia no corpo — consulta o pagamento direto na API. */
    @Transactional
    public void webhook(String idPagamento) {
        if (idPagamento == null || idPagamento.isBlank()) return;
        dao.buscarPorPagamento(idPagamento.trim()).ifPresent(this::atualizar);
    }

    /** Desenvolvimento (PAGAMENTO_SIMULADO=true): dá como pago o PIX pendente do usuário. */
    @Transactional
    public Map<String, Object> simularPagamento(Integer authId) {
        if (!pix.simulado()) throw new ForbiddenException("Pagamento simulado desativado.");
        exigirTreinadorPagante(authId);
        marcarPaga(dao.buscarPendentes(authId).stream().findFirst()
            .orElseThrow(() -> new BadRequestException("Nenhum PIX pendente.")));
        return minha(authId);
    }

    private void atualizar(Assinatura a) {
        if (Assinatura.PAGA.equals(a.getStatus())) return;
        PixGateway.Situacao s = pix.consultar(a.getId_pagamento());
        if (s == null) return;
        boolean confere = s.valor() != null
            && s.valor().compareTo(BigDecimal.valueOf(a.getValor_centavos(), 2)) == 0
            && referencia(a).equals(s.referencia());
        if (s.aprovado() && confere) marcarPaga(a);
        else if (s.encerrado() && Assinatura.PENDENTE.equals(a.getStatus())) {
            a.setStatus(Assinatura.CANCELADA);
            dao.save(a);
        }
    }

    // shortcut: synchronized só vale numa instância; o webhook e a tela podem
    // confirmar o mesmo PIX ao mesmo tempo. Com várias instâncias, trocar por lock no banco.
    private synchronized void marcarPaga(Assinatura a) {
        if (Assinatura.PAGA.equals(a.getStatus())) return;
        LocalDateTime agora = LocalDateTime.now();
        // renovação antes de vencer soma ao que ainda falta
        Assinatura atual = vigente(a.getUsuario().getId_usuario());
        LocalDateTime base = atual != null && atual.getValida_ate().isAfter(agora) ? atual.getValida_ate() : agora;
        a.setStatus(Assinatura.PAGA);
        a.setPaga_em(agora);
        a.setValida_ate(base.plusDays(DIAS_PLANO));
        dao.save(a);
    }

    // ── Resumo para a tela de planos ─────────────────────────────────────

    public static List<Map<String, Object>> planos() {
        return Arrays.stream(Plano.values()).map(p -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", p.name());
            m.put("nome", p.nome);
            m.put("limite_atletas", p.limiteAtletas);
            m.put("ia", p.ia);
            m.put("valor_centavos", p.valorCentavos);
            return m;
        }).toList();
    }

    @Transactional
    public Map<String, Object> minha(Integer authId) {
        Usuario u = usuarioDAO.findById(authId).orElseThrow(() -> new NotFoundException("Usuario nao encontrado."));
        dao.buscarPendentes(authId).forEach(this::atualizar); // sem webhook (dev), a própria tela confirma

        Map<String, Object> r = new LinkedHashMap<>();
        Situacao s = situacao(u);
        r.put("situacao", s);
        r.put("planos", planos());
        r.put("dias_teste", DIAS_TESTE);
        r.put("teste_disponivel", s != null && u.getTeste_inicio() == null && s != Situacao.ATIVO);
        r.put("teste_fim", u.getTeste_fim());
        r.put("tem_time", u.getTime() != null);
        r.put("pagamento_simulado", pix.simulado());

        Assinatura v = vigente(authId);
        if (v != null) {
            r.put("plano", v.getPlano().name());
            r.put("valida_ate", v.getValida_ate());
            r.put("limite_atletas", v.getPlano().limiteAtletas);
            r.put("ia", v.getPlano().ia);
            if (u.getTime() != null)
                r.put("atletas", usuarioDAO.buscarPorTimeTipo(u.getTime().getId_time(), 3).size());
        }
        LocalDateTime agora = LocalDateTime.now();
        dao.buscarPendentes(authId).stream()
            .filter(p -> p.getPix_expira() != null && p.getPix_expira().isAfter(agora))
            .findFirst()
            .ifPresent(p -> r.put("pix", p));
        return r;
    }
}
