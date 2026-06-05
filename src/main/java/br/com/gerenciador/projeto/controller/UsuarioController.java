package br.com.gerenciador.projeto.controller;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import br.com.gerenciador.projeto.DAO.IUsuario;
import br.com.gerenciador.projeto.DAO.TimeDAO;
import br.com.gerenciador.projeto.model.Exame;
import br.com.gerenciador.projeto.model.Usuario;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/usuarios")
public class UsuarioController {

    @Autowired
    private IUsuario dao;

    @Autowired
    private TimeDAO timeDAO;

    // GET /usuarios
    @GetMapping
    public List<Usuario> listarTodos(
            @org.springframework.web.bind.annotation.RequestParam(required = false) Integer idTime) {
        if (idTime != null) return dao.buscarPorTime(idTime);
        return dao.findAll();
    }

    // GET /usuarios/{id}
    @GetMapping("/{id}")
    public ResponseEntity<Usuario> buscarPorId(@PathVariable Integer id) {
        return dao.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    // GET /usuarios/{id}/exames
    @GetMapping("/{id}/exames")
    public ResponseEntity<List<Exame>> listarExames(@PathVariable Integer id) {
        Optional<Usuario> opt = dao.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(opt.get().getExames());
    }

    // POST /usuarios
    @PostMapping
    public ResponseEntity<Usuario> criar(@RequestBody Usuario usuario) {
        // Resolve time FK so Hibernate doesn't fail on detached entity
        if (usuario.getTime() != null && usuario.getTime().getId_time() != null) {
            timeDAO.findById(usuario.getTime().getId_time()).ifPresent(usuario::setTime);
        }
        Usuario salvo = dao.save(usuario);
        return ResponseEntity.status(HttpStatus.CREATED).body(salvo);
    }

    // POST /usuarios/login
    @PostMapping("/login")
    public ResponseEntity<Usuario> login(@RequestBody Usuario credenciais) {
        Optional<Usuario> opt = dao.autenticar(
            credenciais.getLogin_usuario(),
            credenciais.getSenha_usuario(),
            credenciais.getTipo_usuario()
        );
        return opt.map(ResponseEntity::ok)
                  .orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
    }

    // PUT /usuarios/{id}
    @PutMapping("/{id}")
    public ResponseEntity<Usuario> atualizar(@PathVariable Integer id, @RequestBody Usuario dados) {
        return dao.findById(id).map(u -> {
            if (dados.getNome_usuario()      != null) u.setNome_usuario(dados.getNome_usuario());
            if (dados.getEmail_usuario()     != null) u.setEmail_usuario(dados.getEmail_usuario());
            if (dados.getLogin_usuario()     != null) u.setLogin_usuario(dados.getLogin_usuario());
            if (dados.getSenha_usuario()     != null) u.setSenha_usuario(dados.getSenha_usuario());
            if (dados.getTipo_usuario()      != null) u.setTipo_usuario(dados.getTipo_usuario());
            if (dados.getCel_usuario()       != null) u.setCel_usuario(dados.getCel_usuario());
            if (dados.getCpf_usuario()       != null) u.setCpf_usuario(dados.getCpf_usuario());
            if (dados.getEndereco_usuario()  != null) u.setEndereco_usuario(dados.getEndereco_usuario());
            if (dados.getBairro_usuario()    != null) u.setBairro_usuario(dados.getBairro_usuario());
            if (dados.getCep_usuario()       != null) u.setCep_usuario(dados.getCep_usuario());
            if (dados.getCidade_usuario()    != null) u.setCidade_usuario(dados.getCidade_usuario());
            if (dados.getEstado_usuario()    != null) u.setEstado_usuario(dados.getEstado_usuario());
            if (dados.getFoto_usuario()      != null) u.setFoto_usuario(dados.getFoto_usuario());
            if (dados.getCpf_responsavel_1() != null) u.setCpf_responsavel_1(dados.getCpf_responsavel_1());
            if (dados.getCpf_responsavel_2() != null) u.setCpf_responsavel_2(dados.getCpf_responsavel_2());
            if (dados.getCel_responsavel_1() != null) u.setCel_responsavel_1(dados.getCel_responsavel_1());
            if (dados.getCel_responsavel_2() != null) u.setCel_responsavel_2(dados.getCel_responsavel_2());
            // Vincular/desvincular time
            if (dados.getTime() != null && dados.getTime().getId_time() != null)
                timeDAO.findById(dados.getTime().getId_time()).ifPresent(u::setTime);
            return ResponseEntity.ok(dao.save(u));
        }).orElse(ResponseEntity.notFound().build());
    }

    // GET /usuarios/treinadores — lista apenas admins e treinadores
    @GetMapping("/treinadores")
    public List<Usuario> listarTreinadores() {
        return dao.findAll().stream()
            .filter(u -> u.getTipo_usuario() != null && u.getTipo_usuario() <= 2)
            .collect(java.util.stream.Collectors.toList());
    }

    // DELETE /usuarios/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Integer id) {
        if (!dao.existsById(id)) return ResponseEntity.notFound().build();
        dao.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // PUT /usuarios/{id}/senha — troca senha no primeiro login
    @PutMapping("/{id}/senha")
    public ResponseEntity<Usuario> trocarSenha(
            @PathVariable Integer id,
            @RequestBody java.util.Map<String, String> body) {
        return dao.findById(id).map(u -> {
            String nova = body.get("senha_usuario");
            if (nova != null && !nova.isBlank()) u.setSenha_usuario(nova);
            u.setPrimeiro_login(0);
            return ResponseEntity.ok(dao.save(u));
        }).orElse(ResponseEntity.notFound().build());
    }
}
