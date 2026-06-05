package br.com.gerenciador.projeto.model;

import java.time.LocalDate;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.*;

@Entity
@Table(name = "tbl_exame")
public class Exame {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_exame")
    private Integer id_exame;

    @Column(name = "data_inicio_exame")
    private LocalDate data_inicio_exame;

    @Column(name = "data_fim_exame")
    private LocalDate data_fim_exame;

    @Column(name = "observacoes_exame", columnDefinition = "TEXT")
    private String observacoes_exame;

    @Column(name = "altura_usuario")
    private Double altura_usuario;

    @Column(name = "peso_usuario")
    private Double peso_usuario;

    @Column(name = "taxa_gordura_usuario")
    private Double taxa_gordura_usuario;

    @Column(name = "status_usuario")
    private Integer status_usuario; // 0=Inapto, 1=Apto

    @Column(name = "foto_exame", length = 255)
    private String foto_exame;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_usuario")
    @JsonIgnoreProperties("exames")
    private Usuario usuario;

    public Exame() {}

    public Integer getId_exame() { return id_exame; }
    public void setId_exame(Integer id_exame) { this.id_exame = id_exame; }

    public LocalDate getData_inicio_exame() { return data_inicio_exame; }
    public void setData_inicio_exame(LocalDate data_inicio_exame) { this.data_inicio_exame = data_inicio_exame; }

    public LocalDate getData_fim_exame() { return data_fim_exame; }
    public void setData_fim_exame(LocalDate data_fim_exame) { this.data_fim_exame = data_fim_exame; }

    public String getObservacoes_exame() { return observacoes_exame; }
    public void setObservacoes_exame(String observacoes_exame) { this.observacoes_exame = observacoes_exame; }

    public Double getAltura_usuario() { return altura_usuario; }
    public void setAltura_usuario(Double altura_usuario) { this.altura_usuario = altura_usuario; }

    public Double getPeso_usuario() { return peso_usuario; }
    public void setPeso_usuario(Double peso_usuario) { this.peso_usuario = peso_usuario; }

    public Double getTaxa_gordura_usuario() { return taxa_gordura_usuario; }
    public void setTaxa_gordura_usuario(Double taxa_gordura_usuario) { this.taxa_gordura_usuario = taxa_gordura_usuario; }

    public Integer getStatus_usuario() { return status_usuario; }
    public void setStatus_usuario(Integer status_usuario) { this.status_usuario = status_usuario; }

    public String getFoto_exame() { return foto_exame; }
    public void setFoto_exame(String foto_exame) { this.foto_exame = foto_exame; }

    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
}
