package br.com.gerenciador.projeto.model.json;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.util.List;

/**
 * Conteúdo serializado de uma jogada. É o contrato único do sistema:
 * o editor produz este formato, o Batik exporta a partir dele, o modo
 * leitura do atleta consome ele e a IA da Fase 4 devolve ele.
 *
 * Regras invioláveis do formato:
 *
 *  - Coordenadas SEMPRE em fração da QUADRA INTEIRA (0..1), nunca da
 *    meia quadra e nunca em pixels. Meia quadra é só recorte de viewBox,
 *    então trocar o enquadramento não exige migrar dado nenhum.
 *
 *  - Token.id é ESTÁVEL entre frames. É o que permite interpolar a
 *    animação: sem isso não há como saber que o boneco 5 do frame 1 é o
 *    mesmo do frame 2. Ao duplicar um frame, preservar os ids.
 *
 *  - Cada frame é um snapshot COMPLETO, nunca um delta. Custa alguns KB
 *    e elimina os bugs de reordenar, excluir e editar frame do meio.
 *
 *  - {@code numero} vem gravado aqui, e não resolvido de Escalacao, porque
 *    a jogada vive na biblioteca sem estar vinculada a nenhuma Atividade
 *    (e numero_camisa em Escalacao é por atividade).
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record JogadaConteudo(

        @Min(1) int schemaVersion,

        @NotBlank
        @Pattern(regexp = "ataque|defesa|bola_parada|transicao")
        String tipo,

        @NotBlank
        @Pattern(regexp = "meia|inteira")
        String enquadramento,

        @Min(200) @Max(10_000) int duracaoPadraoMs,

        @NotEmpty @Size(max = 40) @Valid List<Frame> frames
) {

    public static final int VERSAO_ATUAL = 1;

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Frame(
            @NotBlank String id,
            @Size(max = 240) String descricao,
            @Min(200) @Max(10_000) Integer duracaoMs,
            @NotEmpty @Size(max = 12) @Valid List<Token> tokens,
            @Valid Bola bola,
            @Size(max = 40) @Valid List<Traco> tracos,
            @Size(max = 20) @Valid List<Texto> textos
    ) {
        public List<Traco> tracosOuVazio() { return tracos == null ? List.of() : tracos; }
        public List<Texto> textosOuVazio()  { return textos == null ? List.of() : textos; }
    }

    /**
     * Boneco em quadra. {@code id} estável entre frames — base da animação.
     * {@code atletaId} referencia tbl_usuario.id_usuario (Integer no LAIVY).
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Token(
            @NotBlank String id,
            @NotBlank @Pattern(regexp = "ataque|defesa") String papel,
            Integer atletaId,
            @Size(max = 3) String numero,
            @DecimalMin("0.0") @DecimalMax("1.0") double x,
            @DecimalMin("0.0") @DecimalMax("1.0") double y
    ) {}

    /**
     * Quando {@code posseDoTokenId} está preenchido a bola gruda no jogador
     * e acompanha o arrasto sozinha. x/y só valem com a bola solta.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Bola(String posseDoTokenId, Double x, Double y) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Ponto(
            @DecimalMin("0.0") @DecimalMax("1.0") double x,
            @DecimalMin("0.0") @DecimalMax("1.0") double y
    ) {}

    /**
     * Ancorado nos tokens: mover o boneco reposiciona o traço.
     *
     * "arremesso" é o único tipo que não termina em outro jogador: o destino
     * é a cesta. destinoTokenId fica null nesse caso — o ValidadorJogadaService
     * confere que o traço termina perto de UMA cesta (não no meio da quadra).
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Traco(
            @NotBlank String id,
            @NotBlank @Pattern(regexp = "corte|passe|bloqueio|drible|livre|arremesso") String tipo,
            @NotEmpty @Size(max = 200) @Valid List<Ponto> pontos,
            String origemTokenId,
            String destinoTokenId
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Texto(
            @NotBlank String id,
            @DecimalMin("0.0") @DecimalMax("1.0") double x,
            @DecimalMin("0.0") @DecimalMax("1.0") double y,
            @NotBlank @Size(max = 60) String conteudo
    ) {}
}
