/**
 * Sistema de coordenadas da prancheta.
 *
 * REGRA INVIOLÁVEL: coordenadas gravadas SEMPRE em fração da quadra
 * INTEIRA (0..1), nunca da meia quadra e nunca em pixels. Meia quadra é
 * apenas um recorte de viewBox — trocar o enquadramento na Fase 3 não
 * exige migrar nenhuma jogada já salva.
 */
export const QUADRA = Object.freeze({ comprimento: 28, largura: 15 });

export const VIEWBOX = Object.freeze({ meia: '0 0 14 15', inteira: '0 0 28 15' });

/** Aros, em metros. Usado pelos presets de marcação individual. */
export const AROS = Object.freeze({ esquerdo: { x: 1.575, y: 7.5 }, direito: { x: 26.425, y: 7.5 } });

export const paraMetros     = t => ({ x: t.x * QUADRA.comprimento, y: t.y * QUADRA.largura });
export const paraNormalizado = p => ({ x: p.x / QUADRA.comprimento, y: p.y / QUADRA.largura });

export function limitarNaQuadra(p, enquadramento = 'meia', margem = 0.35) {
  const maxX = enquadramento === 'meia' ? 14 : QUADRA.comprimento;
  return {
    x: Math.min(Math.max(p.x, margem), maxX - margem),
    y: Math.min(Math.max(p.y, margem), QUADRA.largura - margem)
  };
}

/**
 * Converte coordenada de tela para coordenada de quadra.
 *
 * Usa a matriz do próprio SVG, o que resolve de graça o viewBox, o zoom do
 * navegador, o redimensionamento responsivo e qualquer rotação aplicada ao
 * grupo (útil se um dia a quadra for exibida na vertical no celular).
 *
 * Passar o GRUPO da quadra, não o <svg> raiz: se houver transform no grupo,
 * só a CTM dele reflete a rotação.
 */
export function coordenadasDoEvento(grupoQuadra, evento) {
  const pt = new DOMPoint(evento.clientX, evento.clientY);
  return pt.matrixTransform(grupoQuadra.getScreenCTM().inverse());
}
