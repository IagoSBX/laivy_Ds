package br.com.gerenciador.projeto.service;

import java.security.SecureRandom;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import br.com.gerenciador.projeto.model.Usuario;

/**
 * E-mails de acesso: senha temporária de um cadastro novo (ou reenviada) e o
 * link de "esqueci minha senha". A senha temporária só existe em memória até
 * sair neste e-mail — não volta na resposta da API nem vai para log; quem
 * cadastrou nunca a vê.
 */
@Service
public class AcessoService {

    private static final Logger log = LoggerFactory.getLogger(AcessoService.class);
    private static final SecureRandom RANDOM = new SecureRandom();

    @Autowired private JavaMailSender mailSender;

    @Value("${app.mail.from}")
    private String mailFrom;

    @Value("${app.url}")
    private String appUrl;

    /** 10 caracteres, sempre com letra e número (passa na regra de senha do sistema). */
    public static String gerarSenhaTemporaria() {
        final String letras = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
        final String numeros = "23456789";
        final String todos = letras + numeros;
        StringBuilder sb = new StringBuilder();
        sb.append(letras.charAt(RANDOM.nextInt(letras.length())));
        sb.append(numeros.charAt(RANDOM.nextInt(numeros.length())));
        for (int i = 0; i < 8; i++) sb.append(todos.charAt(RANDOM.nextInt(todos.length())));
        return sb.toString();
    }

    /**
     * Manda login + senha temporária para o e-mail do usuário.
     * @param novoCadastro true no cadastro; false quando o acesso foi reenviado
     * @return se o e-mail saiu (falha de SMTP não lança exceção)
     */
    public boolean enviarSenhaTemporaria(Usuario u, String senha, boolean novoCadastro) {
        String time = u.getTime() != null && u.getTime().getNome_time() != null ? " no time " + u.getTime().getNome_time() : "";
        String abertura = novoCadastro
            ? "Seu acesso ao LAIVY foi criado" + time + "."
            : "Um novo acesso ao LAIVY foi gerado para você. A senha anterior deixou de valer.";
        return enviar(u, novoCadastro ? "Seu acesso ao LAIVY" : "Nova senha temporária do LAIVY",
            "Olá, " + u.getNome_usuario() + "!\n\n"
            + abertura + "\n\n"
            + "Acesse: " + appUrl + "/login.html\n"
            + "Perfil: " + perfil(u.getTipo_usuario()) + "\n"
            + "Login: " + u.getLogin_usuario() + "\n"
            + "Senha temporária: " + senha + "\n\n"
            + "Para entrar, use o login e a senha temporária acima e escolha o perfil " + perfil(u.getTipo_usuario()) + ".\n"
            + "No primeiro acesso você vai criar a sua própria senha. Ninguém da equipe tem acesso a ela.\n"
            + (u.getCadastro_completo() == 0 ? "Em seguida, complete seus dados (documentos, endereço e contato) para liberar o acesso.\n" : "")
            + "Esqueceu a senha depois? Use \"Esqueci minha senha\" na tela de login.\n"
            + "Se você não esperava este e-mail, pode ignorá-lo.");
    }

    /** Link de redefinição ("esqueci minha senha"). Assíncrono: o tempo da resposta não revela se o login existe. */
    @Async
    public void enviarLinkRedefinicao(Usuario u, String token, int validadeMinutos) {
        enviar(u, "Redefinição de senha do LAIVY",
            "Olá, " + u.getNome_usuario() + "!\n\n"
            + "Recebemos um pedido para redefinir a senha do login \"" + u.getLogin_usuario() + "\" (perfil " + perfil(u.getTipo_usuario()) + ").\n\n"
            + "Para criar uma senha nova, abra o link abaixo em até " + validadeMinutos + " minutos:\n"
            + appUrl + "/redefinir-senha.html?token=" + token + "\n\n"
            + "O link só pode ser usado uma vez. Se você não pediu a redefinição, ignore este e-mail: sua senha atual continua valendo.");
    }

    /** Link de confirmação do e-mail do treinador que se cadastrou sozinho. */
    public boolean enviarConfirmacaoEmail(Usuario u, String token, int validadeHoras) {
        return enviar(u, "Confirme seu e-mail no LAIVY",
            "Olá, " + u.getNome_usuario() + "!\n\n"
            + "Recebemos o cadastro da sua conta de treinador no LAIVY.\n"
            + "Para ativá-la, abra o link abaixo em até " + validadeHoras + " horas:\n"
            + appUrl + "/confirmar-email.html?token=" + token + "\n\n"
            + "Depois, entre com este e-mail (ou com o login " + u.getLogin_usuario() + "), a senha que você criou e o perfil Treinador.\n"
            + "Se não foi você que se cadastrou, ignore este e-mail: a conta não será ativada.");
    }

    private boolean enviar(Usuario u, String assunto, String texto) {
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(mailFrom);
            msg.setTo(u.getEmail_usuario());
            msg.setSubject(assunto);
            msg.setText(texto);
            mailSender.send(msg);
            return true;
        } catch (Exception e) {
            log.warn("Falha ao enviar e-mail \"{}\" para o usuário #{}: {}", assunto, u.getId_usuario(), e.getMessage());
            return false;
        }
    }

    private static String perfil(Integer tipo) {
        if (tipo == null) return "Atleta";
        return switch (tipo) {
            case 1 -> "Administrador";
            case 2 -> "Treinador";
            case 4 -> "Preparador Físico";
            default -> "Atleta";
        };
    }
}
