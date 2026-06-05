package br.com.gerenciador.projeto.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import br.com.gerenciador.projeto.DAO.AtividadeDAO;
import br.com.gerenciador.projeto.DAO.IUsuario;
import br.com.gerenciador.projeto.DAO.TimeDAO;
import br.com.gerenciador.projeto.model.Atividade;
import br.com.gerenciador.projeto.model.Usuario;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/atividades")
public class AtividadeController {

    @Autowired
    private AtividadeDAO atividadeDAO;

    @Autowired
    private IUsuario usuarioDAO;

    @Autowired
    private TimeDAO timeDAO;

    @GetMapping
    public List<Atividade> listarTodas(
            @org.springframework.web.bind.annotation.RequestParam(required = false) Integer idTime) {
        if (idTime != null) return atividadeDAO.buscarPorTime(idTime);
        return atividadeDAO.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Atividade> buscarPorId(@PathVariable Integer id) {
        return atividadeDAO.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/usuario/{id}")
    public List<Atividade> buscarPorUsuario(@PathVariable Integer id) {
        return atividadeDAO.buscarPorUsuario(id);
    }

    @GetMapping("/tipo/{tipo}")
    public List<Atividade> buscarPorTipo(@PathVariable Integer tipo) {
        return atividadeDAO.buscarPorTipo(tipo);
    }

    @GetMapping("/time/{idTime}")
    public List<Atividade> buscarPorTime(@PathVariable Integer idTime) {
        return atividadeDAO.findAll().stream()
            .filter(a -> a.getTime() != null && a.getTime().getId_time().equals(idTime))
            .collect(java.util.stream.Collectors.toList());
    }

    @PostMapping
    public ResponseEntity<Atividade> cadastrar(@RequestBody Atividade atividade) {
        if (atividade.getUsuario() != null && atividade.getUsuario().getId_usuario() != null) {
            Usuario u = usuarioDAO.findById(atividade.getUsuario().getId_usuario())
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
            atividade.setUsuario(u);
        }
        if (atividade.getTime() != null && atividade.getTime().getId_time() != null) {
            timeDAO.findById(atividade.getTime().getId_time()).ifPresent(atividade::setTime);
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(atividadeDAO.save(atividade));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Atividade> atualizar(@PathVariable Integer id, @RequestBody Atividade dados) {
        return atividadeDAO.findById(id).map(a -> {
            if (dados.getNome_atividade()   != null) a.setNome_atividade(dados.getNome_atividade());
            if (dados.getLugar_atividade()  != null) a.setLugar_atividade(dados.getLugar_atividade());
            if (dados.getData_atividade()   != null) a.setData_atividade(dados.getData_atividade());
            if (dados.getTipo_atividade()   != null) a.setTipo_atividade(dados.getTipo_atividade());
            if (dados.getStatus_atividade() != null) a.setStatus_atividade(dados.getStatus_atividade());
            if (dados.getTime_oponente()    != null) a.setTime_oponente(dados.getTime_oponente());
            if (dados.getPlacar_pro()       != null) a.setPlacar_pro(dados.getPlacar_pro());
            if (dados.getPlacar_contra()    != null) a.setPlacar_contra(dados.getPlacar_contra());
            if (dados.getUsuario() != null && dados.getUsuario().getId_usuario() != null)
                usuarioDAO.findById(dados.getUsuario().getId_usuario()).ifPresent(a::setUsuario);
            if (dados.getTime() != null && dados.getTime().getId_time() != null)
                timeDAO.findById(dados.getTime().getId_time()).ifPresent(a::setTime);
            return ResponseEntity.ok(atividadeDAO.save(a));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Integer id) {
        if (!atividadeDAO.existsById(id)) return ResponseEntity.notFound().build();
        atividadeDAO.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
