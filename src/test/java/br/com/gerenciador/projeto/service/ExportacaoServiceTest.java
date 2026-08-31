package br.com.gerenciador.projeto.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ExportacaoServiceTest {

    private final ExportacaoService svc = new ExportacaoService();

    // SVG mínimo e autocontido — não depende de quadra-fiba.svg nem de
    // nenhuma outra jogada: só interessa aqui se o Batik/FOP transcodificam
    // um documento válido para os bytes certos.
    private static final String SVG = """
        <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
          <rect x="0" y="0" width="100" height="100" fill="#D9662B"/>
        </svg>
        """;

    @Test
    void pngGeradoComecaComAAssinaturaMagicaPng() throws Exception {
        byte[] assinaturaEsperada = { (byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n' };

        byte[] png = svc.png(SVG, 200f);

        assertThat(png).startsWith(assinaturaEsperada);
    }

    @Test
    void pdfGeradoComecaComPercentPdf() throws Exception {
        byte[] assinaturaEsperada = { '%', 'P', 'D', 'F' };

        byte[] pdf = svc.pdf(SVG);

        assertThat(pdf).startsWith(assinaturaEsperada);
    }
}
