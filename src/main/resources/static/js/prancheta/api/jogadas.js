/**
 * Cliente da API.
 *
 * O LAIVY não guarda o JWT em localStorage: o token vive num cookie
 * HttpOnly ("jwtToken"), setado pelo servidor no login e inacessível ao
 * JS. Toda chamada autenticada só precisa mandar `credentials: 'include'`
 * para o navegador anexar o cookie sozinho — igual ao `authFetch` já usado
 * em dashboard.html, calendario.html, atividades.html etc.
 *
 * 401/403 aqui redireciona para o login, no mesmo padrão do resto do site.
 */
function cabecalhos(extra = {}) {
  return { 'Content-Type': 'application/json', ...extra };
}

async function json(resposta) {
  if (resposta.status === 401 || resposta.status === 403) {
    localStorage.clear();
    window.location.href = 'login.html';
    throw new Error('Sessão expirada ou sem permissão.');
  }
  if (resposta.status === 409) {
    const e = new Error('Esta jogada foi alterada por outra pessoa. Recarregue antes de salvar.');
    e.conflito = true;
    throw e;
  }
  if (resposta.status === 422) {
    const corpo = await resposta.json();
    const e = new Error(corpo.mensagem ?? 'Jogada inválida.');
    e.detalhes = corpo.detalhes ?? [];
    throw e;
  }
  if (!resposta.ok) throw new Error(`Falha na requisição (${resposta.status}).`);
  return resposta.status === 204 ? null : resposta.json();
}

const base = idTime => `/times/${idTime}/jogadas`;

export const listar = (idTime, { tipo, busca, page = 0, size = 24 } = {}) => {
  const q = new URLSearchParams({ page, size });
  if (tipo)  q.set('tipo', tipo);
  if (busca) q.set('busca', busca);
  return fetch(`${base(idTime)}?${q}`, { credentials: 'include', headers: cabecalhos() }).then(json);
};

export const buscar = (idTime, id) =>
  fetch(`${base(idTime)}/${id}`, { credentials: 'include', headers: cabecalhos() }).then(json);

export const criar = (idTime, nome, conteudo) =>
  fetch(base(idTime), {
    method: 'POST', credentials: 'include', headers: cabecalhos(), body: JSON.stringify({ nome, conteudo })
  }).then(json);

export const atualizar = (idTime, id, nome, conteudo, versao) =>
  fetch(`${base(idTime)}/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: cabecalhos(versao != null ? { 'If-Match': String(versao) } : {}),
    body: JSON.stringify({ nome, conteudo })
  }).then(json);

export const duplicar = (idTime, id) =>
  fetch(`${base(idTime)}/${id}/duplicar`, { method: 'POST', credentials: 'include', headers: cabecalhos() }).then(json);

export const arquivar = (idTime, id) =>
  fetch(`${base(idTime)}/${id}`, { method: 'DELETE', credentials: 'include', headers: cabecalhos() }).then(json);

export const vincular = (idTime, id, idAtividade, ordem, observacoes) =>
  fetch(`${base(idTime)}/${id}/vinculos`, {
    method: 'POST', credentials: 'include', headers: cabecalhos(),
    body: JSON.stringify({ idAtividade, ordem, observacoes })
  }).then(json);

export const confirmarVisualizacao = (idTime, id, idAtividade) =>
  fetch(`${base(idTime)}/${id}/visualizacao?idAtividade=${idAtividade}`, {
    method: 'POST', credentials: 'include', headers: cabecalhos()
  }).then(json);

/** null quando a jogada não está vinculada a essa atividade — não é erro, é estado normal. */
export const buscarVinculo = async (idTime, id, idAtividade) => {
  const r = await fetch(`${base(idTime)}/${id}/vinculos/${idAtividade}`, { credentials: 'include', headers: cabecalhos() });
  if (r.status === 404) return null;
  return json(r);
};

/** Todas as atividades às quais esta jogada já está vinculada. */
export const listarVinculos = (idTime, id) =>
  fetch(`${base(idTime)}/${id}/vinculos`, { credentials: 'include', headers: cabecalhos() }).then(json);

export const desvincular = (idTime, id, idAtividade) =>
  fetch(`${base(idTime)}/${id}/vinculos/${idAtividade}`, {
    method: 'DELETE', credentials: 'include', headers: cabecalhos()
  }).then(json);

export const urlPng = (idTime, id, indice) => `${base(idTime)}/${id}/frames/${indice}.png`;
export const urlPdf = (idTime, id)         => `${base(idTime)}/${id}.pdf`;
