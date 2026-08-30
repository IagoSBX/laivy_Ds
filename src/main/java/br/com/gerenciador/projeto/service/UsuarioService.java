package br.com.gerenciador.projeto.service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.mindrot.jbcrypt.BCrypt;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import br.com.gerenciador.projeto.DAO.IUsuario;
import br.com.gerenciador.projeto.DAO.TimeDAO;
import br.com.gerenciador.projeto.exception.BadRequestException;
import br.com.gerenciador.projeto.exception.ForbiddenException;
import br.com.gerenciador.projeto.exception.NotFoundException;
import br.com.gerenciador.projeto.exception.UnauthorizedException;
import br.com.gerenciador.projeto.model.Exame;
import br.com.gerenciador.projeto.model.Usuario;
import br.com.gerenciador.projeto.security.AuthUtil;
import br.com.gerenciador.projeto.security.JwtUtil;

@Service
public class UsuarioService {

    @Autowired private IUsuario  dao;
    @Autowired private TimeDAO   timeDAO;
    @Autowired private JwtUtil   jwtUtil;

    /** Gera hash BCrypt, evitando re-hashear algo que já é um hash BCrypt. */
    private static String hashSenha(String senha) {
        if (senha == null) return null;
        if (senha.startsWith("$2a$") || senha.startsWith("$2b$") || senha.startsWith("$2y$"))
            return senha; // já é hash BCrypt — não hashear de novo
        return BCrypt.hashpw(senha, BCrypt.gensalt(12));
    }

    private static final String ERRO_SENHA_FRACA =
        "A senha deve ter pelo menos 8 caracteres, incluindo letras e números.";

    /** Política mínima: 8+ caracteres, com pelo menos uma letra e um número. */
    private static boolean senhaFraca(String senha) {
        if (senha == null || senha.length() < 8) return true;
        boolean temLetra  = senha.chars().anyMatch(Character::isLetter);
        boolean temDigito = senha.chars().anyMatch(Character::isDigit);
        return !temLetra || !temDigito;
    }

    /** Remove dados sensíveis (CPF, endereço, dados de responsáveis, etc.)
     *  para quem não é Admin/Treinador nem o próprio usuário. */
    private static Usuario sanitizarParaListagem(Usuario u, Integer authId, Integer authTipo) {
        boolean privilegiado = authTipo != null && authTipo <= 2;
        boolean ehDono = authId != null && authId.equals(u.getId_usuario());
        if (privilegiado || ehDono) return u;

        u.setEmail_usuario(null);
        u.setLogin_usuario(null);
        u.setData_nasc_usuario(null);
        u.setEndereco_usuario(null);
        u.setBairro_usuario(null);
        u.setCep_usuario(null);
        u.setCidade_usuario(null);
        u.setEstado_usuario(null);
        u.setCel_usuario(null);
        u.setCpf_usuario(null);
        u.setRg_responsavel_1(null);
        u.setRg_responsavel_2(null);
        u.setCpf_responsavel_1(null);
        u.setCpf_responsavel_2(null);
        u.setCel_responsavel_1(null);
        u.setCel_responsavel_2(null);
        return u;
    }

    public List<Usuario> listarTodos(Integer idTime, Integer authId, Integer authTipo) {
        List<Usuario> lista = idTime != null ? dao.buscarPorTime(idTime) : dao.findAll();
        lista.forEach(u -> sanitizarParaListagem(u, authId, authTipo));
        return lista;
    }

    public Usuario buscarPorId(Integer id, Integer authId, Integer authTipo) {
        Usuario u = dao.findById(id)
            .orElseThrow(() -> new NotFoundException("Usuario nao encontrado."));
        return sanitizarParaListagem(u, authId, authTipo);
    }

    public List<Exame> listarExames(Integer id, Integer authId, Integer authTipo) {
        Usuario u = dao.findById(id)
            .orElseThrow(() -> new NotFoundException("Usuario nao encontrado."));
        boolean ehDono = authId != null && authId.equals(id);
        Integer idTimeAlvo = u.getTime() != null ? u.getTime().getId_time() : null;
        boolean autorizado = ehDono || AuthUtil.ehAdmin(authTipo)
            || AuthUtil.podeGerenciarTime(authTipo, authId, idTimeAlvo, dao);
        if (!autorizado)
            throw new ForbiddenException("Sem permissao para ver exames deste usuario.");
        return u.getExames();
    }

    public List<Usuario> listarTreinadores() {
        return dao.findAll().stream()
            .filter(u -> u.getTipo_usuario() != null && u.getTipo_usuario() <= 2)
            .collect(Collectors.toList());
    }

    // Somente Admin ou Treinador podem cadastrar novos usuarios.
    public Usuario criar(Usuario usuario, Integer authId, Integer authTipo) {
        if (!AuthUtil.ehAdmin(authTipo) && !AuthUtil.ehTreinador(authTipo))
            throw new ForbiddenException("Somente Admin ou Treinador podem cadastrar usuarios.");

        if (senhaFraca(usuario.getSenha_usuario()))
            throw new BadRequestException(ERRO_SENHA_FRACA);

        // Somente Admin pode definir o perfil (tipo_usuario) do novo cadastro —
        // Treinador sempre cadastra Atleta, evitando autopromoção/promoção indevida.
        if (!AuthUtil.ehAdmin(authTipo) || usuario.getTipo_usuario() == null)
            usuario.setTipo_usuario(3);

        if (AuthUtil.ehTreinador(authTipo)) {
            // Treinador só pode vincular o novo cadastro ao próprio time.
            Integer meuTime = AuthUtil.timeDoUsuario(authId, dao);
            usuario.setTime(meuTime != null ? timeDAO.findById(meuTime).orElse(null) : null);
        } else if (usuario.getTime() != null && usuario.getTime().getId_time() != null) {
            timeDAO.findById(usuario.getTime().getId_time()).ifPresent(usuario::setTime);
        }

        usuario.setSenha_usuario(hashSenha(usuario.getSenha_usuario()));

        return dao.save(usuario);
    }

    public static class LoginResultado {
        public final Usuario usuario;
        public final String token;
        public LoginResultado(Usuario usuario, String token) {
            this.usuario = usuario;
            this.token = token;
        }
    }

    public LoginResultado login(String login, String senha, String tipoStr) {
        if (login == null || senha == null || tipoStr == null)
            throw new BadRequestException("Campos obrigatorios ausentes.");

        Integer tipo;
        try { tipo = Integer.parseInt(tipoStr); }
        catch (NumberFormatException e) {
            throw new BadRequestException("tipo_usuario invalido.");
        }

        Optional<Usuario> opt = dao.buscarPorLoginTipo(login, tipo);
        if (opt.isEmpty())
            throw new UnauthorizedException("Usuario nao encontrado ou perfil incorreto.");

        Usuario u = opt.get();
        String hash = u.getSenha_usuario();

        // Suporta BCrypt (novo) e texto plano (legado).
        // Se a senha legada bater, o hash é migrado para BCrypt na hora.
        boolean senhaOk;
        boolean legado = false;
        if (hash != null && (hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$"))) {
            senhaOk = BCrypt.checkpw(senha, hash);
        } else {
            senhaOk = senha.equals(hash);
            legado  = senhaOk;
        }

        if (!senhaOk)
            throw new UnauthorizedException("Senha incorreta.");

        // Migração automática: substitui a senha em texto plano por BCrypt
        if (legado) {
            u.setSenha_usuario(BCrypt.hashpw(senha, BCrypt.gensalt(12)));
            dao.save(u);
        }

        String token = jwtUtil.gerarToken(u.getId_usuario(), u.getLogin_usuario(), u.getTipo_usuario());
        u.setSenha_usuario(null);
        return new LoginResultado(u, token);
    }

    public long getExpirationSegundos() {
        return jwtUtil.getExpirationSegundos();
    }

    public Usuario atualizar(Integer id, Usuario dados, Integer authId, Integer authTipo) {
        Usuario alvo = dao.findById(id)
            .orElseThrow(() -> new NotFoundException("Usuario nao encontrado."));

        boolean ehDono  = authId != null && authId.equals(id);
        boolean ehAdmin = AuthUtil.ehAdmin(authTipo);
        Integer idTimeAlvo = alvo.getTime() != null ? alvo.getTime().getId_time() : null;
        // Treinador só pode editar cadastros do próprio time — nunca de outro time ou sem time.
        boolean ehTreinadorDoTime = AuthUtil.podeGerenciarTime(authTipo, authId, idTimeAlvo, dao);

        // Só o próprio usuário, um Admin ou o Treinador do time deste usuário podem editar este cadastro
        if (!ehDono && !ehAdmin && !ehTreinadorDoTime)
            throw new ForbiddenException("Sem permissao para editar este usuario.");

        boolean trocandoSenha = dados.getSenha_usuario() != null && !dados.getSenha_usuario().isBlank();
        if (trocandoSenha && senhaFraca(dados.getSenha_usuario()))
            throw new BadRequestException(ERRO_SENHA_FRACA);
        // Só o próprio dono ou um Admin podem trocar a senha por aqui —
        // um Treinador não pode sequestrar a conta de outro usuário via troca de senha.
        if (trocandoSenha && !ehDono && !ehAdmin)
            throw new ForbiddenException("Sem permissao para alterar a senha deste usuario.");

        Usuario u = alvo;
        if (dados.getNome_usuario()      != null) u.setNome_usuario(dados.getNome_usuario());
        if (dados.getEmail_usuario()     != null) u.setEmail_usuario(dados.getEmail_usuario());
        if (dados.getLogin_usuario()     != null) u.setLogin_usuario(dados.getLogin_usuario());
        // Somente Admin pode alterar o perfil (tipo_usuario) de um cadastro —
        // evita que o próprio usuário ou um Treinador se autopromovam.
        if (dados.getTipo_usuario() != null && ehAdmin) u.setTipo_usuario(dados.getTipo_usuario());
        if (dados.getCel_usuario()       != null) u.setCel_usuario(dados.getCel_usuario());
        if (dados.getCpf_usuario()       != null && !dados.getCpf_usuario().isBlank()) u.setCpf_usuario(dados.getCpf_usuario());
        if (dados.getEndereco_usuario()  != null) u.setEndereco_usuario(dados.getEndereco_usuario());
        if (dados.getBairro_usuario()    != null) u.setBairro_usuario(dados.getBairro_usuario());
        if (dados.getCep_usuario()       != null && !dados.getCep_usuario().isBlank()) u.setCep_usuario(dados.getCep_usuario());
        if (dados.getCidade_usuario()    != null) u.setCidade_usuario(dados.getCidade_usuario());
        if (dados.getEstado_usuario()    != null) u.setEstado_usuario(dados.getEstado_usuario());
        if (dados.getFoto_usuario()      != null) u.setFoto_usuario(dados.getFoto_usuario());
        if (dados.getCpf_responsavel_1() != null) u.setCpf_responsavel_1(dados.getCpf_responsavel_1());
        if (dados.getCpf_responsavel_2() != null) u.setCpf_responsavel_2(dados.getCpf_responsavel_2());
        if (dados.getCel_responsavel_1() != null) u.setCel_responsavel_1(dados.getCel_responsavel_1());
        if (dados.getCel_responsavel_2() != null) u.setCel_responsavel_2(dados.getCel_responsavel_2());
        if (trocandoSenha) u.setSenha_usuario(hashSenha(dados.getSenha_usuario()));
        // Admin move para qualquer time; Treinador só pode vincular ao próprio time.
        if (dados.getTime() != null && dados.getTime().getId_time() != null) {
            Integer novoTime = dados.getTime().getId_time();
            boolean podeVincular = ehAdmin
                || (ehTreinadorDoTime && novoTime.equals(AuthUtil.timeDoUsuario(authId, dao)));
            if (podeVincular) timeDAO.findById(novoTime).ifPresent(u::setTime);
        }
        return dao.save(u);
    }

    public LoginResultado trocarSenha(Integer id, String nova, Integer authId, Integer authTipo) {
        // Só o próprio usuário do token (ou um Admin) pode trocar esta senha
        boolean ehDono  = authId != null && authId.equals(id);
        boolean ehAdmin = authTipo != null && authTipo == 1;
        if (!ehDono && !ehAdmin)
            throw new ForbiddenException("Sem permissao para alterar a senha deste usuario.");

        if (senhaFraca(nova))
            throw new BadRequestException(ERRO_SENHA_FRACA);

        Usuario u = dao.findById(id)
            .orElseThrow(() -> new NotFoundException("Usuario nao encontrado."));
        u.setSenha_usuario(BCrypt.hashpw(nova, BCrypt.gensalt(12)));
        u.setPrimeiro_login(0);
        dao.save(u);
        String token = jwtUtil.gerarToken(u.getId_usuario(), u.getLogin_usuario(), u.getTipo_usuario());
        u.setSenha_usuario(null);
        return new LoginResultado(u, token);
    }

    public void excluir(Integer id, Integer authId, Integer authTipo) {
        Usuario alvo = dao.findById(id)
            .orElseThrow(() -> new NotFoundException("Usuario nao encontrado."));

        boolean ehAdmin = AuthUtil.ehAdmin(authTipo);
        // Treinador só pode excluir Atleta/Treinador do próprio time — nunca um Admin.
        Integer idTimeAlvo = alvo.getTime() != null ? alvo.getTime().getId_time() : null;
        boolean ehTreinadorDoTime = alvo.getTipo_usuario() != null && alvo.getTipo_usuario() != 1
            && AuthUtil.podeGerenciarTime(authTipo, authId, idTimeAlvo, dao);

        if (!ehAdmin && !ehTreinadorDoTime)
            throw new ForbiddenException("Sem permissao para excluir este usuario.");

        dao.deleteById(id);
    }
}
