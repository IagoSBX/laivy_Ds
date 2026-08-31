import { paraMetros, paraNormalizado, AROS } from './quadra.js';

/**
 * Formações defensivas prontas — 5 posições (em metros) cada, defendendo o
 * aro esquerdo (mesmo lado que formacaoInicial() ataca em schema.js).
 * Distâncias calibradas para nunca cair a menos de 0.6m de um atacante da
 * formação inicial nem de outro defensor (limite verificado por
 * dominio/validacao.js e ValidadorJogadaService no servidor).
 */
const ZONAS = Object.freeze({
  zona_2_3: () => [
    { x: 6.5, y: 5.5 }, { x: 6.5, y: 9.5 },
    { x: 3.0, y: 2.0 }, { x: 2.5, y: 7.5 }, { x: 3.0, y: 13.0 }
  ],
  zona_3_2: () => [
    { x: 7.0, y: 3.5 }, { x: 6.5, y: 7.5 }, { x: 7.0, y: 11.5 },
    { x: 2.2, y: 5.0 }, { x: 2.2, y: 10.0 }
  ],
  um_tres_um: () => [
    { x: 8.0, y: 7.5 },
    { x: 5.5, y: 3.0 }, { x: 4.0, y: 7.5 }, { x: 5.5, y: 12.0 },
    { x: 2.0, y: 7.5 }
  ]
});

export const PRESETS_DEFESA = Object.freeze({
  zona_2_3: 'Zona 2-3',
  zona_3_2: 'Zona 3-2',
  um_tres_um: '1-3-1',
  individual: 'Individual (marcação por jogador)'
});

/**
 * Marcação individual: cada defensor fica a 35% do caminho entre o atacante
 * correspondente e o aro — "entre o homem e a cesta", sem colar nele (o
 * validador rejeita bonecos a menos de 0.6m um do outro).
 */
function posicoesMarcacaoIndividual(tokensAtaque, aro) {
  return tokensAtaque.slice(0, 5).map(a => {
    const am = paraMetros(a);
    return { x: am.x + (aro.x - am.x) * 0.35, y: am.y + (aro.y - am.y) * 0.35 };
  });
}

/**
 * Retorna até 5 posições (fração 0..1 da quadra inteira) para a formação
 * escolhida. Função pura — não conhece frames nem jogada; a orquestração de
 * "criar frame novo com essas posições" fica em editor/comandos.js, para não
 * criar um import circular com dominio/schema.js (que já importa este
 * módulo para a formação defensiva inicial).
 */
export function gerarPosicoesDefesa(chave, { tokensAtaque = [], aro = AROS.esquerdo } = {}) {
  if (chave === 'individual') {
    return posicoesMarcacaoIndividual(tokensAtaque, aro).map(paraNormalizado);
  }
  const gerador = ZONAS[chave];
  return gerador ? gerador().map(paraNormalizado) : [];
}
