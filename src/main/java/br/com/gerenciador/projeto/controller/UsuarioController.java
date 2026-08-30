package br.com.gerenciador.projeto.controller;

import java.util.List;
import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import br.com.gerenciador.projeto.model.Exame;
import br.com.gerenciador.projeto.model.Usuario;
import br.com.gerenciador.projeto.security.JwtFilter;
import br.com.gerenciador.projeto.service.UsuarioService;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/usuarios")
public class UsuarioController {

    @Autowired private UsuarioService usuarioService;

    private static Integer authId(HttpServletRequest r)   { return (Integer) r.getAttribute(JwtFilter.ATTR_ID); }
    private static Integer authTipo(HttpServletRequest r) { return (Integer) r.getAttribute(JwtFilter.ATTR_TIPO); }

    /** Grava o JWT como cookie HttpOnly — o JS do front nunca tem acesso a ele. */
    private void setCookieToken(HttpServletResponse response, String token) {
        ResponseCookie cookie = ResponseCookie.from("jwtToken", token)
            .httpOnly(true)
            .secure(true)
            .sameSite("Strict")
            .path("/")
            .maxAge(usuarioService.getExpirationSegundos())
            .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    // ── GET /usuarios ────────────────────────────────────────────────────
    @GetMapping
    public List<Usuario> listarTodos(
            @RequestParam(required = false) Integer idTime,
            HttpServletRequest request) {
        return usuarioService.listarTodos(idTime, authId(request), authTipo(request));
    }

    // ── GET /usuarios/{id} ───────────────────────────────────────────────
    @GetMapping("/{id}")
    public Usuario buscarPorId(@PathVariable Integer id, HttpServletRequest request) {
        return usuarioService.buscarPorId(id, authId(request), authTipo(request));
    }

    // ── GET /usuarios/{id}/exames ────────────────────────────────────────
    @GetMapping("/{id}/exames")
    public List<Exame> listarExames(@PathVariable Integer id, HttpServletRequest request) {
        return usuarioService.listarExames(id, authId(request), authTipo(request));
    }

    // ── GET /usuarios/treinadores ─────────────────────────────────────────
    @GetMapping("/treinadores")
    public List<Usuario> listarTreinadores() {
        return usuarioService.listarTreinadores();
    }

    // ── POST /usuarios ────────────────────────────────────────────────────
    @PostMapping
    public ResponseEntity<Usuario> criar(@RequestBody Usuario usuario, HttpServletRequest request) {
        Usuario salvo = usuarioService.criar(usuario, authId(request), authTipo(request));
        return ResponseEntity.status(HttpStatus.CREATED).body(salvo);
    }

    // ── POST /usuarios/login ──────────────────────────────────────────────
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(
            @RequestBody Map<String, String> body,
            HttpServletResponse response) {
        UsuarioService.LoginResultado resultado = usuarioService.login(
            body.get("login_usuario"), body.get("senha_usuario"), body.get("tipo_usuario"));
        setCookieToken(response, resultado.token);
        return ResponseEntity.ok(Map.<String, Object>of("usuario", resultado.usuario));
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
    public Usuario atualizar(
            @PathVariable Integer id,
            @RequestBody Usuario dados,
            HttpServletRequest request) {
        return usuarioService.atualizar(id, dados, authId(request), authTipo(request));
    }

    // ── PUT /usuarios/{id}/senha ──────────────────────────────────────────
    @PutMapping("/{id}/senha")
    public ResponseEntity<Map<String, Object>> trocarSenha(
            @PathVariable Integer id,
            @RequestBody Map<String, String> body,
            HttpServletRequest request,
            HttpServletResponse response) {
        UsuarioService.LoginResultado resultado = usuarioService.trocarSenha(
            id, body.get("senha_usuario"), authId(request), authTipo(request));
        setCookieToken(response, resultado.token);
        return ResponseEntity.ok(Map.<String, Object>of("usuario", resultado.usuario));
    }

    // ── DELETE /usuarios/{id} ─────────────────────────────────────────────
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Integer id, HttpServletRequest request) {
        usuarioService.excluir(id, authId(request), authTipo(request));
        return ResponseEntity.noContent().build();
    }
}
