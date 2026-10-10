package br.com.gerenciador.projeto.service;

import br.com.gerenciador.projeto.model.json.JogadaConteudo;
import jakarta.annotation.PostConstruct;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;

/**
 * Monta o SVG da jogada no servidor, a partir do mesmo JSON que o editor usa.
 *
 * A geometria da quadra NÃO é reimplementada aqui: o arquivo
 * static/img/quadra-fiba.svg é lido do classpath e reaproveitado. Se a
 * quadra fosse desenhada duas vezes — uma em Java, outra em JS — o PDF
 * divergiria da tela na primeira alteração de medida.
 *
 * Regras de compatibilidade com o Batik (SVG 1.1, sem CSS externo, sem JS):
 *   - todo estilo é atributo de apresentação
 *   - nada de variável CSS, nada de <style> com seletor
 *   - centralização vertical de texto por deslocamento, não por
 *     dominant-baseline (que o Batik trata de forma inconsistente)
 */
@Service
public class SvgJogadaService {

    private static final double COMPRIMENTO = 28.0;   // metros
    private static final double LARGURA     = 15.0;

    private static final String COR_ATAQUE = "#D9662B";
    private static final String COR_DEFESA = "#5A5148";
    private static final String COR_BOLA   = "#F2A93B";
    private static final String COR_TINTA  = "#1F1B16";
    private static final String COR_PASSE  = "#2E6B5E";

    // Paleta LAIVY (mesma de dashboard.html / prancheta.css) — usada só no
    // CABEÇALHO da folha PDF. A quadra em si mantém as cores acima: é a
    // notação tática que o treinador já reconhece, não faz sentido "rebrandar".
    private static final String LAIVY_AZUL    = "#0A1628";
    private static final String LAIVY_VERDE   = "#00C97A";
    private static final String LAIVY_LARANJA = "#FF6B1A";
    private static final String LAIVY_CINZA   = "#8899BB"; // sobre fundo navy
    private static final String LAIVY_BRANCO  = "#F0F4FF";
    private static final String LAIVY_TEXTO   = "#20304A"; // sobre fundo branco
    private static final String LAIVY_CINZA_CLARO = "#5A6B8C"; // texto secundário sobre fundo branco

    private final ResourceLoader resourceLoader;
    private String defs;
    private String geometria;

    public SvgJogadaService(ResourceLoader resourceLoader) {
        this.resourceLoader = resourceLoader;
    }

    @PostConstruct
    void carregarQuadra() throws IOException {
        var recurso = resourceLoader.getResource("classpath:static/img/quadra-fiba.svg");
        String arquivo;
        try (var in = recurso.getInputStream()) {
            arquivo = new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
        this.defs      = recortar(arquivo, "<defs>", "</defs>");
        this.geometria = recortar(arquivo, "<g id=\"quadra-geometria\"", "</g>\n</svg>");
        if (defs == null || geometria == null) {
            throw new IllegalStateException(
                "quadra-fiba.svg não tem a estrutura esperada (<defs> e <g id=\"quadra-geometria\">).");
        }
    }

    // ------------------------------------------------------------------
    // SVG de um frame isolado — usado no PNG e na pré-visualização
    // ------------------------------------------------------------------

    public String svgFrame(JogadaConteudo c, int indice) {
        var frame = c.frames().get(indice);
        String viewBox = "meia".equals(c.enquadramento()) ? "0 0 14 15" : "0 0 28 15";

        var sb = new StringBuilder(4096);
        sb.append("<svg xmlns=\"http://www.w3.org/2000/svg\" ")
          .append("xmlns:xlink=\"http://www.w3.org/1999/xlink\" viewBox=\"")
          .append(viewBox).append("\">")
          .append(defs)
          .append(geometria)
          .append(camadas(frame))
          .append("</svg>");
        return sb.toString();
    }

    // ------------------------------------------------------------------
    // Folha A4 com a sequência completa — vira o PDF em uma única página
    // ------------------------------------------------------------------

    /**
     * Uma ou mais folhas A4 (210x297 mm) com título e a grade de frames, cada
     * um com sua descrição. Uma jogada pode ter até 40 frames (ver
     * JogadaConteudo) e nem sempre cabem numa página só — por isso o retorno
     * é uma lista, uma folha por página, e quem chama funde as páginas num
     * PDF só (ExportacaoService.pdf(List)). Antes disso os frames que não
     * coubessem numa única folha eram descartados em silêncio.
     */
    public List<String> svgFolhas(String nomeJogada, JogadaConteudo c) {
        boolean meia = "meia".equals(c.enquadramento());
        String vbFrame = meia ? "0 0 14 15" : "0 0 28 15";
        double razao = meia ? 15.0 / 14.0 : 15.0 / 28.0;

        int colunas = meia ? 2 : 1;
        double margem = 15, larguraUtil = 210 - 2 * margem;
        double espaco = 8;
        double larguraCelula = (larguraUtil - espaco * (colunas - 1)) / colunas;
        double alturaQuadra = larguraCelula * razao;
        double alturaCelula = alturaQuadra + 12;   // 12 mm para a legenda

        double alturaFaixa = 28;
        double topo = alturaFaixa + 12;
        int linhasPorPagina = Math.max(1, (int) ((285 - topo + espaco) / (alturaCelula + espaco)));
        int framesPorPagina = linhasPorPagina * colunas;

        int totalFrames = c.frames().size();
        int totalPaginas = Math.max(1, (int) Math.ceil(totalFrames / (double) framesPorPagina));

        var paginas = new java.util.ArrayList<String>(totalPaginas);
        for (int pagina = 0; pagina < totalPaginas; pagina++) {
            int inicio = pagina * framesPorPagina;
            int fim = Math.min(inicio + framesPorPagina, totalFrames);
            paginas.add(paginaSvg(nomeJogada, c, meia, vbFrame, colunas, margem, espaco,
                    larguraCelula, alturaQuadra, alturaCelula, topo, alturaFaixa,
                    inicio, fim, pagina + 1, totalPaginas));
        }
        return paginas;
    }

    private String paginaSvg(String nomeJogada, JogadaConteudo c, boolean meia, String vbFrame,
                             int colunas, double margem, double espaco, double larguraCelula,
                             double alturaQuadra, double alturaCelula, double topo, double alturaFaixa,
                             int inicio, int fim, int numeroPagina, int totalPaginas) {
        var sb = new StringBuilder(16_384);
        sb.append("<svg xmlns=\"http://www.w3.org/2000/svg\" ")
          .append("width=\"210mm\" height=\"297mm\" viewBox=\"0 0 210 297\">")
          .append("<rect x=\"0\" y=\"0\" width=\"210\" height=\"297\" fill=\"#FFFFFF\"/>")
          .append(defs);

        // Cabeçalho de marca — navy do LAIVY, com faixa laranja de destaque
        // embaixo (mesma dupla verde/laranja usada no resto do sistema).
        sb.append("<rect x=\"0\" y=\"0\" width=\"210\" height=\"").append(f(alturaFaixa))
          .append("\" fill=\"").append(LAIVY_AZUL).append("\"/>");
        sb.append("<rect x=\"0\" y=\"").append(f(alturaFaixa)).append("\" width=\"210\" height=\"1.4\" fill=\"")
          .append(LAIVY_LARANJA).append("\"/>");

        sb.append(texto(margem, 10, 5.5, "start", LAIVY_VERDE, "bold", "LAIVY"));
        String rotuloPagina = totalPaginas > 1
                ? "Prancheta Tática · Página " + numeroPagina + "/" + totalPaginas
                : "Prancheta Tática";
        sb.append(texto(210 - margem, 10, 3, "end", LAIVY_CINZA, "normal", rotuloPagina));
        sb.append(texto(margem, 20, 7, "start", LAIVY_BRANCO, "bold", escapar(nomeJogada)));
        sb.append(texto(margem, 25.5, 3.4, "start", LAIVY_CINZA, "normal",
                escapar(rotuloTipo(c.tipo()) + " · " + c.frames().size() + " frames")));

        for (int i = inicio; i < fim; i++) {
            var frame = c.frames().get(i);
            int posicao = i - inicio;
            int col = posicao % colunas, lin = posicao / colunas;
            double x = margem + col * (larguraCelula + espaco);
            double y = topo + lin * (alturaCelula + espaco);

            sb.append("<svg x=\"").append(f(x)).append("\" y=\"").append(f(y))
              .append("\" width=\"").append(f(larguraCelula))
              .append("\" height=\"").append(f(alturaQuadra))
              .append("\" viewBox=\"").append(vbFrame).append("\">")
              .append(geometria).append(camadas(frame)).append("</svg>");

            String legenda = "Frame " + (i + 1)
                    + (frame.descricao() == null || frame.descricao().isBlank()
                        ? "" : " — " + frame.descricao());
            sb.append(texto(x, y + alturaQuadra + 5, 3.4, "start", LAIVY_TEXTO, "normal",
                    escapar(recortarTexto(legenda, meia ? 58 : 120))));
        }

        sb.append("<line x1=\"").append(margem).append("\" y1=\"290\" x2=\"")
          .append(210 - margem).append("\" y2=\"290\" stroke=\"").append(LAIVY_LARANJA)
          .append("\" stroke-width=\"0.5\" stroke-opacity=\"0.5\"/>");
        sb.append(texto(105, 294.5, 2.8, "middle", LAIVY_CINZA_CLARO, "normal",
                "LAIVY · For those who live the game"));

        sb.append("</svg>");
        return sb.toString();
    }

    // ------------------------------------------------------------------
    // Camadas: traços, tokens, bola, textos
    // ------------------------------------------------------------------

    private String camadas(JogadaConteudo.Frame frame) {
        var sb = new StringBuilder(2048);

        sb.append("<g id=\"camada-tracos\" fill=\"none\" stroke-linecap=\"round\" ")
          .append("stroke-linejoin=\"round\">");
        for (var t : frame.tracosOuVazio()) sb.append(traco(t));
        sb.append("</g>");

        sb.append("<g id=\"camada-tokens\">");
        for (var t : frame.tokens()) sb.append(token(t));
        sb.append("</g>");

        sb.append(bola(frame));

        sb.append("<g id=\"camada-textos\">");
        for (var tx : frame.textosOuVazio()) {
            sb.append(texto(tx.x() * COMPRIMENTO, tx.y() * LARGURA, 0.5,
                    "middle", COR_TINTA, "normal", escapar(tx.conteudo())));
        }
        sb.append("</g>");

        return sb.toString();
    }

    private String token(JogadaConteudo.Token t) {
        double x = t.x() * COMPRIMENTO, y = t.y() * LARGURA;
        boolean ataque = "ataque".equals(t.papel());
        String preenchimento = ataque ? COR_ATAQUE : "#FFFFFF";
        String borda         = ataque ? "#FFFFFF"  : COR_DEFESA;
        String corTexto      = ataque ? "#FFFFFF"  : COR_DEFESA;
        String rotulo        = (t.numero() == null || t.numero().isBlank())
                                ? (ataque ? "" : "x") : t.numero();

        return "<g transform=\"translate(" + f(x) + " " + f(y) + ")\">"
             + "<circle r=\"0.52\" fill=\"" + preenchimento + "\" stroke=\"" + borda
             + "\" stroke-width=\"0.09\"/>"
             + "<text y=\"0.2\" text-anchor=\"middle\" font-size=\"0.58\" "
             + "font-family=\"Helvetica, Arial, sans-serif\" font-weight=\"bold\" fill=\""
             + corTexto + "\">" + escapar(rotulo) + "</text>"
             + "</g>";
    }

    private String bola(JogadaConteudo.Frame frame) {
        var b = frame.bola();
        if (b == null) return "";
        double x, y;
        if (b.posseDoTokenId() != null) {
            var dono = frame.tokens().stream()
                    .filter(t -> b.posseDoTokenId().equals(t.id()))
                    .findFirst().orElse(null);
            if (dono == null) return "";
            x = dono.x() * COMPRIMENTO + 0.55;     // encostada no jogador
            y = dono.y() * LARGURA     - 0.42;
        } else if (b.x() != null && b.y() != null) {
            x = b.x() * COMPRIMENTO;
            y = b.y() * LARGURA;
        } else {
            return "";
        }
        return "<circle cx=\"" + f(x) + "\" cy=\"" + f(y) + "\" r=\"0.23\" fill=\""
             + COR_BOLA + "\" stroke=\"#8A5A12\" stroke-width=\"0.06\"/>";
    }

    private String traco(JogadaConteudo.Traco t) {
        String d = caminhoSuavizado(t.pontos());
        if (d.isEmpty()) return "";

        String cor = "passe".equals(t.tipo()) ? COR_PASSE : COR_TINTA;
        String dash = switch (t.tipo()) {
            case "passe"     -> " stroke-dasharray=\"0.30 0.20\"";
            case "drible"    -> " stroke-dasharray=\"0.12 0.12\"";
            case "arremesso" -> " stroke-dasharray=\"0.05 0.16\"";
            default          -> "";
        };
        String marcador = switch (t.tipo()) {
            case "passe"     -> " marker-end=\"url(#ponta-seta-passe)\"";
            case "bloqueio"  -> " marker-end=\"url(#ponta-bloqueio)\"";
            case "arremesso" -> " marker-end=\"url(#ponta-arremesso)\"";
            case "livre"     -> "";
            default          -> " marker-end=\"url(#ponta-seta)\"";
        };

        return "<path d=\"" + d + "\" stroke=\"" + cor + "\" stroke-width=\"0.11\""
             + dash + marcador + "/>";
    }

    /**
     * Suavização por ponto médio quadrático.
     *
     * O MESMO algoritmo está em dominio/geometria.js no front. As duas
     * implementações precisam continuar idênticas, senão o traço do PDF sai
     * com curvatura diferente do traço da tela. São ~10 linhas de cada lado.
     */
    public static String caminhoSuavizado(List<JogadaConteudo.Ponto> pontos) {
        if (pontos == null || pontos.isEmpty()) return "";
        var p = pontos.stream()
                .map(q -> new double[]{ q.x() * COMPRIMENTO, q.y() * LARGURA })
                .toList();

        if (p.size() == 1) return "M" + f(p.get(0)[0]) + "," + f(p.get(0)[1]);
        if (p.size() == 2) return "M" + f(p.get(0)[0]) + "," + f(p.get(0)[1])
                                 + "L" + f(p.get(1)[0]) + "," + f(p.get(1)[1]);

        var sb = new StringBuilder("M").append(f(p.get(0)[0])).append(",").append(f(p.get(0)[1]));
        for (int i = 1; i < p.size() - 1; i++) {
            double mx = (p.get(i)[0] + p.get(i + 1)[0]) / 2;
            double my = (p.get(i)[1] + p.get(i + 1)[1]) / 2;
            sb.append("Q").append(f(p.get(i)[0])).append(",").append(f(p.get(i)[1]))
              .append(" ").append(f(mx)).append(",").append(f(my));
        }
        var ult = p.get(p.size() - 1);
        sb.append("L").append(f(ult[0])).append(",").append(f(ult[1]));
        return sb.toString();
    }

    // ------------------------------------------------------------------

    private String texto(double x, double y, double tamanho, String ancora,
                         String cor, String peso, String conteudo) {
        return "<text x=\"" + f(x) + "\" y=\"" + f(y) + "\" font-size=\"" + f(tamanho)
             + "\" text-anchor=\"" + ancora + "\" fill=\"" + cor
             + "\" font-weight=\"" + peso
             + "\" font-family=\"Helvetica, Arial, sans-serif\">" + conteudo + "</text>";
    }

    private static String f(double v) {
        return String.format(Locale.US, "%.4f", v);
    }

    private static String escapar(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("'", "&apos;");
    }

    private static String recortarTexto(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max - 1) + "…";
    }

    private static String rotuloTipo(String tipo) {
        return switch (tipo) {
            case "ataque"      -> "Ataque";
            case "defesa"      -> "Defesa";
            case "bola_parada" -> "Bola parada";
            case "transicao"   -> "Transição";
            default            -> tipo;
        };
    }

    private static String recortar(String texto, String inicio, String fim) {
        int a = texto.indexOf(inicio);
        if (a < 0) return null;
        int b = texto.indexOf(fim, a);
        if (b < 0) return null;
        return texto.substring(a, b + (fim.startsWith("</g>") ? 4 : fim.length()));
    }
}
