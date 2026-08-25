package br.com.gerenciador.projeto.controller;

import java.util.List;
import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import br.com.gerenciador.projeto.DAO.AtividadeDAO;
import br.com.gerenciador.projeto.DAO.EscalacaoDAO;
import br.com.gerenciador.projeto.DAO.IUsuario;
import br.com.gerenciador.projeto.model.Atividade;
import br.com.gerenciador.projeto.model.Escalacao;
import br.com.gerenciador.projeto.security.AuthUtil;
import br.com.gerenciador.projeto.security.JwtFilter;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/escalacoes")
public class EscalacaoController {

    @Autowired private EscalacaoDAO escalacaoDAO;
    @Autowired private AtividadeDAO atividadeDAO;
    @Autowired private IUsuario usuarioDAO;

    private static Integer authId(HttpServletRequest r)   { return (Integer) r.getAttribute(JwtFilter.ATTR_ID); }
    private static Integer authTipo(HttpServletRequest r) { return (Integer) r.getAttribute(JwtFilter.ATTR_TIPO); }

    private static Integer idTime(Escalacao e) {
        return e.getAtividade() != null && e.getAtividade().getTime() != null
            ? e.getAtividade().getTime().getId_time() : null;
    }

    @GetMapping("/atividade/{id}")
    public List<Escalacao> buscarPorAtividade(@PathVariable Integer id) {
        return escalacaoDAO.buscarPorAtividade(id);
    }

    // Somente Admin/Treinador escalam jogadores; Treinador só para atividades do próprio time.
    @PostMapping
    public ResponseEntity<?> cadastrar(@RequestBody Escalacao esc, HttpServletRequest request) {
        if (esc.getAtividade() == null || esc.getAtividade().getId_atividade() == null)
            return ResponseEntity.badRequest().body(Map.of("erro", "Atividade obrigatoria."));
        Atividade atividade = atividadeDAO.findById(esc.getAtividade().getId_atividade()).orElse(null);
        if (atividade == null)
            return ResponseEntity.badRequest().body(Map.of("erro", "Atividade nao encontrada."));
        Integer idTimeAlvo = atividade.getTime() != null ? atividade.getTime().getId_time() : null;
        if (!AuthUtil.podeGerenciarTime(authTipo(request), authId(request), idTimeAlvo, usuarioDAO))
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("erro", "Sem permissao para escalar jogadores nesta atividade."));
        esc.setAtividade(atividade);
        if (esc.getUsuario() != null && esc.getUsuario().getId_usuario() != null)
            usuarioDAO.findById(esc.getUsuario().getId_usuario()).ifPresent(esc::setUsuario);
        return ResponseEntity.status(HttpStatus.CREATED).body(escalacaoDAO.save(esc));
    }

    // PUT /escalacoes/{id} — atualiza pontos do jogador no jogo
    @PutMapping("/{id}")
    public ResponseEntity<?> atualizar(@PathVariable Integer id, @RequestBody Escalacao dados, HttpServletRequest request) {
        Integer authTipo = authTipo(request);
        Integer authId   = authId(request);
        return escalacaoDAO.findById(id).<ResponseEntity<?>>map(e -> {
            if (!AuthUtil.podeGerenciarTime(authTipo, authId, idTime(e), usuarioDAO))
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("erro", "Sem permissao para editar esta escalacao."));

            if (dados.getPontos_jogo()   != null) e.setPontos_jogo(dados.getPontos_jogo());
            if (dados.getPosicao()       != null) e.setPosicao(dados.getPosicao());
            if (dados.getNumero_camisa() != null) e.setNumero_camisa(dados.getNumero_camisa());
            if (dados.getTitular()       != null) e.setTitular(dados.getTitular());
            return ResponseEntity.ok(escalacaoDAO.save(e));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletar(@PathVariable Integer id, HttpServletRequest request) {
        Escalacao e = escalacaoDAO.findById(id).orElse(null);
        if (e == null) return ResponseEntity.notFound().build();
        if (!AuthUtil.podeGerenciarTime(authTipo(request), authId(request), idTime(e), usuarioDAO))
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("erro", "Sem permissao para excluir esta escalacao."));
        escalacaoDAO.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
