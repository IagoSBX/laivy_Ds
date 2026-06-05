package br.com.gerenciador.projeto.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import br.com.gerenciador.projeto.DAO.CalendarioDAO;
import br.com.gerenciador.projeto.DAO.VisitanteDAO;
import br.com.gerenciador.projeto.model.Calendario;
import br.com.gerenciador.projeto.model.Visitante;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/visitantes")
public class VisitanteController {

    @Autowired
    private VisitanteDAO visitanteDAO;

    @Autowired
    private CalendarioDAO calendarioDAO;

    @GetMapping
    public List<Visitante> listarTodos(@RequestParam(required = false) Integer idTime) {
        if (idTime != null) return visitanteDAO.buscarPorTime(idTime);
        return visitanteDAO.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Visitante> buscarPorId(@PathVariable Integer id) {
        return visitanteDAO.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/calendario/{id}")
    public List<Visitante> buscarPorCalendario(@PathVariable Integer id) {
        return visitanteDAO.buscarPorCalendario(id);
    }

    @PostMapping
    public ResponseEntity<Visitante> cadastrar(@RequestBody Visitante visitante) {
        if (visitante.getCalendario() != null && visitante.getCalendario().getId_calendario() != null) {
            Calendario c = calendarioDAO.findById(visitante.getCalendario().getId_calendario())
                .orElseThrow(() -> new RuntimeException("Calendário não encontrado"));
            visitante.setCalendario(c);
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(visitanteDAO.save(visitante));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Visitante> atualizar(@PathVariable Integer id, @RequestBody Visitante dados) {
        return visitanteDAO.findById(id).map(v -> {
            if (dados.getNome_visitante()      != null) v.setNome_visitante(dados.getNome_visitante());
            if (dados.getMunicipio_visitante() != null) v.setMunicipio_visitante(dados.getMunicipio_visitante());
            if (dados.getCalendario() != null && dados.getCalendario().getId_calendario() != null)
                calendarioDAO.findById(dados.getCalendario().getId_calendario()).ifPresent(v::setCalendario);
            return ResponseEntity.ok(visitanteDAO.save(v));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Integer id) {
        if (!visitanteDAO.existsById(id)) return ResponseEntity.notFound().build();
        visitanteDAO.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
