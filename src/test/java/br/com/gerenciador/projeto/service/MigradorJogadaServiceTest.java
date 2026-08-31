package br.com.gerenciador.projeto.service;

import br.com.gerenciador.projeto.model.json.JogadaConteudo;
import br.com.gerenciador.projeto.model.json.JogadaConteudo.Bola;
import br.com.gerenciador.projeto.model.json.JogadaConteudo.Frame;
import br.com.gerenciador.projeto.model.json.JogadaConteudo.Token;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MigradorJogadaServiceTest {

    private final MigradorJogadaService migrador = new MigradorJogadaService();

    private static JogadaConteudo jogadaComSchema(int schemaVersion) {
        var token = new Token("tk1", "ataque", null, "1", 0.3, 0.3);
        var frame = new Frame("f1", "", 900, List.of(token), new Bola("tk1", null, null), List.of(), List.of());
        return new JogadaConteudo(schemaVersion, "ataque", "meia", 900, List.of(frame));
    }

    @Test
    void schemaVersionMaiorQueASuportadaLancaExcecao() {
        var futura = jogadaComSchema(JogadaConteudo.VERSAO_ATUAL + 1);

        assertThatThrownBy(() -> migrador.migrar(futura))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("mais nova que a suportada");
    }

    @Test
    void schemaVersionAtualPassaSemAlteracao() {
        var atual = jogadaComSchema(JogadaConteudo.VERSAO_ATUAL);

        var migrada = migrador.migrar(atual);

        assertThat(migrada).isSameAs(atual);
    }
}
