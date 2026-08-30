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
    return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ICONS[name] + '</svg>';
  }

  // ---------- ESTRUTURA ÚNICA DO MENU (editar só aqui) ----------
  const NAV = [
    { section: 'Principal', items: [
      { href: 'dashboard.html', label: 'Dashboard', icon: 'dashboard' }
    ]},
    { section: 'Gestão', items: [
      { href: 'usuarios.html', label: 'Usuários', icon: 'usuarios' },
      { href: 'escalacao.html', label: 'Escalação', icon: 'escalacao' }
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
        '<span>' + item.label + '</span>' +
        '<span class="nav-alert" title="Requer atenção">!</span>' +
        '</a>';
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
    '<div id="perfilModal">' +
      '<div class="perfil-card">' +
        '<button class="perfil-fechar" onclick="fecharPerfil()">×</button>' +
        '<div class="perfil-avatar-wrap"><div class="perfil-avatar" id="perfilAvatar">A</div></div>' +
        '<div class="perfil-nome" id="perfilNome">—</div>' +
        '<div class="perfil-role" id="perfilRole">—</div>' +
        '<div class="perfil-campos">' +
          '<div class="perfil-campo"><span class="perfil-label">Login</span><span class="perfil-valor" id="perfilLogin">—</span></div>' +
          '<div class="perfil-campo"><span class="perfil-label">Email</span><span class="perfil-valor" id="perfilEmail">—</span></div>' +
          '<div class="perfil-campo"><span class="perfil-label">Celular</span><span class="perfil-valor" id="perfilCel">—</span></div>' +
          '<div class="perfil-campo"><span class="perfil-label">CPF</span><span class="perfil-valor" id="perfilCpf">—</span></div>' +
          '<div class="perfil-campo"><span class="perfil-label">Nascimento</span><span class="perfil-valor" id="perfilNasc">—</span></div>' +
          '<div class="perfil-campo" id="perfilTimeWrap" style="display:none"><span class="perfil-label">Time</span><span class="perfil-valor" id="perfilTime">—</span></div>' +
          '<div class="perfil-campo"><span class="perfil-label">CEP</span><span class="perfil-valor" id="perfilCep">—</span></div>' +
          '<div class="perfil-campo"><span class="perfil-label">Endereço</span><span class="perfil-valor" id="perfilEndereco">—</span></div>' +
          '<div class="perfil-campo"><span class="perfil-label">Bairro</span><span class="perfil-valor" id="perfilBairro">—</span></div>' +
          '<div class="perfil-campo"><span class="perfil-label">Cidade/UF</span><span class="perfil-valor" id="perfilCidade">—</span></div>' +
        '</div>' +
        '<div class="perfil-graficos" id="perfilGraficos" style="display:none">' +
          '<div class="perfil-stats-mini">' +
            '<div class="pgm-stat"><div class="pgm-num" id="pgAtv">—</div><div class="pgm-label">Atividades</div></div>' +
            '<div class="pgm-stat"><div class="pgm-num" id="pgExames">—</div><div class="pgm-label">Exames</div></div>' +
            '<div class="pgm-stat"><div class="pgm-num" id="pgDesemp">—</div><div class="pgm-label">Desempenhos</div></div>' +
          '</div>' +
          '<div class="perfil-grafico-titulo">Pontuação nos Jogos</div>' +
          '<div class="perfil-chart-wrap"><canvas id="perfilChartPontuacao"></canvas></div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<aside class="sidebar">' +
      '<div class="sidebar-logo" id="sidebarLogo">' +
        '<div class="logo-icon" id="sidebarLogoIcon">L</div>' +
        '<div class="logo-texts"><div class="t1" id="sidebarNomeTime">LAIVY</div><div class="t2">Sistema Esportivo</div></div>' +
      '</div>' +
      '<nav>' + navHtml + '</nav>' +
      '<a href="painel-admin.html" class="painel-admin-link" id="painelAdminLink">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 14.4l-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z"/></svg>' +
        '<span>Painel Admin</span>' +
      '</a>' +
      '<a href="selecionar-time.html" class="time-indicator" id="timeSidebarIndicator" style="display:none">' +
        '<div class="ti-dot"></div><div class="ti-nome">—</div><div class="ti-trocar">Trocar</div>' +
      '</a>' +
      '<div class="sidebar-footer">' +
        '<div class="user-info" onclick="abrirPerfil()" title="Ver perfil">' +
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
  // Painel Admin não é um item de menu dentro das telas de um time — é o hub
  // que abre ANTES de entrar em um time. Este botão é o único caminho de volta.
  if (user.tipo_usuario === 1 && paginaAtual !== 'painel-admin.html') {
    const painelLink = document.getElementById('painelAdminLink');
    if (painelLink) painelLink.style.display = 'flex';
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
  if (ts) {
    // Admin já tem o botão "Painel Admin" para navegar entre times — o pill
    // de "Trocar" de time é redundante e some só para ele.
    if (tiEl && user.tipo_usuario !== 1) {
      tiEl.style.display = 'flex';
      const dot = tiEl.querySelector('.ti-dot');
      const nome = tiEl.querySelector('.ti-nome');
      if (dot) dot.style.background = ts.cor || '#00C97A';
      if (nome) nome.textContent = ts.nome || 'Time';
    }

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

  // ---------- PERFIL (clique na foto/nome no rodapé da sidebar) ----------
  function escAttr(s) {
    return String(s == null ? '' : s).replace(/"/g, '&quot;');
  }
  function formatarData(iso) {
    if (!iso) return '—';
    const partes = String(iso).split('-');
    if (partes.length !== 3) return iso;
    return partes[2] + '/' + partes[1] + '/' + partes[0];
  }
  // ---------- GRÁFICOS DO PERFIL (só para atleta — mesmos dados de perfil-atleta.html) ----------
  var _chartJsLoading = null;
  function garantirChartJs() {
    if (window.Chart) return Promise.resolve();
    if (_chartJsLoading) return _chartJsLoading;
    _chartJsLoading = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/chart.js';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return _chartJsLoading;
  }

  var perfilChartRef = null;
  function renderPerfilGrafico(desempenhos) {
    var comPts = (desempenhos || [])
      .filter(function (d) { return d.pontuacao != null && d.data_desempenho; })
      .sort(function (a, b) { return new Date(a.data_desempenho) - new Date(b.data_desempenho); })
      .slice(-12);
    var wrap = document.querySelector('#perfilGraficos .perfil-chart-wrap');
    if (!wrap) return;
    if (perfilChartRef) { perfilChartRef.destroy(); perfilChartRef = null; }
    if (!comPts.length) {
      wrap.innerHTML = '<div class="perfil-chart-empty">Sem pontuações registradas</div>';
      return;
    }
    wrap.innerHTML = '<canvas id="perfilChartPontuacao"></canvas>';
    var ctx = document.getElementById('perfilChartPontuacao').getContext('2d');
    perfilChartRef = new Chart(ctx, {
      type: 'line',
      data: {
        labels: comPts.map(function (d) { return formatarData(d.data_desempenho); }),
        datasets: [{
          label: 'Pontuação',
          data: comPts.map(function (d) { return d.pontuacao; }),
          borderColor: '#00C97A',
          backgroundColor: 'rgba(0,201,122,0.12)',
          pointBackgroundColor: '#00C97A',
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.35,
          fill: true,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: function (c) { return ' ' + c.raw + ' pts'; } } }
        },
        scales: {
          x: { ticks: { color: '#8899BB', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { ticks: { color: '#8899BB', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true }
        }
      }
    });
  }

  function carregarGraficosPerfil() {
    var el = document.getElementById('perfilGraficos');
    var card = document.querySelector('.perfil-card');
    if (!el) return;
    el.style.display = 'block';
    if (card) card.classList.add('com-graficos');
    Promise.all([
      fetch('/atividades/usuario/' + user.id_usuario, { credentials: 'include' }).then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
      fetch('/exames/usuario/' + user.id_usuario, { credentials: 'include' }).then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
      fetch('/desempenhos/usuario/' + user.id_usuario, { credentials: 'include' }).then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; })
    ]).then(function (results) {
      var atividades = results[0], exames = results[1], desempenhos = results[2];
      var elAtv = document.getElementById('pgAtv'); if (elAtv) elAtv.textContent = atividades.length;
      var elEx = document.getElementById('pgExames'); if (elEx) elEx.textContent = exames.length;
      var elDe = document.getElementById('pgDesemp'); if (elDe) elDe.textContent = desempenhos.length;
      garantirChartJs().then(function () { renderPerfilGrafico(desempenhos); }).catch(function () {});
    });
  }

  window.abrirPerfil = function () {
    const nomeEl     = document.getElementById('perfilNome');
    const roleEl     = document.getElementById('perfilRole');
    const loginEl    = document.getElementById('perfilLogin');
    const emailEl    = document.getElementById('perfilEmail');
    const celEl      = document.getElementById('perfilCel');
    const cpfEl      = document.getElementById('perfilCpf');
    const nascEl     = document.getElementById('perfilNasc');
    const cepEl      = document.getElementById('perfilCep');
    const enderecoEl = document.getElementById('perfilEndereco');
    const bairroEl   = document.getElementById('perfilBairro');
    const cidadeEl   = document.getElementById('perfilCidade');
    const timeWrapEl = document.getElementById('perfilTimeWrap');
    const timeEl     = document.getElementById('perfilTime');
    const avEl       = document.getElementById('perfilAvatar');

    if (nomeEl)     nomeEl.textContent     = user.nome_usuario || '—';
    if (roleEl)     roleEl.textContent     = tipos[user.tipo_usuario] || '—';
    if (loginEl)    loginEl.textContent    = user.login_usuario || '—';
    if (emailEl)    emailEl.textContent    = user.email_usuario || '—';
    if (celEl)      celEl.textContent      = user.cel_usuario || '—';
    if (cpfEl)      cpfEl.textContent      = user.cpf_usuario || '—';
    if (nascEl)     nascEl.textContent     = formatarData(user.data_nasc_usuario);
    if (cepEl)      cepEl.textContent      = user.cep_usuario || '—';
    if (enderecoEl) enderecoEl.textContent = user.endereco_usuario || '—';
    if (bairroEl)   bairroEl.textContent   = user.bairro_usuario || '—';
    if (cidadeEl)   cidadeEl.textContent   = (user.cidade_usuario || user.estado_usuario)
      ? [user.cidade_usuario, user.estado_usuario].filter(Boolean).join('/')
      : '—';
    if (timeWrapEl && timeEl) {
      if (user.time && user.time.nome_time) {
        timeEl.textContent = user.time.nome_time;
        timeWrapEl.style.display = 'flex';
      } else {
        timeWrapEl.style.display = 'none';
      }
    }
    if (avEl) {
      if (user.foto_usuario) {
        avEl.innerHTML = '<img src="' + escAttr(user.foto_usuario) + '" alt="">';
      } else {
        avEl.textContent = (user.nome_usuario || 'U')[0].toUpperCase();
      }
    }

    const graficosEl = document.getElementById('perfilGraficos');
    const perfilCardEl = document.querySelector('.perfil-card');
    if (user.tipo_usuario === 3) {
      carregarGraficosPerfil();
    } else {
      if (graficosEl) graficosEl.style.display = 'none';
      if (perfilCardEl) perfilCardEl.classList.remove('com-graficos');
    }

    const modal = document.getElementById('perfilModal');
    if (modal) modal.classList.add('show');
  };
  window.fecharPerfil = function () {
    const modal = document.getElementById('perfilModal');
    if (modal) modal.classList.remove('show');
  };

  // ---------- AVISOS (exames expirando / atividade próxima) ----------
  // Marca um "!" ao lado do item de menu correspondente. Falha silenciosa
  // se o backend estiver fora do ar — não deve travar a sidebar.
  function marcarAviso(href, mostrar) {
    const el = document.querySelector('.nav-item[href="' + href + '"] .nav-alert');
    if (el) el.style.display = mostrar ? 'flex' : 'none';
  }

  function verificarAvisos() {
    const idTimeQS = ts ? ('?idTime=' + ts.id) : '';

    // Exames com validade terminando nos próximos 7 dias (ou já vencida).
    fetch('/exames' + idTimeQS, { credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (lista) {
        const limite = new Date();
        limite.setHours(23, 59, 59, 999);
        limite.setDate(limite.getDate() + 7);
        const temAviso = (lista || []).some(function (e) {
          if (!e.data_fim_exame) return false;
          return new Date(e.data_fim_exame + 'T00:00:00') <= limite;
        });
        marcarAviso('exames.html', temAviso);
      })
      .catch(function () {});

    // Atividades ativas acontecendo nas próximas 24h.
    fetch('/atividades' + idTimeQS, { credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (lista) {
        const agora = new Date();
        const limite = new Date(agora.getTime() + 24 * 60 * 60 * 1000);
        const temAviso = (lista || []).some(function (a) {
          if (a.status_atividade !== 1 || !a.data_atividade) return false;
          const dt = new Date(a.data_atividade);
          return dt >= agora && dt <= limite;
        });
        marcarAviso('atividades.html', temAviso);
      })
      .catch(function () {});
  }
  verificarAvisos();

})();
