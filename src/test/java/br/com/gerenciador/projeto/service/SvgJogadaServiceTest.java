package br.com.gerenciador.projeto.service;

import br.com.gerenciador.projeto.model.json.JogadaConteudo;
import br.com.gerenciador.projeto.model.json.JogadaConteudo.Bola;
import br.com.gerenciador.projeto.model.json.JogadaConteudo.Frame;
import br.com.gerenciador.projeto.model.json.JogadaConteudo.Token;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.DefaultResourceLoader;
import org.xml.sax.InputSource;

import javax.xml.parsers.DocumentBuilderFactory;
import java.io.StringReader;
import java.util.List;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

class SvgJogadaServiceTest {

    private SvgJogadaService svc;

    @BeforeEach
    void setUp() throws Exception {
        svc = new SvgJogadaService(new DefaultResourceLoader());
        // @PostConstruct não roda fora de um container — chamado direto aqui,
        // possível porque o teste está no mesmo pacote (método package-private).
        svc.carregarQuadra();
    }

    private static Frame frame(String id, Token... tokens) {
        return new Frame(id, "descrição do frame", 900, List.of(tokens),
            new Bola(tokens[0].id(), null, null), List.of(), List.of());
    }

    private static JogadaConteudo jogadaDeDoisFrames() {
        var f1 = frame("f1",
            new Token("tk1", "ataque", null, "1", 0.30, 0.30),
            new Token("tk2", "defesa", null, "2", 0.60, 0.60));
        var f2 = frame("f2",
            new Token("tk1", "ataque", null, "1", 0.35, 0.30),
            new Token("tk2", "defesa", null, "2", 0.55, 0.60));
        return new JogadaConteudo(1, "ataque", "meia", 900, List.of(f1, f2));
    }

    @Test
    void svgDaFolhaTemAQuantidadeCertaDeTokensETemXmlBemFormado() {
        var jogada = jogadaDeDoisFrames();

        String svg = svc.svgFolhas("Jogada de teste", jogada).get(0);

        // cada token é um <circle r="0.52" .../>; a bola usa r="0.23", não colide
        int tokensNoSvg = contarOcorrencias(svg, Pattern.quote("r=\"0.52\""));
        int tokensEsperados = jogada.frames().stream().mapToInt(f -> f.tokens().size()).sum();
        assertThat(tokensNoSvg).isEqualTo(tokensEsperados).isEqualTo(4);

        assertThatCode(() -> parsear(svg)).doesNotThrowAnyException();
    }

    @Test
    void svgDeUmFrameIsoladoTambemEBemFormado() {
        var jogada = jogadaDeDoisFrames();

        String svg = svc.svgFrame(jogada, 0);

        assertThat(contarOcorrencias(svg, Pattern.quote("r=\"0.52\""))).isEqualTo(2);
        assertThatCode(() -> parsear(svg)).doesNotThrowAnyException();
    }

    private static int contarOcorrencias(String texto, String regex) {
        var m = Pattern.compile(regex).matcher(texto);
        int n = 0;
        while (m.find()) n++;
        return n;
    }

    private static void parsear(String xml) throws Exception {
        var factory = DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(true);
        factory.newDocumentBuilder().parse(new InputSource(new StringReader(xml)));
    }
}
