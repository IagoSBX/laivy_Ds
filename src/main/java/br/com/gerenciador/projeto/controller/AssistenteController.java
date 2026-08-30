package br.com.gerenciador.projeto.controller;

import java.util.List;
import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import br.com.gerenciador.projeto.dto.JogadaDTOs.JogadaResponse;
import br.com.gerenciador.projeto.exception.ForbiddenException;
import br.com.gerenciador.projeto.model.json.JogadaConteudo;
import br.com.gerenciador.projeto.security.JwtFilter;
import br.com.gerenciador.projeto.service.AssistenteService;
import br.com.gerenciador.projeto.service.JogadaService.JogadaInvalidaException;
import jakarta.validation.Valid;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/assistente")
public class AssistenteController {

    @Autowired private AssistenteService assistenteService;

    private static Integer authId(HttpServletRequest r)   { return (Integer) r.getAttribute(JwtFilter.ATTR_ID); }
    private static Integer authTipo(HttpServletRequest r) { return (Integer) r.getAttribute(JwtFilter.ATTR_TIPO); }

    // ── POST /assistente/chat ─────────────────────────────────────
    @PostMapping("/chat")
    public ResponseEntity<Map> chat(@RequestBody Map<String, Object> body) {
        try {
            return ResponseEntity.ok(assistenteService.chat(body));
        } catch (Exception e) {
            return ResponseEntity.status(503)
                .body(Map.of("erro", "Assistente indisponível. Verifique se o n8n está rodando."));
        }
    }

    // ── GET /assistente/resumo-geral ──────────────────────────────
    @GetMapping("/resumo-geral")
    public ResponseEntity<Map<String, Object>> resumoGeral() {
        try {
            return ResponseEntity.ok(assistenteService.resumoGeral());
        } catch (Exception e) {
            return ResponseEntity.status(500)
                .body(Map.of("erro", "Erro ao buscar resumo geral."));
        }
    }

    // ── GET /assistente/resumo-time?idTime=1 ─────────────────────
    @GetMapping("/resumo-time")
    public ResponseEntity<Map<String, Object>> resumoTime(@RequestParam Integer idTime, HttpServletRequest request) {
        try {
            return ResponseEntity.ok(assistenteService.resumoTime(idTime, authTipo(request), authId(request)));
        } catch (ForbiddenException e) {
            throw e;
        } catch (Exception e) {
            return ResponseEntity.status(500)
                .body(Map.of("erro", "Erro ao buscar resumo do time."));
        }
    }

    // ── GET /assistente/ranking-desempenho?idTime=1 ───────────────
    @GetMapping("/ranking-desempenho")
    public ResponseEntity<List<Map<String, Object>>> rankingDesempenho(
            @RequestParam Integer idTime, HttpServletRequest request) {
        try {
            return ResponseEntity.ok(assistenteService.rankingDesempenho(idTime, authTipo(request), authId(request)));
        } catch (ForbiddenException e) {
            throw e;
        } catch (Exception e) {
            return ResponseEntity.ok(List.of(Map.of("erro", "Erro ao buscar ranking de desempenho.")));
        }
    }

    // ── GET /assistente/ranking-pontos?idAtividade=5 ──────────────
    @GetMapping("/ranking-pontos")
    public ResponseEntity<List<Map<String, Object>>> rankingPontos(
            @RequestParam Integer idAtividade, HttpServletRequest request) {
        try {
            return ResponseEntity.ok(assistenteService.rankingPontos(idAtividade, authTipo(request), authId(request)));
        } catch (ForbiddenException e) {
            throw e;
        } catch (Exception e) {
            return ResponseEntity.ok(List.of(Map.of("erro", "Erro ao buscar ranking de pontos.")));
        }
    }

    // ── GET /assistente/proximas-atividades?idTime=1 ──────────────
    @GetMapping("/proximas-atividades")
    public ResponseEntity<List<Map<String, Object>>> proximasAtividades(
            @RequestParam Integer idTime, HttpServletRequest request) {
        try {
            return ResponseEntity.ok(assistenteService.proximasAtividades(idTime, authTipo(request), authId(request)));
        } catch (ForbiddenException e) {
            throw e;
        } catch (Exception e) {
            return ResponseEntity.ok(List.of(Map.of("erro", "Erro ao buscar próximas atividades.")));
        }
    }

    // ── GET /assistente/jogadas?idTime=1 ──────────────────────────
    @GetMapping("/jogadas")
    public ResponseEntity<List<Map<String, Object>>> jogadas(
            @RequestParam Integer idTime, HttpServletRequest request) {
        try {
            return ResponseEntity.ok(assistenteService.jogadasTime(idTime, authTipo(request), authId(request)));
        } catch (ForbiddenException e) {
            throw e;
        } catch (Exception e) {
            return ResponseEntity.ok(List.of(Map.of("erro", "Erro ao buscar jogadas do time.")));
        }
    }

    // ── POST /assistente/sugerir-jogada ───────────────────────────
    // Body: { idTime, idUsuario, nome, conteudo }. idUsuario é quem pediu a
    // sugestão no chat — a autorização de escrita é recalculada em cima
    // dele (ver AssistenteService.sugerirJogada), não do X-Token de serviço.
    public record SugerirJogadaRequest(Integer idTime, Integer idUsuario, String nome, @Valid JogadaConteudo conteudo) {}

    @PostMapping("/sugerir-jogada")
    public ResponseEntity<?> sugerirJogada(@RequestBody @Valid SugerirJogadaRequest req) {
        try {
            JogadaResponse criada = assistenteService.sugerirJogada(
                req.idTime(), req.idUsuario(), req.nome(), req.conteudo());
            return ResponseEntity.status(201).body(criada);
        } catch (ForbiddenException e) {
            throw e;
        } catch (JogadaInvalidaException e) {
            return ResponseEntity.unprocessableEntity()
                .body(Map.of("erro", "Jogada inválida.", "detalhes", e.getErros()));
        } catch (Exception e) {
            return ResponseEntity.status(500)
                .body(Map.of("erro", "Erro ao criar jogada sugerida."));
        }
    }

    // ── GET /assistente/dados-time?idTime=1 ──────────────────────────
    @GetMapping("/dados-time")
    public ResponseEntity<Map<String, Object>> dadosTime(@RequestParam Integer idTime, HttpServletRequest request) {
        try {
            return ResponseEntity.ok(assistenteService.dadosTime(idTime, authTipo(request), authId(request)));
        } catch (ForbiddenException e) {
            throw e;
        } catch (Exception e) {
            return ResponseEntity.status(500)
                .body(Map.of("erro", "Erro ao buscar dados do time."));
        }
    }
}
