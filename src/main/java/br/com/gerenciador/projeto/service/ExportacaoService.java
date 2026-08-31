package br.com.gerenciador.projeto.service;

import org.apache.batik.transcoder.TranscoderException;
import org.apache.batik.transcoder.TranscoderInput;
import org.apache.batik.transcoder.TranscoderOutput;
import org.apache.batik.transcoder.image.PNGTranscoder;
import org.apache.fop.svg.PDFTranscoder;
import org.apache.pdfbox.multipdf.PDFMergerUtility;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.StringReader;
import java.util.List;

/**
 * Exportação PNG e PDF em processo, sem infra nova.
 *
 * Apache Batik (+ FOP para PDF) é Java puro: não precisa de binário externo,
 * não precisa de fila, não precisa de storage. Como o SVG de uma jogada é
 * pequeno, a transcodificação é rápida o suficiente para rodar síncrona no
 * request — não vale a complexidade de um worker.
 *
 * Vídeo continua fora de alcance: MP4 exige ffmpeg e fila. Enquanto isso a
 * proposta é atendida com PDF da sequência + PNG por frame.
 *
 * SEGURANÇA: o SVG transcodificado aqui é SEMPRE gerado pelo próprio servidor
 * a partir do JSON do banco. Nunca transcodifique SVG enviado pelo usuário —
 * o Batik já teve CVEs de SSRF por referência externa dentro do documento.
 */
@Service
public class ExportacaoService {

    /** @param larguraPx largura do PNG. 1600 dá boa qualidade para WhatsApp. */
    public byte[] png(String svg, float larguraPx) throws TranscoderException {
        var t = new PNGTranscoder();
        t.addTranscodingHint(PNGTranscoder.KEY_WIDTH, larguraPx);
        return transcodificar(t, svg);
    }

    public byte[] pdf(String svg) throws TranscoderException {
        var t = new PDFTranscoder();
        // O SVG da folha já vem dimensionado em mm (210x297), então não se
        // passa KEY_WIDTH: deixar o transcoder respeitar width/height do doc.
        return transcodificar(t, svg);
    }

    /**
     * Uma jogada com mais frames do que cabem numa folha A4 vira várias
     * páginas (ver SvgJogadaService.svgFolhas) — cada uma é transcodificada
     * separadamente e depois unidas num PDF só com o PDFMergerUtility.
     */
    public byte[] pdf(List<String> paginasSvg) throws TranscoderException, IOException {
        if (paginasSvg.size() == 1) return pdf(paginasSvg.get(0));

        var merger = new PDFMergerUtility();
        var destino = new ByteArrayOutputStream(64 * 1024 * paginasSvg.size());
        merger.setDestinationStream(destino);
        for (String pagina : paginasSvg) {
            merger.addSource(new java.io.ByteArrayInputStream(pdf(pagina)));
        }
        merger.mergeDocuments(null);
        return destino.toByteArray();
    }

    private byte[] transcodificar(org.apache.batik.transcoder.Transcoder t, String svg)
            throws TranscoderException {
        var saida = new ByteArrayOutputStream(64 * 1024);
        t.transcode(new TranscoderInput(new StringReader(svg)), new TranscoderOutput(saida));
        return saida.toByteArray();
    }
}
