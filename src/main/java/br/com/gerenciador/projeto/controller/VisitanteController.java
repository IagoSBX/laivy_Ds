package br.com.gerenciador.projeto.controller;

import java.util.List;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import br.com.gerenciador.projeto.model.Visitante;
import br.com.gerenciador.projeto.security.JwtFilter;
import br.com.gerenciador.projeto.service.VisitanteService;

@RestController
@RequestMapping("/visitantes")
public class VisitanteController {

    @Autowired
    private VisitanteService visitanteService;

    private static Integer authId(HttpServletRequest r)   { return (Integer) r.getAttribute(JwtFilter.ATTR_ID); }
    private static Integer authTipo(HttpServletRequest r) { return (Integer) r.getAttribute(JwtFilter.ATTR_TIPO); }

    @GetMapping
    public List<Visitante> listarTodos(@RequestParam(required = false) Integer idTime, HttpServletRequest request) {
        return visitanteService.listarTodos(idTime, authTipo(request), authId(request));
    }

    @GetMapping("/{id}")
    public Visitante buscarPorId(@PathVariable Integer id, HttpServletRequest request) {
        return visitanteService.buscarPorId(id, authTipo(request), authId(request));
    }

    @GetMapping("/calendario/{id}")
    public List<Visitante> buscarPorCalendario(@PathVariable Integer id, HttpServletRequest request) {
        return visitanteService.buscarPorCalendario(id, authTipo(request), authId(request));
    }

    @PostMapping
    public ResponseEntity<Visitante> cadastrar(@RequestBody Visitante visitante, HttpServletRequest request) {
        Visitante salvo = visitanteService.cadastrar(visitante, authTipo(request), authId(request));
        return ResponseEntity.status(HttpStatus.CREATED).body(salvo);
    }

    @PutMapping("/{id}")
    public Visitante atualizar(@PathVariable Integer id, @RequestBody Visitante dados, HttpServletRequest request) {
        return visitanteService.atualizar(id, dados, authTipo(request), authId(request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Integer id, HttpServletRequest request) {
        visitanteService.deletar(id, authTipo(request), authId(request));
        return ResponseEntity.noContent().build();
    }
}
