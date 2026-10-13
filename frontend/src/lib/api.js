// fetch com o cookie do JWT. Sessão expirada (401/403) volta para o login,
// como o authFetch que cada página antiga repetia.
export async function authFetch(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  if (res.status === 401 || res.status === 403) {
    localStorage.clear();
    window.location.href = '/login.html';
    throw new Error('Sessão expirada');
  }
  return res;
}

export const getJson = (url) => authFetch(url).then((r) => r.json());

export async function sair() {
  try { await fetch('/usuarios/logout', { method: 'POST', credentials: 'include' }); } catch { /* offline */ }
  localStorage.clear();
  window.location.href = '/login.html';
}

/** Lê um arquivo de imagem como data URL (base64), recusando acima de maxMB. */
export function lerImagem(file, maxMB = 2) {
  return new Promise((resolve, reject) => {
    if (file.size > maxMB * 1024 * 1024) { reject(new Error('grande')); return; }
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const iniciais = (n) => (n || '?').split(' ').slice(0, 2).map((x) => x[0]).join('').toUpperCase();
