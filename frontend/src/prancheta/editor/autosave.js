/**
 * Rascunho automático em IndexedDB.
 *
 * O treinador trabalha no ginásio, com wi-fi ruim. Perder a jogada por queda
 * de rede seria o jeito mais rápido de fazer ele abandonar a ferramenta.
 * Wrapper mínimo, sem idb-keyval nem dependência.
 */
const BANCO = 'prancheta', LOJA = 'rascunhos';

function abrir() {
  return new Promise((ok, erro) => {
    const req = indexedDB.open(BANCO, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(LOJA);
    req.onsuccess = () => ok(req.result);
    req.onerror = () => erro(req.error);
  });
}

async function transacao(modo, fn) {
  const db = await abrir();
  return new Promise((ok, erro) => {
    const tx = db.transaction(LOJA, modo);
    const req = fn(tx.objectStore(LOJA));
    req.onsuccess = () => ok(req.result);
    req.onerror = () => erro(req.error);
  });
}

export const salvarRascunho = (chave, jogada) =>
  transacao('readwrite', loja => loja.put({ jogada, em: Date.now() }, chave));

export const lerRascunho = chave =>
  transacao('readonly', loja => loja.get(chave));

export const apagarRascunho = chave =>
  transacao('readwrite', loja => loja.delete(chave));

/** Dispara `fn` no máximo uma vez a cada `ms`. */
export function comDebounce(fn, ms = 2000) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
