package br.com.gerenciador.projeto.controller;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import br.com.gerenciador.projeto.DAO.AtividadeDAO;
import br.com.gerenciador.projeto.DAO.EscalacaoDAO;
import br.com.gerenciador.projeto.DAO.IUsuario;
import br.com.gerenciador.projeto.model.Escalacao;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/escalacoes")
public class EscalacaoController {

    @Autowired private EscalacaoDAO escalacaoDAO;
    @Autowired private AtividadeDAO atividadeDAO;
    @Autowired private IUsuario usuarioDAO;

    @GetMapping("/atividade/{id}")
    public List<Escalacao> buscarPorAtividade(@PathVariable Integer id) {
        return escalacaoDAO.buscarPorAtividade(id);
    }

    @PostMapping
    public ResponseEntity<Escalacao> cadastrar(@RequestBody Escalacao esc) {
        if (esc.getAtividade() != null)
            atividadeDAO.findById(esc.getAtividade().getId_atividade())
                .ifPresent(esc::setAtividade);
        if (esc.getUsuario() != null)
            usuarioDAO.findById(esc.getUsuario().getId_usuario())
                .ifPresent(esc::setUsuario);
        return ResponseEntity.status(HttpStatus.CREATED).body(escalacaoDAO.save(esc));
    }

    // PUT /escalacoes/{id} — atualiza pontos do jogador no jogo
    @PutMapping("/{id}")
    public ResponseEntity<Escalacao> atualizar(@PathVariable Integer id, @RequestBody Escalacao dados) {
        return escalacaoDAO.findById(id).map(e -> {
            if (dados.getPontos_jogo()   != null) e.setPontos_jogo(dados.getPontos_jogo());
            if (dados.getPosicao()       != null) e.setPosicao(dados.getPosicao());
            if (dados.getNumero_camisa() != null) e.setNumero_camisa(dados.getNumero_camisa());
            if (dados.getTitular()       != null) e.setTitular(dados.getTitular());
            return ResponseEntity.ok(escalacaoDAO.save(e));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Integer id) {
        if (!escalacaoDAO.existsById(id)) return ResponseEntity.notFound().build();
        escalacaoDAO.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
