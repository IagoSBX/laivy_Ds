package br.com.gerenciador.projeto.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * Utilitário JWT — gera, valida e extrai claims de tokens.
 *
 * Claims armazenadas no token:
 *   sub  → login_usuario
 *   id   → id_usuario
 *   tipo → tipo_usuario (1=Admin, 2=Treinador, 3=Atleta)
 */
@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private long expirationMs;

    private SecretKey getKey() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    /** Duração do token em segundos — usada como Max-Age do cookie. */
    public long getExpirationSegundos() {
        return expirationMs / 1000;
    }

    // ── Geração ──────────────────────────────────────────────────
    public String gerarToken(Integer id, String login, Integer tipo) {
        return Jwts.builder()
                .subject(login)
                .claim("id",   id)
                .claim("tipo", tipo)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(getKey())
                .compact();
    }

    // ── Validação ────────────────────────────────────────────────
    public boolean validar(String token) {
        try {
            parsear(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    // ── Extração de claims ───────────────────────────────────────
    public String getLogin(String token) {
        return parsear(token).getPayload().getSubject();
    }

    public Integer getId(String token) {
        return parsear(token).getPayload().get("id", Integer.class);
    }

    public Integer getTipo(String token) {
        return parsear(token).getPayload().get("tipo", Integer.class);
    }

    // ── Interno ──────────────────────────────────────────────────
    private Jws<Claims> parsear(String token) {
        return Jwts.parser()
                .verifyWith(getKey())
                .build()
                .parseSignedClaims(token);
    }
}
