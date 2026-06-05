package br.com.gerenciador.projeto.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;

@Entity
@Table(name = "tbl_escalacao")
public class Escalacao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_escalacao")
    private Integer id_escalacao;

    @Column(name = "numero_camisa")
    private Integer numero_camisa;

    @Column(name = "posicao", length = 50)
    private String posicao;

    @Column(name = "titular")
    private Integer titular; // 1=Titular, 0=Reserva

    @Column(name = "pontos_jogo")
    private Integer pontos_jogo; // Pontos marcados pelo jogador neste jogo

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_atividade")
    @JsonIgnoreProperties("escalacoes")
    private Atividade atividade;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_usuario")
    @JsonIgnoreProperties("escalacoes")
    private Usuario usuario;

    public Escalacao() {}

    public Integer getId_escalacao() { return id_escalacao; }
    public void setId_escalacao(Integer id_escalacao) { this.id_escalacao = id_escalacao; }
    public Integer getNumero_camisa() { return numero_camisa; }
    public void setNumero_camisa(Integer numero_camisa) { this.numero_camisa = numero_camisa; }
    public String getPosicao() { return posicao; }
    public void setPosicao(String posicao) { this.posicao = posicao; }
    public Integer getTitular() { return titular; }
    public void setTitular(Integer titular) { this.titular = titular; }
    public Integer getPontos_jogo() { return pontos_jogo; }
    public void setPontos_jogo(Integer pontos_jogo) { this.pontos_jogo = pontos_jogo; }
    public Atividade getAtividade() { return atividade; }
    public void setAtividade(Atividade atividade) { this.atividade = atividade; }
    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
}
