// Ordenação compartilhada das listas (antes js/list-sort.js).
export function comparar(a, b, tipo) {
  if (tipo === 'numero') return (Number(a) || 0) - (Number(b) || 0);
  if (tipo === 'data') return (a ? new Date(a) : new Date(0)) - (b ? new Date(b) : new Date(0));
  // texto (padrão) — alfabética, acentos e maiúsculas/minúsculas ignorados
  return String(a || '').localeCompare(String(b || ''), 'pt-BR', { sensitivity: 'base' });
}

/** Ordena sem alterar o array original. opts: { campo, direcao, tipo, getter? } */
export function ordenar(lista, { campo, direcao = 'asc', tipo = 'texto', getter } = {}) {
  if (!campo) return lista.slice();
  return lista.slice().sort((x, y) => {
    const r = comparar(getter ? getter(x, campo) : x[campo], getter ? getter(y, campo) : y[campo], tipo);
    return direcao === 'desc' ? -r : r;
  });
}

/** Próximo estado ao clicar num cabeçalho: mesma coluna inverte, outra começa em asc. */
export function alternarOrdem(estado, campo, tipo) {
  if (estado.campo === campo) return { ...estado, direcao: estado.direcao === 'asc' ? 'desc' : 'asc' };
  return { campo, tipo, direcao: 'asc' };
}
