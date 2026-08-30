package br.com.gerenciador.projeto.model;

import jakarta.persistence.*;
import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Objects;

/** Vínculo N:N entre uma jogada da biblioteca e um treino/jogo do calendário. */
@Entity
@Table(name = "atividade_jogada")
public class AtividadeJogada {

    @EmbeddedId
    private Id id;

    @ManyToOne(fetch = FetchType.LAZY) @MapsId("idAtividade")
    @JoinColumn(name = "id_atividade")
    private Atividade atividade;

    @ManyToOne(fetch = FetchType.LAZY) @MapsId("idJogada")
    @JoinColumn(name = "id_jogada")
    private Jogada jogada;

    @Column(nullable = false)
    private Integer ordem = 0;

    @Column(columnDefinition = "TEXT")
    private String observacoes;

    @Column(name = "criado_em", insertable = false, updatable = false)
    private LocalDateTime criadoEm;

    protected AtividadeJogada() { }

    public AtividadeJogada(Atividade atividade, Jogada jogada, int ordem, String observacoes) {
        this.atividade = atividade;
        this.jogada = jogada;
        this.ordem = ordem;
        this.observacoes = observacoes;
        this.id = new Id(atividade.getId_atividade(), jogada.getId());
    }

    public Atividade getAtividade() { return atividade; }
    public Jogada getJogada() { return jogada; }
    public Integer getOrdem() { return ordem; }
    public void setOrdem(Integer ordem) { this.ordem = ordem; }
    public String getObservacoes() { return observacoes; }
    public void setObservacoes(String o) { this.observacoes = o; }

    @Embeddable
    public static class Id implements Serializable {
        @Column(name = "id_atividade") private Integer idAtividade;
        @Column(name = "id_jogada")    private Integer idJogada;

        protected Id() { }
        public Id(Integer idAtividade, Integer idJogada) {
            this.idAtividade = idAtividade;
            this.idJogada = idJogada;
        }
        @Override public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof Id other)) return false;
            return Objects.equals(idAtividade, other.idAtividade)
                && Objects.equals(idJogada, other.idJogada);
        }
        @Override public int hashCode() { return Objects.hash(idAtividade, idJogada); }
    }
}
