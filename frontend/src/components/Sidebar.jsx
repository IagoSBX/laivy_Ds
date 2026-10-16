import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { TIPOS, formatarData, timeSelecionado, usuarioLogado } from '../lib/sessao.js';
import useGrafico from '../lib/useGrafico.js';

/* Menu lateral único de todas as telas. Qualquer alteração de navegação
   (nova tela, renomear item, trocar ícone) deve ser feita SÓ AQUI. */

const ICONS = {
  dashboard: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
  usuarios: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
  escalacao: <><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></>,
  exames: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
  desempenho: <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
  atividades: <><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>,
  calendario: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
  jogadas: <><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M5.6 5.6c2 2 4 3 6.4 3s4.4-1 6.4-3M5.6 18.4c2-2 4-3 6.4-3s4.4 1 6.4 3"/></>,
  assistente: <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>,
};

const Svg = ({ children, size = 20, sw = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);

const NAV = [
  { section: 'Principal', items: [{ href: '/dashboard.html', label: 'Dashboard', icon: 'dashboard' }] },
  { section: 'Gestão', items: [
    { href: '/usuarios.html', label: 'Usuários', icon: 'usuarios' },
    { href: '/escalacao.html', label: 'Escalação', icon: 'escalacao' },
  ] },
  { section: 'Atividades', items: [
    { href: '/exames.html', label: 'Exames', icon: 'exames' },
    { href: '/desempenho.html', label: 'Desempenho', icon: 'desempenho' },
    { href: '/atividades.html', label: 'Atividades', icon: 'atividades' },
    { href: '/calendario.html', label: 'Calendário', icon: 'calendario' },
    { href: '/biblioteca-jogadas.html', label: 'Jogadas', icon: 'jogadas' },
  ] },
  { section: 'IA', items: [{ href: '/assistente.html', label: 'Assistente', icon: 'assistente' }] },
];

// ---------- RECOLHER / EXPANDIR ----------
// Sem escolha salva, recolhe sozinho em janelas estreitas (tela dividida).
// No celular o menu não recolhe: vira uma gaveta (ver styles/responsivo.css).
const CHAVE_MENU = 'sidebarRecolhida';
const CELULAR = '(max-width: 768px)';
const ehCelular = () => window.matchMedia(CELULAR).matches;
function lerPreferencia() { try { return localStorage.getItem(CHAVE_MENU); } catch { return null; } }
function menuRecolhido() {
  if (ehCelular()) return false;
  const pref = lerPreferencia();
  return pref === null ? window.innerWidth < 1000 : pref === '1';
}

const getJson = (url) => fetch(url, { credentials: 'include' }).then((r) => (r.ok ? r.json() : [])).catch(() => []);

function GraficoPerfil({ desempenhos }) {
  const comPts = desempenhos
    .filter((d) => d.pontuacao != null && d.data_desempenho)
    .sort((a, b) => new Date(a.data_desempenho) - new Date(b.data_desempenho))
    .slice(-12);
  const ref = useGrafico(() => (!comPts.length ? null : {
    type: 'line',
    data: {
      labels: comPts.map((d) => formatarData(d.data_desempenho)),
      datasets: [{
        label: 'Pontuação', data: comPts.map((d) => d.pontuacao),
        borderColor: '#00C97A', backgroundColor: 'rgba(0,201,122,0.12)', pointBackgroundColor: '#00C97A',
        pointRadius: 4, pointHoverRadius: 6, tension: 0.35, fill: true, borderWidth: 2,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ' ' + c.raw + ' pts' } } },
      scales: {
        x: { ticks: { color: '#8899BB', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { ticks: { color: '#8899BB', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true },
      },
    },
  }), [desempenhos]);
  return (
    <div className="perfil-chart-wrap">
      {comPts.length ? <canvas ref={ref} /> : <div className="perfil-chart-empty">Sem pontuações registradas</div>}
    </div>
  );
}

function Avatar({ user }) {
  return user.foto_usuario
    ? <img src={user.foto_usuario} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
    : (user.nome_usuario || 'U')[0].toUpperCase();
}

// ocultarGestao: o perfil do atleta esconde a seção Gestão quando quem vê é atleta.
export default function Sidebar({ ocultarGestao = false }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const user = usuarioLogado();
  const ts = timeSelecionado();
  const [logoutAberto, setLogoutAberto] = useState(false);
  const [perfilAberto, setPerfilAberto] = useState(false);
  const [statsPerfil, setStatsPerfil] = useState(null);
  const [avisos, setAvisos] = useState({});
  const navRef = useRef(null);

  // aplica a largura do menu no <html> (o tema usa html.sb-recolhida em todas as telas)
  const [recolhida, setRecolhida] = useState(menuRecolhido);
  useLayoutEffect(() => {
    document.documentElement.classList.toggle('sb-recolhida', recolhida);
  }, [recolhida]);
  useEffect(() => {
    const aoRedimensionar = () => setRecolhida(menuRecolhido());
    window.addEventListener('resize', aoRedimensionar);
    return () => window.removeEventListener('resize', aoRedimensionar);
  }, []);
  function alternarMenu() {
    try { localStorage.setItem(CHAVE_MENU, recolhida ? '0' : '1'); } catch { /* sem storage */ }
    setRecolhida(!recolhida);
  }

  // celular: gaveta aberta/fechada (classe no <html>, como o sb-recolhida);
  // fecha sozinha ao trocar de tela
  const [gavetaAberta, setGavetaAberta] = useState(false);
  useLayoutEffect(() => {
    document.documentElement.classList.toggle('sb-gaveta-aberta', gavetaAberta);
  }, [gavetaAberta]);
  useEffect(() => { setGavetaAberta(false); }, [pathname]);
  useEffect(() => () => document.documentElement.classList.remove('sb-gaveta-aberta'), []);

  // posiciona o menu no item ativo
  useEffect(() => {
    navRef.current?.querySelector('.nav-item.active')?.scrollIntoView({ block: 'center' });
  }, [pathname]);

  // ---------- AVISOS (exames expirando / atividade próxima) ----------
  // Marca um "!" ao lado do item de menu. Falha silenciosa se o backend cair.
  useEffect(() => {
    if (!user.id_usuario) return;
    const qs = ts ? '?idTime=' + ts.id : '';
    getJson('/exames' + qs).then((lista) => {
      const limite = new Date();
      limite.setHours(23, 59, 59, 999);
      limite.setDate(limite.getDate() + 7);
      const tem = (lista || []).some((e) => e.data_fim_exame && new Date(e.data_fim_exame + 'T00:00:00') <= limite);
      setAvisos((a) => ({ ...a, '/exames.html': tem }));
    });
    getJson('/atividades' + qs).then((lista) => {
      const agora = new Date();
      const limite = new Date(agora.getTime() + 24 * 60 * 60 * 1000);
      const tem = (lista || []).some((a) => {
        if (a.status_atividade !== 1 || !a.data_atividade) return false;
        const dt = new Date(a.data_atividade);
        return dt >= agora && dt <= limite;
      });
      setAvisos((a) => ({ ...a, '/atividades.html': tem }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user.id_usuario) return <Navigate to="/login.html" replace />;

  function abrirPerfil() {
    setPerfilAberto(true);
    if (user.tipo_usuario === 3) {
      Promise.all([
        getJson('/atividades/usuario/' + user.id_usuario),
        getJson('/exames/usuario/' + user.id_usuario),
        getJson('/desempenhos/usuario/' + user.id_usuario),
      ]).then(([atividades, exames, desempenhos]) => setStatsPerfil({ atividades, exames, desempenhos }));
    }
  }

  async function confirmarLogout() {
    // O JWT está em cookie HttpOnly: o servidor precisa invalidar a sessão.
    try { await fetch('/usuarios/logout', { method: 'POST', credentials: 'include' }); } catch { /* offline */ }
    localStorage.clear();
    navigate('/login.html');
  }

  const ehAtleta = user.tipo_usuario === 3;
  const cidadeUf = (user.cidade_usuario || user.estado_usuario)
    ? [user.cidade_usuario, user.estado_usuario].filter(Boolean).join('/') : '—';
  const campo = (label, valor) => (
    <div className="perfil-campo"><span className="perfil-label">{label}</span><span className="perfil-valor">{valor || '—'}</span></div>
  );

  return (
    <>
      <div id="logoutModal" className={logoutAberto ? 'show' : ''}>
        <div className="logout-card">
          <div className="logout-icon">👋</div>
          <div className="logout-titulo">Sair do Sistema?</div>
          <div className="logout-msg">Sua sessão será encerrada.<br />Deseja realmente sair?</div>
          <div className="logout-btns">
            <button className="btn-logout-cancel" onClick={() => setLogoutAberto(false)}>Cancelar</button>
            <button className="btn-logout-confirm" onClick={confirmarLogout}>Sair</button>
          </div>
        </div>
      </div>

      <div id="perfilModal" className={perfilAberto ? 'show' : ''}>
        <div className={'perfil-card' + (ehAtleta ? ' com-graficos' : '')}>
          <button className="perfil-fechar" onClick={() => setPerfilAberto(false)}>×</button>
          <div className="perfil-avatar-wrap"><div className="perfil-avatar">
            {user.foto_usuario ? <img src={user.foto_usuario} alt="" /> : (user.nome_usuario || 'U')[0].toUpperCase()}
          </div></div>
          <div className="perfil-nome">{user.nome_usuario || '—'}</div>
          <div className="perfil-role">{TIPOS[user.tipo_usuario] || '—'}</div>
          <div className="perfil-campos">
            {campo('Login', user.login_usuario)}
            {campo('Email', user.email_usuario)}
            {campo('Celular', user.cel_usuario)}
            {campo('CPF', user.cpf_usuario)}
            {campo('Nascimento', formatarData(user.data_nasc_usuario))}
            {user.time?.nome_time && campo('Time', user.time.nome_time)}
            {campo('CEP', user.cep_usuario)}
            {campo('Endereço', user.endereco_usuario)}
            {campo('Bairro', user.bairro_usuario)}
            {campo('Cidade/UF', cidadeUf)}
          </div>
          {ehAtleta && perfilAberto && (
            <div className="perfil-graficos" style={{ display: 'block' }}>
              <div className="perfil-stats-mini">
                <div className="pgm-stat"><div className="pgm-num">{statsPerfil ? statsPerfil.atividades.length : '—'}</div><div className="pgm-label">Atividades</div></div>
                <div className="pgm-stat"><div className="pgm-num">{statsPerfil ? statsPerfil.exames.length : '—'}</div><div className="pgm-label">Exames</div></div>
                <div className="pgm-stat"><div className="pgm-num">{statsPerfil ? statsPerfil.desempenhos.length : '—'}</div><div className="pgm-label">Desempenhos</div></div>
              </div>
              <div className="perfil-grafico-titulo">Pontuação nos Jogos</div>
              {statsPerfil ? <GraficoPerfil desempenhos={statsPerfil.desempenhos} /> : <div className="perfil-chart-wrap" />}
            </div>
          )}
        </div>
      </div>

      {/* só aparecem no celular (styles/responsivo.css) */}
      <button type="button" className="btn-menu-movel" onClick={() => setGavetaAberta(true)} aria-label="Abrir menu" aria-expanded={gavetaAberta}>
        <Svg size={22}><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></Svg>
      </button>
      <div className="sb-fundo" onClick={() => setGavetaAberta(false)} aria-hidden="true" />

      <aside className="sidebar">
        <button type="button" className="btn-fechar-gaveta" onClick={() => setGavetaAberta(false)} aria-label="Fechar menu">
          <Svg size={20}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></Svg>
        </button>
        <button type="button" className="btn-recolher" onClick={alternarMenu} aria-expanded={!recolhida}
          aria-label={recolhida ? 'Expandir menu' : 'Recolher menu'} title={recolhida ? 'Expandir menu' : 'Recolher menu'}>
          <Svg size={14} sw={2.5}><polyline points="15 18 9 12 15 6" /></Svg>
        </button>
        <div className="sidebar-logo">
          {ts?.logo ? (
            <div className="logo-icon" style={{ background: 'none', padding: 0 }}>
              <img src={ts.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} />
            </div>
          ) : (
            <div className="logo-icon"><img className="laivy-marca" src="/img/logo/icone/laivy-icone-claro.svg" alt="LAIVY" style={{ width: '100%', height: '100%' }} /></div>
          )}
          <div className="logo-texts"><div className="t1">{ts?.nome || 'LAIVY'}</div><div className="t2">For those who live the game</div></div>
        </div>
        <nav ref={navRef}>
          {NAV.filter((g) => !(ocultarGestao && g.section === 'Gestão')).map((grupo) => (
            <Fragment key={grupo.section}>
              <div className="nav-section">{grupo.section}</div>
              {grupo.items.map((item) => (
                <Link key={item.href} to={item.href} className={'nav-item' + (item.href === pathname ? ' active' : '')} title={item.label} onClick={() => setGavetaAberta(false)}>
                  <span className="nav-icon" style={{ display: 'inline-flex' }}><Svg>{ICONS[item.icon]}</Svg></span>
                  <span>{item.label}</span>
                  <span className="nav-alert" title="Requer atenção" style={avisos[item.href] ? { display: 'flex' } : undefined}>!</span>
                </Link>
              ))}
            </Fragment>
          ))}
        </nav>
        {/* Painel Admin é o hub que abre ANTES de entrar num time: este botão é o único caminho de volta. */}
        {user.tipo_usuario === 1 && pathname !== '/painel-admin.html' && (
          <Link to="/painel-admin.html" className="painel-admin-link" title="Painel Admin" style={{ display: 'flex' }}>
            <Svg size={16}><path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 14.4l-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z" /></Svg>
            <span>Painel Admin</span>
          </Link>
        )}
        {/* Admin já navega entre times pelo Painel Admin — o "Trocar" é só para os demais. */}
        {ts && user.tipo_usuario !== 1 && (
          <Link to="/selecionar-time.html" className="time-indicator" style={{ display: 'flex' }}>
            <div className="ti-dot" style={{ background: ts.cor || '#00C97A' }} /><div className="ti-nome">{ts.nome || 'Time'}</div><div className="ti-trocar">Trocar</div>
          </Link>
        )}
        {/* Treinador autocadastrado: dias de teste ou atalho para o plano */}
        {user.situacao && (
          <Link to="/planos.html" className={'plano-indicator' + (user.situacao === 'TESTE' ? ' teste' : '')} title="Planos">
            {user.situacao === 'TESTE'
              ? <>Teste · {Math.max(0, Math.ceil((new Date(user.teste_fim) - new Date()) / 86400000))} dia(s) · <strong>Assinar</strong></>
              : <>Meu plano</>}
          </Link>
        )}
        <div className="sidebar-footer">
          <div className="user-info" onClick={abrirPerfil} title="Ver perfil">
            <div className={'user-avatar' + (user.foto_usuario ? ' has-foto' : '')}><Avatar user={user} /></div>
            <div><div className="user-name">{user.nome_usuario || '—'}</div><div className="user-role">{TIPOS[user.tipo_usuario] || '—'}</div></div>
          </div>
          <button className="btn-logout" onClick={() => setLogoutAberto(true)} title="Sair">
            <Svg size={16}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></Svg>
            <span>Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}
