package br.com.gerenciador.projeto.controller;

import java.util.List;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import br.com.gerenciador.projeto.model.Calendario;
import br.com.gerenciador.projeto.security.JwtFilter;
import br.com.gerenciador.projeto.service.CalendarioService;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/calendarios")
public class CalendarioController {

    @Autowired
    private CalendarioService calendarioService;

    private static Integer authId(HttpServletRequest r)   { return (Integer) r.getAttribute(JwtFilter.ATTR_ID); }
    private static Integer authTipo(HttpServletRequest r) { return (Integer) r.getAttribute(JwtFilter.ATTR_TIPO); }

    @GetMapping
    public List<Calendario> listarTodos() {
        return calendarioService.listarTodos();
    }

    @GetMapping("/{id}")
    public Calendario buscarPorId(@PathVariable Integer id) {
        return calendarioService.buscarPorId(id);
    }

    @GetMapping("/usuario/{id}")
    public List<Calendario> buscarPorUsuario(@PathVariable Integer id) {
        return calendarioService.buscarPorUsuario(id);
    }

    @GetMapping("/atividade/{id}")
    public List<Calendario> buscarPorAtividade(@PathVariable Integer id) {
        return calendarioService.buscarPorAtividade(id);
    }

    @PostMapping
    public ResponseEntity<Calendario> cadastrar(@RequestBody Calendario calendario, HttpServletRequest request) {
        Calendario salvo = calendarioService.cadastrar(calendario, authTipo(request), authId(request));
        return ResponseEntity.status(HttpStatus.CREATED).body(salvo);
    }

    @PutMapping("/{id}")
    public Calendario atualizar(@PathVariable Integer id, @RequestBody Calendario dados, HttpServletRequest request) {
        return calendarioService.atualizar(id, dados, authTipo(request), authId(request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Integer id, HttpServletRequest request) {
        calendarioService.deletar(id, authTipo(request), authId(request));
        return ResponseEntity.noContent().build();
    }
}
