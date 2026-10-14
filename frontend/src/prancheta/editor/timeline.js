import { clonarFrame } from '../dominio/schema.js';

/**
 * Linha de frames. Cada frame é uma foto completa da quadra — nunca um
 * delta. Custa alguns KB e elimina os bugs de reordenar, excluir o frame do
 * meio e editar um frame isolado.
 */
export function criarTimeline({ elemento, store, historico, aoMudar, somenteLeitura = false }) {

  function render() {
    const { jogada, frameAtual } = store.get();
    elemento.innerHTML = '';

    jogada.frames.forEach((f, i) => {
      const b = document.createElement('button');
      b.className = 'frame-chip' + (i === frameAtual ? ' ativo' : '');
      b.type = 'button';
      b.innerHTML = `<span class="frame-num">Frame ${i + 1}</span>` +
        (f.descricao ? `<span class="frame-desc">${escapar(f.descricao)}</span>` : '');
      b.onclick = () => { store.aplicar(s => { s.frameAtual = i; }); aoMudar(); };
      if (!somenteLeitura) b.oncontextmenu = ev => { ev.preventDefault(); menu(i); };
      elemento.appendChild(b);
    });

    const mais = document.createElement('button');
    mais.className = 'frame-chip novo';
    mais.type = 'button';
    mais.textContent = '+ Novo frame';
    mais.title = 'Duplica o frame atual preservando os ids dos jogadores';
    mais.onclick = novoFrame;
    if (!somenteLeitura) elemento.appendChild(mais);
  }

  /**
   * DUPLICA o frame atual em vez de criar em branco. Dois motivos:
   * é o que o treinador espera (ele quer mexer no que já está lá), e
   * preservar os ids dos tokens é pré-requisito da animação.
   */
  function novoFrame() {
    historico.registrar(store.get());
    store.aplicar(s => {
      const copia = clonarFrame(s.jogada.frames[s.frameAtual]);
      s.jogada.frames.splice(s.frameAtual + 1, 0, copia);
      s.frameAtual += 1;
    });
    aoMudar();
  }

  function menu(i) {
    const acao = prompt(
      `Frame ${i + 1}\n\n1 = descrever\n2 = duplicar\n3 = excluir\n4 = duração (ms)`);
    if (!acao) return;
    const s = store.get();

    if (acao === '1') {
      const d = prompt('Descrição do frame:', s.jogada.frames[i].descricao ?? '');
      if (d === null) return;
      historico.registrar(s);
      store.aplicar(x => { x.jogada.frames[i].descricao = d; });
    } else if (acao === '2') {
      historico.registrar(s);
      store.aplicar(x => { x.jogada.frames.splice(i + 1, 0, clonarFrame(x.jogada.frames[i])); });
    } else if (acao === '3') {
      if (s.jogada.frames.length === 1) return alert('A jogada precisa de pelo menos um frame.');
      historico.registrar(s);
      store.aplicar(x => {
        x.jogada.frames.splice(i, 1);
        x.frameAtual = Math.min(x.frameAtual, x.jogada.frames.length - 1);
      });
    } else if (acao === '4') {
      const ms = Number(prompt('Duração até o próximo frame, em ms:',
        s.jogada.frames[i].duracaoMs ?? s.jogada.duracaoPadraoMs));
      if (!Number.isFinite(ms)) return;
      historico.registrar(s);
      store.aplicar(x => { x.jogada.frames[i].duracaoMs = Math.min(Math.max(ms, 200), 10000); });
    }
    aoMudar();
  }

  return { render };
}

const escapar = s => s.replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
