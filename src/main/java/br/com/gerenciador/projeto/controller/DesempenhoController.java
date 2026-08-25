package br.com.gerenciador.projeto.controller;

import java.util.List;
import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import br.com.gerenciador.projeto.DAO.DesempenhoDAO;
import br.com.gerenciador.projeto.DAO.IUsuario;
import br.com.gerenciador.projeto.model.Desempenho;
import br.com.gerenciador.projeto.model.Usuario;
import br.com.gerenciador.projeto.security.AuthUtil;
import br.com.gerenciador.projeto.security.JwtFilter;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/desempenhos")
public class DesempenhoController {

    @Autowired
    private DesempenhoDAO desempenhoDAO;

    @Autowired
    private IUsuario usuarioDAO;

    private static Integer authId(HttpServletRequest r)   { return (Integer) r.getAttribute(JwtFilter.ATTR_ID); }
    private static Integer authTipo(HttpServletRequest r) { return (Integer) r.getAttribute(JwtFilter.ATTR_TIPO); }

    private static Integer idTime(Desempenho d) {
        return d.getUsuario() != null && d.getUsuario().getTime() != null
            ? d.getUsuario().getTime().getId_time() : null;
    }

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

    // Somente Admin/Treinador cadastram desempenho; Treinador só para atletas do próprio time.
    @PostMapping
    public ResponseEntity<?> cadastrar(@RequestBody Desempenho desempenho, HttpServletRequest request) {
        if (desempenho.getUsuario() == null || desempenho.getUsuario().getId_usuario() == null)
            return ResponseEntity.badRequest().body(Map.of("erro", "Usuario obrigatorio."));
        Usuario u = usuarioDAO.findById(desempenho.getUsuario().getId_usuario())
            .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
        Integer idTimeAlvo = u.getTime() != null ? u.getTime().getId_time() : null;
        if (!AuthUtil.podeGerenciarTime(authTipo(request), authId(request), idTimeAlvo, usuarioDAO))
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("erro", "Sem permissao para cadastrar desempenho para este usuario."));
        desempenho.setUsuario(u);
        return ResponseEntity.status(HttpStatus.CREATED).body(desempenhoDAO.save(desempenho));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> atualizar(@PathVariable Integer id, @RequestBody Desempenho dados, HttpServletRequest request) {
        Integer authTipo = authTipo(request);
        Integer authId   = authId(request);
        return desempenhoDAO.findById(id).<ResponseEntity<?>>map(d -> {
            if (!AuthUtil.podeGerenciarTime(authTipo, authId, idTime(d), usuarioDAO))
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("erro", "Sem permissao para editar este desempenho."));

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
    public ResponseEntity<?> deletar(@PathVariable Integer id, HttpServletRequest request) {
        Desempenho d = desempenhoDAO.findById(id).orElse(null);
        if (d == null) return ResponseEntity.notFound().build();
        if (!AuthUtil.podeGerenciarTime(authTipo(request), authId(request), idTime(d), usuarioDAO))
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("erro", "Sem permissao para excluir este desempenho."));
        desempenhoDAO.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
