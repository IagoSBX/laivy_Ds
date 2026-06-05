package br.com.gerenciador.projeto.model;

import java.util.List;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

@Entity
@Table(name = "tbl_time")
public class Time {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_time")
    private Integer id_time;

    @Column(name = "nome_time", nullable = false, length = 100)
    private String nome_time;

    @Column(name = "modalidade_time", length = 60)
    private String modalidade_time;

    @Column(name = "categoria_time", length = 60)
    private String categoria_time; // Sub-13, Sub-15, Sub-17, Adulto, etc.

    @Column(name = "cor_time", length = 20)
    private String cor_time; // hex color

    @Column(name = "descricao_time", columnDefinition = "TEXT")
    private String descricao_time;

    @Column(name = "ativo_time")
    private Integer ativo_time; // 1=ativo, 0=inativo

    @Column(name = "logo_time", columnDefinition = "MEDIUMTEXT")
    private String logo_time; // Base64

    // Treinador responsável pelo time
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_treinador")
    private Usuario treinador;

    @OneToMany(mappedBy = "time", cascade = CascadeType.ALL)
    @JsonIgnore
    private List<Usuario> membros;

    public Time() {}

    public Integer getId_time() { return id_time; }
    public void setId_time(Integer id_time) { this.id_time = id_time; }
    public String getNome_time() { return nome_time; }
    public void setNome_time(String nome_time) { this.nome_time = nome_time; }
    public String getModalidade_time() { return modalidade_time; }
    public void setModalidade_time(String modalidade_time) { this.modalidade_time = modalidade_time; }
    public String getCategoria_time() { return categoria_time; }
    public void setCategoria_time(String categoria_time) { this.categoria_time = categoria_time; }
    public String getCor_time() { return cor_time; }
    public void setCor_time(String cor_time) { this.cor_time = cor_time; }
    public String getDescricao_time() { return descricao_time; }
    public void setDescricao_time(String descricao_time) { this.descricao_time = descricao_time; }
    public Integer getAtivo_time() { return ativo_time; }
    public void setAtivo_time(Integer ativo_time) { this.ativo_time = ativo_time; }
    public String getLogo_time() { return logo_time; }
    public void setLogo_time(String logo_time) { this.logo_time = logo_time; }
    public Usuario getTreinador() { return treinador; }
    public void setTreinador(Usuario treinador) { this.treinador = treinador; }
    public List<Usuario> getMembros() { return membros; }
    public void setMembros(List<Usuario> membros) { this.membros = membros; }
}
