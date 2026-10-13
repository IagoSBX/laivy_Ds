import { interpolar, cenaDoFrame, duracaoTotal } from '../dominio/interpolacao.js';

/**
 * Player da sequência de frames.
 *
 * requestAnimationFrame com interpolação própria em vez de biblioteca: são
 * ~60 linhas, o scrub manual (arrastar a barra e ver a cena naquele instante)
 * fica trivial, e a mesma interpolar() serve à futura exportação de vídeo.
 */
export function criarPlayer({ obterJogada, aoQuadro }) {
  let rodando = false, inicio = 0, velocidade = 1, pausaEm = 0, raf = null;

  function cenaEm(ms) {
    const j = obterJogada();
    if (j.frames.length === 1) return cenaDoFrame(j.frames[0]);

    let acumulado = 0;
    for (let i = 0; i < j.frames.length - 1; i++) {
      const dur = j.frames[i].duracaoMs ?? j.duracaoPadraoMs;
      if (ms < acumulado + dur) {
        return interpolar(j.frames[i], j.frames[i + 1], (ms - acumulado) / dur);
      }
      acumulado += dur;
    }
    return cenaDoFrame(j.frames[j.frames.length - 1]);
  }

  function laco(agora) {
    if (!rodando) return;
    const decorrido = (agora - inicio) * velocidade;
    const total = duracaoTotal(obterJogada());
    if (decorrido >= total) {
      pausaEm = total;
      rodando = false;
      aoQuadro(cenaEm(total), total, total);
      return;
    }
    pausaEm = decorrido;
    aoQuadro(cenaEm(decorrido), decorrido, total);
    raf = requestAnimationFrame(laco);
  }

  return {
    tocar() {
      const total = duracaoTotal(obterJogada());
      if (pausaEm >= total) pausaEm = 0;
      rodando = true;
      inicio = performance.now() - pausaEm / velocidade;
      raf = requestAnimationFrame(laco);
    },
    pausar() { rodando = false; cancelAnimationFrame(raf); },
    /** Scrub: posiciona em um instante sem tocar. */
    irPara(ms) {
      this.pausar();
      pausaEm = ms;
      aoQuadro(cenaEm(ms), ms, duracaoTotal(obterJogada()));
    },
    velocidade(v) { velocidade = v; if (rodando) { this.pausar(); this.tocar(); } },
    estaTocando: () => rodando,
    total: () => duracaoTotal(obterJogada())
  };
}
