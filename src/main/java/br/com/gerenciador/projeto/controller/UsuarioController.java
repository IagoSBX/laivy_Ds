package br.com.gerenciador.projeto.controller;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.mindrot.jbcrypt.BCrypt;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import br.com.gerenciador.projeto.DAO.IUsuario;
import br.com.gerenciador.projeto.DAO.TimeDAO;
import br.com.gerenciador.projeto.model.Exame;
import br.com.gerenciador.projeto.model.Usuario;
import br.com.gerenciador.projeto.security.JwtFilter;
import br.com.gerenciador.projeto.security.JwtUtil;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/usuarios")
public class UsuarioController {

    @Autowired private IUsuario  dao;
    @Autowired private TimeDAO   timeDAO;
    @Autowired private JwtUtil   jwtUtil;

    /** Gera hash BCrypt, evitando re-hashear algo que já é um hash BCrypt. */
    private static String hashSenha(String senha) {
        if (senha == null) return null;
        if (senha.startsWith("$2a$") || senha.startsWith("$2b$") || senha.startsWith("$2y$"))
            return senha; // já é hash BCrypt — não hashear de novo
        return BCrypt.hashpw(senha, BCrypt.gensalt(12));
    }

    private static final String ERRO_SENHA_FRACA =
        "A senha deve ter pelo menos 8 caracteres, incluindo letras e números.";

    /** Política mínima: 8+ caracteres, com pelo menos uma letra e um número. */
    private static boolean senhaFraca(String senha) {
        if (senha == null || senha.length() < 8) return true;
        boolean temLetra  = senha.chars().anyMatch(Character::isLetter);
        boolean temDigito = senha.chars().anyMatch(Character::isDigit);
        return !temLetra || !temDigito;
    }

    /** Grava o JWT como cookie HttpOnly — o JS do front nunca tem acesso a ele. */
    private void setCookieToken(HttpServletResponse response, String token) {
        ResponseCookie cookie = ResponseCookie.from("jwtToken", token)
            .httpOnly(true)
            .secure(true)
            .sameSite("Strict")
            .path("/")
            .maxAge(jwtUtil.getExpirationSegundos())
            .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    // ── GET /usuarios ────────────────────────────────────────────────────
    @GetMapping
    public List<Usuario> listarTodos(@RequestParam(required = false) Integer idTime) {
        if (idTime != null) return dao.buscarPorTime(idTime);
        return dao.findAll();
    }

    // ── GET /usuarios/{id} ───────────────────────────────────────────────
    @GetMapping("/{id}")
    public ResponseEntity<Usuario> buscarPorId(@PathVariable Integer id) {
        return dao.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    // ── GET /usuarios/{id}/exames ────────────────────────────────────────
    @GetMapping("/{id}/exames")
    public ResponseEntity<List<Exame>> listarExames(@PathVariable Integer id) {
        return dao.findById(id)
            .map(u -> ResponseEntity.ok(u.getExames()))
            .orElse(ResponseEntity.notFound().build());
    }

    // ── GET /usuarios/treinadores ─────────────────────────────────────────
    @GetMapping("/treinadores")
    public List<Usuario> listarTreinadores() {
        return dao.findAll().stream()
            .filter(u -> u.getTipo_usuario() != null && u.getTipo_usuario() <= 2)
            .collect(Collectors.toList());
    }

    // ── POST /usuarios ────────────────────────────────────────────────────
    @PostMapping
    public ResponseEntity<?> criar(@RequestBody Usuario usuario) {
        if (senhaFraca(usuario.getSenha_usuario()))
            return ResponseEntity.badRequest().body(Map.of("erro", ERRO_SENHA_FRACA));

        if (usuario.getTime() != null && usuario.getTime().getId_time() != null)
            timeDAO.findById(usuario.getTime().getId_time()).ifPresent(usuario::setTime);

        usuario.setSenha_usuario(hashSenha(usuario.getSenha_usuario()));

        return ResponseEntity.status(HttpStatus.CREATED).body(dao.save(usuario));
    }

    // ── POST /usuarios/login ──────────────────────────────────────────────
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(
            @RequestBody Map<String, String> body,
            HttpServletResponse response) {
        String login   = body.get("login_usuario");
        String senha   = body.get("senha_usuario");
        String tipoStr = body.get("tipo_usuario");

        if (login == null || senha == null || tipoStr == null)
            return ResponseEntity.badRequest()
                .body(Map.of("erro", "Campos obrigatorios ausentes."));

        Integer tipo;
        try { tipo = Integer.parseInt(tipoStr); }
        catch (NumberFormatException e) {
            return ResponseEntity.badRequest()
                .body(Map.of("erro", "tipo_usuario invalido."));
        }

        Optional<Usuario> opt = dao.buscarPorLoginTipo(login, tipo);
        if (opt.isEmpty())
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("erro", "Usuario nao encontrado ou perfil incorreto."));

        Usuario u = opt.get();
        String hash = u.getSenha_usuario();

        // Suporta BCrypt (novo) e texto plano (legado).
        // Se a senha legada bater, o hash é migrado para BCrypt na hora.
        boolean senhaOk;
        boolean legado = false;
        if (hash != null && (hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$"))) {
            senhaOk = BCrypt.checkpw(senha, hash);
        } else {
            senhaOk = senha.equals(hash);
            legado  = senhaOk;
        }

        if (!senhaOk)
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("erro", "Senha incorreta."));

        // Migração automática: substitui a senha em texto plano por BCrypt
        if (legado) {
            u.setSenha_usuario(BCrypt.hashpw(senha, BCrypt.gensalt(12)));
            dao.save(u);
        }

        String token = jwtUtil.gerarToken(u.getId_usuario(), u.getLogin_usuario(), u.getTipo_usuario());
        u.setSenha_usuario(null);
        setCookieToken(response, token);

        return ResponseEntity.ok(Map.<String, Object>of("usuario", u));
    }

    // ── POST /usuarios/logout ─────────────────────────────────────────────
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from("jwtToken", "")
            .httpOnly(true)
            .secure(true)
            .sameSite("Strict")
            .path("/")
            .maxAge(0)
            .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
        return ResponseEntity.noContent().build();
    }

    // ── PUT /usuarios/{id} ────────────────────────────────────────────────
    @PutMapping("/{id}")
    public ResponseEntity<?> atualizar(@PathVariable Integer id, @RequestBody Usuario dados) {
        boolean trocandoSenha = dados.getSenha_usuario() != null && !dados.getSenha_usuario().isBlank();
        if (trocandoSenha && senhaFraca(dados.getSenha_usuario()))
            return ResponseEntity.badRequest().body(Map.of("erro", ERRO_SENHA_FRACA));

        return dao.findById(id).map(u -> {
            if (dados.getNome_usuario()      != null) u.setNome_usuario(dados.getNome_usuario());
            if (dados.getEmail_usuario()     != null) u.setEmail_usuario(dados.getEmail_usuario());
            if (dados.getLogin_usuario()     != null) u.setLogin_usuario(dados.getLogin_usuario());
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
            if (dados.getSenha_usuario() != null && !dados.getSenha_usuario().isBlank())
                u.setSenha_usuario(hashSenha(dados.getSenha_usuario()));
            if (dados.getTime() != null && dados.getTime().getId_time() != null)
                timeDAO.findById(dados.getTime().getId_time()).ifPresent(u::setTime);
            return ResponseEntity.ok(dao.save(u));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── PUT /usuarios/{id}/senha ──────────────────────────────────────────
    @PutMapping("/{id}/senha")
    public ResponseEntity<Map<String, Object>> trocarSenha(
            @PathVariable Integer id,
            @RequestBody Map<String, String> body,
            HttpServletRequest request,
            HttpServletResponse response) {

        // Identidade injetada pelo JwtFilter após validar o token
        Integer authId   = (Integer) request.getAttribute(JwtFilter.ATTR_ID);
        Integer authTipo = (Integer) request.getAttribute(JwtFilter.ATTR_TIPO);

        // Só o próprio usuário do token (ou um Admin) pode trocar esta senha
        boolean ehDono  = authId != null && authId.equals(id);
        boolean ehAdmin = authTipo != null && authTipo == 1;
        if (!ehDono && !ehAdmin)
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("erro", "Sem permissao para alterar a senha deste usuario."));

        String nova = body.get("senha_usuario");
        if (senhaFraca(nova))
            return ResponseEntity.badRequest().body(Map.of("erro", ERRO_SENHA_FRACA));

        return dao.findById(id).map(u -> {
            u.setSenha_usuario(BCrypt.hashpw(nova, BCrypt.gensalt(12)));
            u.setPrimeiro_login(0);
            dao.save(u);
            String token = jwtUtil.gerarToken(u.getId_usuario(), u.getLogin_usuario(), u.getTipo_usuario());
            u.setSenha_usuario(null);
            setCookieToken(response, token);
            return ResponseEntity.ok(Map.<String, Object>of("usuario", u));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── DELETE /usuarios/{id} ─────────────────────────────────────────────
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Integer id) {
        if (!dao.existsById(id)) return ResponseEntity.notFound().build();
        dao.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
