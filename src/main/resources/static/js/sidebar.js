/* ============================================================
   LAIVY — Sidebar unificada
   Fonte única de verdade para o menu lateral de todas as telas.
   Qualquer alteração de navegação (nova tela, renomear item,
   trocar ícone) deve ser feita SÓ AQUI — nunca direto no HTML
   de cada página.
   ============================================================ */
(function () {

  // ---------- ÍCONES (SVG, mesmo estilo em toda a sidebar) ----------
  const ICONS = {
    dashboard: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    usuarios: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    times: '<path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z"/>',
    escalacao: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    treinadores: '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/>',
    exames: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    desempenho: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    atividades: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    calendario: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    assistente: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>'
  };

  function svg(name) {
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ICONS[name] + '</svg>';
  }

  // ---------- ESTRUTURA ÚNICA DO MENU (editar só aqui) ----------
  const NAV = [
    { section: 'Principal', items: [
      { href: 'dashboard.html', label: 'Dashboard', icon: 'dashboard' }
    ]},
    { section: 'Gestão', items: [
      { href: 'usuarios.html', label: 'Usuários', icon: 'usuarios' },
      { href: 'times.html', label: 'Times', icon: 'times' },
      { href: 'escalacao.html', label: 'Escalação', icon: 'escalacao' },
      { href: 'cadastrar-treinador.html', label: 'Treinadores', icon: 'treinadores' }
    ]},
    { section: 'Atividades', items: [
      { href: 'exames.html', label: 'Exames', icon: 'exames' },
      { href: 'desempenho.html', label: 'Desempenho', icon: 'desempenho' },
      { href: 'atividades.html', label: 'Atividades', icon: 'atividades' },
      { href: 'calendario.html', label: 'Calendário', icon: 'calendario' }
    ]},
    { section: 'IA', items: [
      { href: 'assistente.html', label: 'Assistente', icon: 'assistente' }
    ]}
  ];

  // ---------- MONTAGEM DO HTML ----------
  const paginaAtual = location.pathname.split('/').pop() || 'dashboard.html';

  let navHtml = '';
  NAV.forEach(function (grupo) {
    navHtml += '<div class="nav-section">' + grupo.section + '</div>';
    grupo.items.forEach(function (item) {
      const ativo = item.href === paginaAtual ? ' active' : '';
      navHtml +=
        '<a href="' + item.href + '" class="nav-item' + ativo + '">' +
        '<span class="nav-icon" style="display:inline-flex">' + svg(item.icon) + '</span>' +
        '<span>' + item.label + '</span></a>';
    });
  });

  const sidebarHtml =
    '<div id="logoutModal">' +
      '<div class="logout-card">' +
        '<div class="logout-icon">👋</div>' +
        '<div class="logout-titulo">Sair do Sistema?</div>' +
        '<div class="logout-msg">Sua sessão será encerrada.<br>Deseja realmente sair?</div>' +
        '<div class="logout-btns">' +
          '<button class="btn-logout-cancel" onclick="fecharLogout()">Cancelar</button>' +
          '<button class="btn-logout-confirm" onclick="confirmarLogout()">Sair</button>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<aside class="sidebar">' +
      '<div class="sidebar-logo" id="sidebarLogo">' +
        '<div class="logo-icon" id="sidebarLogoIcon">L</div>' +
        '<div class="logo-texts"><div class="t1" id="sidebarNomeTime">LAIVY</div><div class="t2">Sistema Esportivo</div></div>' +
      '</div>' +
      '<nav>' + navHtml + '</nav>' +
      '<a href="selecionar-time.html" class="time-indicator" id="timeSidebarIndicator" style="display:none">' +
        '<div class="ti-dot"></div><div class="ti-nome">—</div><div class="ti-trocar">Trocar</div>' +
      '</a>' +
      '<div class="sidebar-footer">' +
        '<div class="user-info">' +
          '<div class="user-avatar" id="avatarLetra">A</div>' +
          '<div><div class="user-name" id="nomeUsuario">—</div><div class="user-role" id="tipoUsuario">—</div></div>' +
        '</div>' +
        '<button class="btn-logout" onclick="logout()">Sair do Sistema</button>' +
      '</div>' +
    '</aside>';

  const placeholder = document.getElementById('sidebar-placeholder');
  if (!placeholder) return; // página sem sidebar (login, selecionar-time)
  placeholder.outerHTML = sidebarHtml;

  // ---------- POSICIONA O MENU NO ITEM ATIVO ----------
  const itemAtivo = document.querySelector('.nav-item.active');
  if (itemAtivo) {
    itemAtivo.scrollIntoView({ block: 'center' });
  }

  // ---------- AUTENTICAÇÃO ----------
  const user = JSON.parse(localStorage.getItem('usuario') || '{}');
  if (!user.id_usuario) {
    window.location.href = 'login.html';
    return;
  }
  if (user.tipo_usuario !== 1) {
    document.querySelectorAll('.nav-item[href="times.html"]').forEach(function (item) { item.remove(); });
  }

  // ---------- DADOS DO USUÁRIO ----------
  const tipos = { 1: 'Administrador', 2: 'Treinador', 3: 'Atleta' };
  const nomeEl = document.getElementById('nomeUsuario');
  const tipoEl = document.getElementById('tipoUsuario');
  const avatarEl = document.getElementById('avatarLetra');
  if (nomeEl) nomeEl.textContent = user.nome_usuario || '—';
  if (tipoEl) tipoEl.textContent = tipos[user.tipo_usuario] || '—';
  if (avatarEl) {
    if (user.foto_usuario) {
      avatarEl.classList.add('has-foto');
      avatarEl.innerHTML = '<img src="' + user.foto_usuario + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
    } else {
      avatarEl.textContent = (user.nome_usuario || 'U')[0].toUpperCase();
    }
  }

  // ---------- TIME SELECIONADO ----------
  const ts = JSON.parse(localStorage.getItem('timeSelecionado') || 'null');
  const tiEl = document.getElementById('timeSidebarIndicator');
  if (ts && tiEl) {
    tiEl.style.display = 'flex';
    const dot = tiEl.querySelector('.ti-dot');
    const nome = tiEl.querySelector('.ti-nome');
    if (dot) dot.style.background = ts.cor || '#00C97A';
    if (nome) nome.textContent = ts.nome || 'Time';

    const icon = document.getElementById('sidebarLogoIcon');
    const nomeTimeEl = document.getElementById('sidebarNomeTime');
    if (nomeTimeEl) nomeTimeEl.textContent = ts.nome || 'LAIVY';
    if (icon) {
      if (ts.logo) {
        icon.style.background = 'none';
        icon.style.padding = '0';
        icon.innerHTML = '<img src="' + ts.logo + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">';
      } else {
        const ini = (ts.nome || 'L').split(' ').slice(0, 2).map(function (x) { return x[0]; }).join('').toUpperCase();
        icon.textContent = ini;
        if (ts.cor) icon.style.background = 'linear-gradient(135deg,' + ts.cor + ',' + ts.cor + 'AA)';
      }
    }
  }

  // ---------- LOGOUT ----------
  // O backend agora usa cookie HttpOnly para o JWT — é preciso avisar o
  // servidor (/usuarios/logout) para invalidar a sessão corretamente,
  // não basta só limpar o localStorage como antes.
  window.logout = function () {
    const modal = document.getElementById('logoutModal');
    if (modal) modal.classList.add('show');
  };
  window.fecharLogout = function () {
    const modal = document.getElementById('logoutModal');
    if (modal) modal.classList.remove('show');
  };
  window.confirmarLogout = async function () {
    try { await fetch('/usuarios/logout', { method: 'POST', credentials: 'include' }); } catch (e) {}
    localStorage.clear();
    window.location.href = 'login.html';
  };

})();
