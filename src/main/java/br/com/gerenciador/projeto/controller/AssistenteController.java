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
    public ResponseEntity<Map> chat(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        try {
            return ResponseEntity.ok(assistenteService.chat(body, authTipo(request), authId(request)));
        } catch (Exception e) {
            return ResponseEntity.status(503)
                .body(Map.of("erro", "Assistente indisponível. Verifique se o n8n está rodando."));
        }
    }

    // ── GET /assistente/resumo-geral?idUsuario=1 ───────────────────
    // idUsuario (não authTipo(request)) porque quem chama é sempre o n8n,
    // autenticado só pelo X-Token — o JwtFilter injeta authTipo=Admin nesse
    // caminho sem checar identidade nenhuma (ver JwtFilter e
    // AssistenteService.autorizadoParaTime).
    @GetMapping("/resumo-geral")
    public ResponseEntity<Map<String, Object>> resumoGeral(@RequestParam Integer idUsuario) {
        try {
            return ResponseEntity.ok(assistenteService.resumoGeral(idUsuario));
        } catch (ForbiddenException e) {
            throw e;
        } catch (Exception e) {
            return ResponseEntity.status(500)
                .body(Map.of("erro", "Erro ao buscar resumo geral."));
        }
    }

    // ── GET /assistente/resumo-time?idTime=1&idUsuario=1 ───────────
    @GetMapping("/resumo-time")
    public ResponseEntity<Map<String, Object>> resumoTime(@RequestParam Integer idTime, @RequestParam Integer idUsuario) {
        try {
            return ResponseEntity.ok(assistenteService.resumoTime(idTime, idUsuario));
        } catch (ForbiddenException e) {
            throw e;
        } catch (Exception e) {
            return ResponseEntity.status(500)
                .body(Map.of("erro", "Erro ao buscar resumo do time."));
        }
    }

    // ── GET /assistente/ranking-desempenho?idTime=1&idUsuario=1 ────
    @GetMapping("/ranking-desempenho")
    public ResponseEntity<List<Map<String, Object>>> rankingDesempenho(
            @RequestParam Integer idTime, @RequestParam Integer idUsuario) {
        try {
            return ResponseEntity.ok(assistenteService.rankingDesempenho(idTime, idUsuario));
        } catch (ForbiddenException e) {
            throw e;
        } catch (Exception e) {
            return ResponseEntity.ok(List.of(Map.of("erro", "Erro ao buscar ranking de desempenho.")));
        }
    }

    // ── GET /assistente/ranking-pontos?idAtividade=5&idUsuario=1 ───
    @GetMapping("/ranking-pontos")
    public ResponseEntity<List<Map<String, Object>>> rankingPontos(
            @RequestParam Integer idAtividade, @RequestParam Integer idUsuario) {
        try {
            return ResponseEntity.ok(assistenteService.rankingPontos(idAtividade, idUsuario));
        } catch (ForbiddenException e) {
            throw e;
        } catch (Exception e) {
            return ResponseEntity.ok(List.of(Map.of("erro", "Erro ao buscar ranking de pontos.")));
        }
    }

    // ── GET /assistente/proximas-atividades?idTime=1&idUsuario=1 ───
    @GetMapping("/proximas-atividades")
    public ResponseEntity<List<Map<String, Object>>> proximasAtividades(
            @RequestParam Integer idTime, @RequestParam Integer idUsuario) {
        try {
            return ResponseEntity.ok(assistenteService.proximasAtividades(idTime, idUsuario));
        } catch (ForbiddenException e) {
            throw e;
        } catch (Exception e) {
            return ResponseEntity.ok(List.of(Map.of("erro", "Erro ao buscar próximas atividades.")));
        }
    }

    // ── GET /assistente/jogadas?idTime=1&idUsuario=1 ────────────────
    @GetMapping("/jogadas")
    public ResponseEntity<List<Map<String, Object>>> jogadas(
            @RequestParam Integer idTime, @RequestParam Integer idUsuario) {
        try {
            return ResponseEntity.ok(assistenteService.jogadasTime(idTime, idUsuario));
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

    // ── GET /assistente/dados-time?idTime=1&idUsuario=1 ──────────────
    @GetMapping("/dados-time")
    public ResponseEntity<Map<String, Object>> dadosTime(@RequestParam Integer idTime, @RequestParam Integer idUsuario) {
        try {
            return ResponseEntity.ok(assistenteService.dadosTime(idTime, idUsuario));
        } catch (ForbiddenException e) {
            throw e;
        } catch (Exception e) {
            return ResponseEntity.status(500)
                .body(Map.of("erro", "Erro ao buscar dados do time."));
        }
    }
}
