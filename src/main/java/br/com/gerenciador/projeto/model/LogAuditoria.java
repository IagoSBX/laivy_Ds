package br.com.gerenciador.projeto.model;

import java.time.LocalDateTime;

import jakarta.persistence.*;

/**
 * Uma linha do log de atividades: quem fez o quê, em qual item e de onde.
 * Nome e perfil do usuário são copiados no momento da ação, para o registro
 * continuar legível mesmo depois que o usuário for excluído.
 */
@Entity
@Table(name = "tbl_log_auditoria")
public class LogAuditoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_log")
    private Long id_log;

    @Column(name = "data_hora", nullable = false)
    private LocalDateTime data_hora;

    @Column(name = "id_usuario")
    private Integer id_usuario;

    @Column(name = "nome_usuario")
    private String nome_usuario;

    @Column(name = "tipo_usuario")
    private Integer tipo_usuario;

    @Column(name = "id_time")
    private Integer id_time;

    @Column(name = "acao", length = 30, nullable = false)
    private String acao;

    @Column(name = "descricao", nullable = false)
    private String descricao;

    @Column(name = "recurso", length = 40)
    private String recurso;

    @Column(name = "id_recurso")
    private Integer id_recurso;

    @Column(name = "detalhe")
    private String detalhe;

    @Column(name = "metodo", length = 8)
    private String metodo;

    @Column(name = "caminho")
    private String caminho;

    @Column(name = "status_http")
    private Integer status_http;

    @Column(name = "sucesso", nullable = false)
    private Boolean sucesso;

    @Column(name = "ip", length = 45)
    private String ip;

    public LogAuditoria() {}

    public Long getId_log() { return id_log; }
    public void setId_log(Long id_log) { this.id_log = id_log; }

    public LocalDateTime getData_hora() { return data_hora; }
    public void setData_hora(LocalDateTime data_hora) { this.data_hora = data_hora; }

    public Integer getId_usuario() { return id_usuario; }
    public void setId_usuario(Integer id_usuario) { this.id_usuario = id_usuario; }

    public String getNome_usuario() { return nome_usuario; }
    public void setNome_usuario(String nome_usuario) { this.nome_usuario = nome_usuario; }

    public Integer getTipo_usuario() { return tipo_usuario; }
    public void setTipo_usuario(Integer tipo_usuario) { this.tipo_usuario = tipo_usuario; }

    public Integer getId_time() { return id_time; }
    public void setId_time(Integer id_time) { this.id_time = id_time; }

    public String getAcao() { return acao; }
    public void setAcao(String acao) { this.acao = acao; }

    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }

    public String getRecurso() { return recurso; }
    public void setRecurso(String recurso) { this.recurso = recurso; }

    public Integer getId_recurso() { return id_recurso; }
    public void setId_recurso(Integer id_recurso) { this.id_recurso = id_recurso; }

    public String getDetalhe() { return detalhe; }
    public void setDetalhe(String detalhe) { this.detalhe = detalhe; }

    public String getMetodo() { return metodo; }
    public void setMetodo(String metodo) { this.metodo = metodo; }

    public String getCaminho() { return caminho; }
    public void setCaminho(String caminho) { this.caminho = caminho; }

    public Integer getStatus_http() { return status_http; }
    public void setStatus_http(Integer status_http) { this.status_http = status_http; }

    public Boolean getSucesso() { return sucesso; }
    public void setSucesso(Boolean sucesso) { this.sucesso = sucesso; }

    public String getIp() { return ip; }
    public void setIp(String ip) { this.ip = ip; }
}
