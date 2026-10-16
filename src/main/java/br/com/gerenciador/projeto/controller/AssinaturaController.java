package br.com.gerenciador.projeto.controller;

import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.fasterxml.jackson.databind.JsonNode;

import br.com.gerenciador.projeto.security.JwtFilter;
import br.com.gerenciador.projeto.service.AssinaturaService;

/** Tela de planos do treinador autocadastrado: teste grátis, PIX e confirmação do pagamento. */
@RestController
@RequestMapping("/assinaturas")
public class AssinaturaController {

    @Autowired private AssinaturaService service;

    private static Integer authId(HttpServletRequest r) { return (Integer) r.getAttribute(JwtFilter.ATTR_ID); }

    // ── GET /assinaturas/minha ── situação, plano vigente e PIX pendente
    @GetMapping("/minha")
    public Map<String, Object> minha(HttpServletRequest request) {
        return service.minha(authId(request));
    }

    // ── POST /assinaturas/teste ── começa os 7 dias de teste
    @PostMapping("/teste")
    public Map<String, Object> iniciarTeste(HttpServletRequest request) {
        return service.iniciarTeste(authId(request));
    }

    // ── POST /assinaturas/pix ── { "plano": "BASIC" | "PRO" | "FULL" }
    @PostMapping("/pix")
    public Map<String, Object> gerarPix(@RequestBody Map<String, String> body, HttpServletRequest request) {
        return service.gerarPix(authId(request), body.get("plano"));
    }

    // ── POST /assinaturas/simular-pagamento ── só com PAGAMENTO_SIMULADO=true (dev)
    @PostMapping("/simular-pagamento")
    public Map<String, Object> simular(HttpServletRequest request) {
        return service.simularPagamento(authId(request));
    }

    // ── POST /assinaturas/webhook/mercadopago (pública) ──
    // O id vem no corpo ({"type":"payment","data":{"id":"..."}}) ou na query
    // (?data.id=...&type=payment). Só serve de gatilho: o status é consultado na API.
    @PostMapping("/webhook/mercadopago")
    public ResponseEntity<Void> webhook(@RequestBody(required = false) JsonNode body,
                                        @RequestParam(name = "data.id", required = false) String idQuery,
                                        @RequestParam(name = "type", required = false) String tipoQuery) {
        String tipo = body != null && body.hasNonNull("type") ? body.get("type").asText() : tipoQuery;
        String id = body != null && body.path("data").hasNonNull("id") ? body.path("data").get("id").asText() : idQuery;
        if ("payment".equals(tipo)) service.webhook(id);
        return ResponseEntity.ok().build();
    }
}
