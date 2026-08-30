package br.com.gerenciador.projeto.service;

import br.com.gerenciador.projeto.model.json.JogadaConteudo;
import org.springframework.stereotype.Service;

/**
 * Aplica a cadeia de migrações de schema na LEITURA da jogada.
 *
 * Existe desde a Fase 1 com uma versão só, de propósito: escrever isto
 * agora custa uma hora, e escrever depois de ter jogadas em produção custa
 * um fim de semana. A Fase 2 (frames) é a primeira migração de verdade.
 */
@Service
public class MigradorJogadaService {

    public JogadaConteudo migrar(JogadaConteudo c) {
        if (c == null) return null;

        if (c.schemaVersion() > JogadaConteudo.VERSAO_ATUAL) {
            throw new IllegalStateException(
                "Jogada gravada em schemaVersion " + c.schemaVersion() +
                ", mais nova que a suportada (" + JogadaConteudo.VERSAO_ATUAL + "). " +
                "Atualize a aplicação.");
        }

        JogadaConteudo atual = c;
        // if (atual.schemaVersion() < 2) atual = v1paraV2(atual);
        return atual;
    }

    /* Modelo de como a migração da Fase 2 vai ficar:
     *
     * private JogadaConteudo v1paraV2(JogadaConteudo v1) {
     *     // v1 tinha um frame só implícito; v2 formaliza frames[]
     *     return new JogadaConteudo(2, v1.tipo(), v1.enquadramento(),
     *                               v1.duracaoPadraoMs(), v1.frames());
     * }
     */
}
