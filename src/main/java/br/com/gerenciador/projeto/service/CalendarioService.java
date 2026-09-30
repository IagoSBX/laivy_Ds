package br.com.gerenciador.projeto.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import br.com.gerenciador.projeto.DAO.AtividadeDAO;
import br.com.gerenciador.projeto.DAO.CalendarioDAO;
import br.com.gerenciador.projeto.DAO.IUsuario;
import br.com.gerenciador.projeto.exception.BadRequestException;
import br.com.gerenciador.projeto.exception.ForbiddenException;
import br.com.gerenciador.projeto.exception.NotFoundException;
import br.com.gerenciador.projeto.model.Atividade;
import br.com.gerenciador.projeto.model.Calendario;
import br.com.gerenciador.projeto.model.Usuario;
import br.com.gerenciador.projeto.security.AuthUtil;

@Service
public class CalendarioService {

    @Autowired private CalendarioDAO calendarioDAO;
    @Autowired private IUsuario usuarioDAO;
    @Autowired private AtividadeDAO atividadeDAO;

    private static Integer idTime(Calendario c) {
        if (c.getAtividade() != null && c.getAtividade().getTime() != null)
            return c.getAtividade().getTime().getId_time();
        if (c.getUsuario() != null && c.getUsuario().getTime() != null)
            return c.getUsuario().getTime().getId_time();
        return null;
    }

    private Calendario buscar(Integer id) {
        return calendarioDAO.findById(id)
            .orElseThrow(() -> new NotFoundException("Registro de calendario nao encontrado."));
    }

    // Admin ve qualquer time; Treinador/Atleta somente o proprio (sem filtro no DAO: restringe apos buscar).
    public List<Calendario> listarTodos(Integer authTipo, Integer authId) {
        List<Calendario> lista = calendarioDAO.findAll();
        if (AuthUtil.ehAdmin(authTipo)) return lista;

        Integer meuTime = AuthUtil.timeDoUsuario(authId, usuarioDAO);
        if (meuTime == null) return List.of();
        return lista.stream()
            .filter(c -> meuTime.equals(idTime(c)))
            .collect(java.util.stream.Collectors.toList());
    }

    public Calendario buscarPorId(Integer id, Integer authTipo, Integer authId) {
        Calendario c = buscar(id);
        if (!AuthUtil.ehMembroDoTime(authTipo, authId, idTime(c), usuarioDAO))
            throw new ForbiddenException("Sem permissao para ver este registro de calendario.");
        return c;
    }

    public List<Calendario> buscarPorUsuario(Integer id, Integer authTipo, Integer authId) {
        Usuario alvo = usuarioDAO.findById(id)
            .orElseThrow(() -> new NotFoundException("Usuario nao encontrado."));
        Integer idTimeAlvo = alvo.getTime() != null ? alvo.getTime().getId_time() : null;
        if (!AuthUtil.ehMembroDoTime(authTipo, authId, idTimeAlvo, usuarioDAO))
            throw new ForbiddenException("Sem permissao para ver o calendario deste usuario.");
        return calendarioDAO.buscarPorUsuario(id);
    }

    public List<Calendario> buscarPorAtividade(Integer id, Integer authTipo, Integer authId) {
        Atividade atividade = atividadeDAO.findById(id)
            .orElseThrow(() -> new NotFoundException("Atividade nao encontrada."));
        Integer idTimeAlvo = atividade.getTime() != null ? atividade.getTime().getId_time() : null;
        if (!AuthUtil.ehMembroDoTime(authTipo, authId, idTimeAlvo, usuarioDAO))
            throw new ForbiddenException("Sem permissao para ver o calendario desta atividade.");
        return calendarioDAO.buscarPorAtividade(id);
    }

    public Calendario cadastrar(Calendario calendario, Integer authTipo, Integer authId) {
        if (calendario.getUsuario() != null && calendario.getUsuario().getId_usuario() != null) {
            Usuario u = usuarioDAO.findById(calendario.getUsuario().getId_usuario())
                .orElseThrow(() -> new BadRequestException("Usuario nao encontrado."));
            calendario.setUsuario(u);
        }
        if (calendario.getAtividade() != null && calendario.getAtividade().getId_atividade() != null) {
            Atividade a = atividadeDAO.findById(calendario.getAtividade().getId_atividade())
                .orElseThrow(() -> new BadRequestException("Atividade nao encontrada."));
            calendario.setAtividade(a);
        }
        if (!AuthUtil.podeGerenciarTime(authTipo, authId, idTime(calendario), usuarioDAO))
            throw new ForbiddenException("Sem permissao para cadastrar este registro de calendario.");
        return calendarioDAO.save(calendario);
    }

    public Calendario atualizar(Integer id, Calendario dados, Integer authTipo, Integer authId) {
        Calendario c = buscar(id);
        if (!AuthUtil.podeGerenciarTime(authTipo, authId, idTime(c), usuarioDAO))
            throw new ForbiddenException("Sem permissao para editar este registro de calendario.");

        if (dados.getObservacoes()   != null) c.setObservacoes(dados.getObservacoes());
        if (dados.getPlacar_pro()    != null) c.setPlacar_pro(dados.getPlacar_pro());
        if (dados.getPlacar_contra() != null) c.setPlacar_contra(dados.getPlacar_contra());
        if (dados.getUsuario() != null && dados.getUsuario().getId_usuario() != null)
            usuarioDAO.findById(dados.getUsuario().getId_usuario()).ifPresent(c::setUsuario);
        if (dados.getAtividade() != null && dados.getAtividade().getId_atividade() != null)
            atividadeDAO.findById(dados.getAtividade().getId_atividade()).ifPresent(c::setAtividade);
        return calendarioDAO.save(c);
    }

    public void deletar(Integer id, Integer authTipo, Integer authId) {
        Calendario c = buscar(id);
        if (!AuthUtil.podeGerenciarTime(authTipo, authId, idTime(c), usuarioDAO))
            throw new ForbiddenException("Sem permissao para excluir este registro de calendario.");
        calendarioDAO.deleteById(id);
    }
}
