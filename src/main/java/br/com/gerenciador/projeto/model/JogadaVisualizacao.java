package br.com.gerenciador.projeto.model;

import jakarta.persistence.*;
import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Objects;

/** Confirmação de leitura do atleta. Alimenta o "quem já viu" do treinador. */
@Entity
@Table(name = "jogada_visualizacao")
public class JogadaVisualizacao {

    @EmbeddedId
    private Id id;

    @Column(name = "visualizada_em", insertable = false, updatable = false)
    private LocalDateTime visualizadaEm;

    protected JogadaVisualizacao() { }

    public JogadaVisualizacao(Integer idJogada, Integer idAtividade, Integer idUsuario) {
        this.id = new Id(idJogada, idAtividade, idUsuario);
    }

    public Id getId() { return id; }
    public LocalDateTime getVisualizadaEm() { return visualizadaEm; }

    @Embeddable
    public static class Id implements Serializable {
        @Column(name = "id_jogada")    private Integer idJogada;
        @Column(name = "id_atividade") private Integer idAtividade;
        @Column(name = "id_usuario")   private Integer idUsuario;

        protected Id() { }
        public Id(Integer idJogada, Integer idAtividade, Integer idUsuario) {
            this.idJogada = idJogada;
            this.idAtividade = idAtividade;
            this.idUsuario = idUsuario;
        }
        public Integer getIdJogada() { return idJogada; }
        public Integer getIdAtividade() { return idAtividade; }
        public Integer getIdUsuario() { return idUsuario; }

        @Override public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof Id x)) return false;
            return Objects.equals(idJogada, x.idJogada)
                && Objects.equals(idAtividade, x.idAtividade)
                && Objects.equals(idUsuario, x.idUsuario);
        }
        @Override public int hashCode() { return Objects.hash(idJogada, idAtividade, idUsuario); }
    }
}
