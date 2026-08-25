package br.com.gerenciador.projeto.controller;

import java.util.List;
import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import br.com.gerenciador.projeto.DAO.AtividadeDAO;
import br.com.gerenciador.projeto.DAO.CalendarioDAO;
import br.com.gerenciador.projeto.DAO.IUsuario;
import br.com.gerenciador.projeto.model.Atividade;
import br.com.gerenciador.projeto.model.Calendario;
import br.com.gerenciador.projeto.model.Usuario;
import br.com.gerenciador.projeto.security.AuthUtil;
import br.com.gerenciador.projeto.security.JwtFilter;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/calendarios")
public class CalendarioController {

    @Autowired
    private CalendarioDAO calendarioDAO;

    @Autowired
    private IUsuario usuarioDAO;

    @Autowired
    private AtividadeDAO atividadeDAO;

    private static Integer authId(HttpServletRequest r)   { return (Integer) r.getAttribute(JwtFilter.ATTR_ID); }
    private static Integer authTipo(HttpServletRequest r) { return (Integer) r.getAttribute(JwtFilter.ATTR_TIPO); }

    private static Integer idTime(Calendario c) {
        if (c.getAtividade() != null && c.getAtividade().getTime() != null)
            return c.getAtividade().getTime().getId_time();
        if (c.getUsuario() != null && c.getUsuario().getTime() != null)
            return c.getUsuario().getTime().getId_time();
        return null;
    }

    @GetMapping
    public List<Calendario> listarTodos() {
        return calendarioDAO.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Calendario> buscarPorId(@PathVariable Integer id) {
        return calendarioDAO.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/usuario/{id}")
    public List<Calendario> buscarPorUsuario(@PathVariable Integer id) {
        return calendarioDAO.buscarPorUsuario(id);
    }

    @GetMapping("/atividade/{id}")
    public List<Calendario> buscarPorAtividade(@PathVariable Integer id) {
        return calendarioDAO.buscarPorAtividade(id);
    }

    @PostMapping
    public ResponseEntity<?> cadastrar(@RequestBody Calendario calendario, HttpServletRequest request) {
        if (calendario.getUsuario() != null && calendario.getUsuario().getId_usuario() != null) {
            Usuario u = usuarioDAO.findById(calendario.getUsuario().getId_usuario())
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
            calendario.setUsuario(u);
        }
        if (calendario.getAtividade() != null && calendario.getAtividade().getId_atividade() != null) {
            Atividade a = atividadeDAO.findById(calendario.getAtividade().getId_atividade())
                .orElseThrow(() -> new RuntimeException("Atividade não encontrada"));
            calendario.setAtividade(a);
        }
        if (!AuthUtil.podeGerenciarTime(authTipo(request), authId(request), idTime(calendario), usuarioDAO))
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("erro", "Sem permissao para cadastrar este registro de calendario."));
        return ResponseEntity.status(HttpStatus.CREATED).body(calendarioDAO.save(calendario));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> atualizar(@PathVariable Integer id, @RequestBody Calendario dados, HttpServletRequest request) {
        Integer authTipo = authTipo(request);
        Integer authId   = authId(request);
        return calendarioDAO.findById(id).<ResponseEntity<?>>map(c -> {
            if (!AuthUtil.podeGerenciarTime(authTipo, authId, idTime(c), usuarioDAO))
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("erro", "Sem permissao para editar este registro de calendario."));

            if (dados.getObservacoes()   != null) c.setObservacoes(dados.getObservacoes());
            if (dados.getPlacar_pro()    != null) c.setPlacar_pro(dados.getPlacar_pro());
            if (dados.getPlacar_contra() != null) c.setPlacar_contra(dados.getPlacar_contra());
            if (dados.getUsuario() != null && dados.getUsuario().getId_usuario() != null)
                usuarioDAO.findById(dados.getUsuario().getId_usuario()).ifPresent(c::setUsuario);
            if (dados.getAtividade() != null && dados.getAtividade().getId_atividade() != null)
                atividadeDAO.findById(dados.getAtividade().getId_atividade()).ifPresent(c::setAtividade);
            return ResponseEntity.ok(calendarioDAO.save(c));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletar(@PathVariable Integer id, HttpServletRequest request) {
        Calendario c = calendarioDAO.findById(id).orElse(null);
        if (c == null) return ResponseEntity.notFound().build();
        if (!AuthUtil.podeGerenciarTime(authTipo(request), authId(request), idTime(c), usuarioDAO))
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("erro", "Sem permissao para excluir este registro de calendario."));
        calendarioDAO.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
