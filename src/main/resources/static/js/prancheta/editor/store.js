/**
 * Store mínima. Substitui Zustand em ~30 linhas.
 *
 * structuredClone é nativo e faz o papel do Immer: o estado é sempre
 * imutável, o histórico guarda snapshots seguros e "mudou?" é comparação de
 * referência. Com ~15 objetos por frame o custo do clone é irrelevante.
 */
export function criarStore(estadoInicial) {
  let estado = estadoInicial;
  const ouvintes = new Set();

  return {
    get: () => estado,

    /** @param {(rascunho:any)=>any|void} receita recebe um clone mutável */
    aplicar(receita) {
      const rascunho = structuredClone(estado);
      const retorno = receita(rascunho);
      estado = retorno === undefined ? rascunho : retorno;
      ouvintes.forEach(f => f(estado));
      return estado;
    },

    /** Substitui o estado inteiro. Usado por desfazer/refazer e por carregar. */
    substituir(novo) {
      estado = novo;
      ouvintes.forEach(f => f(estado));
      return estado;
    },

    assinar(fn) { ouvintes.add(fn); return () => ouvintes.delete(fn); }
  };
}
