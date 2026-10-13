import { criarToken, clonarFrame } from '../dominio/schema.js';
import { gerarPosicoesDefesa, PRESETS_DEFESA } from '../dominio/presets.js';

/**
 * Fachada de comandos do editor — o único ponto de entrada para mutações
 * "de alto nível" na jogada (mover jogador, trocar formação, adicionar
 * jogador etc.), usado por dois chamadores:
 *
 *   1. os botões do painel "Formação defensiva" (UI direta do treinador);
 *   2. o chat de IA (js/prancheta/ia/chat.js), que recebe do n8n uma lista
 *      de ações neste MESMO formato e as executa uma a uma.
 *
 * Cada função devolve sempre { ok, erro? } em vez de lançar exceção — é o
 * formato que o executor de ações da IA precisa para reportar sucesso/falha
 * de cada passo no chat sem precisar de try/catch em cada chamada.
 */
export function criarComandos({ store, historico, frameAtual, render, agendarRascunho }) {
  const tentar = fn => {
    try { fn(); return { ok: true }; }
    catch (e) { return { ok: false, erro: e?.message || String(e) }; }
  };

  return {
    /** Lista as chaves de formação defensiva disponíveis (para a IA/UI oferecer). */
    listarFormacoesDefensivas: () => ({ ...PRESETS_DEFESA }),

    /** Estado atual da jogada, para enviar como contexto à IA. */
    obterEstado: () => structuredClone(store.get().jogada),
    obterFrameAtualIndice: () => store.get().frameAtual,

    moverToken: (id, x, y) => tentar(() => {
      if (typeof x !== 'number' || typeof y !== 'number') throw new Error('Posição x/y inválida.');
      if (!frameAtual().tokens.some(t => t.id === id))
        throw new Error(`Jogador "${id}" não encontrado no frame atual.`);
      historico.registrar(store.get());
      store.aplicar(s => {
        const t = s.jogada.frames[s.frameAtual].tokens.find(k => k.id === id);
        t.x = x; t.y = y;
        s.sujo = true;
      });
      render();
      agendarRascunho();
    }),

    definirPosseBola: id => tentar(() => {
      if (id && !frameAtual().tokens.some(t => t.id === id))
        throw new Error(`Jogador "${id}" não encontrado no frame atual.`);
      historico.registrar(store.get());
      store.aplicar(s => {
        s.jogada.frames[s.frameAtual].bola = { posseDoTokenId: id ?? null, x: null, y: null };
        s.sujo = true;
      });
      render();
      agendarRascunho();
    }),

    /** Adiciona um jogador em TODOS os frames (mesmo invariante de id estável da animação). */
    adicionarToken: ({ papel = 'defesa', x = 0.5, y = 0.5, numero = '' } = {}) => tentar(() => {
      if (papel !== 'ataque' && papel !== 'defesa') throw new Error(`Papel "${papel}" inválido.`);
      const atual = frameAtual().tokens.filter(t => t.papel === papel).length;
      if (atual >= 5) throw new Error(`Já existem 5 jogadores de "${papel}" em quadra.`);
      const novo = criarToken({ papel, x, y, numero });
      historico.registrar(store.get());
      store.aplicar(s => {
        s.jogada.frames.forEach(f => f.tokens.push({ ...novo }));
        s.sujo = true;
      });
      render();
      agendarRascunho();
    }),

    /** Remove um jogador de TODOS os frames, e limpa a posse de bola se era dele. */
    removerToken: id => tentar(() => {
      if (!frameAtual().tokens.some(t => t.id === id))
        throw new Error(`Jogador "${id}" não encontrado no frame atual.`);
      historico.registrar(store.get());
      store.aplicar(s => {
        s.jogada.frames.forEach(f => {
          f.tokens = f.tokens.filter(t => t.id !== id);
          if (f.bola?.posseDoTokenId === id) f.bola = { posseDoTokenId: null, x: null, y: null };
        });
        s.sujo = true;
      });
      render();
      agendarRascunho();
    }),

    /**
     * Cria um novo frame com os 5 defensores na formação escolhida — a marcação
     * atual fica registrada como "antes", a nova formação como "depois", e o
     * play anima a troca. Mesmo padrão das ferramentas de traço (arrasto.js):
     * a mudança nunca sobrescreve o frame atual, sempre avança para o próximo.
     */
    aplicarFormacaoDefensiva: chave => tentar(() => {
      if (!PRESETS_DEFESA[chave]) throw new Error(`Formação "${chave}" desconhecida.`);
      const atual = frameAtual();
      const ataque = atual.tokens.filter(t => t.papel === 'ataque');
      const posicoes = gerarPosicoesDefesa(chave, { tokensAtaque: ataque }).slice(0, 5);
      if (!posicoes.length) throw new Error('Não há atacantes suficientes para calcular a marcação individual.');

      const defesaAtual = atual.tokens.filter(t => t.papel === 'defesa');
      const faltam = Math.max(0, posicoes.length - defesaAtual.length);
      const novosTokens = Array.from({ length: faltam },
        () => criarToken({ papel: 'defesa', x: 0.5, y: 0.5 }));

      historico.registrar(store.get());
      store.aplicar(s => {
        // 1) garante que TODO frame já tenha os mesmos defensores (mesmo
        //    invariante de id estável que sustenta toda a animação).
        if (novosTokens.length) {
          s.jogada.frames.forEach(f => novosTokens.forEach(t => f.tokens.push({ ...t })));
        }
        // 2) clona o frame atual (agora completo) para um novo frame, e só
        //    NELE reposiciona os defensores para a formação escolhida.
        const frameCompleto = s.jogada.frames[s.frameAtual];
        const proximo = clonarFrame(frameCompleto);
        const defesaProximo = proximo.tokens.filter(t => t.papel === 'defesa');
        defesaProximo.forEach((t, i) => { const p = posicoes[i]; if (p) { t.x = p.x; t.y = p.y; } });
        s.jogada.frames.splice(s.frameAtual + 1, 0, proximo);
        s.frameAtual += 1;
        s.sujo = true;
      });
      render();
      agendarRascunho();
    })
  };
}
