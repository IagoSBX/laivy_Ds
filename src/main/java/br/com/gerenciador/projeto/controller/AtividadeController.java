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
@CrossOrigin(origins = "*")
@RequestMapping("/atividades")
public class AtividadeController {

    @Autowired
    private AtividadeService atividadeService;

    private static Integer authId(HttpServletRequest r)   { return (Integer) r.getAttribute(JwtFilter.ATTR_ID); }
    private static Integer authTipo(HttpServletRequest r) { return (Integer) r.getAttribute(JwtFilter.ATTR_TIPO); }

    @GetMapping
    public List<Atividade> listarTodas(@RequestParam(required = false) Integer idTime) {
        return atividadeService.listarTodas(idTime);
    }

    @GetMapping("/{id}")
    public Atividade buscarPorId(@PathVariable Integer id) {
        return atividadeService.buscarPorId(id);
    }

    @GetMapping("/usuario/{id}")
    public List<Atividade> buscarPorUsuario(@PathVariable Integer id) {
        return atividadeService.buscarPorUsuario(id);
    }

    @GetMapping("/tipo/{tipo}")
    public List<Atividade> buscarPorTipo(@PathVariable Integer tipo) {
        return atividadeService.buscarPorTipo(tipo);
    }

    @GetMapping("/time/{idTime}")
    public List<Atividade> buscarPorTime(@PathVariable Integer idTime) {
        return atividadeService.buscarPorTime(idTime);
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
