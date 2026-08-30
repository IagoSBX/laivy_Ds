package br.com.gerenciador.projeto.exception;

/** Lançada quando as credenciais informadas (login) são inválidas. */
public class UnauthorizedException extends RuntimeException {
    public UnauthorizedException(String message) {
        super(message);
    }
}
