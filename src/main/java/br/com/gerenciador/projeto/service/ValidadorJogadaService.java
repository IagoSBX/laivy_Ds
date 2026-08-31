package br.com.gerenciador.projeto.service;

import br.com.gerenciador.projeto.model.json.JogadaConteudo;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Validação de PLAUSIBILIDADE, complementar ao Bean Validation.
 *
 * O @Valid dos records garante que a estrutura é bem formada (campos
 * presentes, coordenadas em 0..1). Isto aqui garante que a jogada faz
 * sentido como basquete e que os invariantes da animação estão de pé.
 *
 * Mesmo validador serve para dois consumidores:
 *   - o editor, ao salvar
 *   - a IA da Fase 4, antes de abrir o rascunho na prancheta
 */
@Service
public class ValidadorJogadaService {

    // Mesmas medidas de dominio/quadra.js (28m x 15m) e AROS — duplicado de
    // propósito: o validador do servidor não pode depender de JS do front.
    private static final double COMPRIMENTO = 28.0, LARGURA = 15.0;
    private static final double[] ARO_ESQUERDO = { 1.575 / COMPRIMENTO, 7.5 / LARGURA };
    private static final double[] ARO_DIREITO  = { 26.425 / COMPRIMENTO, 7.5 / LARGURA };
    private static final double RAIO_CESTA_METROS = 2.2; // arremesso precisa "cair" perto da cesta

    public record Resultado(boolean valido, List<String> erros) {
        public static Resultado ok() { return new Resultado(true, List.of()); }
    }

    public Resultado validar(JogadaConteudo c) {
        var erros = new ArrayList<String>();
        if (c == null || c.frames() == null || c.frames().isEmpty()) {
            return new Resultado(false, List.of("Jogada sem frames."));
        }

        var primeiro = c.frames().get(0);
        Set<String> idsBase = ids(primeiro);
        // Lado da cesta que os arremessos da jogada miram — precisa ser sempre
        // o mesmo (o time não pode atacar as duas cestas na mesma jogada).
        Set<String> ladosArremesso = new HashSet<>();

        for (int i = 0; i < c.frames().size(); i++) {
            var f = c.frames().get(i);
            String ref = "Frame " + (i + 1);

            // --- INVARIANTE CENTRAL DA ANIMAÇÃO ---------------------------
            // Sem o mesmo conjunto de ids em todos os frames não há como
            // interpolar: o player não sabe qual boneco virou qual.
            if (!ids(f).equals(idsBase)) {
                erros.add(ref + ": conjunto de tokens diferente do frame 1. " +
                          "Os ids precisam ser estáveis entre frames.");
            }

            // ids únicos dentro do frame
            if (ids(f).size() != f.tokens().size()) {
                erros.add(ref + ": há tokens com id repetido.");
            }

            // Basquete é 5x5: uma jogada com menos gente em quadra não representa
            // o time de verdade. Exige exatamente 5 de cada papel em todo frame.
            long ataque = f.tokens().stream().filter(t -> "ataque".equals(t.papel())).count();
            long defesa = f.tokens().stream().filter(t -> "defesa".equals(t.papel())).count();
            if (ataque != 5) erros.add(ref + ": " + ataque + " atacantes em quadra (precisa ser exatamente 5, time joga 5x5).");
            if (defesa != 5) erros.add(ref + ": " + defesa + " defensores em quadra (precisa ser exatamente 5, time joga 5x5).");

            // sobreposição: dois bonecos no mesmo ponto é erro de geração da IA
            for (int a = 0; a < f.tokens().size(); a++) {
                for (int b = a + 1; b < f.tokens().size(); b++) {
                    var t1 = f.tokens().get(a);
                    var t2 = f.tokens().get(b);
                    double dx = (t1.x() - t2.x()) * 28.0;   // metros
                    double dy = (t1.y() - t2.y()) * 15.0;
                    if (Math.hypot(dx, dy) < 0.6) {
                        erros.add(ref + ": tokens " + t1.id() + " e " + t2.id() +
                                  " praticamente no mesmo ponto.");
                    }
                }
            }

            // posse de bola tem que apontar para alguém que existe
            if (f.bola() != null && f.bola().posseDoTokenId() != null
                    && !ids(f).contains(f.bola().posseDoTokenId())) {
                erros.add(ref + ": bola em posse de um token inexistente.");
            }
            if (f.bola() == null) {
                erros.add(ref + ": frame sem bola.");
            }

            // traços ancorados precisam apontar para tokens existentes
            for (var t : f.tracosOuVazio()) {
                if (t.origemTokenId() != null && !ids(f).contains(t.origemTokenId()))
                    erros.add(ref + ": traço " + t.id() + " ancorado em token inexistente.");
                if (t.destinoTokenId() != null && !ids(f).contains(t.destinoTokenId()))
                    erros.add(ref + ": traço " + t.id() + " com destino inexistente.");

                // arremesso: não termina em outro jogador, termina NA CESTA.
                if ("arremesso".equals(t.tipo())) {
                    var fim = t.pontos().get(t.pontos().size() - 1);
                    double dEsq = distanciaMetros(fim.x(), fim.y(), ARO_ESQUERDO[0], ARO_ESQUERDO[1]);
                    double dDir = distanciaMetros(fim.x(), fim.y(), ARO_DIREITO[0], ARO_DIREITO[1]);
                    if (dEsq > RAIO_CESTA_METROS && dDir > RAIO_CESTA_METROS) {
                        erros.add(ref + ": traço " + t.id() + " de arremesso não termina perto de "
                            + "nenhuma cesta — arremesso precisa mirar o aro, não o meio da quadra.");
                    } else {
                        ladosArremesso.add(dEsq <= dDir ? "esquerda" : "direita");
                    }
                }
            }
        }

        if (ladosArremesso.size() > 1) {
            erros.add("A jogada tem arremessos mirando cestas diferentes (esquerda e direita) — "
                + "o time precisa atacar sempre a MESMA cesta do início ao fim da jogada.");
        }

        return erros.isEmpty() ? Resultado.ok() : new Resultado(false, erros);
    }

    private static double distanciaMetros(double x1, double y1, double x2, double y2) {
        double dx = (x1 - x2) * COMPRIMENTO;
        double dy = (y1 - y2) * LARGURA;
        return Math.hypot(dx, dy);
    }

    private Set<String> ids(JogadaConteudo.Frame f) {
        Set<String> s = new HashSet<>();
        f.tokens().forEach(t -> s.add(t.id()));
        return s;
    }
}
