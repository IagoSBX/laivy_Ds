package br.com.gerenciador.projeto.exception;

/** Lançada pelos services quando um recurso solicitado não existe. */
public class NotFoundException extends RuntimeException {
    public NotFoundException(String message) {
        super(message);
    }
}
