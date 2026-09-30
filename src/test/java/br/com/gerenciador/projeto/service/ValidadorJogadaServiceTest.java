package br.com.gerenciador.projeto.service;

import br.com.gerenciador.projeto.model.json.JogadaConteudo;
import br.com.gerenciador.projeto.model.json.JogadaConteudo.Bola;
import br.com.gerenciador.projeto.model.json.JogadaConteudo.Frame;
import br.com.gerenciador.projeto.model.json.JogadaConteudo.Token;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ValidadorJogadaServiceTest {

    private final ValidadorJogadaService validador = new ValidadorJogadaService();

    private static Token token(String id, String papel, double x, double y) {
        return new Token(id, papel, null, "", x, y);
    }

    private static Frame frame(String id, Bola bola, Token... tokens) {
        return new Frame(id, "", 900, List.of(tokens), bola, List.of(), List.of());
    }

    private static JogadaConteudo jogada(Frame... frames) {
        return new JogadaConteudo(1, "ataque", "meia", 900, List.of(frames));
    }

    @Test
    void jogadaValidaPassa() {
        // basquete é 5x5: precisa de exatamente 5 atacantes e 5 defensores
        // por frame, cada um longe o bastante dos outros (>0.6m).
        Token[] tokens = new Token[10];
        for (int i = 0; i < 5; i++) {
            tokens[i] = token("ataque" + i, "ataque", 0.10, 0.10 + i * 0.20);
            tokens[5 + i] = token("defesa" + i, "defesa", 0.30, 0.10 + i * 0.20);
        }
        var f = frame("f1", new Bola("ataque0", null, null), tokens);

        var resultado = validador.validar(jogada(f));

        assertThat(resultado.valido()).isTrue();
        assertThat(resultado.erros()).isEmpty();
    }

    @Test
    void idsDeTokenDivergentesEntreFramesFalha() {
        var f1 = frame("f1", new Bola("tk1", null, null), token("tk1", "ataque", 0.3, 0.3));
        // frame 2 troca o id do boneco — quebra o invariante que sustenta a interpolação
        var f2 = frame("f2", new Bola("tk2", null, null), token("tk2", "ataque", 0.4, 0.4));

        var resultado = validador.validar(jogada(f1, f2));

        assertThat(resultado.valido()).isFalse();
        assertThat(resultado.erros()).anyMatch(e -> e.contains("ids precisam ser estáveis"));
    }

    @Test
    void maisDeCincoAtacantesFalha() {
        Token[] tokens = new Token[6];
        for (int i = 0; i < 6; i++) {
            tokens[i] = token("tk" + i, "ataque", 0.1 + i * 0.1, 0.1 + i * 0.1);
        }
        var f = frame("f1", new Bola("tk0", null, null), tokens);

        var resultado = validador.validar(jogada(f));

        assertThat(resultado.valido()).isFalse();
        assertThat(resultado.erros()).anyMatch(e -> e.contains("atacantes em quadra"));
    }

    @Test
    void bolaApontandoParaTokenInexistenteFalha() {
        var t1 = token("tk1", "ataque", 0.3, 0.3);
        var f = frame("f1", new Bola("naoexiste", null, null), t1);

        var resultado = validador.validar(jogada(f));

        assertThat(resultado.valido()).isFalse();
        assertThat(resultado.erros()).anyMatch(e -> e.contains("token inexistente"));
    }
}
