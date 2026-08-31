import { QUADRA } from './quadra.js';

/**
 * Suavização por ponto médio quadrático.
 *
 * ⚠ ESTE ALGORITMO ESTÁ DUPLICADO EM SvgJogadaService.caminhoSuavizado().
 * As duas implementações precisam continuar idênticas, senão o traço do PDF
 * sai com curvatura diferente do traço da tela. Alterou aqui, altere lá.
 */
export function caminhoSuavizado(pontos) {
  if (!pontos || pontos.length === 0) return '';
  const p = pontos.map(q => [q.x * QUADRA.comprimento, q.y * QUADRA.largura]);
  const f = v => v.toFixed(4);

  if (p.length === 1) return `M${f(p[0][0])},${f(p[0][1])}`;
  if (p.length === 2) return `M${f(p[0][0])},${f(p[0][1])}L${f(p[1][0])},${f(p[1][1])}`;

  let d = `M${f(p[0][0])},${f(p[0][1])}`;
  for (let i = 1; i < p.length - 1; i++) {
    const mx = (p[i][0] + p[i + 1][0]) / 2;
    const my = (p[i][1] + p[i + 1][1]) / 2;
    d += `Q${f(p[i][0])},${f(p[i][1])} ${f(mx)},${f(my)}`;
  }
  const u = p[p.length - 1];
  return d + `L${f(u[0])},${f(u[1])}`;
}

/**
 * Ramer–Douglas–Peucker. Reduz o traço à mão livre de centenas de pontos
 * para algumas dezenas antes de gravar, sem mudar a forma percebida.
 * Tolerância em unidades normalizadas (0.004 ≈ 11 cm de quadra).
 */
export function simplificar(pontos, tolerancia = 0.004) {
  if (!pontos || pontos.length < 3) return pontos ?? [];
  const dist2 = (p, a, b) => {
    let x = a.x, y = a.y, dx = b.x - x, dy = b.y - y;
    if (dx !== 0 || dy !== 0) {
      const t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);
      if (t > 1) { x = b.x; y = b.y; } else if (t > 0) { x += dx * t; y += dy * t; }
    }
    return (p.x - x) ** 2 + (p.y - y) ** 2;
  };
  const rec = (ini, fim) => {
    let maior = 0, indice = -1;
    for (let i = ini + 1; i < fim; i++) {
      const d = dist2(pontos[i], pontos[ini], pontos[fim]);
      if (d > maior) { maior = d; indice = i; }
    }
    if (maior > tolerancia ** 2) return [...rec(ini, indice), ...rec(indice, fim).slice(1)];
    return [pontos[ini], pontos[fim]];
  };
  return rec(0, pontos.length - 1);
}
