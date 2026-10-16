package br.com.gerenciador.projeto.model;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.*;

/** Uma cobrança PIX de um mês de plano. PENDENTE até o gateway confirmar; PAGA vale até valida_ate. */
@Entity
@Table(name = "tbl_assinatura")
public class Assinatura {

    public static final String PENDENTE = "PENDENTE";
    public static final String PAGA = "PAGA";
    public static final String CANCELADA = "CANCELADA";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_assinatura")
    private Integer id_assinatura;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario", nullable = false)
    private Usuario usuario;

    @Enumerated(EnumType.STRING)
    @Column(name = "plano", nullable = false, length = 10)
    private Plano plano;

    @Column(name = "valor_centavos", nullable = false)
    private Integer valor_centavos;

    @Column(name = "status", nullable = false, length = 12)
    private String status;

    @JsonIgnore
    @Column(name = "id_pagamento", length = 40)
    private String id_pagamento;

    @Column(name = "pix_copia_cola", length = 1000)
    private String pix_copia_cola;

    @Column(name = "pix_qr_base64", columnDefinition = "MEDIUMTEXT")
    private String pix_qr_base64;

    @Column(name = "pix_expira")
    private LocalDateTime pix_expira;

    @Column(name = "criada_em", nullable = false)
    private LocalDateTime criada_em;

    @Column(name = "paga_em")
    private LocalDateTime paga_em;

    @Column(name = "valida_ate")
    private LocalDateTime valida_ate;

    public Integer getId_assinatura() { return id_assinatura; }
    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
    public Plano getPlano() { return plano; }
    public void setPlano(Plano plano) { this.plano = plano; }
    public Integer getValor_centavos() { return valor_centavos; }
    public void setValor_centavos(Integer valor_centavos) { this.valor_centavos = valor_centavos; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getId_pagamento() { return id_pagamento; }
    public void setId_pagamento(String id_pagamento) { this.id_pagamento = id_pagamento; }
    public String getPix_copia_cola() { return pix_copia_cola; }
    public void setPix_copia_cola(String pix_copia_cola) { this.pix_copia_cola = pix_copia_cola; }
    public String getPix_qr_base64() { return pix_qr_base64; }
    public void setPix_qr_base64(String pix_qr_base64) { this.pix_qr_base64 = pix_qr_base64; }
    public LocalDateTime getPix_expira() { return pix_expira; }
    public void setPix_expira(LocalDateTime pix_expira) { this.pix_expira = pix_expira; }
    public LocalDateTime getCriada_em() { return criada_em; }
    public void setCriada_em(LocalDateTime criada_em) { this.criada_em = criada_em; }
    public LocalDateTime getPaga_em() { return paga_em; }
    public void setPaga_em(LocalDateTime paga_em) { this.paga_em = paga_em; }
    public LocalDateTime getValida_ate() { return valida_ate; }
    public void setValida_ate(LocalDateTime valida_ate) { this.valida_ate = valida_ate; }
}
