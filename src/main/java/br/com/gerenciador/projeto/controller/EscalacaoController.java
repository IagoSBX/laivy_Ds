package br.com.gerenciador.projeto.controller;

import java.util.List;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import br.com.gerenciador.projeto.model.Escalacao;
import br.com.gerenciador.projeto.security.JwtFilter;
import br.com.gerenciador.projeto.service.EscalacaoService;

@RestController
@RequestMapping("/escalacoes")
public class EscalacaoController {

    @Autowired private EscalacaoService escalacaoService;

    private static Integer authId(HttpServletRequest r)   { return (Integer) r.getAttribute(JwtFilter.ATTR_ID); }
    private static Integer authTipo(HttpServletRequest r) { return (Integer) r.getAttribute(JwtFilter.ATTR_TIPO); }

    @GetMapping("/atividade/{id}")
    public List<Escalacao> buscarPorAtividade(@PathVariable Integer id, HttpServletRequest request) {
        return escalacaoService.buscarPorAtividade(id, authTipo(request), authId(request));
    }

    @PostMapping
    public ResponseEntity<Escalacao> cadastrar(@RequestBody Escalacao esc, HttpServletRequest request) {
        Escalacao salva = escalacaoService.cadastrar(esc, authTipo(request), authId(request));
        return ResponseEntity.status(HttpStatus.CREATED).body(salva);
    }

    @PutMapping("/{id}")
    public Escalacao atualizar(@PathVariable Integer id, @RequestBody Escalacao dados, HttpServletRequest request) {
        return escalacaoService.atualizar(id, dados, authTipo(request), authId(request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Integer id, HttpServletRequest request) {
        escalacaoService.deletar(id, authTipo(request), authId(request));
        return ResponseEntity.noContent().build();
    }
}
