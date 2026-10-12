package br.com.gerenciador.projeto.controller;

import br.com.gerenciador.projeto.DAO.AtividadeDAO;
import br.com.gerenciador.projeto.DAO.AtividadeJogadaDAO;
import br.com.gerenciador.projeto.DAO.IUsuario;
import br.com.gerenciador.projeto.DAO.TimeDAO;
import br.com.gerenciador.projeto.dto.JogadaDTOs.*;
import br.com.gerenciador.projeto.exception.ForbiddenException;
import br.com.gerenciador.projeto.exception.NotFoundException;
import br.com.gerenciador.projeto.model.AtividadeJogada;
import br.com.gerenciador.projeto.model.Atividade;
import br.com.gerenciador.projeto.model.Time;
import br.com.gerenciador.projeto.model.Usuario;
import br.com.gerenciador.projeto.security.AuthUtil;
import br.com.gerenciador.projeto.security.JwtFilter;
import br.com.gerenciador.projeto.service.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.*;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.bind.annotation.*;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * API da Prancheta Tática.
 *
 * Mapeada sob /times/{idTime}/jogadas (não /api/...) porque o JwtFilter só
 * exige token para os prefixos que ele conhece (JwtFilter.API_PREFIXOS), e
 * "/times" já está nessa lista — assim a rota herda autenticação sem
 * precisar mexer no filtro.
 *
 * Autorização: usuário autenticado precisa pertencer ao time da URL
 * (AuthUtil.ehMembroDoTime) e, para escrita, ter papel de treinador
 * (AuthUtil.podeGerenciarTime) — Admin sempre passa, igual ao resto do sistema.
 */
@RestController
@RequestMapping("/times/{idTime}/jogadas")
public class JogadaController {

    private final JogadaService service;
    private final SvgJogadaService svg;
    private final ExportacaoService exportacao;
    private final MigradorJogadaService migrador;
    private final TimeDAO timeDAO;
    private final IUsuario usuarioDAO;
    private final AtividadeDAO atividadeDAO;
    private final AtividadeJogadaDAO atividadeJogadaDAO;

    public JogadaController(JogadaService service, SvgJogadaService svg,
                            ExportacaoService exportacao, MigradorJogadaService migrador,
                            TimeDAO timeDAO, IUsuario usuarioDAO, AtividadeDAO atividadeDAO,
                            AtividadeJogadaDAO atividadeJogadaDAO) {
        this.service = service;
        this.svg = svg;
        this.exportacao = exportacao;
        this.migrador = migrador;
        this.timeDAO = timeDAO;
        this.usuarioDAO = usuarioDAO;
        this.atividadeDAO = atividadeDAO;
        this.atividadeJogadaDAO = atividadeJogadaDAO;
    }

    // ---- biblioteca ---------------------------------------------------

    @GetMapping
    public Page<ItemBiblioteca> biblioteca(@PathVariable Integer idTime,
                                           @RequestParam(required = false) String tipo,
                                           @RequestParam(required = false) String busca,
                                           Pageable pageable,
                                           HttpServletRequest request) {
        exigirMembroDoTime(idTime, request);
        return service.biblioteca(idTime, tipo, busca, pageable);
    }

    @GetMapping("/{id}")
    public JogadaResponse buscar(@PathVariable Integer idTime, @PathVariable Integer id,
                                 HttpServletRequest request) {
        exigirMembroDoTime(idTime, request);
        return service.buscar(id, idTime);
    }

    // ---- criação e edição -----------------------------------------------

    @PostMapping
    public ResponseEntity<JogadaResponse> criar(@PathVariable Integer idTime,
                                                @RequestBody @Valid SalvarJogadaRequest req,
                                                HttpServletRequest request) {
        exigirTreinadorDoTime(idTime, request);
        Time time = timeDAO.findById(idTime)
                .orElseThrow(() -> new NotFoundException("Time " + idTime + " não encontrado."));
        Usuario usuario = usuarioLogado(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(service.criar(req, time, usuario));
    }

    @PutMapping("/{id}")
    public JogadaResponse atualizar(@PathVariable Integer idTime, @PathVariable Integer id,
                                    @RequestBody @Valid SalvarJogadaRequest req,
                                    @RequestHeader(value = "If-Match", required = false) Long versao,
                                    HttpServletRequest request) {
        exigirTreinadorDoTime(idTime, request);
        return service.atualizar(id, idTime, req, versao);
    }

    @PostMapping("/{id}/duplicar")
    public ResponseEntity<JogadaResponse> duplicar(@PathVariable Integer idTime, @PathVariable Integer id,
                                                    HttpServletRequest request) {
        exigirTreinadorDoTime(idTime, request);
        Usuario usuario = usuarioLogado(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(service.duplicar(id, idTime, usuario));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> arquivar(@PathVariable Integer idTime, @PathVariable Integer id,
                                         HttpServletRequest request) {
        exigirTreinadorDoTime(idTime, request);
        service.arquivar(id, idTime);
        return ResponseEntity.noContent().build();
    }

    // ---- vínculo com o calendário --------------------------------------

    @PostMapping("/{id}/vinculos")
    public ResponseEntity<Void> vincular(@PathVariable Integer idTime, @PathVariable Integer id,
                                         @RequestBody @Valid VincularRequest req,
                                         HttpServletRequest request) {
        exigirTreinadorDoTime(idTime, request);
        Atividade atividade = atividadeDAO.findById(req.idAtividade())
                .orElseThrow(() -> new NotFoundException("Atividade " + req.idAtividade() + " não encontrada."));
        service.vincular(id, idTime, atividade, req.ordem(), req.observacoes());
        return ResponseEntity.noContent().build();
    }

    /** Atividades às quais esta jogada já está vinculada — usado pra mostrar
     *  na prancheta/biblioteca que a jogada não está "solta". */
    @GetMapping("/{id}/vinculos")
    public List<VinculoAtividadeResponse> vinculos(@PathVariable Integer idTime, @PathVariable Integer id,
                                                    HttpServletRequest request) {
        exigirMembroDoTime(idTime, request);
        return service.atividadesDaJogada(id);
    }

    @DeleteMapping("/{id}/vinculos/{idAtividade}")
    public ResponseEntity<Void> desvincular(@PathVariable Integer idTime, @PathVariable Integer id,
                                            @PathVariable Integer idAtividade,
                                            HttpServletRequest request) {
        exigirTreinadorDoTime(idTime, request);
        service.desvincular(id, idAtividade);
        return ResponseEntity.noContent().build();
    }

    /** As observações que o treinador deixou ao vincular esta jogada a esta atividade. */
    @GetMapping("/{id}/vinculos/{idAtividade}")
    public VinculoResponse vinculo(@PathVariable Integer idTime, @PathVariable Integer id,
                                   @PathVariable Integer idAtividade,
                                   HttpServletRequest request) {
        exigirMembroDoTime(idTime, request);
        AtividadeJogada aj = atividadeJogadaDAO.findById(new AtividadeJogada.Id(idAtividade, id))
                .orElseThrow(() -> new NotFoundException("Esta jogada não está vinculada a essa atividade."));
        return new VinculoResponse(aj.getOrdem(), aj.getObservacoes());
    }

    // ---- confirmação de leitura do atleta ------------------------------

    @PostMapping("/{id}/visualizacao")
    public ResponseEntity<Void> confirmarVisualizacao(@PathVariable Integer idTime, @PathVariable Integer id,
                                                       @RequestParam Integer idAtividade,
                                                       HttpServletRequest request) {
        exigirMembroDoTime(idTime, request);
        Integer idUsuario = (Integer) request.getAttribute(JwtFilter.ATTR_ID);
        service.registrarVisualizacao(id, idAtividade, idUsuario);
        return ResponseEntity.noContent().build();
    }

    // ---- exportação -----------------------------------------------------

    /** PNG de um frame. Rápido o suficiente para responder síncrono. */
    @GetMapping(value = "/{id}/frames/{indice}.png", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> png(@PathVariable Integer idTime, @PathVariable Integer id,
                                      @PathVariable int indice,
                                      @RequestParam(defaultValue = "1600") float largura,
                                      HttpServletRequest request)
            throws Exception {
        exigirMembroDoTime(idTime, request);
        var jogada = service.carregar(id, idTime);
        var conteudo = migrador.migrar(jogada.getConteudo());
        if (indice < 0 || indice >= conteudo.frames().size()) {
            return ResponseEntity.notFound().build();
        }
        byte[] bytes = exportacao.png(svg.svgFrame(conteudo, indice), largura);
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .cacheControl(CacheControl.noCache())
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        anexo(jogada.getNome() + " - frame " + (indice + 1) + ".png"))
                .body(bytes);
    }

    /** PDF com a sequência completa e a descrição de cada frame. */
    @GetMapping(value = "/{id}.pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> pdf(@PathVariable Integer idTime, @PathVariable Integer id,
                                      HttpServletRequest request)
            throws Exception {
        exigirMembroDoTime(idTime, request);
        var jogada = service.carregar(id, idTime);
        var conteudo = migrador.migrar(jogada.getConteudo());
        byte[] bytes = exportacao.pdf(svg.svgFolhas(jogada.getNome(), conteudo));
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, anexo(jogada.getNome() + ".pdf"))
                .body(bytes);
    }

    /** SVG cru — útil para depurar divergência entre tela e exportação. */
    @GetMapping(value = "/{id}/frames/{indice}.svg", produces = "image/svg+xml")
    public String svgCru(@PathVariable Integer idTime, @PathVariable Integer id, @PathVariable int indice,
                         HttpServletRequest request) {
        exigirMembroDoTime(idTime, request);
        var conteudo = migrador.migrar(service.carregar(id, idTime).getConteudo());
        return svg.svgFrame(conteudo, indice);
    }

    // ---- autorização ------------------------------------------------------
    // authId/authTipo vêm dos atributos que o JwtFilter injeta na requisição
    // (nunca do corpo), igual a TimeController/UsuarioController. Leitura é
    // liberada para qualquer membro do time (inclui atleta); escrita exige
    // treinador (ou admin) — AuthUtil.ehMembroDoTime/podeGerenciarTime.

    private static Integer authId(HttpServletRequest r)   { return (Integer) r.getAttribute(JwtFilter.ATTR_ID); }
    private static Integer authTipo(HttpServletRequest r) { return (Integer) r.getAttribute(JwtFilter.ATTR_TIPO); }

    private void exigirMembroDoTime(Integer idTime, HttpServletRequest request) {
        if (!AuthUtil.ehMembroDoTime(authTipo(request), authId(request), idTime, usuarioDAO)) {
            throw new ForbiddenException("Usuário não pertence a este time.");
        }
    }

    private void exigirTreinadorDoTime(Integer idTime, HttpServletRequest request) {
        if (!AuthUtil.podeGerenciarTime(authTipo(request), authId(request), idTime, usuarioDAO)) {
            throw new ForbiddenException("Somente o treinador do time pode alterar a biblioteca de jogadas.");
        }
    }

    private Usuario usuarioLogado(HttpServletRequest request) {
        return usuarioDAO.findById(authId(request))
                .orElseThrow(() -> new NotFoundException("Usuário autenticado não encontrado."));
    }

    // ---- tratamento de erro específico da prancheta ----------------------
    // NotFoundException/ForbiddenException/BadRequestException já são
    // tratadas globalmente por GlobalExceptionHandler; só o que é
    // específico desta feature fica aqui.

    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    public ResponseEntity<ErroValidacao> conflito(ObjectOptimisticLockingFailureException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new ErroValidacao(
                "Esta jogada foi alterada por outra pessoa. Recarregue antes de salvar.", List.of()));
    }

    @ExceptionHandler(JogadaService.JogadaInvalidaException.class)
    public ResponseEntity<ErroValidacao> invalida(JogadaService.JogadaInvalidaException e) {
        return ResponseEntity.unprocessableEntity()
                .body(new ErroValidacao("Jogada inválida.", e.getErros()));
    }

    private static String anexo(String nomeArquivo) {
        String seguro = nomeArquivo.replaceAll("[\\\\/:*?\"<>|]", "-");
        return "attachment; filename*=UTF-8''"
                + URLEncoder.encode(seguro, StandardCharsets.UTF_8).replace("+", "%20");
    }
}
