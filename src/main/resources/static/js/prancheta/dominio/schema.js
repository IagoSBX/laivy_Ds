import { paraNormalizado } from './quadra.js';
import { gerarPosicoesDefesa } from './presets.js';

export const SCHEMA_VERSION = 1;

export const TIPOS = Object.freeze({ ataque: 'Ataque', defesa: 'Defesa' });

export const novoId = prefixo =>
  `${prefixo}_${(crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)).slice(0, 8)}`;

export function criarToken({ papel = 'ataque', atletaId = null, numero = '', x, y }) {
  return { id: novoId('tk'), papel, atletaId, numero: String(numero ?? ''), x, y };
}

export function criarFrame(tokens = [], bola = null) {
  return {
    id: novoId('f'), descricao: '', duracaoMs: null,
    tokens, bola: bola ?? { posseDoTokenId: null, x: null, y: null },
    tracos: [], textos: []
  };
}

/**
 * Duplica um frame PRESERVANDO os ids dos tokens.
 *
 * É o invariante que sustenta a animação inteira: só dá para interpolar
 * entre dois frames se o boneco 5 do frame 1 tiver o mesmo id do boneco 5
 * do frame 2. Por isso "Novo frame" duplica o anterior em vez de criar em
 * branco — que também é o comportamento que o treinador espera.
 * Ids de TRAÇO e de TEXTO, ao contrário, são regerados: eles não animam.
 */
export function clonarFrame(frame) {
  const c = structuredClone(frame);
  c.id = novoId('f');
  c.tracos = (c.tracos ?? []).map(t => ({ ...t, id: novoId('tr') }));
  c.textos = (c.textos ?? []).map(t => ({ ...t, id: novoId('tx') }));
  return c;
}

/** Formação 1-2-2 atacando a cesta esquerda, em metros. */
const POSICOES_ATAQUE_METROS = [
  { x: 9.0, y: 7.5 },   // 1 — topo, com a posse
  { x: 6.6, y: 2.0 },   // 2 — ala direita
  { x: 6.6, y: 13.0 },  // 3 — ala esquerda
  { x: 3.4, y: 4.6 },   // 4 — poste
  { x: 3.4, y: 10.4 }   // 5 — poste
];

/** As 5 posições padrão de ataque, já em fração da quadra (0..1). */
export function posicoesAtaquePadrao() {
  return POSICOES_ATAQUE_METROS.map(paraNormalizado);
}

export function formacaoInicial(elenco = []) {
  return posicoesAtaquePadrao().map((pos, i) => {
    const a = elenco[i];
    return criarToken({
      papel: 'ataque',
      atletaId: a?.id ?? null,
      numero: a?.numero ?? String(i + 1),
      ...pos
    });
  });
}

/** 5 defensores em zona 2-3, marcando a formação de ataque passada. Real 5x5. */
export function formacaoDefensivaInicial(tokensAtaque, chave = 'zona_2_3') {
  return gerarPosicoesDefesa(chave, { tokensAtaque }).map(pos =>
    criarToken({ papel: 'defesa', numero: '', ...pos }));
}

export function criarJogada({ nome = 'Nova jogada', tipo = 'ataque', elenco = [] } = {}) {
  const ataque = formacaoInicial(elenco);
  const defesa = formacaoDefensivaInicial(ataque);
  const tokens = [...ataque, ...defesa];
  const frame = criarFrame(tokens, { posseDoTokenId: tokens[0].id, x: null, y: null });
  return {
    schemaVersion: SCHEMA_VERSION,
    nome, tipo,
    enquadramento: 'meia',
    duracaoPadraoMs: 900,
    frames: [frame]
  };
}
