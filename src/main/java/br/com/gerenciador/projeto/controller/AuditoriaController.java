package br.com.gerenciador.projeto.controller;

import java.time.LocalDate;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import br.com.gerenciador.projeto.exception.ForbiddenException;
import br.com.gerenciador.projeto.model.LogAuditoria;
import br.com.gerenciador.projeto.security.AuthUtil;
import br.com.gerenciador.projeto.security.JwtFilter;
import br.com.gerenciador.projeto.service.AuditoriaService;
import jakarta.servlet.http.HttpServletRequest;

/** Log de atividades — só o Admin consulta. */
@RestController
@RequestMapping("/auditoria")
public class AuditoriaController {

    @Autowired
    private AuditoriaService auditoriaService;

    // ── GET /auditoria?idUsuario=&acao=&idTime=&busca=&de=&ate=&pagina=&tamanho= ──
    @GetMapping
    public Map<String, Object> listar(
            @RequestParam(required = false) Integer idUsuario,
            @RequestParam(required = false) String acao,
            @RequestParam(required = false) Integer idTime,
            @RequestParam(required = false) String busca,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate de,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ate,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "50") int tamanho,
            HttpServletRequest request) {
        if (!AuthUtil.ehAdmin((Integer) request.getAttribute(JwtFilter.ATTR_TIPO)))
            throw new ForbiddenException("Apenas administradores podem ver o log de atividades.");

        Page<LogAuditoria> p = auditoriaService.listar(idUsuario, acao, idTime, busca, de, ate, pagina, tamanho);
        return Map.of(
            "itens", p.getContent(),
            "total", p.getTotalElements(),
            "pagina", p.getNumber(),
            "paginas", p.getTotalPages());
    }
}
