import { QUADRA } from '../dominio/quadra.js';
import { caminhoSuavizado } from '../dominio/geometria.js';

const NS = 'http://www.w3.org/2000/svg';

/**
 * ⚠ PALETA DUPLICADA em SvgJogadaService (constantes COR_*). Alterou aqui,
 * altere lá — senão o PNG e o PDF saem com cor diferente da tela.
 */
export const CORES = Object.freeze({
  ataque: '#D9662B', defesa: '#5A5148', bola: '#F2A93B',
  tinta: '#1F1B16', passe: '#2E6B5E'
});

/**
 * Reconciliação mínima — o "React de pobre".
 *
 * Redesenhar com innerHTML a cada mudança pisca, perde o setPointerCapture
 * no meio do arrasto e derruba o foco. Manter um Map de nós e atualizar só
 * os atributos resolve, em ~20 linhas, e é o que o React faria.
 */
export function criarRenderizador(svgRaiz) {
  const camadaTracos = grupo(svgRaiz, 'camada-tracos');
  const camadaTokens = grupo(svgRaiz, 'camada-tokens');
  const camadaBola   = grupo(svgRaiz, 'camada-bola');
  const camadaTextos = grupo(svgRaiz, 'camada-textos');

  const nosToken = new Map();
  const nosTraco = new Map();
  const nosTexto = new Map();
  let noBola = null;

  function render(cena, { selecionado = null, revelacao = 1 } = {}) {
    reconciliar(nosToken, camadaTokens, cena.tokens, criarToken, (no, t) => {
      no.setAttribute('transform', `translate(${t.x * QUADRA.comprimento} ${t.y * QUADRA.largura})`);
      no.querySelector('.token-corpo').setAttribute(
        'fill', t.papel === 'ataque' ? CORES.ataque : '#FFFFFF');
      no.querySelector('.token-corpo').setAttribute(
        'stroke', t.papel === 'ataque' ? '#FFFFFF' : CORES.defesa);
      const rotulo = no.querySelector('.token-rotulo');
      rotulo.textContent = t.numero || (t.papel === 'ataque' ? '' : 'x');
      rotulo.setAttribute('fill', t.papel === 'ataque' ? '#FFFFFF' : CORES.defesa);
      no.classList.toggle('selecionado', t.id === selecionado);
      no.dataset.tokenId = t.id;
      no.dataset.papel = t.papel;
    });

    reconciliar(nosTraco, camadaTracos, cena.tracos ?? [], criarTraco, (no, t) => {
      const d = caminhoSuavizado(t.pontos);
      no.setAttribute('d', d);
      no.setAttribute('stroke', t.tipo === 'passe' ? CORES.passe : CORES.tinta);
      no.setAttribute('stroke-dasharray',
        t.tipo === 'passe' ? '0.30 0.20'
        : t.tipo === 'drible' ? '0.12 0.12'
        : t.tipo === 'arremesso' ? '0.05 0.16' : 'none');
      no.setAttribute('marker-end',
        t.tipo === 'passe' ? 'url(#ponta-seta-passe)'
        : t.tipo === 'bloqueio' ? 'url(#ponta-bloqueio)'
        : t.tipo === 'arremesso' ? 'url(#ponta-arremesso)'
        : t.tipo === 'livre' ? 'none' : 'url(#ponta-seta)');
      no.dataset.tracoId = t.id;
      aplicarRevelacao(no, revelacao, t.tipo);
    });

    reconciliar(nosTexto, camadaTextos, cena.textos ?? [], criarTexto, (no, t) => {
      no.setAttribute('x', t.x * QUADRA.comprimento);
      no.setAttribute('y', t.y * QUADRA.largura);
      no.textContent = t.conteudo;
      no.dataset.textoId = t.id;
    });

    renderBola(cena);
  }

  function renderBola(cena) {
    const b = cena.bola;
    let x, y;
    if (b?.posseDoTokenId) {
      const dono = cena.tokens.find(t => t.id === b.posseDoTokenId);
      if (!dono) { if (noBola) noBola.style.display = 'none'; return; }
      x = dono.x * QUADRA.comprimento + 0.55;
      y = dono.y * QUADRA.largura - 0.42;
    } else if (b && b.x != null && b.y != null) {
      x = b.x * QUADRA.comprimento; y = b.y * QUADRA.largura;
    } else { if (noBola) noBola.style.display = 'none'; return; }

    if (!noBola) {
      noBola = document.createElementNS(NS, 'circle');
      noBola.setAttribute('r', '0.23');
      noBola.setAttribute('fill', CORES.bola);
      noBola.setAttribute('stroke', '#8A5A12');
      noBola.setAttribute('stroke-width', '0.06');
      noBola.classList.add('bola');
      camadaBola.appendChild(noBola);
    }
    noBola.style.display = '';
    noBola.setAttribute('cx', x);
    noBola.setAttribute('cy', y);
  }

  return { render, camadaTokens, camadaTracos };
}

/**
 * Revelação progressiva do traço durante a animação: o passe aparece sendo
 * desenhado no momento em que acontece, em vez de já estar na tela. Custa
 * pouco e é o detalhe que faz o treinador achar a ferramenta boa.
 */
function aplicarRevelacao(no, revelacao, tipo) {
  if (revelacao >= 1 || tipo === 'passe' || tipo === 'drible' || tipo === 'arremesso') {
    no.style.strokeDashoffset = '';
    return;
  }
  const comprimento = no.getTotalLength?.() ?? 0;
  if (!comprimento) return;
  no.setAttribute('stroke-dasharray', comprimento);
  no.style.strokeDashoffset = comprimento * (1 - revelacao);
}

function reconciliar(mapa, camada, itens, criar, atualizar) {
  const vistos = new Set();
  for (const item of itens) {
    vistos.add(item.id);
    let no = mapa.get(item.id);
    if (!no) { no = criar(item); mapa.set(item.id, no); camada.appendChild(no); }
    atualizar(no, item);
  }
  for (const [id, no] of mapa) {
    if (!vistos.has(id)) { no.remove(); mapa.delete(id); }
  }
}

function criarToken(t) {
  const g = document.createElementNS(NS, 'g');
  g.classList.add('token');

  // Área de toque MAIOR que o boneco: o arrasto precisa funcionar com o dedo.
  const alvo = document.createElementNS(NS, 'circle');
  alvo.setAttribute('r', '0.85');
  alvo.setAttribute('fill', 'transparent');
  alvo.classList.add('token-alvo');

  const corpo = document.createElementNS(NS, 'circle');
  corpo.setAttribute('r', '0.52');
  corpo.setAttribute('stroke-width', '0.09');
  corpo.classList.add('token-corpo');

  const rotulo = document.createElementNS(NS, 'text');
  rotulo.setAttribute('y', '0.2');
  rotulo.setAttribute('text-anchor', 'middle');
  rotulo.setAttribute('font-size', '0.58');
  rotulo.setAttribute('font-weight', 'bold');
  rotulo.setAttribute('font-family', 'Helvetica, Arial, sans-serif');
  rotulo.classList.add('token-rotulo');

  g.append(alvo, corpo, rotulo);
  return g;
}

function criarTraco() {
  const p = document.createElementNS(NS, 'path');
  p.setAttribute('fill', 'none');
  p.setAttribute('stroke-width', '0.11');
  p.setAttribute('stroke-linecap', 'round');
  p.setAttribute('stroke-linejoin', 'round');
  p.classList.add('traco');
  return p;
}

function criarTexto() {
  const t = document.createElementNS(NS, 'text');
  t.setAttribute('text-anchor', 'middle');
  t.setAttribute('font-size', '0.5');
  t.setAttribute('fill', CORES.tinta);
  t.setAttribute('font-family', 'Helvetica, Arial, sans-serif');
  t.classList.add('texto');
  return t;
}

function grupo(svg, id) {
  let g = svg.querySelector(`#${id}`);
  if (!g) { g = document.createElementNS(NS, 'g'); g.id = id; svg.appendChild(g); }
  return g;
}
