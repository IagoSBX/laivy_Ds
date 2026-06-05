package br.com.gerenciador.projeto.model;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.*;

@Entity
@Table(name = "tbl_calendario")
public class Calendario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_calendario")
    private Integer id_calendario;

    @Column(name = "observacoes", length = 100)
    private String observacoes;

    @Column(name = "placar_pro")
    private Integer placar_pro;

    @Column(name = "placar_contra")
    private Integer placar_contra;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_usuario")
    @JsonIgnoreProperties("calendarios")
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_atividade")
    @JsonIgnoreProperties("calendarios")
    private Atividade atividade;

    @OneToMany(mappedBy = "calendario", cascade = CascadeType.ALL)
    @JsonIgnoreProperties("calendario")
    private List<Visitante> visitantes;

    public Calendario() {}

    public Integer getId_calendario() { return id_calendario; }
    public void setId_calendario(Integer id_calendario) { this.id_calendario = id_calendario; }

    public String getObservacoes() { return observacoes; }
    public void setObservacoes(String observacoes) { this.observacoes = observacoes; }

    public Integer getPlacar_pro() { return placar_pro; }
    public void setPlacar_pro(Integer placar_pro) { this.placar_pro = placar_pro; }

    public Integer getPlacar_contra() { return placar_contra; }
    public void setPlacar_contra(Integer placar_contra) { this.placar_contra = placar_contra; }

    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }

    public Atividade getAtividade() { return atividade; }
    public void setAtividade(Atividade atividade) { this.atividade = atividade; }

    public List<Visitante> getVisitantes() { return visitantes; }
    public void setVisitantes(List<Visitante> visitantes) { this.visitantes = visitantes; }
}
