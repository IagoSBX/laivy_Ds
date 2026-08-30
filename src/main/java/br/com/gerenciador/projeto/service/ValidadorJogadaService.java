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

            long ataque = f.tokens().stream().filter(t -> "ataque".equals(t.papel())).count();
            long defesa = f.tokens().stream().filter(t -> "defesa".equals(t.papel())).count();
            if (ataque > 5) erros.add(ref + ": " + ataque + " atacantes em quadra (máximo 5).");
            if (defesa > 5) erros.add(ref + ": " + defesa + " defensores em quadra (máximo 5).");

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
            }
        }

        return erros.isEmpty() ? Resultado.ok() : new Resultado(false, erros);
    }

    private Set<String> ids(JogadaConteudo.Frame f) {
        Set<String> s = new HashSet<>();
        f.tokens().forEach(t -> s.add(t.id()));
        return s;
    }
}
