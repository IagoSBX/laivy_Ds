// Dados de sessão guardados no navegador. O JWT em si fica em cookie HttpOnly;
// aqui só ficam os dados de exibição, como nas páginas originais.
function lerJson(chave, padrao) {
  try { return JSON.parse(localStorage.getItem(chave)) ?? padrao; } catch { return padrao; }
}

export const usuarioLogado = () => lerJson('usuario', {});
export const timeSelecionado = () => lerJson('timeSelecionado', null);
export const TIPOS = { 1: 'Administrador', 2: 'Treinador', 3: 'Atleta', 4: 'Preparador Físico' };

// Situação do treinador que se cadastrou sozinho (vem do login e de /assinaturas/minha):
// TESTE = só visualização do time demo, SEM_PLANO = só a tela de planos, ATIVO = plano pago.
export const emTeste = (u) => u.situacao === 'TESTE';

/** Gerencia o time (escalação, jogadas, cadastro de pessoas): Admin e Treinador fora do teste. */
export const ehGestor = (u) => u.tipo_usuario === 1 || (u.tipo_usuario === 2 && !emTeste(u));

/** Atividades, exames e desempenho: quem gerencia o time e o Preparador Físico. */
export const ehPreparo = (u) => ehGestor(u) || u.tipo_usuario === 4;

/** Para onde vai depois do login (ou da troca de senha). */
export function destinoInicial(u) {
  if (Number(u.tipo_usuario) === 1) return '/painel-admin.html';
  if (Number(u.cadastro_completo) === 0) return '/completar-cadastro.html';
  if (u.situacao === 'SEM_PLANO') return '/planos.html';
  if (u.situacao === 'ATIVO' && !u.time) return '/novo-time.html';
  return '/selecionar-time.html';
}

/** Atualiza os dados de exibição guardados (ex.: situação do plano depois de pagar). */
export function atualizarUsuario(campos) {
  localStorage.setItem('usuario', JSON.stringify({ ...usuarioLogado(), ...campos }));
}

export function formatarData(iso) {
  if (!iso) return '—';
  const p = String(iso).split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}
