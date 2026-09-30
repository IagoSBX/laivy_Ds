package br.com.gerenciador.projeto.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import br.com.gerenciador.projeto.DAO.CalendarioDAO;
import br.com.gerenciador.projeto.DAO.IUsuario;
import br.com.gerenciador.projeto.DAO.VisitanteDAO;
import br.com.gerenciador.projeto.exception.BadRequestException;
import br.com.gerenciador.projeto.exception.ForbiddenException;
import br.com.gerenciador.projeto.exception.NotFoundException;
import br.com.gerenciador.projeto.model.Calendario;
import br.com.gerenciador.projeto.model.Visitante;
import br.com.gerenciador.projeto.security.AuthUtil;

@Service
public class VisitanteService {

    @Autowired private VisitanteDAO visitanteDAO;
    @Autowired private CalendarioDAO calendarioDAO;
    @Autowired private IUsuario usuarioDAO;

    private static Integer idTime(Visitante v) {
        if (v.getCalendario() == null || v.getCalendario().getAtividade() == null) return null;
        return v.getCalendario().getAtividade().getTime() != null
            ? v.getCalendario().getAtividade().getTime().getId_time() : null;
    }

    private Visitante buscar(Integer id) {
        return visitanteDAO.findById(id)
            .orElseThrow(() -> new NotFoundException("Visitante nao encontrado."));
    }

    // Admin ve qualquer time; Treinador/Atleta somente o proprio.
    public List<Visitante> listarTodos(Integer idTime, Integer authTipo, Integer authId) {
        if (AuthUtil.ehAdmin(authTipo))
            return idTime != null ? visitanteDAO.buscarPorTime(idTime) : visitanteDAO.findAll();

        Integer meuTime = AuthUtil.timeDoUsuario(authId, usuarioDAO);
        if (meuTime == null) return List.of();
        if (idTime != null && !idTime.equals(meuTime))
            throw new ForbiddenException("Sem permissao para ver visitantes de outro time.");
        return visitanteDAO.buscarPorTime(meuTime);
    }

    public Visitante buscarPorId(Integer id, Integer authTipo, Integer authId) {
        Visitante v = buscar(id);
        if (!AuthUtil.ehMembroDoTime(authTipo, authId, idTime(v), usuarioDAO))
            throw new ForbiddenException("Sem permissao para ver este visitante.");
        return v;
    }

    public List<Visitante> buscarPorCalendario(Integer id, Integer authTipo, Integer authId) {
        Calendario c = calendarioDAO.findById(id)
            .orElseThrow(() -> new NotFoundException("Calendario nao encontrado."));
        Integer idTimeAlvo = c.getAtividade() != null && c.getAtividade().getTime() != null
            ? c.getAtividade().getTime().getId_time() : null;
        if (!AuthUtil.ehMembroDoTime(authTipo, authId, idTimeAlvo, usuarioDAO))
            throw new ForbiddenException("Sem permissao para ver visitantes deste calendario.");
        return visitanteDAO.buscarPorCalendario(id);
    }

    public Visitante cadastrar(Visitante visitante, Integer authTipo, Integer authId) {
        if (visitante.getCalendario() != null && visitante.getCalendario().getId_calendario() != null) {
            Calendario c = calendarioDAO.findById(visitante.getCalendario().getId_calendario())
                .orElseThrow(() -> new BadRequestException("Calendario nao encontrado."));
            visitante.setCalendario(c);
        }
        if (!AuthUtil.podeGerenciarTime(authTipo, authId, idTime(visitante), usuarioDAO))
            throw new ForbiddenException("Sem permissao para cadastrar este visitante.");
        return visitanteDAO.save(visitante);
    }

    public Visitante atualizar(Integer id, Visitante dados, Integer authTipo, Integer authId) {
        Visitante v = buscar(id);
        if (!AuthUtil.podeGerenciarTime(authTipo, authId, idTime(v), usuarioDAO))
            throw new ForbiddenException("Sem permissao para editar este visitante.");

        if (dados.getNome_visitante()      != null) v.setNome_visitante(dados.getNome_visitante());
        if (dados.getMunicipio_visitante() != null) v.setMunicipio_visitante(dados.getMunicipio_visitante());
        if (dados.getCalendario() != null && dados.getCalendario().getId_calendario() != null)
            calendarioDAO.findById(dados.getCalendario().getId_calendario()).ifPresent(v::setCalendario);
        return visitanteDAO.save(v);
    }

    public void deletar(Integer id, Integer authTipo, Integer authId) {
        Visitante v = buscar(id);
        if (!AuthUtil.podeGerenciarTime(authTipo, authId, idTime(v), usuarioDAO))
            throw new ForbiddenException("Sem permissao para excluir este visitante.");
        visitanteDAO.deleteById(id);
    }
}
