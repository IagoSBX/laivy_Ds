package br.com.gerenciador.projeto.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import br.com.gerenciador.projeto.DAO.ExameDAO;
import br.com.gerenciador.projeto.DAO.IUsuario;
import br.com.gerenciador.projeto.model.Exame;
import br.com.gerenciador.projeto.model.Usuario;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/exames")
public class ExameController {

    @Autowired
    private ExameDAO exameDAO;

    @Autowired
    private IUsuario usuarioDAO;

    // GET /exames
    @GetMapping
    public List<Exame> listarTodos(@RequestParam(required = false) Integer idTime) {
        if (idTime != null) return exameDAO.buscarPorTime(idTime);
        return exameDAO.findAll();
    }

    // GET /exames/{id}
    @GetMapping("/{id}")
    public ResponseEntity<Exame> buscarPorId(@PathVariable Integer id) {
        return exameDAO.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    // GET /exames/usuario/{id}
    @GetMapping("/usuario/{id}")
    public List<Exame> buscarPorUsuario(@PathVariable Integer id) {
        return exameDAO.buscarPorUsuario(id);
    }

    // POST /exames
    @PostMapping
    public ResponseEntity<Exame> cadastrar(@RequestBody Exame exame) {
        if (exame.getUsuario() != null && exame.getUsuario().getId_usuario() != null) {
            Usuario usuario = usuarioDAO.findById(exame.getUsuario().getId_usuario())
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
            exame.setUsuario(usuario);
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(exameDAO.save(exame));
    }

    // PUT /exames/{id}
    @PutMapping("/{id}")
    public ResponseEntity<Exame> atualizar(@PathVariable Integer id, @RequestBody Exame dados) {
        return exameDAO.findById(id).map(e -> {
            if (dados.getData_inicio_exame()      != null) e.setData_inicio_exame(dados.getData_inicio_exame());
            if (dados.getData_fim_exame()         != null) e.setData_fim_exame(dados.getData_fim_exame());
            if (dados.getObservacoes_exame()      != null) e.setObservacoes_exame(dados.getObservacoes_exame());
            if (dados.getAltura_usuario()         != null) e.setAltura_usuario(dados.getAltura_usuario());
            if (dados.getPeso_usuario()           != null) e.setPeso_usuario(dados.getPeso_usuario());
            if (dados.getTaxa_gordura_usuario()   != null) e.setTaxa_gordura_usuario(dados.getTaxa_gordura_usuario());
            if (dados.getStatus_usuario()         != null) e.setStatus_usuario(dados.getStatus_usuario());
            if (dados.getFoto_exame()             != null) e.setFoto_exame(dados.getFoto_exame());
            if (dados.getUsuario() != null && dados.getUsuario().getId_usuario() != null) {
                usuarioDAO.findById(dados.getUsuario().getId_usuario()).ifPresent(e::setUsuario);
            }
            return ResponseEntity.ok(exameDAO.save(e));
        }).orElse(ResponseEntity.notFound().build());
    }

    // DELETE /exames/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Integer id) {
        if (!exameDAO.existsById(id)) return ResponseEntity.notFound().build();
        exameDAO.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
