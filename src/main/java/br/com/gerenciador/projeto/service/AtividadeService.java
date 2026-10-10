package br.com.gerenciador.projeto.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import br.com.gerenciador.projeto.DAO.AtividadeDAO;
import br.com.gerenciador.projeto.DAO.IUsuario;
import br.com.gerenciador.projeto.DAO.TimeDAO;
import br.com.gerenciador.projeto.exception.ForbiddenException;
import br.com.gerenciador.projeto.exception.BadRequestException;
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

    private Atividade buscar(Integer id) {
        return atividadeDAO.findById(id)
            .orElseThrow(() -> new NotFoundException("Atividade nao encontrada."));
    }

    // Admin ve qualquer time; Treinador/Atleta somente o proprio.
    public List<Atividade> listarTodas(Integer idTime, Integer authTipo, Integer authId) {
        if (AuthUtil.ehAdmin(authTipo))
            return idTime != null ? atividadeDAO.buscarPorTime(idTime) : atividadeDAO.findAll();

        Integer meuTime = AuthUtil.timeDoUsuario(authId, usuarioDAO);
        if (meuTime == null) return List.of();
        if (idTime != null && !idTime.equals(meuTime))
            throw new ForbiddenException("Sem permissao para ver atividades de outro time.");
        return atividadeDAO.buscarPorTime(meuTime);
    }

    public Atividade buscarPorId(Integer id, Integer authTipo, Integer authId) {
        Atividade a = buscar(id);
        if (!AuthUtil.ehMembroDoTime(authTipo, authId, idTime(a), usuarioDAO))
            throw new ForbiddenException("Sem permissao para ver esta atividade.");
        return a;
    }

    public List<Atividade> buscarPorUsuario(Integer id, Integer authTipo, Integer authId) {
        Usuario alvo = usuarioDAO.findById(id)
            .orElseThrow(() -> new NotFoundException("Usuario nao encontrado."));
        Integer idTimeAlvo = alvo.getTime() != null ? alvo.getTime().getId_time() : null;
        if (!AuthUtil.ehMembroDoTime(authTipo, authId, idTimeAlvo, usuarioDAO))
            throw new ForbiddenException("Sem permissao para ver atividades deste usuario.");
        return atividadeDAO.buscarPorUsuario(id);
    }

    // Sem filtro de time no DAO: restringe ao proprio time apos buscar, exceto para Admin.
    public List<Atividade> buscarPorTipo(Integer tipo, Integer authTipo, Integer authId) {
        List<Atividade> lista = atividadeDAO.buscarPorTipo(tipo);
        if (AuthUtil.ehAdmin(authTipo)) return lista;

        Integer meuTime = AuthUtil.timeDoUsuario(authId, usuarioDAO);
        if (meuTime == null) return List.of();
        return lista.stream()
            .filter(a -> meuTime.equals(idTime(a)))
            .collect(Collectors.toList());
    }

    public List<Atividade> buscarPorTime(Integer idTime, Integer authTipo, Integer authId) {
        if (!AuthUtil.ehMembroDoTime(authTipo, authId, idTime, usuarioDAO))
            throw new ForbiddenException("Sem permissao para ver atividades de outro time.");
        return atividadeDAO.findAll().stream()
            .filter(a -> a.getTime() != null && a.getTime().getId_time().equals(idTime))
            .collect(Collectors.toList());
    }

    // Somente Admin/Treinador cadastram atividades; Treinador só para o próprio time.
    public Atividade cadastrar(Atividade atividade, Integer authTipo, Integer authId) {
        validarFormulario(atividade);
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
        Atividade a = buscar(id);
        if (!AuthUtil.podeGerenciarTime(authTipo, authId, idTime(a), usuarioDAO))
            throw new ForbiddenException("Sem permissao para editar esta atividade.");

        Atividade validacao = new Atividade();
        validacao.setData_atividade(dados.getData_atividade() != null ? dados.getData_atividade() : a.getData_atividade());
        validacao.setTipo_atividade(dados.getTipo_atividade() != null ? dados.getTipo_atividade() : a.getTipo_atividade());
        validacao.setTime_oponente(dados.getTipo_atividade() != null
            ? dados.getTime_oponente()
            : dados.getTime_oponente() != null ? dados.getTime_oponente() : a.getTime_oponente());
        validacao.setRecorrente(dados.getRecorrente() != null ? dados.getRecorrente() : a.getRecorrente());
        validacao.setFim_recorrencia(dados.getRecorrente() != null
            ? dados.getFim_recorrencia()
            : dados.getFim_recorrencia() != null ? dados.getFim_recorrencia() : a.getFim_recorrencia());
        validarFormulario(validacao);

        if (dados.getNome_atividade()   != null) a.setNome_atividade(dados.getNome_atividade());
        if (dados.getLugar_atividade()  != null) a.setLugar_atividade(dados.getLugar_atividade());
        if (dados.getData_atividade()   != null) a.setData_atividade(dados.getData_atividade());
        if (dados.getTipo_atividade()   != null) a.setTipo_atividade(dados.getTipo_atividade());
        if (dados.getStatus_atividade() != null) a.setStatus_atividade(dados.getStatus_atividade());
        if (Integer.valueOf(2).equals(validacao.getTipo_atividade())) {
            if (dados.getTipo_atividade() != null || dados.getTime_oponente() != null)
                a.setTime_oponente(dados.getTime_oponente());
        } else {
            a.setTime_oponente(null);
        }
        if (dados.getPlacar_pro()       != null) a.setPlacar_pro(dados.getPlacar_pro());
        if (dados.getPlacar_contra()    != null) a.setPlacar_contra(dados.getPlacar_contra());
        if (dados.getRecorrente()       != null) a.setRecorrente(dados.getRecorrente());
        if (Boolean.TRUE.equals(validacao.getRecorrente())) {
            if (dados.getRecorrente() != null) a.setFim_recorrencia(dados.getFim_recorrencia());
            else if (dados.getFim_recorrencia() != null) a.setFim_recorrencia(dados.getFim_recorrencia());
        } else {
            a.setFim_recorrencia(null);
        }
        if (dados.getUsuario() != null && dados.getUsuario().getId_usuario() != null)
            usuarioDAO.findById(dados.getUsuario().getId_usuario()).ifPresent(a::setUsuario);
        // Só Admin pode mover a atividade para outro time.
        if (dados.getTime() != null && dados.getTime().getId_time() != null && AuthUtil.ehAdmin(authTipo))
            timeDAO.findById(dados.getTime().getId_time()).ifPresent(a::setTime);
        return atividadeDAO.save(a);
    }

    private static void validarFormulario(Atividade atividade) {
        if (atividade.getData_atividade() == null)
            throw new BadRequestException("Data e hora da atividade são obrigatórias.");
        if (Integer.valueOf(2).equals(atividade.getTipo_atividade())
                && (atividade.getTime_oponente() == null || atividade.getTime_oponente().isBlank()))
            throw new BadRequestException("Informe o adversário para atividades do tipo jogo.");
        if (Boolean.TRUE.equals(atividade.getRecorrente()) && atividade.getFim_recorrencia() != null
                && atividade.getFim_recorrencia().isBefore(atividade.getData_atividade().toLocalDate()))
            throw new BadRequestException("A data final da recorrência não pode ser anterior à primeira atividade.");
    }

    public void deletar(Integer id, Integer authTipo, Integer authId) {
        Atividade a = buscar(id);
        if (!AuthUtil.podeGerenciarTime(authTipo, authId, idTime(a), usuarioDAO))
            throw new ForbiddenException("Sem permissao para excluir esta atividade.");
        atividadeDAO.deleteById(id);
    }
}
