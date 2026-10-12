package br.com.gerenciador.projeto.exception;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Converte as exceções de domínio lançadas pelos services na resposta HTTP equivalente. */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /** JSON malformado no corpo da requisição (ex.: a IA gerou um JSON inválido). */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> tratarJsonInvalido(HttpMessageNotReadableException ex) {
        return ResponseEntity.badRequest().body(Map.of("erro", "JSON do corpo da requisição inválido ou malformado."));
    }

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<Void> tratarNaoEncontrado(NotFoundException ex) {
        return ResponseEntity.notFound().build();
    }

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<Map<String, Object>> tratarProibido(ForbiddenException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("erro", ex.getMessage()));
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<Map<String, Object>> tratarRequisicaoInvalida(BadRequestException ex) {
        return ResponseEntity.badRequest().body(Map.of("erro", ex.getMessage()));
    }

    @ExceptionHandler(br.com.gerenciador.projeto.service.UsuarioService.TooManyRequestsException.class)
    public ResponseEntity<Map<String, Object>> tratarMuitasTentativas(RuntimeException ex) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("erro", ex.getMessage()));
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<Map<String, Object>> tratarNaoAutorizado(UnauthorizedException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("erro", ex.getMessage()));
    }
}
