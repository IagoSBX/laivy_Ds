package br.com.gerenciador.projeto.service;

import br.com.gerenciador.projeto.DAO.AtividadeJogadaDAO;
import br.com.gerenciador.projeto.DAO.JogadaDAO;
import br.com.gerenciador.projeto.DAO.JogadaVisualizacaoDAO;
import br.com.gerenciador.projeto.dto.JogadaDTOs.*;
import br.com.gerenciador.projeto.model.*;
import br.com.gerenciador.projeto.model.json.JogadaConteudo;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class JogadaService {

    private final JogadaDAO jogadas;
    private final AtividadeJogadaDAO vinculos;
    private final JogadaVisualizacaoDAO visualizacoes;
    private final MigradorJogadaService migrador;
    private final ValidadorJogadaService validador;

    public JogadaService(JogadaDAO jogadas,
                         AtividadeJogadaDAO vinculos,
                         JogadaVisualizacaoDAO visualizacoes,
                         MigradorJogadaService migrador,
                         ValidadorJogadaService validador) {
        this.jogadas = jogadas;
        this.vinculos = vinculos;
        this.visualizacoes = visualizacoes;
        this.migrador = migrador;
        this.validador = validador;
    }

    @Transactional(readOnly = true)
    public Page<ItemBiblioteca> biblioteca(Integer idTime, String tipo, String busca, Pageable p) {
        return jogadas.listarBiblioteca(idTime, vazioParaNulo(tipo), vazioParaNulo(busca), p)
                .map(r -> new ItemBiblioteca(r.getId(), r.getNome(), r.getTipo(),
                        r.getQtdFrames(), r.getEnquadramento(), r.getAtualizadoEm(),
                        r.getPrimeiroFrame()));
    }

    @Transactional(readOnly = true)
    public JogadaResponse buscar(Integer id, Integer idTime) {
        var j = carregar(id, idTime);
        return JogadaResponse.de(j, migrador.migrar(j.getConteudo()));
    }

    /** Usado pela exportação e pelo modo leitura: já devolve migrado. */
    @Transactional(readOnly = true)
    public Jogada carregar(Integer id, Integer idTime) {
        return jogadas.findByIdAndTimeId(id, idTime)
                .orElseThrow(() -> new EntityNotFoundException("Jogada " + id + " não encontrada."));
    }

    @Transactional
    public JogadaResponse criar(SalvarJogadaRequest req, Time time, Usuario criador) {
        exigirValida(req.conteudo());
        var j = new Jogada(time, criador, req.nome(), req.conteudo());
        jogadas.save(j);
        return JogadaResponse.de(j, j.getConteudo());
    }

    /**
     * A trava otimista é do JPA (@Version). Se outro usuário salvou antes,
     * o flush lança OptimisticLockException, tratada no controller como 409.
     */
    @Transactional
    public JogadaResponse atualizar(Integer id, Integer idTime, SalvarJogadaRequest req, Long versaoCliente) {
        var j = carregar(id, idTime);
        if (versaoCliente != null && !versaoCliente.equals(j.getVersao())) {
            throw new org.springframework.orm.ObjectOptimisticLockingFailureException(Jogada.class, id);
        }
        exigirValida(req.conteudo());
        j.setNome(req.nome());
        j.setConteudo(req.conteudo());
        jogadas.saveAndFlush(j);
        return JogadaResponse.de(j, j.getConteudo());
    }

    @Transactional
    public JogadaResponse duplicar(Integer id, Integer idTime, Usuario criador) {
        var origem = carregar(id, idTime);
        var copia = new Jogada(origem.getTime(), criador,
                origem.getNome() + " (cópia)", migrador.migrar(origem.getConteudo()));
        jogadas.save(copia);
        return JogadaResponse.de(copia, copia.getConteudo());
    }

    /**
     * Arquiva em vez de deletar: jogada apagada que está vinculada a um treino
     * do calendário quebraria o histórico da atividade.
     */
    @Transactional
    public void arquivar(Integer id, Integer idTime) {
        carregar(id, idTime).arquivar();
    }

    // ---- vínculo com o calendário -------------------------------------

    @Transactional
    public void vincular(Integer idJogada, Integer idTime, Atividade atividade, Integer ordem, String obs) {
        var j = carregar(idJogada, idTime);
        vinculos.save(new AtividadeJogada(atividade, j, ordem == null ? 0 : ordem, obs));
    }

    @Transactional
    public void desvincular(Integer idJogada, Integer idAtividade) {
        vinculos.deleteByAtividadeIdAndJogadaId(idAtividade, idJogada);
    }

    @Transactional(readOnly = true)
    public List<AtividadeJogada> daAtividade(Integer idAtividade) {
        return vinculos.findByAtividadeIdOrderByOrdemAsc(idAtividade);
    }

    @Transactional(readOnly = true)
    public List<VinculoAtividadeResponse> atividadesDaJogada(Integer idJogada) {
        return vinculos.findByJogadaId(idJogada).stream()
                .map(aj -> new VinculoAtividadeResponse(
                        aj.getAtividade().getId_atividade(),
                        aj.getAtividade().getNome_atividade(),
                        aj.getAtividade().getData_atividade()))
                .toList();
    }

    // ---- confirmação de leitura do atleta -----------------------------

    @Transactional
    public void registrarVisualizacao(Integer idJogada, Integer idAtividade, Integer idUsuario) {
        visualizacoes.save(new JogadaVisualizacao(idJogada, idAtividade, idUsuario));
    }

    @Transactional(readOnly = true)
    public List<JogadaVisualizacao> quemJaViu(Integer idJogada, Integer idAtividade) {
        return visualizacoes.daJogadaNaAtividade(idJogada, idAtividade);
    }

    // -------------------------------------------------------------------

    private void exigirValida(JogadaConteudo c) {
        var r = validador.validar(c);
        if (!r.valido()) throw new JogadaInvalidaException(r.erros());
    }

    private static String vazioParaNulo(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }

    public static class JogadaInvalidaException extends RuntimeException {
        private final List<String> erros;
        public JogadaInvalidaException(List<String> erros) {
            super("Jogada inválida: " + String.join(" | ", erros));
            this.erros = erros;
        }
        public List<String> getErros() { return erros; }
    }
}
