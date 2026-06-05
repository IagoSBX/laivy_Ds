package br.com.gerenciador.projeto.model;

import java.time.LocalDateTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.*;

@Entity
@Table(name = "tbl_atividade")
public class Atividade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_atividade")
    private Integer id_atividade;

    @Column(name = "nome_atividade", nullable = false, length = 100)
    private String nome_atividade;

    @Column(name = "lugar_atividade", length = 60)
    private String lugar_atividade;

    @Column(name = "data_atividade")
    private LocalDateTime data_atividade;

    @Column(name = "status_atividade")
    private Integer status_atividade; // 0=Cancelado, 1=Ativo, 2=Finalizado

    @Column(name = "tipo_atividade")
    private Integer tipo_atividade; // 1=Treino, 2=Jogo, 3=Evento, 4=Competição

    @Column(name = "time_oponente", length = 100)
    private String time_oponente;

    @Column(name = "placar_pro")
    private Integer placar_pro;

    @Column(name = "placar_contra")
    private Integer placar_contra;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_usuario")
    @JsonIgnoreProperties("atividades")
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_time")
    @JsonIgnoreProperties({"membros", "treinador"})
    private Time time;

    @OneToMany(mappedBy = "atividade", cascade = CascadeType.ALL)
    @JsonIgnoreProperties("atividade")
    private List<Calendario> calendario;

    public Atividade() {}

    public Integer getId_atividade() { return id_atividade; }
    public void setId_atividade(Integer id_atividade) { this.id_atividade = id_atividade; }

    public String getNome_atividade() { return nome_atividade; }
    public void setNome_atividade(String nome_atividade) { this.nome_atividade = nome_atividade; }

    public String getLugar_atividade() { return lugar_atividade; }
    public void setLugar_atividade(String lugar_atividade) { this.lugar_atividade = lugar_atividade; }

    public LocalDateTime getData_atividade() { return data_atividade; }
    public void setData_atividade(LocalDateTime data_atividade) { this.data_atividade = data_atividade; }

    public Integer getStatus_atividade() { return status_atividade; }
    public void setStatus_atividade(Integer status_atividade) { this.status_atividade = status_atividade; }

    public Integer getTipo_atividade() { return tipo_atividade; }
    public void setTipo_atividade(Integer tipo_atividade) { this.tipo_atividade = tipo_atividade; }

    public String getTime_oponente() { return time_oponente; }
    public void setTime_oponente(String time_oponente) { this.time_oponente = time_oponente; }

    public Integer getPlacar_pro() { return placar_pro; }
    public void setPlacar_pro(Integer placar_pro) { this.placar_pro = placar_pro; }

    public Integer getPlacar_contra() { return placar_contra; }
    public void setPlacar_contra(Integer placar_contra) { this.placar_contra = placar_contra; }

    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }

    public Time getTime() { return time; }
    public void setTime(Time time) { this.time = time; }

    public List<Calendario> getCalendarios() { return calendario; }
    public void setCalendarios(List<Calendario> calendario) { this.calendario = calendario; }
}
