package br.com.gerenciador.projeto.controller;

import java.util.List;
import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import br.com.gerenciador.projeto.DAO.CalendarioDAO;
import br.com.gerenciador.projeto.DAO.IUsuario;
import br.com.gerenciador.projeto.DAO.VisitanteDAO;
import br.com.gerenciador.projeto.model.Calendario;
import br.com.gerenciador.projeto.model.Visitante;
import br.com.gerenciador.projeto.security.AuthUtil;
import br.com.gerenciador.projeto.security.JwtFilter;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/visitantes")
public class VisitanteController {

    @Autowired
    private VisitanteDAO visitanteDAO;

    @Autowired
    private CalendarioDAO calendarioDAO;

    @Autowired
    private IUsuario usuarioDAO;

    private static Integer authId(HttpServletRequest r)   { return (Integer) r.getAttribute(JwtFilter.ATTR_ID); }
    private static Integer authTipo(HttpServletRequest r) { return (Integer) r.getAttribute(JwtFilter.ATTR_TIPO); }

    private static Integer idTime(Visitante v) {
        if (v.getCalendario() == null || v.getCalendario().getAtividade() == null) return null;
        return v.getCalendario().getAtividade().getTime() != null
            ? v.getCalendario().getAtividade().getTime().getId_time() : null;
    }

    @GetMapping
    public List<Visitante> listarTodos(@RequestParam(required = false) Integer idTime) {
        if (idTime != null) return visitanteDAO.buscarPorTime(idTime);
        return visitanteDAO.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Visitante> buscarPorId(@PathVariable Integer id) {
        return visitanteDAO.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/calendario/{id}")
    public List<Visitante> buscarPorCalendario(@PathVariable Integer id) {
        return visitanteDAO.buscarPorCalendario(id);
    }

    @PostMapping
    public ResponseEntity<?> cadastrar(@RequestBody Visitante visitante, HttpServletRequest request) {
        if (visitante.getCalendario() != null && visitante.getCalendario().getId_calendario() != null) {
            Calendario c = calendarioDAO.findById(visitante.getCalendario().getId_calendario())
                .orElseThrow(() -> new RuntimeException("Calendário não encontrado"));
            visitante.setCalendario(c);
        }
        if (!AuthUtil.podeGerenciarTime(authTipo(request), authId(request), idTime(visitante), usuarioDAO))
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("erro", "Sem permissao para cadastrar este visitante."));
        return ResponseEntity.status(HttpStatus.CREATED).body(visitanteDAO.save(visitante));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> atualizar(@PathVariable Integer id, @RequestBody Visitante dados, HttpServletRequest request) {
        Integer authTipo = authTipo(request);
        Integer authId   = authId(request);
        return visitanteDAO.findById(id).<ResponseEntity<?>>map(v -> {
            if (!AuthUtil.podeGerenciarTime(authTipo, authId, idTime(v), usuarioDAO))
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("erro", "Sem permissao para editar este visitante."));

            if (dados.getNome_visitante()      != null) v.setNome_visitante(dados.getNome_visitante());
            if (dados.getMunicipio_visitante() != null) v.setMunicipio_visitante(dados.getMunicipio_visitante());
            if (dados.getCalendario() != null && dados.getCalendario().getId_calendario() != null)
                calendarioDAO.findById(dados.getCalendario().getId_calendario()).ifPresent(v::setCalendario);
            return ResponseEntity.ok(visitanteDAO.save(v));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletar(@PathVariable Integer id, HttpServletRequest request) {
        Visitante v = visitanteDAO.findById(id).orElse(null);
        if (v == null) return ResponseEntity.notFound().build();
        if (!AuthUtil.podeGerenciarTime(authTipo(request), authId(request), idTime(v), usuarioDAO))
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("erro", "Sem permissao para excluir este visitante."));
        visitanteDAO.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
