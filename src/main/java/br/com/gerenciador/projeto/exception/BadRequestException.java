package br.com.gerenciador.projeto.exception;

/** Lançada pelos services quando os dados recebidos são inválidos ou incompletos. */
public class BadRequestException extends RuntimeException {
    public BadRequestException(String message) {
        super(message);
    }
}
