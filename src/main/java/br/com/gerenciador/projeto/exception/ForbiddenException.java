package br.com.gerenciador.projeto.exception;

/** Lançada pelos services quando o usuário autenticado não tem permissão para a operação. */
public class ForbiddenException extends RuntimeException {
    public ForbiddenException(String message) {
        super(message);
    }
}
