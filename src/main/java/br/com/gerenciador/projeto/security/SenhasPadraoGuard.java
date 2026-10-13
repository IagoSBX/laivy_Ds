package br.com.gerenciador.projeto.security;

import java.security.SecureRandom;
import java.util.Map;

import org.mindrot.jbcrypt.BCrypt;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import br.com.gerenciador.projeto.DAO.IUsuario;

/**
 * As contas do V3__seed.sql (admin/admin, treinador/1234, atleta/1234) estão
 * no README — qualquer um entraria como Admin. Na subida, se alguma ainda usa
 * a senha padrão, ela é trocada por uma senha temporária aleatória (com troca
 * obrigatória no primeiro acesso) que só aparece no log do container:
 *   docker logs laivy-backend | grep "Senha padrao"
 * Também converte para BCrypt qualquer senha legada ainda em texto puro.
 */
@Component
public class SenhasPadraoGuard implements ApplicationRunner {

    private static final Map<String, String> PADRAO = Map.of(
        "admin", "admin", "treinador", "1234", "atleta", "1234");
    private static final SecureRandom RANDOM = new SecureRandom();

    private final IUsuario dao;

    public SenhasPadraoGuard(IUsuario dao) { this.dao = dao; }

    @Override
    public void run(ApplicationArguments args) {
        PADRAO.forEach((login, senhaPadrao) -> dao.findAll().stream()
            .filter(u -> login.equals(u.getLogin_usuario()))
            .filter(u -> usaSenha(u.getSenha_usuario(), senhaPadrao))
            .forEach(u -> {
                String nova = gerar();
                u.setSenha_usuario(BCrypt.hashpw(nova, BCrypt.gensalt(12)));
                u.setPrimeiro_login(1);
                u.setToken_version(u.getToken_version() + 1);
                dao.save(u);
                System.out.println("[LAIVY] Senha padrao da conta '" + login
                    + "' substituida. Senha temporaria: " + nova + " (troca obrigatoria no primeiro acesso)");
            }));

        // Senhas legadas em texto puro: o login só aceita BCrypt, então elas
        // viram hash aqui, uma vez, sem mudar a senha de ninguém.
        dao.findAll().stream()
            .filter(u -> u.getSenha_usuario() != null && !u.getSenha_usuario().startsWith("$2"))
            .forEach(u -> {
                u.setSenha_usuario(BCrypt.hashpw(u.getSenha_usuario(), BCrypt.gensalt(12)));
                dao.save(u);
                System.out.println("[LAIVY] Senha em texto puro da conta '" + u.getLogin_usuario() + "' migrada para BCrypt.");
            });
    }

    private static boolean usaSenha(String hash, String senha) {
        if (hash == null) return false;
        if (hash.startsWith("$2")) return BCrypt.checkpw(senha, hash);
        return hash.equals(senha); // legado em texto puro
    }

    private static String gerar() {
        final String chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        StringBuilder sb = new StringBuilder("Lv");
        for (int i = 0; i < 10; i++) sb.append(chars.charAt(RANDOM.nextInt(chars.length())));
        return sb.append(RANDOM.nextInt(10)).toString();
    }
}
