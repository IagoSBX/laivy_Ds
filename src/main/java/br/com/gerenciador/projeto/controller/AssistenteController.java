package br.com.gerenciador.projeto.controller;

import br.com.gerenciador.projeto.DAO.*;
import br.com.gerenciador.projeto.model.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/assistente")
public class AssistenteController {

    @Value("${assistente.n8n.webhook-url}")
    private String webhookUrl;

    @Value("${assistente.n8n.token}")
    private String token;

    @Autowired private IUsuario usuarioDAO;
    @Autowired private AtividadeDAO atividadeDAO;
    @Autowired private DesempenhoDAO desempenhoDAO;
    @Autowired private EscalacaoDAO escalacaoDAO;
    @Autowired private TimeDAO timeDAO;

    private final RestTemplate restTemplate = new RestTemplate();

    // ── POST /assistente/chat ─────────────────────────────────────
    @PostMapping("/chat")
    public ResponseEntity<Map> chat(@RequestBody Map<String, Object> body) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-Token", token);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(
                webhookUrl, request, Map.class);
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            return ResponseEntity.status(503)
                .body(Map.of("erro", "Assistente indisponível. Verifique se o n8n está rodando."));
        }
    }

    // ── GET /assistente/resumo-geral ──────────────────────────────
    @GetMapping("/resumo-geral")
    public ResponseEntity<Map<String, Object>> resumoGeral() {
        try {
            List<Usuario> todos = usuarioDAO.findAll();
            long atletas    = todos.stream().filter(u -> u.getTipo_usuario() == 3).count();
            long treinadores= todos.stream().filter(u -> u.getTipo_usuario() == 2).count();
            long admins     = todos.stream().filter(u -> u.getTipo_usuario() == 1).count();

            Map<String, Object> r = new HashMap<>();
            r.put("total_usuarios",    todos.size());
            r.put("total_atletas",     atletas);
            r.put("total_treinadores", treinadores);
            r.put("total_admins",      admins);
            r.put("total_times",       timeDAO.count());
            r.put("total_atividades",  atividadeDAO.count());
            r.put("total_desempenhos", desempenhoDAO.count());
            return ResponseEntity.ok(r);
        } catch (Exception e) {
            return ResponseEntity.status(500)
                .body(Map.of("erro", "Erro ao buscar resumo geral."));
        }
    }

    // ── GET /assistente/resumo-time?idTime=1 ─────────────────────
    @GetMapping("/resumo-time")
    public ResponseEntity<Map<String, Object>> resumoTime(@RequestParam Integer idTime) {
        try {
            Map<String, Object> r = new HashMap<>();
            timeDAO.findById(idTime).ifPresent(t -> {
                r.put("time",       t.getNome_time());
                r.put("modalidade", t.getModalidade_time());
                r.put("categoria",  t.getCategoria_time());
                r.put("cor",        t.getCor_time());
                r.put("descricao",  t.getDescricao_time());
                r.put("ativo",      t.getAtivo_time());
                r.put("treinador",  t.getTreinador() != null
                    ? t.getTreinador().getNome_usuario() : "Não definido");
                r.put("total_membros", t.getMembros() != null
                    ? t.getMembros().size() : 0);
            });
            if (r.isEmpty()) r.put("erro", "Time não encontrado.");
            return ResponseEntity.ok(r);
        } catch (Exception e) {
            return ResponseEntity.status(500)
                .body(Map.of("erro", "Erro ao buscar resumo do time."));
        }
    }

    // ── GET /assistente/ranking-desempenho?idTime=1 ───────────────
    @GetMapping("/ranking-desempenho")
    public ResponseEntity<List<Map<String, Object>>> rankingDesempenho(
            @RequestParam Integer idTime) {
        try {
            List<Desempenho> lista = desempenhoDAO.buscarPorTime(idTime);

            Map<String, List<Desempenho>> porAtleta = lista.stream()
                .collect(Collectors.groupingBy(
                    d -> d.getUsuario().getNome_usuario()));

            List<Map<String, Object>> ranking = porAtleta.entrySet().stream()
                .map(e -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("atleta", e.getKey());
                    double media = e.getValue().stream()
                        .mapToInt(d -> d.getPontuacao() != null ? d.getPontuacao() : 0)
                        .average().orElse(0);
                    m.put("media_pontuacao", Math.round(media * 10.0) / 10.0);
                    m.put("total_avaliacoes", e.getValue().size());
                    return m;
                })
                .sorted((a, b) -> Double.compare(
                    (Double) b.get("media_pontuacao"),
                    (Double) a.get("media_pontuacao")))
                .collect(Collectors.toList());

            return ResponseEntity.ok(ranking);
        } catch (Exception e) {
            return ResponseEntity.ok(List.of(
                Map.of("erro", "Erro ao buscar ranking de desempenho.")));
        }
    }

    // ── GET /assistente/ranking-pontos?idAtividade=5 ──────────────
    @GetMapping("/ranking-pontos")
    public ResponseEntity<List<Map<String, Object>>> rankingPontos(
            @RequestParam Integer idAtividade) {
        try {
            List<Map<String, Object>> ranking = escalacaoDAO
                .buscarPorAtividade(idAtividade).stream()
                .filter(e -> e.getPontos_jogo() != null)
                .sorted((a, b) -> b.getPontos_jogo() - a.getPontos_jogo())
                .map(e -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("atleta",  e.getUsuario().getNome_usuario());
                    m.put("pontos",  e.getPontos_jogo());
                    m.put("posicao", e.getPosicao() != null ? e.getPosicao() : "");
                    m.put("titular", e.getTitular() == 1 ? "Titular" : "Reserva");
                    return m;
                })
                .collect(Collectors.toList());

            return ResponseEntity.ok(ranking);
        } catch (Exception e) {
            return ResponseEntity.ok(List.of(
                Map.of("erro", "Erro ao buscar ranking de pontos.")));
        }
    }

    // ── GET /assistente/proximas-atividades?idTime=1 ──────────────
    @GetMapping("/proximas-atividades")
    public ResponseEntity<List<Map<String, Object>>> proximasAtividades(
            @RequestParam Integer idTime) {
        try {
            LocalDateTime agora = LocalDateTime.now();
            Map<Integer, String> tipos = Map.of(
                1, "Treino", 2, "Jogo", 3, "Evento", 4, "Competição");

            List<Map<String, Object>> atividades = atividadeDAO
                .buscarPorTime(idTime).stream()
                .filter(a -> a.getData_atividade() != null
                    && a.getData_atividade().isAfter(agora)
                    && a.getStatus_atividade() == 1)
                .sorted(Comparator.comparing(Atividade::getData_atividade))
                .limit(5)
                .map(a -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("nome",  a.getNome_atividade());
                    m.put("tipo",  tipos.getOrDefault(a.getTipo_atividade(), "Outro"));
                    m.put("data",  a.getData_atividade().toString());
                    m.put("local", a.getLugar_atividade() != null
                        ? a.getLugar_atividade() : "Não definido");
                    return m;
                })
                .collect(Collectors.toList());

            return ResponseEntity.ok(atividades);
        } catch (Exception e) {
            return ResponseEntity.ok(List.of(
                Map.of("erro", "Erro ao buscar próximas atividades.")));
        }
    }
 // ── GET /assistente/dados-time?idTime=1 ──────────────────────────
    @GetMapping("/dados-time")
    public ResponseEntity<Map<String, Object>> dadosTime(@RequestParam Integer idTime) {
        try {
            LocalDateTime agora = LocalDateTime.now();
            Map<Integer, String> tipos = Map.of(
                1, "Treino", 2, "Jogo", 3, "Evento", 4, "Competição");

            Map<String, Object> r = new HashMap<>();

            // Dados do time
            timeDAO.findById(idTime).ifPresent(t -> {
                r.put("time",          t.getNome_time());
                r.put("modalidade",    t.getModalidade_time());
                r.put("categoria",     t.getCategoria_time());
                r.put("treinador",     t.getTreinador() != null
                    ? t.getTreinador().getNome_usuario() : "Não definido");
                r.put("total_membros", t.getMembros() != null
                    ? t.getMembros().size() : 0);
            });

            // Atletas do time
            List<String> nomes = usuarioDAO.buscarPorTimeTipo(idTime, 3)
                .stream()
                .map(Usuario::getNome_usuario)
                .collect(Collectors.toList());
            r.put("atletas", nomes);
            r.put("total_atletas", nomes.size());

            // Ranking de desempenho
            List<Map<String, Object>> ranking = desempenhoDAO.buscarPorTime(idTime)
                .stream()
                .collect(Collectors.groupingBy(d -> d.getUsuario().getNome_usuario()))
                .entrySet().stream()
                .map(e -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("atleta", e.getKey());
                    double media = e.getValue().stream()
                        .mapToInt(d -> d.getPontuacao() != null ? d.getPontuacao() : 0)
                        .average().orElse(0);
                    m.put("media_pontuacao", Math.round(media * 10.0) / 10.0);
                    m.put("avaliacoes", e.getValue().size());
                    return m;
                })
                .sorted((a, b) -> Double.compare(
                    (Double) b.get("media_pontuacao"),
                    (Double) a.get("media_pontuacao")))
                .collect(Collectors.toList());
            r.put("ranking_desempenho", ranking);

            // Próximas atividades
            List<Map<String, Object>> atividades = atividadeDAO.buscarPorTime(idTime)
                .stream()
                .filter(a -> a.getData_atividade() != null
                    && a.getData_atividade().isAfter(agora)
                    && a.getStatus_atividade() == 1)
                .sorted(Comparator.comparing(Atividade::getData_atividade))
                .limit(5)
                .map(a -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("nome",  a.getNome_atividade());
                    m.put("tipo",  tipos.getOrDefault(a.getTipo_atividade(), "Outro"));
                    m.put("data",  a.getData_atividade().toString());
                    m.put("local", a.getLugar_atividade() != null
                        ? a.getLugar_atividade() : "Não definido");
                    return m;
                })
                .collect(Collectors.toList());
            r.put("proximas_atividades", atividades);

            return ResponseEntity.ok(r);
        } catch (Exception e) {
            return ResponseEntity.status(500)
                .body(Map.of("erro", "Erro ao buscar dados do time."));
        }
    }
    
}
