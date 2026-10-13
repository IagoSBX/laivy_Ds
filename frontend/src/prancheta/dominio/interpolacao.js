import { QUADRA } from './quadra.js';

/**
 * Interpolação entre frames — o coração da animação.
 *
 * Função pura, sem DOM: roda no navegador hoje e no servidor quando existir
 * exportação de vídeo, sem uma linha de mudança.
 */
const lerp = (a, b, t) => a + (b - a) * t;

/** easeInOutCubic. Movimento com aceleração e frenagem lê como movimento
 *  humano; linear parece peça de xadrez deslizando. */
export const suavizar = t => (t < 0.5 ? 4 * t ** 3 : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Mesmo deslocamento visual que render/cena.js e SvgJogadaService aplicam à
// bola "presa" na mão do dono — precisa bater exatamente, senão a bola dá um
// salto perceptível no instante em que passa de "voando" para "presa".
const OFFSET_BOLA = { x: 0.55 / QUADRA.comprimento, y: -0.42 / QUADRA.largura };

/**
 * Trocou de dono? A bola só sai voando na SEGUNDA metade da transição — na
 * primeira, ela fica presa em quem já tinha, andando junto com esse jogador.
 * Pedido do treinador: "quando mexe a peça, só depois a bola vai" — mexer o
 * boneco e a bola arrancar juntos, no meio do gesto, lia como errado.
 */
const FASE_JOGADORES = 0.55;

function posicaoDoToken(tokens, id) {
  if (!id) return null;
  const t = tokens.find(tk => tk.id === id);
  return t ? { x: t.x + OFFSET_BOLA.x, y: t.y + OFFSET_BOLA.y } : null;
}

function interpolarBola(frameA, frameB, tokensInterpolados, e) {
  const b0 = frameA.bola, b1 = frameB.bola;
  const doAntigo = b0?.posseDoTokenId ?? null;
  const doNovo   = b1?.posseDoTokenId ?? null;
  const soltaMudou = !doAntigo && !doNovo && (b0?.x !== b1?.x || b0?.y !== b1?.y);

  if (doAntigo === doNovo && !soltaMudou) {
    // sem troca de mão: acompanha o dono atual (já interpolado) sem fase extra.
    return doAntigo ? { posseDoTokenId: doAntigo, x: null, y: null } : b0;
  }

  if (e < FASE_JOGADORES) {
    // fase 1: jogadores ainda se movendo — a bola continua com quem já tinha.
    return doAntigo ? { posseDoTokenId: doAntigo, x: null, y: null } : b0;
  }

  // fase 2: jogadores já chegaram ao destino — agora a bola corre até o novo dono.
  const progresso = (e - FASE_JOGADORES) / (1 - FASE_JOGADORES);
  const origem  = posicaoDoToken(tokensInterpolados, doAntigo)
                ?? (b0?.x != null ? { x: b0.x, y: b0.y } : { x: 0.5, y: 0.5 });
  const destino = posicaoDoToken(tokensInterpolados, doNovo)
                ?? (b1?.x != null ? { x: b1.x, y: b1.y } : origem);
  return {
    posseDoTokenId: null,
    x: lerp(origem.x, destino.x, progresso),
    y: lerp(origem.y, destino.y, progresso)
  };
}

export function interpolar(frameA, frameB, t) {
  const e = suavizar(Math.min(Math.max(t, 0), 1));
  const destino = new Map(frameB.tokens.map(tk => [tk.id, tk]));

  const tokens = frameA.tokens.map(a => {
    const b = destino.get(a.id) ?? a;    // token sem par fica parado
    return { ...a, x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e) };
  });

  return {
    tokens,
    bola: interpolarBola(frameA, frameB, tokens, e),
    // traços do frame de origem, revelados progressivamente pelo player
    tracos: frameA.tracos ?? [],
    textos: e < 0.5 ? (frameA.textos ?? []) : (frameB.textos ?? []),
    progresso: e
  };
}

export function cenaDoFrame(frame) {
  return {
    tokens: frame.tokens,
    bola: frame.bola,
    tracos: frame.tracos ?? [],
    textos: frame.textos ?? [],
    progresso: 1
  };
}

export function duracaoTotal(jogada) {
  return jogada.frames.slice(0, -1)
    .reduce((soma, f) => soma + (f.duracaoMs ?? jogada.duracaoPadraoMs), 0);
}
