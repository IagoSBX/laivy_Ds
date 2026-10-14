package br.com.gerenciador.projeto.controller;

import java.util.List;
import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import br.com.gerenciador.projeto.dto.JogadaDTOs.JogadaResponse;
import br.com.gerenciador.projeto.exception.BadRequestException;
import br.com.gerenciador.projeto.exception.ForbiddenException;
import br.com.gerenciador.projeto.model.json.JogadaConteudo;
import br.com.gerenciador.projeto.security.JwtFilter;
import br.com.gerenciador.projeto.service.AssistenteService;
import br.com.gerenciador.projeto.service.JogadaService.JogadaInvalidaException;
import jakarta.validation.Valid;

@RestController
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
        } catch (BadRequestException | br.com.gerenciador.projeto.exception.ForbiddenException e) {
            // 400 (e não 403) de propósito: o front trata 401/403 como sessão
            // expirada e desloga. Aqui é só um pedido que não pode ser atendido
            // (ex.: recomendação de atleta de outro time) e a mensagem é exibida.
            return ResponseEntity.badRequest().body(Map.of("erro", e.getMessage()));
        } catch (Exception e) {
            System.err.println("[LAIVY] Falha ao chamar o n8n: " + e.getMessage());
            return ResponseEntity.status(503)
                .body(Map.of("erro", "Assistente indisponível no momento. Tente novamente em instantes."));
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
        } catch (BadRequestException e) {
            return ResponseEntity.badRequest().body(Map.of("erro", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500)
                .body(Map.of("erro", "Erro ao criar jogada sugerida."));
        }
    }

    // ── GET /assistente/jogada?idTime=1&idUsuario=1&id=5 ─────────────
    @GetMapping("/jogada")
    public ResponseEntity<?> verJogada(@RequestParam Integer idTime, @RequestParam Integer idUsuario,
                                       @RequestParam Integer id) {
        try {
            return ResponseEntity.ok(assistenteService.verJogada(idTime, idUsuario, id));
        } catch (ForbiddenException e) {
            throw e;
        } catch (Exception e) {
            return ResponseEntity.status(404).body(Map.of("erro", "Jogada não encontrada neste time."));
        }
    }

    // ── POST /assistente/editar-jogada ────────────────────────────
    // Body: { idTime, idUsuario, idJogada, nome, conteudo }. Mesma regra de
    // autorização do sugerir-jogada (recalculada a partir do idUsuario).
    public record EditarJogadaRequest(Integer idTime, Integer idUsuario, Integer idJogada, String nome,
                                      @Valid JogadaConteudo conteudo) {}

    @PostMapping("/editar-jogada")
    public ResponseEntity<?> editarJogada(@RequestBody @Valid EditarJogadaRequest req) {
        try {
            return ResponseEntity.ok(assistenteService.editarJogada(
                req.idTime(), req.idUsuario(), req.idJogada(), req.nome(), req.conteudo()));
        } catch (ForbiddenException e) {
            throw e;
        } catch (JogadaInvalidaException e) {
            return ResponseEntity.unprocessableEntity()
                .body(Map.of("erro", "Jogada inválida.", "detalhes", e.getErros()));
        } catch (BadRequestException e) {
            return ResponseEntity.badRequest().body(Map.of("erro", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500)
                .body(Map.of("erro", "Erro ao editar jogada."));
        }
    }

    // ── POST /assistente/cadastrar-atletas ────────────────────────
    // Body: { idTime, idUsuario, atletas: [{ nome, email, dataNascimento?, celular?, cpf? }] }.
    // Só treinador do time ou admin (recalculado a partir do idUsuario).
    public record CadastrarAtletasRequest(Integer idTime, Integer idUsuario, List<AssistenteService.NovoAtleta> atletas) {}

    @PostMapping("/cadastrar-atletas")
    public ResponseEntity<?> cadastrarAtletas(@RequestBody CadastrarAtletasRequest req) {
        try {
            return ResponseEntity.status(201).body(
                assistenteService.cadastrarAtletas(req.idTime(), req.idUsuario(), req.atletas()));
        } catch (ForbiddenException e) {
            throw e;
        } catch (BadRequestException e) {
            return ResponseEntity.badRequest().body(Map.of("erro", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("erro", "Erro ao cadastrar atletas."));
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

    // Endpoint para a ferramenta de recomendação individual configurada no n8n.
    @GetMapping("/dados-atleta")
    public ResponseEntity<Map<String, Object>> dadosAtleta(
            @RequestParam Integer idAtleta, HttpServletRequest request) {
        try {
            Integer solicitante = authId(request);
            if (solicitante == null)
                throw new ForbiddenException("Sessão de usuário obrigatória para acessar dados de saúde.");
            return ResponseEntity.ok(assistenteService.dadosAtleta(idAtleta, solicitante));
        } catch (ForbiddenException e) {
            throw e;
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("erro", "Erro ao buscar contexto do atleta."));
        }
    }
}
