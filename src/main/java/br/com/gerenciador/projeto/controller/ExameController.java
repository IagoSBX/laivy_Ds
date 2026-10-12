package br.com.gerenciador.projeto.controller;

import java.util.List;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import br.com.gerenciador.projeto.model.Exame;
import br.com.gerenciador.projeto.security.JwtFilter;
import br.com.gerenciador.projeto.service.ExameService;

@RestController
@RequestMapping("/exames")
public class ExameController {

    @Autowired
    private ExameService exameService;

    private static Integer authId(HttpServletRequest r)   { return (Integer) r.getAttribute(JwtFilter.ATTR_ID); }
    private static Integer authTipo(HttpServletRequest r) { return (Integer) r.getAttribute(JwtFilter.ATTR_TIPO); }

    @GetMapping
    public List<Exame> listarTodos(
            @RequestParam(required = false) Integer idTime, HttpServletRequest request) {
        return exameService.listarTodos(idTime, authTipo(request), authId(request));
    }

    @GetMapping("/{id}")
    public Exame buscarPorId(@PathVariable Integer id, HttpServletRequest request) {
        return exameService.buscarPorId(id, authTipo(request), authId(request));
    }

    @GetMapping("/usuario/{id}")
    public List<Exame> buscarPorUsuario(@PathVariable Integer id, HttpServletRequest request) {
        return exameService.buscarPorUsuario(id, authTipo(request), authId(request));
    }

    @PostMapping
    public ResponseEntity<Exame> cadastrar(@RequestBody Exame exame, HttpServletRequest request) {
        Exame salvo = exameService.cadastrar(exame, authTipo(request), authId(request));
        return ResponseEntity.status(HttpStatus.CREATED).body(salvo);
    }

    @PutMapping("/{id}")
    public Exame atualizar(@PathVariable Integer id, @RequestBody Exame dados, HttpServletRequest request) {
        return exameService.atualizar(id, dados, authTipo(request), authId(request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Integer id, HttpServletRequest request) {
        exameService.deletar(id, authTipo(request), authId(request));
        return ResponseEntity.noContent().build();
    }
}
