// Dados de sessão guardados no navegador. O JWT em si fica em cookie HttpOnly;
// aqui só ficam os dados de exibição, como nas páginas originais.
function lerJson(chave, padrao) {
  try { return JSON.parse(localStorage.getItem(chave)) ?? padrao; } catch { return padrao; }
}

export const usuarioLogado = () => lerJson('usuario', {});
export const timeSelecionado = () => lerJson('timeSelecionado', null);
export const TIPOS = { 1: 'Administrador', 2: 'Treinador', 3: 'Atleta' };

export function formatarData(iso) {
  if (!iso) return '—';
  const p = String(iso).split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}
