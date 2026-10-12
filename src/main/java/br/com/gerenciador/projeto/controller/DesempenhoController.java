package br.com.gerenciador.projeto.controller;

import java.util.List;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import br.com.gerenciador.projeto.model.Desempenho;
import br.com.gerenciador.projeto.security.JwtFilter;
import br.com.gerenciador.projeto.service.DesempenhoService;

@RestController
@RequestMapping("/desempenhos")
public class DesempenhoController {

    @Autowired
    private DesempenhoService desempenhoService;

    private static Integer authId(HttpServletRequest r)   { return (Integer) r.getAttribute(JwtFilter.ATTR_ID); }
    private static Integer authTipo(HttpServletRequest r) { return (Integer) r.getAttribute(JwtFilter.ATTR_TIPO); }

    @GetMapping
    public List<Desempenho> listarTodos(@RequestParam(required = false) Integer idTime, HttpServletRequest request) {
        return desempenhoService.listarTodos(idTime, authTipo(request), authId(request));
    }

    @GetMapping("/{id}")
    public Desempenho buscarPorId(@PathVariable Integer id, HttpServletRequest request) {
        return desempenhoService.buscarPorId(id, authTipo(request), authId(request));
    }

    @GetMapping("/usuario/{id}")
    public List<Desempenho> buscarPorUsuario(@PathVariable Integer id, HttpServletRequest request) {
        return desempenhoService.buscarPorUsuario(id, authTipo(request), authId(request));
    }

    @PostMapping
    public ResponseEntity<Desempenho> cadastrar(@RequestBody Desempenho desempenho, HttpServletRequest request) {
        Desempenho salvo = desempenhoService.cadastrar(desempenho, authTipo(request), authId(request));
        return ResponseEntity.status(HttpStatus.CREATED).body(salvo);
    }

    @PutMapping("/{id}")
    public Desempenho atualizar(@PathVariable Integer id, @RequestBody Desempenho dados, HttpServletRequest request) {
        return desempenhoService.atualizar(id, dados, authTipo(request), authId(request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Integer id, HttpServletRequest request) {
        desempenhoService.deletar(id, authTipo(request), authId(request));
        return ResponseEntity.noContent().build();
    }
}
