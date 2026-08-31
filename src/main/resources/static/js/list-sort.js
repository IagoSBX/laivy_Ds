/* ============================================================
   LAIVY — list-sort.js
   Utilitário compartilhado de ordenação para listas do sistema.
   Usado por: usuarios, atividades, exames, desempenho,
              times e treinadores (painel-admin).
   ============================================================ */
const ListSort = (function () {

  function valorComparavel(item, campo, getter) {
    return getter ? getter(item, campo) : item[campo];
  }

  function comparar(a, b, tipo) {
    if (tipo === 'numero') {
      return (Number(a) || 0) - (Number(b) || 0);
    }
    if (tipo === 'data') {
      const da = a ? new Date(a) : new Date(0);
      const db = b ? new Date(b) : new Date(0);
      return da - db;
    }
    // texto (padrão) — alfabética, acentos e maiúsculas/minúsculas ignorados
    return String(a || '').localeCompare(String(b || ''), 'pt-BR', { sensitivity: 'base' });
  }

  /**
   * Ordena uma lista sem alterar o array original.
   * opts: { campo, direcao: 'asc'|'desc', tipo: 'texto'|'numero'|'data', getter? }
   */
  function ordenar(lista, opts) {
    const { campo, direcao = 'asc', tipo = 'texto', getter } = opts;
    if (!campo) return lista.slice();
    const copia = lista.slice();
    copia.sort((x, y) => {
      const va = valorComparavel(x, campo, getter);
      const vb = valorComparavel(y, campo, getter);
      const r = comparar(va, vb, tipo);
      return direcao === 'desc' ? -r : r;
    });
    return copia;
  }

  /**
   * Cria (ou reaproveita) um <select> de ordenação para o modo Cards.
   * container: elemento onde o select será inserido (fica vazio antes de chamar)
   * opcoes: [{ valor:'nome', label:'Nome (A-Z)', campo:'nome_usuario', direcao:'asc', tipo:'texto' }, ...]
   * onChange(opcaoEscolhida) — chamado quando o usuário troca a opção
   * valorInicial — 'valor' da opção que deve iniciar selecionada
   */
  function criarDropdown(container, opcoes, onChange, valorInicial) {
    if (!container) return null;
    const select = document.createElement('select');
    select.className = 'select-filtro sort-dropdown';
    select.innerHTML = opcoes.map(o =>
      '<option value="' + o.valor + '">' + o.label + '</option>'
    ).join('');
    if (valorInicial) select.value = valorInicial;
    select.addEventListener('change', () => {
      const escolhida = opcoes.find(o => o.valor === select.value);
      if (escolhida) onChange(escolhida);
    });
    container.innerHTML = '';
    container.appendChild(select);
    return select;
  }

  /**
   * Torna um <th> clicável para ordenar a tabela, com seta indicando
   * direção. 'state' é um objeto { campo, direcao, tipo } compartilhado
   * entre todos os cabeçalhos do mesmo grupo — passe o MESMO objeto
   * para cada chamada de habilitarCabecalho de uma mesma tabela.
   */
  function habilitarCabecalho(th, campo, tipo, state, onChange) {
    if (!th) return;
    th.classList.add('th-ordenavel');
    th.dataset.campoOrdenacao = campo;
    th.addEventListener('click', () => {
      if (state.campo === campo) {
        state.direcao = state.direcao === 'asc' ? 'desc' : 'asc';
      } else {
        state.campo = campo;
        state.tipo = tipo;
        state.direcao = 'asc';
      }
      atualizarSetas(th.parentElement, state);
      onChange(state);
    });
  }

  function atualizarSetas(tr, state) {
    if (!tr) return;
    tr.querySelectorAll('th[data-campo-ordenacao]').forEach(th => {
      const antiga = th.querySelector('.sort-arrow');
      if (antiga) antiga.remove();
      if (th.dataset.campoOrdenacao === state.campo) {
        const seta = document.createElement('span');
        seta.className = 'sort-arrow';
        seta.textContent = state.direcao === 'asc' ? ' \u25B2' : ' \u25BC';
        th.appendChild(seta);
      }
    });
  }

  return { ordenar, criarDropdown, habilitarCabecalho, atualizarSetas, comparar };
})();
