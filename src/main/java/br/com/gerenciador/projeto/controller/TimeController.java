package br.com.gerenciador.projeto.controller;

import java.util.List;
import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import br.com.gerenciador.projeto.DAO.TimeDAO;
import br.com.gerenciador.projeto.DAO.IUsuario;
import br.com.gerenciador.projeto.model.Time;
import br.com.gerenciador.projeto.model.Usuario;
import br.com.gerenciador.projeto.security.AuthUtil;
import br.com.gerenciador.projeto.security.JwtFilter;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/times")
public class TimeController {

    @Autowired private TimeDAO timeDAO;
    @Autowired private IUsuario usuarioDAO;

    private static Integer authId(HttpServletRequest r)   { return (Integer) r.getAttribute(JwtFilter.ATTR_ID); }
    private static Integer authTipo(HttpServletRequest r) { return (Integer) r.getAttribute(JwtFilter.ATTR_TIPO); }

    @GetMapping
    public List<Time> listarTodos() {
        return timeDAO.findAll();
    }

    @GetMapping("/ativos")
    public List<Time> listarAtivos() {
        return timeDAO.findByAtivo_time(1);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Time> buscarPorId(@PathVariable Integer id) {
        return timeDAO.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/membros")
    public ResponseEntity<List<Usuario>> listarMembros(@PathVariable Integer id) {
        return timeDAO.findById(id)
            .map(t -> ResponseEntity.ok(t.getMembros()))
            .orElse(ResponseEntity.notFound().build());
    }

    // Somente Admin cria/edita/exclui times (o cadastro de time é uma ação administrativa).
    @PostMapping
    public ResponseEntity<?> criar(@RequestBody Time time, HttpServletRequest request) {
        if (!AuthUtil.ehAdmin(authTipo(request)))
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("erro", "Somente Admin pode cadastrar times."));
        if (time.getAtivo_time() == null) time.setAtivo_time(1);
        if (time.getTreinador() != null && time.getTreinador().getId_usuario() != null)
            usuarioDAO.findById(time.getTreinador().getId_usuario()).ifPresent(time::setTreinador);
        return ResponseEntity.status(HttpStatus.CREATED).body(timeDAO.save(time));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> atualizar(@PathVariable Integer id, @RequestBody Time dados, HttpServletRequest request) {
        if (!AuthUtil.ehAdmin(authTipo(request)))
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("erro", "Somente Admin pode editar times."));
        return timeDAO.findById(id).map(t -> {
            if (dados.getNome_time()       != null) t.setNome_time(dados.getNome_time());
            if (dados.getModalidade_time() != null) t.setModalidade_time(dados.getModalidade_time());
            if (dados.getCategoria_time()  != null) t.setCategoria_time(dados.getCategoria_time());
            if (dados.getCor_time()        != null) t.setCor_time(dados.getCor_time());
            if (dados.getDescricao_time()  != null) t.setDescricao_time(dados.getDescricao_time());
            if (dados.getAtivo_time()      != null) t.setAtivo_time(dados.getAtivo_time());
            if (dados.getLogo_time()       != null) t.setLogo_time(dados.getLogo_time());
            if (dados.getTreinador() != null && dados.getTreinador().getId_usuario() != null)
                usuarioDAO.findById(dados.getTreinador().getId_usuario()).ifPresent(t::setTreinador);
            return ResponseEntity.ok(timeDAO.save(t));
        }).orElse(ResponseEntity.notFound().build());
    }

    // PUT /times/{id}/membros/{idUsuario} — adicionar membro ao time
    // Admin gerencia qualquer time; Treinador só o próprio.
    @PutMapping("/{id}/membros/{idUsuario}")
    public ResponseEntity<?> adicionarMembro(
            @PathVariable Integer id,
            @PathVariable Integer idUsuario,
            HttpServletRequest request) {
        if (!AuthUtil.podeGerenciarTime(authTipo(request), authId(request), id, usuarioDAO))
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("erro", "Sem permissao para gerenciar membros deste time."));
        return usuarioDAO.findById(idUsuario).map(u -> {
            timeDAO.findById(id).ifPresent(u::setTime);
            return ResponseEntity.ok(usuarioDAO.save(u));
        }).orElse(ResponseEntity.notFound().build());
    }

    // DELETE /times/{id}/membros/{idUsuario} — remover membro do time
    @DeleteMapping("/{id}/membros/{idUsuario}")
    public ResponseEntity<?> removerMembro(
            @PathVariable Integer id,
            @PathVariable Integer idUsuario,
            HttpServletRequest request) {
        if (!AuthUtil.podeGerenciarTime(authTipo(request), authId(request), id, usuarioDAO))
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("erro", "Sem permissao para gerenciar membros deste time."));
        if (!usuarioDAO.existsById(idUsuario)) return ResponseEntity.notFound().build();
        usuarioDAO.findById(idUsuario).ifPresent(u -> {
            u.setTime(null);
            usuarioDAO.save(u);
        });
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletar(@PathVariable Integer id, HttpServletRequest request) {
        if (!AuthUtil.ehAdmin(authTipo(request)))
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("erro", "Somente Admin pode excluir times."));
        if (!timeDAO.existsById(id)) return ResponseEntity.notFound().build();
        timeDAO.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
