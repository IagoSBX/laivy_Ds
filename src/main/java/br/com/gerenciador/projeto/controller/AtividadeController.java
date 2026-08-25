package br.com.gerenciador.projeto.controller;

import java.util.List;
import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import br.com.gerenciador.projeto.DAO.AtividadeDAO;
import br.com.gerenciador.projeto.DAO.IUsuario;
import br.com.gerenciador.projeto.DAO.TimeDAO;
import br.com.gerenciador.projeto.model.Atividade;
import br.com.gerenciador.projeto.model.Usuario;
import br.com.gerenciador.projeto.security.AuthUtil;
import br.com.gerenciador.projeto.security.JwtFilter;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/atividades")
public class AtividadeController {

    @Autowired
    private AtividadeDAO atividadeDAO;

    @Autowired
    private IUsuario usuarioDAO;

    @Autowired
    private TimeDAO timeDAO;

    private static Integer authId(HttpServletRequest r)   { return (Integer) r.getAttribute(JwtFilter.ATTR_ID); }
    private static Integer authTipo(HttpServletRequest r) { return (Integer) r.getAttribute(JwtFilter.ATTR_TIPO); }

    private static Integer idTime(Atividade a) {
        return a.getTime() != null ? a.getTime().getId_time() : null;
    }

    @GetMapping
    public List<Atividade> listarTodas(
            @org.springframework.web.bind.annotation.RequestParam(required = false) Integer idTime) {
        if (idTime != null) return atividadeDAO.buscarPorTime(idTime);
        return atividadeDAO.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Atividade> buscarPorId(@PathVariable Integer id) {
        return atividadeDAO.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/usuario/{id}")
    public List<Atividade> buscarPorUsuario(@PathVariable Integer id) {
        return atividadeDAO.buscarPorUsuario(id);
    }

    @GetMapping("/tipo/{tipo}")
    public List<Atividade> buscarPorTipo(@PathVariable Integer tipo) {
        return atividadeDAO.buscarPorTipo(tipo);
    }

    @GetMapping("/time/{idTime}")
    public List<Atividade> buscarPorTime(@PathVariable Integer idTime) {
        return atividadeDAO.findAll().stream()
            .filter(a -> a.getTime() != null && a.getTime().getId_time().equals(idTime))
            .collect(java.util.stream.Collectors.toList());
    }

    // Somente Admin/Treinador cadastram atividades; Treinador só para o próprio time.
    @PostMapping
    public ResponseEntity<?> cadastrar(@RequestBody Atividade atividade, HttpServletRequest request) {
        Integer authTipo = authTipo(request);
        Integer authId   = authId(request);
        Integer idTimeDesejado = idTime(atividade);
        if (AuthUtil.ehTreinador(authTipo)) {
            // Treinador só pode cadastrar atividade para o próprio time.
            Integer meuTime = AuthUtil.timeDoUsuario(authId, usuarioDAO);
            if (meuTime == null || (idTimeDesejado != null && !idTimeDesejado.equals(meuTime)))
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("erro", "Sem permissao para cadastrar atividade para este time."));
            idTimeDesejado = meuTime;
        } else if (!AuthUtil.ehAdmin(authTipo)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("erro", "Somente Admin ou Treinador podem cadastrar atividades."));
        }

        if (atividade.getUsuario() != null && atividade.getUsuario().getId_usuario() != null) {
            Usuario u = usuarioDAO.findById(atividade.getUsuario().getId_usuario())
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
            atividade.setUsuario(u);
        }
        if (idTimeDesejado != null) {
            Integer idTimeFinal = idTimeDesejado;
            timeDAO.findById(idTimeFinal).ifPresent(atividade::setTime);
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(atividadeDAO.save(atividade));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> atualizar(@PathVariable Integer id, @RequestBody Atividade dados, HttpServletRequest request) {
        Integer authTipo = authTipo(request);
        Integer authId   = authId(request);
        return atividadeDAO.findById(id).<ResponseEntity<?>>map(a -> {
            if (!AuthUtil.podeGerenciarTime(authTipo, authId, idTime(a), usuarioDAO))
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("erro", "Sem permissao para editar esta atividade."));

            if (dados.getNome_atividade()   != null) a.setNome_atividade(dados.getNome_atividade());
            if (dados.getLugar_atividade()  != null) a.setLugar_atividade(dados.getLugar_atividade());
            if (dados.getData_atividade()   != null) a.setData_atividade(dados.getData_atividade());
            if (dados.getTipo_atividade()   != null) a.setTipo_atividade(dados.getTipo_atividade());
            if (dados.getStatus_atividade() != null) a.setStatus_atividade(dados.getStatus_atividade());
            if (dados.getTime_oponente()    != null) a.setTime_oponente(dados.getTime_oponente());
            if (dados.getPlacar_pro()       != null) a.setPlacar_pro(dados.getPlacar_pro());
            if (dados.getPlacar_contra()    != null) a.setPlacar_contra(dados.getPlacar_contra());
            if (dados.getRecorrente()       != null) a.setRecorrente(dados.getRecorrente());
            if (dados.getFim_recorrencia()  != null) a.setFim_recorrencia(dados.getFim_recorrencia());
            if (dados.getUsuario() != null && dados.getUsuario().getId_usuario() != null)
                usuarioDAO.findById(dados.getUsuario().getId_usuario()).ifPresent(a::setUsuario);
            // Só Admin pode mover a atividade para outro time.
            if (dados.getTime() != null && dados.getTime().getId_time() != null && AuthUtil.ehAdmin(authTipo))
                timeDAO.findById(dados.getTime().getId_time()).ifPresent(a::setTime);
            return ResponseEntity.ok(atividadeDAO.save(a));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletar(@PathVariable Integer id, HttpServletRequest request) {
        Atividade a = atividadeDAO.findById(id).orElse(null);
        if (a == null) return ResponseEntity.notFound().build();
        if (!AuthUtil.podeGerenciarTime(authTipo(request), authId(request), idTime(a), usuarioDAO))
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("erro", "Sem permissao para excluir esta atividade."));
        atividadeDAO.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
