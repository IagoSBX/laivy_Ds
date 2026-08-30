package br.com.gerenciador.projeto.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import br.com.gerenciador.projeto.DAO.DesempenhoDAO;
import br.com.gerenciador.projeto.DAO.IUsuario;
import br.com.gerenciador.projeto.exception.BadRequestException;
import br.com.gerenciador.projeto.exception.ForbiddenException;
import br.com.gerenciador.projeto.exception.NotFoundException;
import br.com.gerenciador.projeto.model.Desempenho;
import br.com.gerenciador.projeto.model.Usuario;
import br.com.gerenciador.projeto.security.AuthUtil;

@Service
public class DesempenhoService {

    @Autowired private DesempenhoDAO desempenhoDAO;
    @Autowired private IUsuario usuarioDAO;

    private static Integer idTime(Desempenho d) {
        return d.getUsuario() != null && d.getUsuario().getTime() != null
            ? d.getUsuario().getTime().getId_time() : null;
    }

    public List<Desempenho> listarTodos(Integer idTime) {
        if (idTime != null) return desempenhoDAO.buscarPorTime(idTime);
        return desempenhoDAO.findAll();
    }

    public Desempenho buscarPorId(Integer id) {
        return desempenhoDAO.findById(id)
            .orElseThrow(() -> new NotFoundException("Desempenho nao encontrado."));
    }

    public List<Desempenho> buscarPorUsuario(Integer id) {
        return desempenhoDAO.buscarPorUsuario(id);
    }

    // Somente Admin/Treinador cadastram desempenho; Treinador só para atletas do próprio time.
    public Desempenho cadastrar(Desempenho desempenho, Integer authTipo, Integer authId) {
        if (desempenho.getUsuario() == null || desempenho.getUsuario().getId_usuario() == null)
            throw new BadRequestException("Usuario obrigatorio.");
        Usuario u = usuarioDAO.findById(desempenho.getUsuario().getId_usuario())
            .orElseThrow(() -> new NotFoundException("Usuario nao encontrado."));
        Integer idTimeAlvo = u.getTime() != null ? u.getTime().getId_time() : null;
        if (!AuthUtil.podeGerenciarTime(authTipo, authId, idTimeAlvo, usuarioDAO))
            throw new ForbiddenException("Sem permissao para cadastrar desempenho para este usuario.");
        desempenho.setUsuario(u);
        return desempenhoDAO.save(desempenho);
    }

    public Desempenho atualizar(Integer id, Desempenho dados, Integer authTipo, Integer authId) {
        Desempenho d = buscarPorId(id);
        if (!AuthUtil.podeGerenciarTime(authTipo, authId, idTime(d), usuarioDAO))
            throw new ForbiddenException("Sem permissao para editar este desempenho.");

        if (dados.getData_desempenho()  != null) d.setData_desempenho(dados.getData_desempenho());
        if (dados.getPosicao_usuario()  != null) d.setPosicao_usuario(dados.getPosicao_usuario());
        if (dados.getSalto_horizontal() != null) d.setSalto_horizontal(dados.getSalto_horizontal());
        if (dados.getSalto_vertical()   != null) d.setSalto_vertical(dados.getSalto_vertical());
        if (dados.getPontuacao()        != null) d.setPontuacao(dados.getPontuacao());
        if (dados.getUsuario() != null && dados.getUsuario().getId_usuario() != null)
            usuarioDAO.findById(dados.getUsuario().getId_usuario()).ifPresent(d::setUsuario);
        return desempenhoDAO.save(d);
    }

    public void deletar(Integer id, Integer authTipo, Integer authId) {
        Desempenho d = buscarPorId(id);
        if (!AuthUtil.podeGerenciarTime(authTipo, authId, idTime(d), usuarioDAO))
            throw new ForbiddenException("Sem permissao para excluir este desempenho.");
        desempenhoDAO.deleteById(id);
    }
}
