package br.com.gerenciador.projeto.controller;

import java.util.List;
import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import br.com.gerenciador.projeto.DAO.ExameDAO;
import br.com.gerenciador.projeto.DAO.IUsuario;
import br.com.gerenciador.projeto.model.Exame;
import br.com.gerenciador.projeto.model.Usuario;
import br.com.gerenciador.projeto.security.AuthUtil;
import br.com.gerenciador.projeto.security.JwtFilter;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/exames")
public class ExameController {

    @Autowired
    private ExameDAO exameDAO;

    @Autowired
    private IUsuario usuarioDAO;

    private static Integer authId(HttpServletRequest r)   { return (Integer) r.getAttribute(JwtFilter.ATTR_ID); }
    private static Integer authTipo(HttpServletRequest r) { return (Integer) r.getAttribute(JwtFilter.ATTR_TIPO); }

    /** Pode ver exames deste usuário: o próprio dono, Admin, ou Treinador do mesmo time. */
    private boolean podeVer(Usuario alvo, HttpServletRequest request) {
        Integer id = authId(request);
        if (id != null && id.equals(alvo.getId_usuario())) return true;
        return podeGerenciar(alvo, request);
    }

    /** Pode cadastrar/editar/excluir exames deste usuário: Admin, ou Treinador do mesmo time (não o próprio atleta). */
    private boolean podeGerenciar(Usuario alvo, HttpServletRequest request) {
        Integer idTimeAlvo = alvo.getTime() != null ? alvo.getTime().getId_time() : null;
        return AuthUtil.podeGerenciarTime(authTipo(request), authId(request), idTimeAlvo, usuarioDAO);
    }

    // GET /exames — dados de saude sensiveis: nunca listar tudo para quem nao for Admin.
    @GetMapping
    public ResponseEntity<List<Exame>> listarTodos(
            @RequestParam(required = false) Integer idTime, HttpServletRequest request) {
        Integer authTipo = authTipo(request);
        Integer authId   = authId(request);

        if (AuthUtil.ehAdmin(authTipo))
            return ResponseEntity.ok(idTime != null ? exameDAO.buscarPorTime(idTime) : exameDAO.findAll());

        if (AuthUtil.ehTreinador(authTipo)) {
            Integer meuTime = AuthUtil.timeDoUsuario(authId, usuarioDAO);
            if (meuTime == null) return ResponseEntity.ok(List.of());
            if (idTime != null && !idTime.equals(meuTime))
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            return ResponseEntity.ok(exameDAO.buscarPorTime(meuTime));
        }

        // Atleta: somente os proprios exames.
        return ResponseEntity.ok(authId != null ? exameDAO.buscarPorUsuario(authId) : List.of());
    }

    // GET /exames/{id}
    @GetMapping("/{id}")
    public ResponseEntity<Exame> buscarPorId(@PathVariable Integer id, HttpServletRequest request) {
        return exameDAO.findById(id)
            .map(e -> podeVer(e.getUsuario(), request)
                ? ResponseEntity.ok(e)
                : ResponseEntity.status(HttpStatus.FORBIDDEN).<Exame>build())
            .orElse(ResponseEntity.notFound().build());
    }

    // GET /exames/usuario/{id}
    @GetMapping("/usuario/{id}")
    public ResponseEntity<List<Exame>> buscarPorUsuario(@PathVariable Integer id, HttpServletRequest request) {
        return usuarioDAO.findById(id)
            .map(u -> podeVer(u, request)
                ? ResponseEntity.ok(exameDAO.buscarPorUsuario(id))
                : ResponseEntity.status(HttpStatus.FORBIDDEN).<List<Exame>>build())
            .orElse(ResponseEntity.notFound().build());
    }

    // POST /exames
    @PostMapping
    public ResponseEntity<?> cadastrar(@RequestBody Exame exame, HttpServletRequest request) {
        if (exame.getUsuario() == null || exame.getUsuario().getId_usuario() == null)
            return ResponseEntity.badRequest().body(Map.of("erro", "Usuario obrigatorio."));
        Usuario usuario = usuarioDAO.findById(exame.getUsuario().getId_usuario()).orElse(null);
        if (usuario == null)
            return ResponseEntity.badRequest().body(Map.of("erro", "Usuário não encontrado"));
        if (!podeGerenciar(usuario, request))
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("erro", "Sem permissao para cadastrar exame para este usuario."));
        exame.setUsuario(usuario);
        return ResponseEntity.status(HttpStatus.CREATED).body(exameDAO.save(exame));
    }

    // PUT /exames/{id}
    @PutMapping("/{id}")
    public ResponseEntity<?> atualizar(@PathVariable Integer id, @RequestBody Exame dados, HttpServletRequest request) {
        return exameDAO.findById(id).<ResponseEntity<?>>map(e -> {
            if (!podeGerenciar(e.getUsuario(), request))
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("erro", "Sem permissao para editar este exame."));

            if (dados.getData_inicio_exame()      != null) e.setData_inicio_exame(dados.getData_inicio_exame());
            if (dados.getData_fim_exame()         != null) e.setData_fim_exame(dados.getData_fim_exame());
            if (dados.getObservacoes_exame()      != null) e.setObservacoes_exame(dados.getObservacoes_exame());
            if (dados.getAltura_usuario()         != null) e.setAltura_usuario(dados.getAltura_usuario());
            if (dados.getPeso_usuario()           != null) e.setPeso_usuario(dados.getPeso_usuario());
            if (dados.getTaxa_gordura_usuario()   != null) e.setTaxa_gordura_usuario(dados.getTaxa_gordura_usuario());
            if (dados.getStatus_usuario()         != null) e.setStatus_usuario(dados.getStatus_usuario());
            if (dados.getFoto_exame()             != null) e.setFoto_exame(dados.getFoto_exame());
            if (dados.getUsuario() != null && dados.getUsuario().getId_usuario() != null
                    && AuthUtil.ehAdmin(authTipo(request))) {
                usuarioDAO.findById(dados.getUsuario().getId_usuario()).ifPresent(e::setUsuario);
            }
            return ResponseEntity.ok(exameDAO.save(e));
        }).orElse(ResponseEntity.notFound().build());
    }

    // DELETE /exames/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletar(@PathVariable Integer id, HttpServletRequest request) {
        Exame e = exameDAO.findById(id).orElse(null);
        if (e == null) return ResponseEntity.notFound().build();
        if (!podeGerenciar(e.getUsuario(), request))
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("erro", "Sem permissao para excluir este exame."));
        exameDAO.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
