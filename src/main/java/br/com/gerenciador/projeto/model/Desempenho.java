package br.com.gerenciador.projeto.model;

import java.time.LocalDate;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.*;

@Entity
@Table(name = "tbl_desempenho")
public class Desempenho {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_desempenho")
    private Integer id_desempenho;

    @Column(name = "posicao_usuario")
    private Integer posicao_usuario;

    @Column(name = "data_desempenho")
    private LocalDate data_desempenho;

    @Column(name = "salto_horizontal")
    private Double salto_horizontal;

    @Column(name = "salto_vertical")
    private Double salto_vertical;

    @Column(name = "pontuacao")
    private Integer pontuacao;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_usuario")
    @JsonIgnoreProperties("desempenhos")
    private Usuario usuario;

    public Desempenho() {}

    public Integer getId_desempenho() { return id_desempenho; }
    public void setId_desempenho(Integer id_desempenho) { this.id_desempenho = id_desempenho; }

    public Integer getPosicao_usuario() { return posicao_usuario; }
    public void setPosicao_usuario(Integer posicao_usuario) { this.posicao_usuario = posicao_usuario; }

    public LocalDate getData_desempenho() { return data_desempenho; }
    public void setData_desempenho(LocalDate data_desempenho) { this.data_desempenho = data_desempenho; }

    public Double getSalto_horizontal() { return salto_horizontal; }
    public void setSalto_horizontal(Double salto_horizontal) { this.salto_horizontal = salto_horizontal; }

    public Double getSalto_vertical() { return salto_vertical; }
    public void setSalto_vertical(Double salto_vertical) { this.salto_vertical = salto_vertical; }

    public Integer getPontuacao() { return pontuacao; }
    public void setPontuacao(Integer pontuacao) { this.pontuacao = pontuacao; }

    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
}
