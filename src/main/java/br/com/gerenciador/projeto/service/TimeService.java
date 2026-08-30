package br.com.gerenciador.projeto.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import br.com.gerenciador.projeto.DAO.IUsuario;
import br.com.gerenciador.projeto.DAO.TimeDAO;
import br.com.gerenciador.projeto.exception.ForbiddenException;
import br.com.gerenciador.projeto.exception.NotFoundException;
import br.com.gerenciador.projeto.model.Time;
import br.com.gerenciador.projeto.model.Usuario;
import br.com.gerenciador.projeto.security.AuthUtil;

@Service
public class TimeService {

    @Autowired private TimeDAO timeDAO;
    @Autowired private IUsuario usuarioDAO;

    public List<Time> listarTodos() {
        return timeDAO.findAll();
    }

    public List<Time> listarAtivos() {
        return timeDAO.findByAtivo_time(1);
    }

    public Time buscarPorId(Integer id) {
        return timeDAO.findById(id)
            .orElseThrow(() -> new NotFoundException("Time nao encontrado."));
    }

    public List<Usuario> listarMembros(Integer id) {
        return buscarPorId(id).getMembros();
    }

    // Somente Admin cria/edita/exclui times (o cadastro de time é uma ação administrativa).
    public Time criar(Time time, Integer authTipo) {
        if (!AuthUtil.ehAdmin(authTipo))
            throw new ForbiddenException("Somente Admin pode cadastrar times.");
        if (time.getAtivo_time() == null) time.setAtivo_time(1);
        if (time.getTreinador() != null && time.getTreinador().getId_usuario() != null)
            usuarioDAO.findById(time.getTreinador().getId_usuario()).ifPresent(time::setTreinador);
        return timeDAO.save(time);
    }

    public Time atualizar(Integer id, Time dados, Integer authTipo) {
        if (!AuthUtil.ehAdmin(authTipo))
            throw new ForbiddenException("Somente Admin pode editar times.");
        Time t = buscarPorId(id);
        if (dados.getNome_time()       != null) t.setNome_time(dados.getNome_time());
        if (dados.getModalidade_time() != null) t.setModalidade_time(dados.getModalidade_time());
        if (dados.getCategoria_time()  != null) t.setCategoria_time(dados.getCategoria_time());
        if (dados.getCor_time()        != null) t.setCor_time(dados.getCor_time());
        if (dados.getDescricao_time()  != null) t.setDescricao_time(dados.getDescricao_time());
        if (dados.getAtivo_time()      != null) t.setAtivo_time(dados.getAtivo_time());
        if (dados.getLogo_time()       != null) t.setLogo_time(dados.getLogo_time());
        if (dados.getTreinador() != null && dados.getTreinador().getId_usuario() != null)
            usuarioDAO.findById(dados.getTreinador().getId_usuario()).ifPresent(t::setTreinador);
        return timeDAO.save(t);
    }

    // Admin gerencia qualquer time; Treinador só o próprio.
    public Usuario adicionarMembro(Integer id, Integer idUsuario, Integer authTipo, Integer authId) {
        if (!AuthUtil.podeGerenciarTime(authTipo, authId, id, usuarioDAO))
            throw new ForbiddenException("Sem permissao para gerenciar membros deste time.");
        Usuario u = usuarioDAO.findById(idUsuario)
            .orElseThrow(() -> new NotFoundException("Usuario nao encontrado."));
        timeDAO.findById(id).ifPresent(u::setTime);
        return usuarioDAO.save(u);
    }

    public void removerMembro(Integer id, Integer idUsuario, Integer authTipo, Integer authId) {
        if (!AuthUtil.podeGerenciarTime(authTipo, authId, id, usuarioDAO))
            throw new ForbiddenException("Sem permissao para gerenciar membros deste time.");
        Usuario u = usuarioDAO.findById(idUsuario)
            .orElseThrow(() -> new NotFoundException("Usuario nao encontrado."));
        u.setTime(null);
        usuarioDAO.save(u);
    }

    public void deletar(Integer id, Integer authTipo) {
        if (!AuthUtil.ehAdmin(authTipo))
            throw new ForbiddenException("Somente Admin pode excluir times.");
        if (!timeDAO.existsById(id)) throw new NotFoundException("Time nao encontrado.");
        timeDAO.deleteById(id);
    }
}
