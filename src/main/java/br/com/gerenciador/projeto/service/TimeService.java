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

    // Dados sensíveis (CPF, endereço, contatos de responsáveis) são removidos
    // para quem não é Admin/Treinador nem o próprio membro — mesmo criterio
    // usado em UsuarioService.listarTodos.
    public List<Usuario> listarMembros(Integer id, Integer authTipo, Integer authId) {
        List<Usuario> membros = buscarPorId(id).getMembros();
        Integer meuTime = AuthUtil.timeDoUsuario(authId, usuarioDAO);
        membros.forEach(u -> UsuarioService.sanitizarParaListagem(u, authId, authTipo, meuTime));
        return membros;
    }

    // Somente Admin cria/edita/exclui times (o cadastro de time é uma ação administrativa).
    public Time criar(Time time, Integer authTipo) {
        if (!AuthUtil.ehAdmin(authTipo))
            throw new ForbiddenException("Somente Admin pode cadastrar times.");
        if (time.getAtivo_time() == null) time.setAtivo_time(1);
        if (time.getTreinador() != null && time.getTreinador().getId_usuario() != null)
            usuarioDAO.findById(time.getTreinador().getId_usuario()).ifPresent(time::setTreinador);
        Time salvo = timeDAO.save(time);
        vincularTreinadorAoTime(salvo);
        return salvo;
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
        Time salvo = timeDAO.save(t);
        vincularTreinadorAoTime(salvo);
        return salvo;
    }

    /**
     * As permissões de treinador (AuthUtil.podeGerenciarTime) valem para o time
     * de que ele é MEMBRO. O treinador responsável que ainda não está em time
     * nenhum vira membro deste — senão ele enxerga o time mas leva 403 em tudo.
     * Quem já é membro de outro time não é movido (um usuário tem um time só);
     * para isso existe o "Atribuir Time" do Painel Admin.
     */
    private void vincularTreinadorAoTime(Time time) {
        Usuario treinador = time.getTreinador();
        if (treinador != null && AuthUtil.ehTreinador(treinador.getTipo_usuario()) && treinador.getTime() == null) {
            treinador.setTime(time);
            usuarioDAO.save(treinador);
        }
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
