import { QUADRA, AROS } from './quadra.js';

const RAIO_CESTA_METROS = 2.2;

function distanciaMetros(x1, y1, x2, y2) {
  return Math.hypot((x1 - x2) * QUADRA.comprimento, (y1 - y2) * QUADRA.largura);
}

/**
 * Espelho no cliente do ValidadorJogadaService do servidor. O servidor é a
 * autoridade; isto aqui só evita ida e volta e dá feedback imediato.
 */
export function validarJogada(j) {
  const erros = [];
  if (!j?.frames?.length) return ['Jogada sem frames.'];

  const idsBase = new Set(j.frames[0].tokens.map(t => t.id));
  const ladosArremesso = new Set();

  j.frames.forEach((f, i) => {
    const ref = `Frame ${i + 1}`;
    const ids = new Set(f.tokens.map(t => t.id));

    if (ids.size !== f.tokens.length) erros.push(`${ref}: tokens com id repetido.`);
    if (ids.size !== idsBase.size || [...idsBase].some(id => !ids.has(id))) {
      erros.push(`${ref}: conjunto de tokens diferente do frame 1 — a animação precisa de ids estáveis.`);
    }

    // Basquete é 5x5: time incompleto em quadra não representa o time de verdade.
    const ataque = f.tokens.filter(t => t.papel === 'ataque').length;
    const defesa = f.tokens.filter(t => t.papel === 'defesa').length;
    if (ataque !== 5) erros.push(`${ref}: ${ataque} atacantes em quadra (precisa ser exatamente 5, time joga 5x5).`);
    if (defesa !== 5) erros.push(`${ref}: ${defesa} defensores em quadra (precisa ser exatamente 5, time joga 5x5).`);

    for (let a = 0; a < f.tokens.length; a++) {
      for (let b = a + 1; b < f.tokens.length; b++) {
        const t1 = f.tokens[a], t2 = f.tokens[b];
        const d = distanciaMetros(t1.x, t1.y, t2.x, t2.y);
        if (d < 0.6) erros.push(`${ref}: dois bonecos praticamente no mesmo ponto.`);
      }
    }

    if (!f.bola) erros.push(`${ref}: frame sem bola.`);
    else if (f.bola.posseDoTokenId && !ids.has(f.bola.posseDoTokenId)) {
      erros.push(`${ref}: bola em posse de um token inexistente.`);
    }

    (f.tracos ?? []).forEach(t => {
      if (t.origemTokenId && !ids.has(t.origemTokenId)) {
        erros.push(`${ref}: traço ${t.id} ancorado em token inexistente.`);
      }
      if (t.destinoTokenId && !ids.has(t.destinoTokenId)) {
        erros.push(`${ref}: traço ${t.id} com destino inexistente.`);
      }
      if (t.tipo === 'arremesso') {
        const fim = t.pontos[t.pontos.length - 1];
        const dEsq = distanciaMetros(fim.x, fim.y, AROS.esquerdo.x / QUADRA.comprimento, AROS.esquerdo.y / QUADRA.largura);
        const dDir = distanciaMetros(fim.x, fim.y, AROS.direito.x / QUADRA.comprimento, AROS.direito.y / QUADRA.largura);
        if (dEsq > RAIO_CESTA_METROS && dDir > RAIO_CESTA_METROS) {
          erros.push(`${ref}: traço ${t.id} de arremesso não termina perto de nenhuma cesta.`);
        } else {
          ladosArremesso.add(dEsq <= dDir ? 'esquerda' : 'direita');
        }
      }
    });
  });

  if (ladosArremesso.size > 1) {
    erros.push('A jogada tem arremessos mirando cestas diferentes — ataque sempre a mesma cesta do início ao fim.');
  }

  return erros;
}
