import { VIEWBOX } from '../dominio/quadra.js';

/**
 * Injeta a quadra a partir de static/img/quadra-fiba.svg — o MESMO arquivo
 * que o SvgJogadaService lê do classpath para exportar. Fonte única: se a
 * geometria estivesse escrita também aqui, o PDF divergiria da tela.
 */
export async function montarQuadra(svgRaiz, enquadramento = 'meia') {
  const texto = await fetch('img/quadra-fiba.svg').then(r => r.text());
  const doc = new DOMParser().parseFromString(texto, 'image/svg+xml');

  const defs = doc.querySelector('defs');
  const geometria = doc.querySelector('#quadra-geometria');
  svgRaiz.append(svgRaiz.ownerDocument.importNode(defs, true),
                 svgRaiz.ownerDocument.importNode(geometria, true));

  aplicarEnquadramento(svgRaiz, enquadramento);
  return svgRaiz;
}

export function aplicarEnquadramento(svgRaiz, enquadramento) {
  svgRaiz.setAttribute('viewBox', VIEWBOX[enquadramento] ?? VIEWBOX.meia);
}
