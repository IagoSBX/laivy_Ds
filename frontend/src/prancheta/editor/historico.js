/**
 * Desfazer/refazer por snapshot. Substitui o zundo.
 *
 * REGRA: um registrar() por GESTO, não por movimento de ponteiro. Chamado
 * no pointerdown, nunca no pointermove — senão arrastar um boneco de um lado
 * ao outro gera 300 passos de histórico.
 */
export function criarHistorico(limite = 50) {
  let passado = [], futuro = [];

  return {
    registrar(estadoAtual) {
      passado.push(structuredClone(estadoAtual));
      if (passado.length > limite) passado.shift();
      futuro = [];
    },
    desfazer(estadoAtual) {
      if (!passado.length) return null;
      futuro.push(structuredClone(estadoAtual));
      return passado.pop();
    },
    refazer(estadoAtual) {
      if (!futuro.length) return null;
      passado.push(structuredClone(estadoAtual));
      return futuro.pop();
    },
    limpar() { passado = []; futuro = []; },
    podeDesfazer: () => passado.length > 0,
    podeRefazer:  () => futuro.length > 0
  };
}
