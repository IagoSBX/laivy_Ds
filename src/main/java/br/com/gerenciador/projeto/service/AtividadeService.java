package br.com.gerenciador.projeto.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import br.com.gerenciador.projeto.DAO.AtividadeDAO;
import br.com.gerenciador.projeto.DAO.IUsuario;
import br.com.gerenciador.projeto.DAO.TimeDAO;
import br.com.gerenciador.projeto.exception.ForbiddenException;
import br.com.gerenciador.projeto.exception.NotFoundException;
import br.com.gerenciador.projeto.model.Atividade;
import br.com.gerenciador.projeto.model.Usuario;
import br.com.gerenciador.projeto.security.AuthUtil;

@Service
public class AtividadeService {

    @Autowired private AtividadeDAO atividadeDAO;
    @Autowired private IUsuario usuarioDAO;
    @Autowired private TimeDAO timeDAO;

    private static Integer idTime(Atividade a) {
        return a.getTime() != null ? a.getTime().getId_time() : null;
    }

    public List<Atividade> listarTodas(Integer idTime) {
        if (idTime != null) return atividadeDAO.buscarPorTime(idTime);
        return atividadeDAO.findAll();
    }

    public Atividade buscarPorId(Integer id) {
        return atividadeDAO.findById(id)
            .orElseThrow(() -> new NotFoundException("Atividade nao encontrada."));
    }

    public List<Atividade> buscarPorUsuario(Integer id) {
        return atividadeDAO.buscarPorUsuario(id);
    }

    public List<Atividade> buscarPorTipo(Integer tipo) {
        return atividadeDAO.buscarPorTipo(tipo);
    }

    public List<Atividade> buscarPorTime(Integer idTime) {
        return atividadeDAO.findAll().stream()
            .filter(a -> a.getTime() != null && a.getTime().getId_time().equals(idTime))
            .collect(Collectors.toList());
    }

    // Somente Admin/Treinador cadastram atividades; Treinador só para o próprio time.
    public Atividade cadastrar(Atividade atividade, Integer authTipo, Integer authId) {
        Integer idTimeDesejado = idTime(atividade);
        if (AuthUtil.ehTreinador(authTipo)) {
            // Treinador só pode cadastrar atividade para o próprio time.
            Integer meuTime = AuthUtil.timeDoUsuario(authId, usuarioDAO);
            if (meuTime == null || (idTimeDesejado != null && !idTimeDesejado.equals(meuTime)))
                throw new ForbiddenException("Sem permissao para cadastrar atividade para este time.");
            idTimeDesejado = meuTime;
        } else if (!AuthUtil.ehAdmin(authTipo)) {
            throw new ForbiddenException("Somente Admin ou Treinador podem cadastrar atividades.");
        }

        if (atividade.getUsuario() != null && atividade.getUsuario().getId_usuario() != null) {
            Usuario u = usuarioDAO.findById(atividade.getUsuario().getId_usuario())
                .orElseThrow(() -> new NotFoundException("Usuario nao encontrado."));
            atividade.setUsuario(u);
        }
        if (idTimeDesejado != null) {
            Integer idTimeFinal = idTimeDesejado;
            timeDAO.findById(idTimeFinal).ifPresent(atividade::setTime);
        }
        return atividadeDAO.save(atividade);
    }

    public Atividade atualizar(Integer id, Atividade dados, Integer authTipo, Integer authId) {
        Atividade a = buscarPorId(id);
        if (!AuthUtil.podeGerenciarTime(authTipo, authId, idTime(a), usuarioDAO))
            throw new ForbiddenException("Sem permissao para editar esta atividade.");

        if (dados.getNome_atividade()   != null) a.setNome_atividade(dados.getNome_atividade());
        if (dados.getLugar_atividade()  != null) a.setLugar_atividade(dados.getLugar_atividade());
        if (dados.getData_atividade()   != null) a.setData_atividade(dados.getData_atividade());
        if (dados.getTipo_atividade()   != null) a.setTipo_atividade(dados.getTipo_atividade());
        if (dados.getStatus_atividade() != null) a.setStatus_atividade(dados.getStatus_atividade());
        if (dados.getTime_oponente()    != null) a.setTime_oponente(dados.getTime_oponente());
        if (dados.getPlacar_pro()       != null) a.setPlacar_pro(dados.getPlacar_pro());
        if (dados.getPlacar_contra()    != null) a.setPlacar_contra(dados.getPlacar_contra());
        if (dados.getRecorrente()       != null) a.setRecorrente(dados.getRecorrente());
        if (dados.getFim_recorrencia()  != null) a.setFim_recorrencia(dados.getFim_recorrencia());
        if (dados.getUsuario() != null && dados.getUsuario().getId_usuario() != null)
            usuarioDAO.findById(dados.getUsuario().getId_usuario()).ifPresent(a::setUsuario);
        // Só Admin pode mover a atividade para outro time.
        if (dados.getTime() != null && dados.getTime().getId_time() != null && AuthUtil.ehAdmin(authTipo))
            timeDAO.findById(dados.getTime().getId_time()).ifPresent(a::setTime);
        return atividadeDAO.save(a);
    }

    public void deletar(Integer id, Integer authTipo, Integer authId) {
        Atividade a = buscarPorId(id);
        if (!AuthUtil.podeGerenciarTime(authTipo, authId, idTime(a), usuarioDAO))
            throw new ForbiddenException("Sem permissao para excluir esta atividade.");
        atividadeDAO.deleteById(id);
    }
}
