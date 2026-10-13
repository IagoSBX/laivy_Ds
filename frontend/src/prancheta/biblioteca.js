import { montarQuadra } from './render/quadraSvg.js';
import { criarRenderizador } from './render/cena.js';
import { cenaDoFrame } from './dominio/interpolacao.js';
import { TIPOS } from './dominio/schema.js';
import * as api from './api/jogadas.js';

/**
 * Biblioteca de jogadas (antes js/prancheta/biblioteca.js, que rodava no import).
 * Iniciada pela tela React (pages/BibliotecaJogadas.jsx) depois que a casca existe.
 */
export function iniciarBiblioteca({ navegar }) {
  // Mesma resolução de time que a prancheta usa: URL primeiro (deep link),
  // timeSelecionado do localStorage depois (entrada pela sidebar).
  const params = new URLSearchParams(location.search);
  const _timeSelecionado = JSON.parse(localStorage.getItem('timeSelecionado') || 'null');
  const ID_TIME = Number(params.get('time')) || _timeSelecionado?.id || null;
  if (!ID_TIME) { navegar('/selecionar-time.html', { replace: true }); return () => {}; }

  const TAMANHO_PAGINA = 24;

  const el = id => document.getElementById(id);
  const grade = el('grade');

  let pagina = 0;
  let ultima = true;
  let debounceBusca = null;

  // ---------------------------------------------------------------------
  // miniatura — reaproveita o MESMO renderizador do editor, sem reimplementar
  // nada da quadra ou dos bonecos. O primeiro frame já vem pronto na resposta
  // da biblioteca (item.primeiroFrame), então não é preciso buscar a jogada
  // inteira só para desenhar o card.
  // ---------------------------------------------------------------------

  async function montarMiniatura(container, item) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    container.appendChild(svg);
    container.dataset.enquadramento = item.enquadramento;
    try {
      await montarQuadra(svg, item.enquadramento);
      const renderizador = criarRenderizador(svg);
      const frame = JSON.parse(item.primeiroFrame);
      renderizador.render(cenaDoFrame(frame));
    } catch {
      container.innerHTML = '';
    }
  }

  // ---------------------------------------------------------------------
  // cartão
  // ---------------------------------------------------------------------

  function formatarData(iso) {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function abrirJogada(item) {
    navegar(`/prancheta.html?time=${ID_TIME}&jogada=${item.id}`);
  }

  function criarCartao(item) {
    const card = document.createElement('article');
    card.className = 'cartao-jogada';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Abrir jogada ${item.nome}`);
    // O card inteiro abre a jogada; os botões de ação, dentro dele, contêm o
    // clique (stopPropagation) para não disparar essa navegação também.
    card.onclick = () => abrirJogada(item);
    card.onkeydown = e => { if (e.key === 'Enter') abrirJogada(item); };

    const thumb = document.createElement('div');
    thumb.className = 'cartao-thumb';
    montarMiniatura(thumb, item);

    const corpo = document.createElement('div');
    corpo.className = 'cartao-corpo';
    corpo.innerHTML = `
      <p class="cartao-nome">${escapar(item.nome)}</p>
      <p class="cartao-meta">
        <span class="chip-tipo">${escapar(TIPOS[item.tipo] ?? item.tipo)}</span>
        <span>${item.qtdFrames} frame${item.qtdFrames === 1 ? '' : 's'}</span>
        <span>· ${formatarData(item.atualizadoEm)}</span>
      </p>`;

    const acoes = document.createElement('div');
    acoes.className = 'cartao-acoes';
    acoes.onclick = e => e.stopPropagation();

    const btnAbrir = document.createElement('button');
    btnAbrir.type = 'button'; btnAbrir.className = 'btn btn-primario';
    btnAbrir.textContent = 'Abrir';
    btnAbrir.onclick = () => abrirJogada(item);

    const btnDuplicar = document.createElement('button');
    btnDuplicar.type = 'button'; btnDuplicar.className = 'btn';
    btnDuplicar.textContent = 'Duplicar';
    btnDuplicar.onclick = async () => {
      btnDuplicar.disabled = true;
      try {
        await api.duplicar(ID_TIME, item.id);
        await carregar({ reset: true });
      } catch (e) {
        alert('Falha ao duplicar: ' + e.message);
        btnDuplicar.disabled = false;
      }
    };

    const btnArquivar = document.createElement('button');
    btnArquivar.type = 'button'; btnArquivar.className = 'btn btn-arquivar';
    btnArquivar.textContent = 'Arquivar';
    btnArquivar.onclick = async () => {
      if (!confirm(`Arquivar "${item.nome}"? Ela sai da biblioteca, mas continua vinculada aos treinos/jogos que já a usam.`)) return;
      btnArquivar.disabled = true;
      try {
        await api.arquivar(ID_TIME, item.id);
        card.remove();
      } catch (e) {
        alert('Falha ao arquivar: ' + e.message);
        btnArquivar.disabled = false;
      }
    };

    acoes.append(btnAbrir, btnDuplicar, btnArquivar);
    card.append(thumb, corpo, acoes);
    return card;
  }

  function escapar(s) {
    const d = document.createElement('div');
    d.textContent = s ?? '';
    return d.innerHTML;
  }

  // ---------------------------------------------------------------------
  // listagem
  // ---------------------------------------------------------------------

  async function carregar({ reset = false } = {}) {
    if (reset) { pagina = 0; grade.innerHTML = ''; }

    const tipo  = el('filtro-tipo').value || undefined;
    const busca = el('busca').value.trim() || undefined;

    let pagina_dados;
    try {
      pagina_dados = await api.listar(ID_TIME, { tipo, busca, page: pagina, size: TAMANHO_PAGINA });
    } catch (e) {
      grade.innerHTML = `<p class="ajuda">Falha ao carregar a biblioteca: ${escapar(e.message)}</p>`;
      el('btn-carregar-mais').hidden = true;
      return;
    }

    ultima = pagina_dados.last;
    if (pagina === 0 && pagina_dados.content.length === 0) {
      grade.innerHTML = '<p class="ajuda">Nenhuma jogada encontrada.</p>';
    } else {
      pagina_dados.content.forEach(item => grade.appendChild(criarCartao(item)));
    }
    el('btn-carregar-mais').hidden = ultima;
  }

  function carregarMais() {
    pagina += 1;
    carregar();
  }

  // ---------------------------------------------------------------------
  // boot
  // ---------------------------------------------------------------------

  Object.entries(TIPOS).forEach(([v, r]) => el('filtro-tipo').appendChild(new Option(r, v)));
  el('link-nova').onclick = e => { e.preventDefault(); navegar(`/prancheta.html?time=${ID_TIME}`); };
  el('link-nova').href = `/prancheta.html?time=${ID_TIME}`;

  el('filtro-tipo').onchange = () => carregar({ reset: true });
  el('busca').oninput = () => {
    clearTimeout(debounceBusca);
    debounceBusca = setTimeout(() => carregar({ reset: true }), 300);
  };
  el('btn-carregar-mais').onclick = carregarMais;

  carregar({ reset: true });

  return () => clearTimeout(debounceBusca);
}
