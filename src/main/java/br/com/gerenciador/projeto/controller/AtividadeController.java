package br.com.gerenciador.projeto.controller;

import java.util.List;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import br.com.gerenciador.projeto.model.Atividade;
import br.com.gerenciador.projeto.security.JwtFilter;
import br.com.gerenciador.projeto.service.AtividadeService;

@RestController
@RequestMapping("/atividades")
public class AtividadeController {

    @Autowired
    private AtividadeService atividadeService;

    private static Integer authId(HttpServletRequest r)   { return (Integer) r.getAttribute(JwtFilter.ATTR_ID); }
    private static Integer authTipo(HttpServletRequest r) { return (Integer) r.getAttribute(JwtFilter.ATTR_TIPO); }

    @GetMapping
    public List<Atividade> listarTodas(@RequestParam(required = false) Integer idTime, HttpServletRequest request) {
        return atividadeService.listarTodas(idTime, authTipo(request), authId(request));
    }

    @GetMapping("/{id}")
    public Atividade buscarPorId(@PathVariable Integer id, HttpServletRequest request) {
        return atividadeService.buscarPorId(id, authTipo(request), authId(request));
    }

    @GetMapping("/usuario/{id}")
    public List<Atividade> buscarPorUsuario(@PathVariable Integer id, HttpServletRequest request) {
        return atividadeService.buscarPorUsuario(id, authTipo(request), authId(request));
    }

    @GetMapping("/tipo/{tipo}")
    public List<Atividade> buscarPorTipo(@PathVariable Integer tipo, HttpServletRequest request) {
        return atividadeService.buscarPorTipo(tipo, authTipo(request), authId(request));
    }

    @GetMapping("/time/{idTime}")
    public List<Atividade> buscarPorTime(@PathVariable Integer idTime, HttpServletRequest request) {
        return atividadeService.buscarPorTime(idTime, authTipo(request), authId(request));
    }

    @PostMapping
    public ResponseEntity<Atividade> cadastrar(@RequestBody Atividade atividade, HttpServletRequest request) {
        Atividade salva = atividadeService.cadastrar(atividade, authTipo(request), authId(request));
        return ResponseEntity.status(HttpStatus.CREATED).body(salva);
    }

    @PutMapping("/{id}")
    public Atividade atualizar(@PathVariable Integer id, @RequestBody Atividade dados, HttpServletRequest request) {
        return atividadeService.atualizar(id, dados, authTipo(request), authId(request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Integer id, HttpServletRequest request) {
        atividadeService.deletar(id, authTipo(request), authId(request));
        return ResponseEntity.noContent().build();
    }
}
