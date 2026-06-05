package br.com.gerenciador.projeto.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.*;

@Entity
@Table(name = "tbl_visitante")
public class Visitante {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_visitante")
    private Integer id_visitante;

    @Column(name = "nome_visitante", length = 100)
    private String nome_visitante;

    @Column(name = "municipio_visitante", length = 100)
    private String municipio_visitante;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_calendario")
    @JsonIgnoreProperties("visitantes")
    private Calendario calendario;

    public Visitante() {}

    public Integer getId_visitante() { return id_visitante; }
    public void setId_visitante(Integer id_visitante) { this.id_visitante = id_visitante; }

    public String getNome_visitante() { return nome_visitante; }
    public void setNome_visitante(String nome_visitante) { this.nome_visitante = nome_visitante; }

    public String getMunicipio_visitante() { return municipio_visitante; }
    public void setMunicipio_visitante(String municipio_visitante) { this.municipio_visitante = municipio_visitante; }

    public Calendario getCalendario() { return calendario; }
    public void setCalendario(Calendario calendario) { this.calendario = calendario; }
}
