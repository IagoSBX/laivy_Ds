package br.com.gerenciador.projeto.service;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.fasterxml.jackson.databind.JsonNode;

import br.com.gerenciador.projeto.exception.BadRequestException;

/**
 * Cobrança PIX pelo Mercado Pago (API /v1/payments). O token fica só no
 * servidor (MERCADOPAGO_ACCESS_TOKEN). Sem token, o PIX fica indisponível —
 * a não ser com PAGAMENTO_SIMULADO=true, que é só para desenvolvimento: gera
 * um código de mentira e libera o botão "Simular pagamento".
 */
@Service
public class PixGateway {

    private static final Logger log = LoggerFactory.getLogger(PixGateway.class);
    private static final String API = "https://api.mercadopago.com";
    /** Por quanto tempo o QR Code vale. */
    public static final int VALIDADE_PIX_MIN = 30;

    @Value("${pagamento.mercadopago.token:}")
    private String token;

    @Value("${pagamento.simulado:false}")
    private boolean simulado;

    @Value("${app.url}")
    private String appUrl;

    private final RestClient http = RestClient.create(API);

    public record Cobranca(String idPagamento, String copiaCola, String qrBase64, OffsetDateTime expira) {}

    /** Situação de um pagamento no gateway (o valor e a referência servem para conferir que é o nosso). */
    public record Situacao(boolean aprovado, boolean encerrado, BigDecimal valor, String referencia) {}

    public boolean simulado() { return simulado; }

    public Cobranca criar(int valorCentavos, String descricao, String emailPagador, String referencia) {
        OffsetDateTime expira = OffsetDateTime.now(ZoneOffset.of("-03:00")).plusMinutes(VALIDADE_PIX_MIN);
        if (simulado) {
            String id = "SIM-" + UUID.randomUUID().toString().substring(0, 18);
            return new Cobranca(id, "PIX-SIMULADO|" + referencia + "|" + valorCentavos, null, expira);
        }
        exigirToken();

        Map<String, Object> corpo = new LinkedHashMap<>();
        corpo.put("transaction_amount", BigDecimal.valueOf(valorCentavos, 2));
        corpo.put("description", descricao);
        corpo.put("payment_method_id", "pix");
        corpo.put("payer", Map.of("email", emailPagador));
        corpo.put("external_reference", referencia);
        corpo.put("date_of_expiration", expira.format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSXXX")));
        // O Mercado Pago só chama endereço público em HTTPS; em dev a tela consulta o status sozinha.
        if (appUrl.startsWith("https://"))
            corpo.put("notification_url", appUrl + "/assinaturas/webhook/mercadopago");

        try {
            JsonNode r = http.post().uri("/v1/payments")
                .header("Authorization", "Bearer " + token)
                .header("X-Idempotency-Key", UUID.randomUUID().toString())
                .contentType(MediaType.APPLICATION_JSON)
                .body(corpo)
                .retrieve()
                .body(JsonNode.class);
            JsonNode dados = r.path("point_of_interaction").path("transaction_data");
            return new Cobranca(r.path("id").asText(), dados.path("qr_code").asText(null),
                dados.path("qr_code_base64").asText(null), expira);
        } catch (RestClientException e) {
            log.warn("Mercado Pago recusou a criação do PIX: {}", e.getMessage());
            throw new BadRequestException("Não foi possível gerar o PIX agora. Tente novamente em instantes.");
        }
    }

    /** Consulta no gateway; null se não deu para consultar agora. */
    public Situacao consultar(String idPagamento) {
        if (idPagamento == null || idPagamento.startsWith("SIM-") || token == null || token.isBlank()) return null;
        if (!idPagamento.matches("\\d{1,30}")) return null; // só ids do Mercado Pago vão na URL
        try {
            JsonNode r = http.get().uri("/v1/payments/{id}", idPagamento)
                .header("Authorization", "Bearer " + token)
                .retrieve()
                .body(JsonNode.class);
            String status = r.path("status").asText("");
            boolean encerrado = switch (status) {
                case "rejected", "cancelled", "refunded", "charged_back" -> true;
                default -> false;
            };
            return new Situacao("approved".equals(status), encerrado,
                r.path("transaction_amount").decimalValue(), r.path("external_reference").asText(null));
        } catch (RestClientException e) {
            log.warn("Falha ao consultar o pagamento {} no Mercado Pago: {}", idPagamento, e.getMessage());
            return null;
        }
    }

    private void exigirToken() {
        if (token == null || token.isBlank())
            throw new BadRequestException("Pagamento por PIX ainda não está configurado. Fale com o suporte do LAIVY.");
    }
}
