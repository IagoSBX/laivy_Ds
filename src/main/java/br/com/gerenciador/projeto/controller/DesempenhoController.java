package br.com.gerenciador.projeto.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import br.com.gerenciador.projeto.DAO.DesempenhoDAO;
import br.com.gerenciador.projeto.DAO.IUsuario;
import br.com.gerenciador.projeto.model.Desempenho;
import br.com.gerenciador.projeto.model.Usuario;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/desempenhos")
public class DesempenhoController {

    @Autowired
    private DesempenhoDAO desempenhoDAO;

    @Autowired
    private IUsuario usuarioDAO;

    @GetMapping
    public List<Desempenho> listarTodos(@RequestParam(required = false) Integer idTime) {
        if (idTime != null) return desempenhoDAO.buscarPorTime(idTime);
        return desempenhoDAO.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Desempenho> buscarPorId(@PathVariable Integer id) {
        return desempenhoDAO.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/usuario/{id}")
    public List<Desempenho> buscarPorUsuario(@PathVariable Integer id) {
        return desempenhoDAO.buscarPorUsuario(id);
    }

    @PostMapping
    public ResponseEntity<Desempenho> cadastrar(@RequestBody Desempenho desempenho) {
        if (desempenho.getUsuario() != null && desempenho.getUsuario().getId_usuario() != null) {
            Usuario u = usuarioDAO.findById(desempenho.getUsuario().getId_usuario())
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
            desempenho.setUsuario(u);
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(desempenhoDAO.save(desempenho));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Desempenho> atualizar(@PathVariable Integer id, @RequestBody Desempenho dados) {
        return desempenhoDAO.findById(id).map(d -> {
            if (dados.getData_desempenho()  != null) d.setData_desempenho(dados.getData_desempenho());
            if (dados.getPosicao_usuario()  != null) d.setPosicao_usuario(dados.getPosicao_usuario());
            if (dados.getSalto_horizontal() != null) d.setSalto_horizontal(dados.getSalto_horizontal());
            if (dados.getSalto_vertical()   != null) d.setSalto_vertical(dados.getSalto_vertical());
            if (dados.getPontuacao()        != null) d.setPontuacao(dados.getPontuacao());
            if (dados.getUsuario() != null && dados.getUsuario().getId_usuario() != null)
                usuarioDAO.findById(dados.getUsuario().getId_usuario()).ifPresent(d::setUsuario);
            return ResponseEntity.ok(desempenhoDAO.save(d));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Integer id) {
        if (!desempenhoDAO.existsById(id)) return ResponseEntity.notFound().build();
        desempenhoDAO.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
