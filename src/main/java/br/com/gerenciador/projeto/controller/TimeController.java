package br.com.gerenciador.projeto.controller;

import java.util.List;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import br.com.gerenciador.projeto.model.Time;
import br.com.gerenciador.projeto.model.Usuario;
import br.com.gerenciador.projeto.security.JwtFilter;
import br.com.gerenciador.projeto.service.TimeService;

@RestController
@RequestMapping("/times")
public class TimeController {

    @Autowired private TimeService timeService;

    private static Integer authId(HttpServletRequest r)   { return (Integer) r.getAttribute(JwtFilter.ATTR_ID); }
    private static Integer authTipo(HttpServletRequest r) { return (Integer) r.getAttribute(JwtFilter.ATTR_TIPO); }

    @GetMapping
    public List<Time> listarTodos() {
        return timeService.listarTodos();
    }

    @GetMapping("/ativos")
    public List<Time> listarAtivos() {
        return timeService.listarAtivos();
    }

    @GetMapping("/{id}")
    public Time buscarPorId(@PathVariable Integer id) {
        return timeService.buscarPorId(id);
    }

    @GetMapping("/{id}/membros")
    public List<Usuario> listarMembros(@PathVariable Integer id, HttpServletRequest request) {
        return timeService.listarMembros(id, authTipo(request), authId(request));
    }

    @PostMapping
    public ResponseEntity<Time> criar(@RequestBody Time time, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(timeService.criar(time, authTipo(request)));
    }

    @PutMapping("/{id}")
    public Time atualizar(@PathVariable Integer id, @RequestBody Time dados, HttpServletRequest request) {
        return timeService.atualizar(id, dados, authTipo(request));
    }

    // PUT /times/{id}/membros/{idUsuario} — adicionar membro ao time
    @PutMapping("/{id}/membros/{idUsuario}")
    public Usuario adicionarMembro(
            @PathVariable Integer id,
            @PathVariable Integer idUsuario,
            HttpServletRequest request) {
        return timeService.adicionarMembro(id, idUsuario, authTipo(request), authId(request));
    }

    // DELETE /times/{id}/membros/{idUsuario} — remover membro do time
    @DeleteMapping("/{id}/membros/{idUsuario}")
    public ResponseEntity<Void> removerMembro(
            @PathVariable Integer id,
            @PathVariable Integer idUsuario,
            HttpServletRequest request) {
        timeService.removerMembro(id, idUsuario, authTipo(request), authId(request));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Integer id, HttpServletRequest request) {
        timeService.deletar(id, authTipo(request));
        return ResponseEntity.noContent().build();
    }
}
