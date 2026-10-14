package br.com.gerenciador.projeto.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.gerenciador.projeto.DAO.IUsuario;
import br.com.gerenciador.projeto.DAO.LogAuditoriaDAO;
import br.com.gerenciador.projeto.model.LogAuditoria;
import br.com.gerenciador.projeto.model.Time;
import br.com.gerenciador.projeto.model.Usuario;
import jakarta.persistence.criteria.Predicate;

/**
 * Log de atividades do sistema. A gravação é assíncrona (o usuário não espera
 * por ela) e nunca derruba a requisição: se falhar, só vai para o log do servidor.
 */
@Service
public class AuditoriaService {

    private static final Logger log = LoggerFactory.getLogger(AuditoriaService.class);

    /** Ação registrada. nomeFixo substitui a busca do usuário (ex.: "Assistente IA"). */
    public record Evento(LocalDateTime quando, Integer idUsuario, String nomeFixo,
                         String acao, String descricao, String recurso, Integer idRecurso, String detalhe,
                         String metodo, String caminho, Integer status, boolean sucesso, String ip) {}

    @Autowired private LogAuditoriaDAO dao;
    @Autowired private IUsuario usuarioDAO;

    @Value("${auditoria.retencao-dias:180}")
    private int retencaoDias;

    @Async
    @Transactional
    public void registrar(Evento e) {
        try {
            LogAuditoria l = new LogAuditoria();
            l.setData_hora(e.quando());
            l.setId_usuario(e.idUsuario());
            l.setNome_usuario(e.nomeFixo());
            if (e.idUsuario() != null) {
                usuarioDAO.findById(e.idUsuario()).ifPresent(u -> preencherUsuario(l, u, e.nomeFixo()));
            }
            l.setAcao(e.acao());
            l.setDescricao(cortar(e.descricao(), 255));
            l.setRecurso(e.recurso());
            l.setId_recurso(e.idRecurso());
            l.setDetalhe(cortar(e.detalhe(), 255));
            l.setMetodo(e.metodo());
            l.setCaminho(cortar(e.caminho(), 255));
            l.setStatus_http(e.status());
            l.setSucesso(e.sucesso());
            l.setIp(cortar(e.ip(), 45));
            dao.save(l);
        } catch (Exception ex) {
            log.warn("Falha ao gravar o log de auditoria ({}): {}", e.descricao(), ex.toString());
        }
    }

    private static void preencherUsuario(LogAuditoria l, Usuario u, String nomeFixo) {
        if (nomeFixo == null) l.setNome_usuario(u.getNome_usuario());
        l.setTipo_usuario(u.getTipo_usuario());
        Time t = u.getTime();
        l.setId_time(t != null ? t.getId_time() : null);
    }

    /** Consulta paginada, mais recentes primeiro. Todos os filtros são opcionais. */
    @Transactional(readOnly = true)
    public Page<LogAuditoria> listar(Integer idUsuario, String acao, Integer idTime, String busca,
                                     LocalDate de, LocalDate ate, int pagina, int tamanho) {
        Specification<LogAuditoria> filtro = (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            if (idUsuario != null) p.add(cb.equal(root.get("id_usuario"), idUsuario));
            if (acao != null && !acao.isBlank()) p.add(cb.equal(root.get("acao"), acao));
            if (idTime != null) p.add(cb.equal(root.get("id_time"), idTime));
            if (busca != null && !busca.isBlank()) {
                String like = "%" + busca.trim().toLowerCase().replace("%", "\\%").replace("_", "\\_") + "%";
                p.add(cb.or(cb.like(cb.lower(root.get("nome_usuario")), like),
                            cb.like(cb.lower(root.get("descricao")), like)));
            }
            if (de != null) p.add(cb.greaterThanOrEqualTo(root.get("data_hora"), de.atStartOfDay()));
            if (ate != null) p.add(cb.lessThan(root.get("data_hora"), ate.plusDays(1).atStartOfDay()));
            // ordem aqui e não no PageRequest: o Sort do Spring Data lê "_" como
            // separador de propriedade e procuraria um campo "id" inexistente
            query.orderBy(cb.desc(root.get("id_log")));
            return cb.and(p.toArray(new Predicate[0]));
        };
        int tam = Math.max(1, Math.min(tamanho, 100));
        return dao.findAll(filtro, PageRequest.of(Math.max(pagina, 0), tam));
    }

    /** Retenção: todo dia às 3h30 apaga o que passou do prazo (padrão 180 dias). */
    @Scheduled(cron = "0 30 3 * * *")
    public void limparAntigos() {
        int apagados = dao.apagarAntesDe(LocalDateTime.now().minusDays(retencaoDias));
        if (apagados > 0) log.info("Log de auditoria: {} registro(s) com mais de {} dias apagado(s).", apagados, retencaoDias);
    }

    private static String cortar(String s, int max) {
        return s == null || s.length() <= max ? s : s.substring(0, max);
    }
}
