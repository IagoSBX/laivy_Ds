package br.com.gerenciador.projeto.model;

import br.com.gerenciador.projeto.model.json.JogadaConteudo;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

/**
 * Jogada da biblioteca do time.
 *
 * Vive SOZINHA: não tem FK para Atividade. O vínculo com treino/jogo é
 * N:N via {@link AtividadeJogada}, que é o que permite a mesma jogada
 * servir ao treino de terça e ao jogo de sábado.
 *
 * Não substitui nem reaproveita Escalacao. Escalacao responde "quem joga"
 * (papel, número, titular, pontos, sempre presa a uma Atividade). Jogada
 * responde "como se joga". Conceitos ortogonais que convivem.
 */
@Entity
@Table(name = "jogada")
public class Jogada {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_time")
    private Time time;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_criador")
    private Usuario criador;

    @Column(nullable = false, length = 120)
    private String nome;

    /**
     * Hibernate 6 (Spring Boot 3.2) serializa o record direto na coluna JSON
     * do MySQL. Sem AttributeConverter escrito à mão, sem @Lob String.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "conteudo", nullable = false, columnDefinition = "json")
    private JogadaConteudo conteudo;

    /** Trava otimista. Dois auxiliares na mesma jogada -> OptimisticLockException -> 409. */
    @Version
    private Long versao;

    // ---- Colunas GERADAS pelo MySQL --------------------------------------
    // insertable/updatable = false é obrigatório: sem isso o Hibernate tenta
    // escrever nelas no INSERT e o MySQL rejeita. Pegadinha número um.

    @Column(name = "tipo", insertable = false, updatable = false)
    private String tipo;

    @Column(name = "qtd_frames", insertable = false, updatable = false)
    private Integer qtdFrames;

    @Column(name = "schema_ver", insertable = false, updatable = false)
    private Integer schemaVer;

    @Column(name = "criado_em", insertable = false, updatable = false)
    private LocalDateTime criadoEm;

    @Column(name = "atualizado_em", insertable = false, updatable = false)
    private LocalDateTime atualizadoEm;

    @Column(name = "arquivada_em")
    private LocalDateTime arquivadaEm;

    protected Jogada() { }

    public Jogada(Time time, Usuario criador, String nome, JogadaConteudo conteudo) {
        this.time = time;
        this.criador = criador;
        this.nome = nome;
        this.conteudo = conteudo;
    }

    public void arquivar() { this.arquivadaEm = LocalDateTime.now(); }

    public Integer getId() { return id; }
    public Time getTime() { return time; }
    public Usuario getCriador() { return criador; }
    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public JogadaConteudo getConteudo() { return conteudo; }
    public void setConteudo(JogadaConteudo c) { this.conteudo = c; }
    public Long getVersao() { return versao; }
    public String getTipo() { return tipo; }
    public Integer getQtdFrames() { return qtdFrames; }
    public Integer getSchemaVer() { return schemaVer; }
    public LocalDateTime getCriadoEm() { return criadoEm; }
    public LocalDateTime getAtualizadoEm() { return atualizadoEm; }
    public LocalDateTime getArquivadaEm() { return arquivadaEm; }
}
