// O backend manda um "codigo" no 403 quando a conta precisa de algo antes
// de seguir (ver JwtFilter): cada um leva para a tela que resolve.
const DESTINO_POR_CODIGO = { PLANO: '/planos.html', CADASTRO: '/completar-cadastro.html' };

// fetch com o cookie do JWT. Sessão expirada (401) volta para o login,
// como o authFetch que cada página antiga repetia.
export async function authFetch(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  if (res.status === 403) {
    const { erro, codigo } = await res.clone().json().catch(() => ({}));
    if (DESTINO_POR_CODIGO[codigo]) {
      if (window.location.pathname !== DESTINO_POR_CODIGO[codigo]) window.location.href = DESTINO_POR_CODIGO[codigo];
      throw new Error(erro || 'Acesso bloqueado');
    }
    // período de teste ou ação que o perfil não tem: avisa, mas não derruba a sessão
    if (codigo === 'SOMENTE_LEITURA' || (!codigo && erro)) {
      alert(codigo === 'SOMENTE_LEITURA' ? 'Período de teste: somente visualização. Assine um plano para editar.' : erro);
      throw new Error(erro || 'Sem permissão');
    }
  }
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

/**
 * Foto de perfil: reduz para no máximo `lado` px antes de virar base64, porque
 * ela viaja em toda listagem de usuários. Se o navegador não conseguir abrir
 * o arquivo como imagem, fica o original.
 */
export async function lerFoto(file, lado = 256, maxMB = 2) {
  if (file.size > maxMB * 1024 * 1024) throw new Error('grande');
  let img;
  try { img = await createImageBitmap(file); } catch { return lerImagem(file, maxMB); }
  const escala = Math.min(1, lado / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * escala);
  canvas.height = Math.round(img.height * escala);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; // JPEG não tem transparência
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  img.close();
  return canvas.toDataURL('image/jpeg', 0.85);
}

export const iniciais = (n) => (n || '?').split(' ').slice(0, 2).map((x) => x[0]).join('').toUpperCase();
