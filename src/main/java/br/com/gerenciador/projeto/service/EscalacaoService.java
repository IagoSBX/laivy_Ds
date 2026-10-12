package br.com.gerenciador.projeto.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.gerenciador.projeto.DAO.AtividadeDAO;
import br.com.gerenciador.projeto.DAO.EscalacaoDAO;
import br.com.gerenciador.projeto.DAO.IUsuario;
import br.com.gerenciador.projeto.exception.BadRequestException;
import br.com.gerenciador.projeto.exception.ForbiddenException;
import br.com.gerenciador.projeto.exception.NotFoundException;
import br.com.gerenciador.projeto.model.Atividade;
import br.com.gerenciador.projeto.model.Escalacao;
import br.com.gerenciador.projeto.security.AuthUtil;

@Service
public class EscalacaoService {

    @Autowired private EscalacaoDAO escalacaoDAO;
    @Autowired private AtividadeDAO atividadeDAO;
    @Autowired private IUsuario usuarioDAO;

    private static Integer idTime(Escalacao e) {
        return e.getAtividade() != null && e.getAtividade().getTime() != null
            ? e.getAtividade().getTime().getId_time() : null;
    }

    public List<Escalacao> buscarPorAtividade(Integer id, Integer authTipo, Integer authId) {
        Atividade atividade = atividadeDAO.findById(id)
            .orElseThrow(() -> new NotFoundException("Atividade nao encontrada."));
        Integer idTimeAlvo = atividade.getTime() != null ? atividade.getTime().getId_time() : null;
        if (!AuthUtil.ehMembroDoTime(authTipo, authId, idTimeAlvo, usuarioDAO))
            throw new ForbiddenException("Sem permissao para ver escalacoes desta atividade.");
        return escalacaoDAO.buscarPorAtividade(id);
    }

    /** Dois atletas escalados na mesma atividade não podem usar a mesma camisa. */
    private boolean numeroJaUsado(Integer idAtividade, Integer numero, Integer ignorarIdEscalacao) {
        return numero != null && escalacaoDAO.contarCamisa(idAtividade, numero, ignorarIdEscalacao) > 0;
    }

    private boolean posicaoJaUsada(Integer idAtividade, String posicao, Integer ignorar) {
        return posicao != null && !posicao.isBlank()
            && escalacaoDAO.contarPosicao(idAtividade, posicao.trim(), ignorar) > 0;
    }

    // Somente Admin/Treinador escalam jogadores; Treinador só para atividades do próprio time.
    @Transactional
    public Escalacao cadastrar(Escalacao esc, Integer authTipo, Integer authId) {
        if (esc.getAtividade() == null || esc.getAtividade().getId_atividade() == null)
            throw new BadRequestException("Atividade obrigatoria.");
        Atividade atividade = atividadeDAO.buscarPorIdComBloqueio(esc.getAtividade().getId_atividade())
            .orElseThrow(() -> new BadRequestException("Atividade nao encontrada."));
        Integer idTimeAlvo = atividade.getTime() != null ? atividade.getTime().getId_time() : null;
        if (!AuthUtil.podeGerenciarTime(authTipo, authId, idTimeAlvo, usuarioDAO))
            throw new ForbiddenException("Sem permissao para escalar jogadores nesta atividade.");
        if (esc.getNumero_camisa() != null
                && numeroJaUsado(atividade.getId_atividade(), esc.getNumero_camisa(), null))
            throw new BadRequestException(
                "Já existe um atleta escalado com a camisa " + esc.getNumero_camisa() + " nesta atividade.");
        if (Integer.valueOf(1).equals(esc.getTitular()) && posicaoJaUsada(atividade.getId_atividade(), esc.getPosicao(), null))
            throw new BadRequestException("Já existe um atleta escalado nesta posição nesta atividade.");
        esc.setAtividade(atividade);
        if (esc.getUsuario() != null && esc.getUsuario().getId_usuario() != null)
            usuarioDAO.findById(esc.getUsuario().getId_usuario()).ifPresent(esc::setUsuario);
        return escalacaoDAO.save(esc);
    }

    // atualiza pontos do jogador no jogo
    @Transactional
    public Escalacao atualizar(Integer id, Escalacao dados, Integer authTipo, Integer authId) {
        Escalacao e = escalacaoDAO.findById(id)
            .orElseThrow(() -> new NotFoundException("Escalacao nao encontrada."));
        if (!AuthUtil.podeGerenciarTime(authTipo, authId, idTime(e), usuarioDAO))
            throw new ForbiddenException("Sem permissao para editar esta escalacao.");
        atividadeDAO.buscarPorIdComBloqueio(e.getAtividade().getId_atividade());

        if (dados.getNumero_camisa() != null && !dados.getNumero_camisa().equals(e.getNumero_camisa())
                && numeroJaUsado(e.getAtividade().getId_atividade(), dados.getNumero_camisa(), e.getId_escalacao()))
            throw new BadRequestException(
                "Já existe um atleta escalado com a camisa " + dados.getNumero_camisa() + " nesta atividade.");

        Integer titularFinal = dados.getTitular() != null ? dados.getTitular() : e.getTitular();
        String posicaoFinal = dados.getPosicao() != null ? dados.getPosicao() : e.getPosicao();
        if (Integer.valueOf(1).equals(titularFinal)
                && posicaoJaUsada(e.getAtividade().getId_atividade(), posicaoFinal, e.getId_escalacao()))
            throw new BadRequestException("Já existe um atleta escalado nesta posição nesta atividade.");
        if (dados.getPontos_jogo()   != null) e.setPontos_jogo(dados.getPontos_jogo());
        if (dados.getPosicao()       != null) e.setPosicao(dados.getPosicao());
        if (dados.getNumero_camisa() != null) e.setNumero_camisa(dados.getNumero_camisa());
        if (dados.getTitular()       != null) e.setTitular(dados.getTitular());
        return escalacaoDAO.save(e);
    }

    public void deletar(Integer id, Integer authTipo, Integer authId) {
        Escalacao e = escalacaoDAO.findById(id)
            .orElseThrow(() -> new NotFoundException("Escalacao nao encontrada."));
        if (!AuthUtil.podeGerenciarTime(authTipo, authId, idTime(e), usuarioDAO))
            throw new ForbiddenException("Sem permissao para excluir esta escalacao.");
        escalacaoDAO.deleteById(id);
    }
}
