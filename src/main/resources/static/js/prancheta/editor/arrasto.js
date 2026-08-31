import { coordenadasDoEvento, limitarNaQuadra, paraNormalizado } from '../dominio/quadra.js';

/**
 * Arrasto de boneco com Pointer Events.
 *
 * Não usar a API HTML5 de drag and drop: ela não funciona em toque.
 * Não esquecer de touch-action:none no CSS da quadra, senão o navegador do
 * celular rola a página quando o treinador tenta arrastar.
 *
 * Durante o gesto a posição é escrita DIRETO no DOM. Comitar no store a cada
 * pointermove re-renderizaria tudo a 60 Hz sem necessidade. O store só é
 * tocado no pointerup — que é o mesmo momento do passo de histórico.
 */
export function ativarArrasto({ svg, grupoQuadra, store, historico, aoSoltar, aoSelecionar, enquadramento }) {
  let arrasto = null;

  svg.addEventListener('pointerdown', e => {
    const g = e.target.closest('[data-token-id]');

    // A seleção (usada pelo painel "Elenco em quadra" para saber a quem
    // associar o atleta clicado) precisa funcionar em QUALQUER ferramenta —
    // senão, com outra ferramenta ativa, o clique no atleta associa ao
    // último boneco selecionado em "Mover" (ou a nenhum), o que parece bug.
    if (g) aoSelecionar?.(g.dataset.tokenId);

    if (store.get().ferramenta !== 'mover' || !g) return;

    historico.registrar(store.get());          // UM passo por gesto
    g.setPointerCapture(e.pointerId);          // segue o dedo mesmo fora do boneco
    g.classList.add('arrastando');
    arrasto = { id: g.dataset.tokenId, no: g, pos: null };
    e.preventDefault();
  });

  svg.addEventListener('pointermove', e => {
    if (!arrasto) return;
    const p = limitarNaQuadra(coordenadasDoEvento(grupoQuadra, e), enquadramento());
    arrasto.pos = p;
    arrasto.no.setAttribute('transform', `translate(${p.x} ${p.y})`);
  });

  const finalizar = () => {
    if (!arrasto) return;
    const { id, pos, no } = arrasto;
    arrasto = null;
    no.classList.remove('arrastando');
    if (pos) aoSoltar(id, paraNormalizado(pos));
  };

  svg.addEventListener('pointerup', finalizar);
  svg.addEventListener('pointercancel', finalizar);
}
