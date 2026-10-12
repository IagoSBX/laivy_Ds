package br.com.gerenciador.projeto.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import br.com.gerenciador.projeto.DAO.ExameDAO;
import br.com.gerenciador.projeto.DAO.IUsuario;
import br.com.gerenciador.projeto.exception.BadRequestException;
import br.com.gerenciador.projeto.exception.ForbiddenException;
import br.com.gerenciador.projeto.exception.NotFoundException;
import br.com.gerenciador.projeto.model.Exame;
import br.com.gerenciador.projeto.model.Usuario;
import br.com.gerenciador.projeto.security.AuthUtil;

@Service
public class ExameService {

    @Autowired private ExameDAO exameDAO;
    @Autowired private IUsuario usuarioDAO;

    /** Pode ver exames deste usuário: o próprio dono, Admin, ou Treinador do mesmo time. */
    private boolean podeVer(Usuario alvo, Integer authTipo, Integer authId) {
        if (authId != null && authId.equals(alvo.getId_usuario())) return true;
        return podeGerenciar(alvo, authTipo, authId);
    }

    /** Pode cadastrar/editar/excluir exames deste usuário: Admin, ou Treinador do mesmo time (não o próprio atleta). */
    private boolean podeGerenciar(Usuario alvo, Integer authTipo, Integer authId) {
        Integer idTimeAlvo = alvo.getTime() != null ? alvo.getTime().getId_time() : null;
        return AuthUtil.podeGerenciarTime(authTipo, authId, idTimeAlvo, usuarioDAO);
    }

    // dados de saude sensiveis: nunca listar tudo para quem nao for Admin.
    public List<Exame> listarTodos(Integer idTime, Integer authTipo, Integer authId) {
        if (AuthUtil.ehAdmin(authTipo))
            return idTime != null ? exameDAO.buscarPorTime(idTime) : exameDAO.findAll();

        if (AuthUtil.ehTreinador(authTipo)) {
            Integer meuTime = AuthUtil.timeDoUsuario(authId, usuarioDAO);
            if (meuTime == null) return List.of();
            if (idTime != null && !idTime.equals(meuTime))
                throw new ForbiddenException("Sem permissao para ver exames de outro time.");
            return exameDAO.buscarPorTime(meuTime);
        }

        // Atleta: somente os proprios exames.
        return authId != null ? exameDAO.buscarPorUsuario(authId) : List.of();
    }

    public Exame buscarPorId(Integer id, Integer authTipo, Integer authId) {
        Exame e = exameDAO.findById(id)
            .orElseThrow(() -> new NotFoundException("Exame nao encontrado."));
        if (!podeVer(e.getUsuario(), authTipo, authId))
            throw new ForbiddenException("Sem permissao para ver este exame.");
        return e;
    }

    public List<Exame> buscarPorUsuario(Integer id, Integer authTipo, Integer authId) {
        Usuario u = usuarioDAO.findById(id)
            .orElseThrow(() -> new NotFoundException("Usuario nao encontrado."));
        if (!podeVer(u, authTipo, authId))
            throw new ForbiddenException("Sem permissao para ver exames deste usuario.");
        return exameDAO.buscarPorUsuario(id);
    }

    /** A validade do exame não pode terminar antes de começar. */
    private static void validarPeriodo(LocalDate inicio, LocalDate fim) {
        if (inicio != null && fim != null && fim.isBefore(inicio))
            throw new BadRequestException("A data de fim do exame nao pode ser anterior a data de inicio.");
    }

    public Exame cadastrar(Exame exame, Integer authTipo, Integer authId) {
        if (exame.getUsuario() == null || exame.getUsuario().getId_usuario() == null)
            throw new BadRequestException("Usuario obrigatorio.");
        Usuario usuario = usuarioDAO.findById(exame.getUsuario().getId_usuario())
            .orElseThrow(() -> new BadRequestException("Usuario nao encontrado."));
        if (!podeGerenciar(usuario, authTipo, authId))
            throw new ForbiddenException("Sem permissao para cadastrar exame para este usuario.");
        validarPeriodo(exame.getData_inicio_exame(), exame.getData_fim_exame());
        exame.setUsuario(usuario);
        return exameDAO.save(exame);
    }

    public Exame atualizar(Integer id, Exame dados, Integer authTipo, Integer authId) {
        Exame e = exameDAO.findById(id)
            .orElseThrow(() -> new NotFoundException("Exame nao encontrado."));
        if (!podeGerenciar(e.getUsuario(), authTipo, authId))
            throw new ForbiddenException("Sem permissao para editar este exame.");

        validarPeriodo(dados.getData_inicio_exame() != null ? dados.getData_inicio_exame() : e.getData_inicio_exame(),
                       dados.getData_fim_exame()    != null ? dados.getData_fim_exame()    : e.getData_fim_exame());
        if (dados.getData_inicio_exame()      != null) e.setData_inicio_exame(dados.getData_inicio_exame());
        if (dados.getData_fim_exame()         != null) e.setData_fim_exame(dados.getData_fim_exame());
        if (dados.getObservacoes_exame()      != null) e.setObservacoes_exame(dados.getObservacoes_exame());
        if (dados.getAltura_usuario()         != null) e.setAltura_usuario(dados.getAltura_usuario());
        if (dados.getPeso_usuario()           != null) e.setPeso_usuario(dados.getPeso_usuario());
        if (dados.getTaxa_gordura_usuario()   != null) e.setTaxa_gordura_usuario(dados.getTaxa_gordura_usuario());
        if (dados.getStatus_usuario()         != null) e.setStatus_usuario(dados.getStatus_usuario());
        if (dados.getFoto_exame()             != null) e.setFoto_exame(dados.getFoto_exame());
        if (dados.getUsuario() != null && dados.getUsuario().getId_usuario() != null
                && AuthUtil.ehAdmin(authTipo)) {
            usuarioDAO.findById(dados.getUsuario().getId_usuario()).ifPresent(e::setUsuario);
        }
        return exameDAO.save(e);
    }

    public void deletar(Integer id, Integer authTipo, Integer authId) {
        Exame e = exameDAO.findById(id)
            .orElseThrow(() -> new NotFoundException("Exame nao encontrado."));
        if (!podeGerenciar(e.getUsuario(), authTipo, authId))
            throw new ForbiddenException("Sem permissao para excluir este exame.");
        exameDAO.deleteById(id);
    }
}
