package br.com.gerenciador.projeto.service;

import java.security.SecureRandom;

import jakarta.mail.internet.MimeMessage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

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
        String perfil = perfil(u.getTipo_usuario());
        String time = u.getTime() != null && u.getTime().getNome_time() != null ? " no time " + u.getTime().getNome_time() : "";
        Email e = new Email()
            .titulo(novoCadastro ? "Bem-vindo ao LAIVY" : "Seu novo acesso")
            .paragrafo("Olá, " + u.getNome_usuario() + "!")
            .paragrafo(novoCadastro
                ? "Seu acesso ao LAIVY foi criado" + time + ". Use os dados abaixo para entrar pela primeira vez."
                : "Geramos um novo acesso para você. A senha anterior não vale mais.")
            .dado("Login", u.getLogin_usuario())
            .dado("Senha temporária", senha)
            .dado("Perfil", perfil)
            .botao("Entrar no LAIVY", appUrl + "/login.html")
            .paragrafo("No primeiro acesso você vai criar a sua própria senha — ninguém da equipe tem acesso a ela."
                + (u.getCadastro_completo() == 0 ? " Depois é só completar seus dados (documentos, endereço e contato) para liberar o acesso." : ""))
            .rodape("Se esquecer a senha, use \"Esqueci minha senha\" na tela de login. Não esperava este e-mail? Pode ignorá-lo.");
        return enviar(u, novoCadastro ? "Seu acesso ao LAIVY" : "Seu novo acesso ao LAIVY", e);
    }

    /** Link de redefinição ("esqueci minha senha"). Assíncrono: o tempo da resposta não revela se o login existe. */
    @Async
    public void enviarLinkRedefinicao(Usuario u, String token, int validadeMinutos) {
        enviar(u, "Redefina sua senha do LAIVY", new Email()
            .titulo("Redefinir senha")
            .paragrafo("Olá, " + u.getNome_usuario() + "!")
            .paragrafo("Recebemos um pedido para redefinir a senha do login " + u.getLogin_usuario()
                + " (" + perfil(u.getTipo_usuario()) + "). Clique no botão para criar uma senha nova.")
            .botao("Criar nova senha", appUrl + "/redefinir-senha.html?token=" + token)
            .paragrafo("O link vale por " + validadeMinutos + " minutos e só pode ser usado uma vez.")
            .rodape("Não foi você? Ignore este e-mail — sua senha atual continua valendo."));
    }

    /** Link de confirmação do e-mail do treinador que se cadastrou sozinho. */
    public boolean enviarConfirmacaoEmail(Usuario u, String token, int validadeHoras) {
        return enviar(u, "Confirme seu e-mail no LAIVY", new Email()
            .titulo("Confirme seu e-mail")
            .paragrafo("Olá, " + u.getNome_usuario() + "!")
            .paragrafo("Que bom ter você no LAIVY. Falta só um passo para ativar sua conta de treinador:")
            .botao("Confirmar e-mail", appUrl + "/confirmar-email.html?token=" + token)
            .paragrafo("O link vale por " + validadeHoras + " horas. Depois, entre com este e-mail (ou com o login "
                + u.getLogin_usuario() + "), a senha que você criou e o perfil Treinador.")
            .rodape("Não foi você que se cadastrou? Ignore este e-mail — a conta não será ativada."));
    }

    private boolean enviar(Usuario u, String assunto, Email email) {
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper h = new MimeMessageHelper(msg, true, "UTF-8");
            h.setFrom(mailFrom, "LAIVY");
            h.setTo(u.getEmail_usuario());
            h.setSubject(assunto);
            // texto puro + HTML no mesmo e-mail: só HTML pesa no filtro de spam
            h.setText(email.texto(), email.html());
            mailSender.send(msg);
            return true;
        } catch (Exception e) {
            log.warn("Falha ao enviar e-mail \"{}\" para o usuário #{}: {}", assunto, u.getId_usuario(), e.getMessage());
            return false;
        }
    }

    /** Monta o mesmo conteúdo em HTML (estilos inline, que é o que os clientes de e-mail respeitam) e em texto puro. */
    private static class Email {
        private static final String AZUL = "#0a1628", VERDE = "#00c97a", CINZA = "#5b6577";
        private final StringBuilder html = new StringBuilder(), texto = new StringBuilder(), dados = new StringBuilder();
        private String titulo = "";

        Email titulo(String t) { titulo = t; return this; }

        Email paragrafo(String p) {
            fecharDados();
            html.append("<p style=\"margin:0 0 16px;font-size:15px;line-height:1.6;color:").append(AZUL).append("\">")
                .append(esc(p)).append("</p>");
            texto.append(p).append("\n\n");
            return this;
        }

        /** Linhas seguidas viram um único quadro (ex.: login/senha). */
        Email dado(String rotulo, String valor) {
            dados.append("<tr><td style=\"padding:6px 0;font-size:13px;color:").append(CINZA).append("\">").append(esc(rotulo)).append("</td>")
                .append("<td style=\"padding:6px 0;font-size:15px;font-weight:bold;color:").append(AZUL)
                .append(";font-family:Consolas,Menlo,monospace;text-align:right\">").append(esc(valor)).append("</td></tr>");
            texto.append(rotulo).append(": ").append(valor).append("\n");
            return this;
        }

        private void fecharDados() {
            if (dados.length() == 0) return;
            html.append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin:4px 0 24px;")
                .append("padding:14px 18px;background:#f3f6fb;border-radius:10px\">").append(dados).append("</table>");
            dados.setLength(0);
            texto.append("\n");
        }

        Email botao(String rotulo, String url) {
            fecharDados();
            html.append("<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin:8px 0 24px\"><tr>")
                .append("<td style=\"border-radius:8px;background:").append(VERDE).append("\">")
                .append("<a href=\"").append(esc(url)).append("\" style=\"display:inline-block;padding:13px 28px;font-size:15px;")
                .append("font-weight:bold;color:").append(AZUL).append(";text-decoration:none;border-radius:8px\">")
                .append(esc(rotulo)).append("</a></td></tr></table>")
                .append("<p style=\"margin:0 0 20px;font-size:12px;line-height:1.5;color:").append(CINZA)
                .append("\">Se o botão não funcionar, copie e cole este endereço no navegador:<br>")
                .append("<span style=\"word-break:break-all;color:").append(AZUL).append("\">").append(esc(url)).append("</span></p>");
            texto.append(rotulo).append(": ").append(url).append("\n\n");
            return this;
        }

        Email rodape(String r) {
            fecharDados();
            html.append("<p style=\"margin:24px 0 0;padding-top:18px;border-top:1px solid #e4e8f0;font-size:13px;line-height:1.5;color:")
                .append(CINZA).append("\">").append(esc(r)).append("</p>");
            texto.append("—\n").append(r).append("\n");
            return this;
        }

        String texto() { return texto.toString(); }

        String html() {
            fecharDados();
            return "<!DOCTYPE html><html lang=\"pt-BR\"><head><meta charset=\"UTF-8\">"
                + "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>" + esc(titulo) + "</title></head>"
                + "<body style=\"margin:0;padding:0;background:#eef1f6;font-family:'Segoe UI',Helvetica,Arial,sans-serif\">"
                + "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#eef1f6;padding:32px 12px\"><tr><td align=\"center\">"
                + "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:520px;background:#ffffff;border-radius:14px;overflow:hidden\">"
                + "<tr><td style=\"background:" + AZUL + ";padding:22px 32px\">"
                + "<span style=\"font-size:22px;font-weight:800;letter-spacing:3px;color:#ffffff\">LAIV<span style=\"color:" + VERDE + "\">Y</span></span></td></tr>"
                + "<tr><td style=\"padding:32px\">"
                + "<h1 style=\"margin:0 0 20px;font-size:21px;line-height:1.3;color:" + AZUL + "\">" + esc(titulo) + "</h1>"
                + html
                + "</td></tr></table>"
                + "<p style=\"margin:16px 0 0;font-size:12px;color:#8a93a3\">LAIVY · gestão de equipes esportivas</p>"
                + "</td></tr></table></body></html>";
        }

        private static String esc(String s) { return HtmlUtils.htmlEscape(s == null ? "" : s, "UTF-8"); }
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
