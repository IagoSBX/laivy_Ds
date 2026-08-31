import { coordenadasDoEvento, limitarNaQuadra, paraNormalizado, QUADRA } from '../dominio/quadra.js';
import { simplificar } from '../dominio/geometria.js';
import { novoId, clonarFrame, criarToken } from '../dominio/schema.js';

/**
 * Ferramentas "de ação única" da barra principal. Os traços (corte, passe,
 * bloqueio, drible) ficam agrupados à parte em TIPOS_TRACO_INFO, atrás de um
 * único botão "Seta" — 4 botões soltos pra escolher "o que a seta desenha"
 * competia demais com o resto da barra.
 */
export const FERRAMENTAS = Object.freeze({
  mover:    { rotulo: 'Mover',    dica: 'Arrastar jogadores' },
  bola:     { rotulo: 'Bola',     dica: 'Dar a posse a um jogador' },
  atacante: { rotulo: 'Atacante', dica: 'Adicionar atacante (máx. 5)' },
  defensor: { rotulo: 'Defensor', dica: 'Adicionar defensor (máx. 5)' },
  texto:    { rotulo: 'Texto',    dica: 'Anotação na quadra' },
  borracha: { rotulo: 'Borr.',    dica: 'Apagar traço ou anotação' }
});

/** Sub-tipos do botão "Seta" — mesma notação que o treinador já usa na prancheta física. */
export const TIPOS_TRACO_INFO = Object.freeze({
  corte:     { rotulo: 'Corte',     dica: 'Movimentação de jogador' },
  passe:     { rotulo: 'Passe',     dica: 'Passe (linha tracejada)' },
  bloqueio:  { rotulo: 'Bloqueio',  dica: 'Bloqueio (barra no fim)' },
  drible:    { rotulo: 'Drible',    dica: 'Condução de bola — sai sozinho de quem está com ela' },
  arremesso: { rotulo: 'Arremesso', dica: 'Bola vai pra cesta — sai de quem está com ela, o jogador não se move' }
});

const PAPEL_POR_FERRAMENTA = Object.freeze({ atacante: 'ataque', defensor: 'defesa' });

const TIPOS_TRACO = new Set(Object.keys(TIPOS_TRACO_INFO));

export function ativarFerramentas({ svg, grupoQuadra, store, historico, enquadramento,
                                    frameAtual, aplicarNoFrame, render, agendarRascunho }) {
  let desenho = null;

  const tokenMaisProximo = (p, raio = 1.0) => {
    let melhor = null, menor = raio;
    for (const t of frameAtual().tokens) {
      const d = Math.hypot(t.x * QUADRA.comprimento - p.x, t.y * QUADRA.largura - p.y);
      if (d < menor) { menor = d; melhor = t; }
    }
    return melhor;
  };

  svg.addEventListener('pointerdown', e => {
    const f = store.get().ferramenta;
    if (f === 'mover') return;                       // tratado em arrasto.js

    const p = limitarNaQuadra(coordenadasDoEvento(grupoQuadra, e), enquadramento());

    // --- bola: dar a posse ao jogador clicado -----------------------
    if (f === 'bola') {
      const alvo = tokenMaisProximo(p, 1.2);
      historico.registrar(store.get());
      aplicarNoFrame(frame => {
        frame.bola = alvo
          ? { posseDoTokenId: alvo.id, x: null, y: null }
          : { posseDoTokenId: null, ...paraNormalizado(p) };
      });
      return;
    }

    // --- atacante/defensor: adiciona um jogador em TODOS os frames --
    // (precisa existir em todos, não só no atual, senão a validação de
    // "mesmo conjunto de ids em todo frame" — a base da animação — falha).
    if (f === 'atacante' || f === 'defensor') {
      const papel = PAPEL_POR_FERRAMENTA[f];
      const atual = frameAtual().tokens.filter(t => t.papel === papel).length;
      if (atual >= 5) {
        alert(`Já existem 5 jogadores de ${papel === 'ataque' ? 'ataque' : 'defesa'} em quadra.`);
        return;
      }
      const novo = criarToken({ papel, ...paraNormalizado(p) });
      historico.registrar(store.get());
      store.aplicar(s => {
        s.jogada.frames.forEach(fr => fr.tokens.push({ ...novo }));
        s.sujo = true;
      });
      render();
      agendarRascunho?.();
      return;
    }

    // --- texto ------------------------------------------------------
    if (f === 'texto') {
      const conteudo = prompt('Anotação:');
      if (!conteudo) return;
      historico.registrar(store.get());
      aplicarNoFrame(frame => {
        (frame.textos ??= []).push({ id: novoId('tx'), ...paraNormalizado(p), conteudo });
      });
      return;
    }

    // --- borracha ---------------------------------------------------
    if (f === 'borracha') {
      const alvoTraco = e.target.closest('[data-traco-id]');
      const alvoTexto = e.target.closest('[data-texto-id]');
      if (!alvoTraco && !alvoTexto) return;
      historico.registrar(store.get());
      aplicarNoFrame(frame => {
        if (alvoTraco) frame.tracos = (frame.tracos ?? [])
          .filter(t => t.id !== alvoTraco.dataset.tracoId);
        if (alvoTexto) frame.textos = (frame.textos ?? [])
          .filter(t => t.id !== alvoTexto.dataset.textoId);
      });
      return;
    }

    // --- traços -----------------------------------------------------
    if (!TIPOS_TRACO.has(f)) return;
    svg.setPointerCapture(e.pointerId);
    // Drible e arremesso só fazem sentido pra quem já está com a bola — não
    // precisa clicar em cima do jogador certo, o traço já parte de quem a tem.
    const origem = (f === 'drible' || f === 'arremesso')
      ? frameAtual().tokens.find(t => t.id === frameAtual().bola?.posseDoTokenId) ?? tokenMaisProximo(p)
      : tokenMaisProximo(p);
    desenho = { tipo: f, pontos: [paraNormalizado(p)], origemTokenId: origem?.id ?? null };
    e.preventDefault();
  });

  svg.addEventListener('pointermove', e => {
    if (!desenho) return;
    const p = limitarNaQuadra(coordenadasDoEvento(grupoQuadra, e), enquadramento());
    desenho.pontos.push(paraNormalizado(p));
    // pré-visualização: renderiza o traço em construção sem tocar no store
    render({ tracoEmConstrucao: desenho });
  });

  const finalizar = () => {
    if (!desenho) return;
    const d = desenho;
    desenho = null;
    render({ tracoEmConstrucao: null });

    if (d.pontos.length < 2) return;
    const pontos = simplificar(d.pontos);
    const fim = pontos[pontos.length - 1];
    // Arremesso mira a CESTA, nunca outro jogador — mesmo que alguém esteja
    // parado perto do aro, não é ele o "destino" do traço.
    const destino = d.tipo === 'arremesso'
      ? null
      : tokenMaisProximo({ x: fim.x * QUADRA.comprimento, y: fim.y * QUADRA.largura });

    // Só existe peça pra mover se o traço tem uma origem identificável: um
    // token pro corte/bloqueio/drible, ou a bola (sempre existe) pro passe.
    // Arremesso tem origem mas NÃO move o jogador (ele fica onde arremessou).
    const temPecaParaMover = d.tipo === 'passe' || (d.tipo !== 'arremesso' && !!d.origemTokenId);

    historico.registrar(store.get());
    store.aplicar(s => {
      const atual = s.jogada.frames[s.frameAtual];
      (atual.tracos ??= []).push({
        id: novoId('tr'), tipo: d.tipo, pontos,
        origemTokenId: d.origemTokenId,
        destinoTokenId: destino?.id ?? null
      });

      // Arremesso: a bola sai da mão de quem arremessou e vai solta pra
      // cesta no frame seguinte — ninguém fica com a posse dela.
      if (d.tipo === 'arremesso') {
        const proximo = clonarFrame(atual);
        proximo.bola = { posseDoTokenId: null, x: fim.x, y: fim.y };
        s.jogada.frames.splice(s.frameAtual + 1, 0, proximo);
        s.frameAtual += 1;
        s.sujo = true;
        return;
      }

      if (!temPecaParaMover) { s.sujo = true; return; }

      // O traço é a INTENÇÃO, desenhada no frame atual. O RESULTADO — a peça
      // já no destino — vai para um frame novo, clonado logo em seguida.
      // Sem um "antes" e um "depois", não há o que interpolar: o play só
      // mostraria a seta parada, nunca o jogador se movendo de verdade.
      const proximo = clonarFrame(atual);
      if (d.tipo === 'passe') {
        proximo.bola = destino
          ? { posseDoTokenId: destino.id, x: null, y: null }
          : { posseDoTokenId: null, x: fim.x, y: fim.y };
      } else {
        const t = proximo.tokens.find(k => k.id === d.origemTokenId);
        if (t) { t.x = fim.x; t.y = fim.y; }
      }
      s.jogada.frames.splice(s.frameAtual + 1, 0, proximo);
      s.frameAtual += 1;
      s.sujo = true;
    });
    render();
    agendarRascunho?.();
  };

  svg.addEventListener('pointerup', finalizar);
  svg.addEventListener('pointercancel', finalizar);
}
