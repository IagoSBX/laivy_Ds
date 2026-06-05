package br.com.gerenciador.projeto.model;

import java.time.LocalDate;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "tbl_usuario")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_usuario")
    private Integer id_usuario;

    @Column(name = "nome_usuario", nullable = false, length = 100)
    private String nome_usuario;

    @Column(name = "email_usuario", nullable = false, unique = true, length = 100)
    private String email_usuario;

    @Column(name = "login_usuario", nullable = false, unique = true, length = 45)
    private String login_usuario;

    @Column(name = "senha_usuario", nullable = false, length = 100)
    private String senha_usuario;

    @Column(name = "primeiro_login")
    private Integer primeiro_login; // 1=deve trocar senha no primeiro login, 0=já redefiniu

    @Column(name = "tipo_usuario", nullable = false)
    private Integer tipo_usuario; // 1=Admin, 2=Treinador, 3=Atleta

    @JsonFormat(pattern = "yyyy-MM-dd")
    @Column(name = "data_nasc_usuario")
    private LocalDate data_nasc_usuario;

    @Column(name = "foto_usuario", columnDefinition = "MEDIUMTEXT")
    private String foto_usuario;

    @Column(name = "endereco_usuario", length = 100)
    private String endereco_usuario;

    @Column(name = "bairro_usuario", length = 60)
    private String bairro_usuario;

    @Column(name = "cep_usuario", length = 20)
    private String cep_usuario;

    @Column(name = "cidade_usuario", length = 60)
    private String cidade_usuario;

    @Column(name = "estado_usuario", length = 45)
    private String estado_usuario;

    @Column(name = "cel_usuario", length = 20)
    private String cel_usuario;

    @Column(name = "cpf_usuario", length = 20)
    private String cpf_usuario;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_time")
    @JsonIgnoreProperties({"membros","treinador"})
    private Time time;

    @Column(name = "rg_responsavel_1", length = 45)
    private String rg_responsavel_1;

    @Column(name = "rg_responsavel_2", length = 45)
    private String rg_responsavel_2;

    @Column(name = "cpf_responsavel_1", length = 45)
    private String cpf_responsavel_1;

    @Column(name = "cpf_responsavel_2", length = 45)
    private String cpf_responsavel_2;

    @Column(name = "cel_responsavel_1", length = 20)
    private String cel_responsavel_1;

    @Column(name = "cel_responsavel_2", length = 20)
    private String cel_responsavel_2;

    // ==================== GETTER/SETTER TIME ====================
    public Time getTime() { return time; }
    public void setTime(Time time) { this.time = time; }

    // ==================== RELACIONAMENTOS ====================

    @OneToMany(mappedBy = "usuario", cascade = CascadeType.ALL)
    @JsonIgnore
    private List<Exame> exames;

    @OneToMany(mappedBy = "usuario", cascade = CascadeType.ALL)
    @JsonIgnore
    private List<Desempenho> desempenhos;

    @OneToMany(mappedBy = "usuario", cascade = CascadeType.ALL)
    @JsonIgnore
    private List<Atividade> atividades;

    @OneToMany(mappedBy = "usuario", cascade = CascadeType.ALL)
    @JsonIgnore
    private List<Calendario> calendarios;

    public Usuario() {}

    // ==================== GETTERS E SETTERS ====================

    public Integer getId_usuario() { return id_usuario; }
    public void setId_usuario(Integer id_usuario) { this.id_usuario = id_usuario; }

    public String getNome_usuario() { return nome_usuario; }
    public void setNome_usuario(String nome_usuario) { this.nome_usuario = nome_usuario; }

    public String getEmail_usuario() { return email_usuario; }
    public void setEmail_usuario(String email_usuario) { this.email_usuario = email_usuario; }

    public String getLogin_usuario() { return login_usuario; }
    public void setLogin_usuario(String login_usuario) { this.login_usuario = login_usuario; }

    public String getSenha_usuario() { return senha_usuario; }
    public void setSenha_usuario(String senha_usuario) { this.senha_usuario = senha_usuario; }

    public Integer getPrimeiro_login() { return primeiro_login; }
    public void setPrimeiro_login(Integer primeiro_login) { this.primeiro_login = primeiro_login; }

    public Integer getTipo_usuario() { return tipo_usuario; }
    public void setTipo_usuario(Integer tipo_usuario) { this.tipo_usuario = tipo_usuario; }

    public LocalDate getData_nasc_usuario() { return data_nasc_usuario; }
    public void setData_nasc_usuario(LocalDate data_nasc_usuario) { this.data_nasc_usuario = data_nasc_usuario; }

    public String getFoto_usuario() { return foto_usuario; }
    public void setFoto_usuario(String foto_usuario) { this.foto_usuario = foto_usuario; }

    public String getEndereco_usuario() { return endereco_usuario; }
    public void setEndereco_usuario(String endereco_usuario) { this.endereco_usuario = endereco_usuario; }

    public String getBairro_usuario() { return bairro_usuario; }
    public void setBairro_usuario(String bairro_usuario) { this.bairro_usuario = bairro_usuario; }

    public String getCep_usuario() { return cep_usuario; }
    public void setCep_usuario(String cep_usuario) { this.cep_usuario = cep_usuario; }

    public String getCidade_usuario() { return cidade_usuario; }
    public void setCidade_usuario(String cidade_usuario) { this.cidade_usuario = cidade_usuario; }

    public String getEstado_usuario() { return estado_usuario; }
    public void setEstado_usuario(String estado_usuario) { this.estado_usuario = estado_usuario; }

    public String getCel_usuario() { return cel_usuario; }
    public void setCel_usuario(String cel_usuario) { this.cel_usuario = cel_usuario; }

    public String getCpf_usuario() { return cpf_usuario; }
    public void setCpf_usuario(String cpf_usuario) { this.cpf_usuario = cpf_usuario; }

    public String getRg_responsavel_1() { return rg_responsavel_1; }
    public void setRg_responsavel_1(String rg_responsavel_1) { this.rg_responsavel_1 = rg_responsavel_1; }

    public String getRg_responsavel_2() { return rg_responsavel_2; }
    public void setRg_responsavel_2(String rg_responsavel_2) { this.rg_responsavel_2 = rg_responsavel_2; }

    public String getCpf_responsavel_1() { return cpf_responsavel_1; }
    public void setCpf_responsavel_1(String cpf_responsavel_1) { this.cpf_responsavel_1 = cpf_responsavel_1; }

    public String getCpf_responsavel_2() { return cpf_responsavel_2; }
    public void setCpf_responsavel_2(String cpf_responsavel_2) { this.cpf_responsavel_2 = cpf_responsavel_2; }

    public String getCel_responsavel_1() { return cel_responsavel_1; }
    public void setCel_responsavel_1(String cel_responsavel_1) { this.cel_responsavel_1 = cel_responsavel_1; }

    public String getCel_responsavel_2() { return cel_responsavel_2; }
    public void setCel_responsavel_2(String cel_responsavel_2) { this.cel_responsavel_2 = cel_responsavel_2; }

    public List<Exame> getExames() { return exames; }
    public void setExames(List<Exame> exames) { this.exames = exames; }

    public List<Desempenho> getDesempenhos() { return desempenhos; }
    public void setDesempenhos(List<Desempenho> desempenhos) { this.desempenhos = desempenhos; }

    public List<Atividade> getAtividades() { return atividades; }
    public void setAtividades(List<Atividade> atividades) { this.atividades = atividades; }

    public List<Calendario> getCalendarios() { return calendarios; }
    public void setCalendarios(List<Calendario> calendarios) { this.calendarios = calendarios; }
}
