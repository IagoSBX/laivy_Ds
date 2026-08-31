package br.com.gerenciador.projeto.dto;

import br.com.gerenciador.projeto.model.Jogada;
import br.com.gerenciador.projeto.model.json.JogadaConteudo;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public final class JogadaDTOs {

    private JogadaDTOs() { }

    public record SalvarJogadaRequest(
            @NotBlank @Size(max = 120) String nome,
            @NotNull @Valid JogadaConteudo conteudo
    ) {}

    public record JogadaResponse(
            Integer id, String nome, String tipo, Integer qtdFrames,
            Long versao, LocalDateTime atualizadoEm, JogadaConteudo conteudo
    ) {
        public static JogadaResponse de(Jogada j, JogadaConteudo migrado) {
            return new JogadaResponse(j.getId(), j.getNome(), j.getTipo(),
                    j.getQtdFrames(), j.getVersao(), j.getAtualizadoEm(), migrado);
        }
    }

    /**
     * Item da biblioteca. Traz o primeiro frame cru (JSON string) em vez de uma
     * miniatura armazenada: o navegador desenha a miniatura na hora, com o
     * mesmo renderizador do editor. Zero storage, zero sincronia a manter.
     */
    public record ItemBiblioteca(
            Integer id, String nome, String tipo, Integer qtdFrames,
            String enquadramento, LocalDateTime atualizadoEm, String primeiroFrame
    ) {}

    public record VincularRequest(
            @NotNull Integer idAtividade,
            Integer ordem,
            @Size(max = 2000) String observacoes
    ) {}

    /** O que o atleta vê em "Ver observações do treinador" no modo leitura. */
    public record VinculoResponse(Integer ordem, String observacoes) {}

    /** Uma atividade à qual a jogada está vinculada — usado para mostrar na
     *  prancheta e na biblioteca que a jogada já foi atribuída a algo. */
    public record VinculoAtividadeResponse(
            Integer idAtividade, String nomeAtividade, LocalDateTime dataAtividade
    ) {}

    public record ErroValidacao(String mensagem, java.util.List<String> detalhes) {}
}
