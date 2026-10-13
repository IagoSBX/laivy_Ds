import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import { authFetch, getJson } from '../lib/api.js';
import { timeSelecionado, usuarioLogado } from '../lib/sessao.js';
import useTitulo from '../lib/useTitulo.js';
import '../styles/pages/dashboard.css';

const TIPO = {
  1: { label: 'Treino', emoji: '🏋️', cor: '#00C97A', bg: 'rgba(0,201,122,0.15)' },
  2: { label: 'Jogo', emoji: '🏀', cor: '#FFB020', bg: 'rgba(255,176,32,0.15)' },
};
const MSG_PERFIL = { 1: 'Você tem acesso completo ao sistema.', 2: 'Gerencie atletas e atividades.', 3: 'Acompanhe seu desempenho e agenda.' };

// Contadores mostram apenas o que ainda vai acontecer/está válido — não conta
// atividades já finalizadas/canceladas nem exames com validade vencida.
// Recorrentes contam enquanto a recorrência não tiver terminado, mesmo com data-âncora no passado.
function aindaVaiAcontecer(a) {
  if (a.status_atividade !== 1) return false;
  const agora = new Date();
  if (a.recorrente) return !a.fim_recorrencia || new Date(a.fim_recorrencia + 'T23:59:59') >= agora;
  return !!a.data_atividade && new Date(a.data_atividade) >= agora;
}
const exameValido = (e) => !e.data_fim_exame || new Date(e.data_fim_exame + ' ') >= new Date(new Date().toDateString());

const ESTILO_STATUS = {
  verificando: { fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 8, background: 'rgba(255,176,32,0.15)', color: '#FFB020' },
  ok: { fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 8, background: 'rgba(0,201,122,0.15)', color: '#00C97A' },
  erro: { fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 8, background: 'rgba(255,80,80,0.12)', color: '#FF6B6B' },
};

const Icone = ({ children, size = 20, sw = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);

function StatCard({ cor, href, valor, label, children }) {
  const navigate = useNavigate();
  return (
    <div className={'stat-card ' + cor} onClick={() => navigate(href)}>
      <div className="stat-top">
        <div className="stat-icon-wrap"><Icone>{children}</Icone></div>
        <Link to={href} className="stat-link" onClick={(e) => e.stopPropagation()}>Ver →</Link>
      </div>
      <div className="stat-num">{valor === undefined ? <div className="stat-loading"></div> : valor}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function ProximaAtividade({ a }) {
  const t = TIPO[a.tipo_atividade] || TIPO[1];
  const d = new Date(a.data_atividade);
  const dia = d.getDate().toString().padStart(2, '0');
  const mes = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const hoje = new Date().toDateString() === d.toDateString();
  return (
    <Link className="ativ-item ativ-link" to={'/atividades.html?ver=' + a.id_atividade} title="Ver detalhes da atividade">
      <div className="ativ-data-box" style={hoje ? { background: 'rgba(0,201,122,0.15)', border: '1px solid rgba(0,201,122,0.3)' } : undefined}>
        <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 22, lineHeight: 1, color: hoje ? 'var(--verde)' : 'var(--branco)' }}>{dia}</div>
        <div style={{ fontSize: 9, color: 'var(--cinza)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>{mes}</div>
      </div>
      <div className="ativ-info">
        <div className="ativ-nome">
          {a.nome_atividade}
          {hoje && <> <span style={{ fontSize: 10, background: 'rgba(0,201,122,0.2)', color: '#00C97A', padding: '1px 6px', borderRadius: 6, fontWeight: 700 }}>HOJE</span></>}
        </div>
        <div className="ativ-sub"> {hora}{a.lugar_atividade ? ' ' + a.lugar_atividade : ''}</div>
      </div>
      <span className="ativ-tipo" style={{ background: t.bg, color: t.cor }}>{t.emoji} {t.label}</span>
    </Link>
  );
}

export default function Dashboard() {
  useTitulo('Dashboard — LAIVY');
  const user = usuarioLogado();
  const isAtleta = user.tipo_usuario === 3;
  const isAdministrador = user.tipo_usuario === 1;
  const ts = timeSelecionado();
  const urlTime = (base) => (ts ? base + '?idTime=' + ts.id : base);

  const [agora, setAgora] = useState(new Date());
  const [stats, setStats] = useState({});
  const [proximas, setProximas] = useState(null); // null = carregando, 'erro'
  const [statusApi, setStatusApi] = useState('verificando');

  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!user.id_usuario) return;
    function loadStat(chave, endpoint, filtro) {
      getJson(urlTime('/' + endpoint))
        .then((d) => setStats((s) => ({ ...s, [chave]: Array.isArray(d) ? (filtro ? d.filter(filtro) : d).length : '—' })))
        .catch(() => setStats((s) => ({ ...s, [chave]: '—' })));
    }
    loadStat('usuarios', 'usuarios');
    loadStat('exames', 'exames', exameValido);
    loadStat('atividades', 'atividades', aindaVaiAcontecer);
    loadStat('desempenhos', 'desempenhos');

    getJson(urlTime('/atividades'))
      .then((data) => {
        const now = new Date();
        setProximas(data
          .filter((a) => a.data_atividade && new Date(a.data_atividade) >= now && a.status_atividade === 1)
          .sort((a, b) => new Date(a.data_atividade) - new Date(b.data_atividade))
          .slice(0, 5));
      })
      .catch(() => setProximas('erro'));

    if (isAdministrador) authFetch('/usuarios').then(() => setStatusApi('ok')).catch(() => setStatusApi('erro'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="pagina pg-dashboard">
      <Sidebar />

      <main className="main">
        {/* TOP BAR */}
        <div className="topbar">
          <div className="topbar-left">
            <h1>Dashboard</h1>
            <p>Visão geral do seu time</p>
          </div>
          <div className="topbar-right">
            <div className="hora-pill"> <span>{agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span></div>
          </div>
        </div>

        {/* BOAS VINDAS */}
        <div className="bv-card">
          <div className="bv-texto">
            <h2>Olá, <span>{user.nome_usuario?.split(' ')[0] || '—'}</span>! </h2>
            <p>{MSG_PERFIL[user.tipo_usuario] || 'Bem-vindo ao sistema.'}</p>
          </div>
          <div className="bv-data">
            <div className="dia">{agora.getDate()}</div>
            <div className="mes">{agora.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</div>
          </div>
        </div>

        {/* STATS */}
        <div className="stats-grid">
          <StatCard cor="verde" href="/usuarios.html" valor={stats.usuarios} label="Usuários">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </StatCard>
          <StatCard cor="laranja" href="/exames.html" valor={stats.exames} label="Exames">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
          </StatCard>
          <StatCard cor="azul" href="/atividades.html" valor={stats.atividades} label="Atividades">
            <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          </StatCard>
          <StatCard cor="roxo" href="/desempenho.html" valor={stats.desempenhos} label="Avaliações">
            <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
          </StatCard>
        </div>

        {/* GRID PRINCIPAL */}
        <div className="grid-main">
          {/* PRÓXIMAS ATIVIDADES */}
          <div className="card-dark">
            <div className="card-header">
              <div className="card-titulo" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icone size={16} sw={2.5}><polyline points="9 18 15 12 9 6" /></Icone> Próximas Atividades</div>
              <Link to="/atividades.html" className="card-link">Ver todas →</Link>
            </div>
            <div>
              {proximas === null && <div className="empty-mini">Carregando...</div>}
              {proximas === 'erro' && <div className="empty-mini">Backend offline</div>}
              {Array.isArray(proximas) && !proximas.length && <div className="empty-mini"> Nenhuma atividade agendada</div>}
              {Array.isArray(proximas) && proximas.map((a) => <ProximaAtividade key={a.id_atividade} a={a} />)}
            </div>
          </div>

          {/* COLUNA DIREITA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* ACESSO RÁPIDO (atleta não cria nada) */}
            {!isAtleta && (
              <div className="card-dark">
                <div className="card-header">
                  <div className="card-titulo" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icone size={16} sw={2.5}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></Icone> Acesso Rápido</div>
                </div>
                <div className="quick-grid">
                  <Link to="/usuarios.html?novo=1" className="quick-btn">
                    <span className="quick-icon"><Icone><circle cx="12" cy="8" r="5" /><path d="M3 21v-2a7 7 0 0 1 14 0v2" /></Icone></span>
                    <div><div className="quick-nome">Novo Atleta</div><div className="quick-desc">Cadastrar usuário</div></div>
                  </Link>
                  <Link to="/exames.html?novo=1" className="quick-btn">
                    <span className="quick-icon"><Icone><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></Icone></span>
                    <div><div className="quick-nome">Novo Exame</div><div className="quick-desc">Registrar avaliação</div></div>
                  </Link>
                  <Link to="/atividades.html?novo=1" className="quick-btn">
                    <span className="quick-icon"><Icone><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></Icone></span>
                    <div><div className="quick-nome">Atividade</div><div className="quick-desc">Criar evento</div></div>
                  </Link>
                  <Link to="/desempenho.html?novo=1" className="quick-btn">
                    <span className="quick-icon"><Icone><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></Icone></span>
                    <div><div className="quick-nome">Desempenho</div><div className="quick-desc">Avaliar atleta</div></div>
                  </Link>
                </div>
              </div>
            )}

            {/* STATUS DO SISTEMA (só administrador) */}
            {isAdministrador && (
              <div className="card-dark">
                <div className="card-header">
                  <div className="card-titulo" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icone size={16} sw={2.5}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></Icone> Status do Sistema</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: 13, color: 'var(--cinza)' }}>Backend API</span>
                    <span style={ESTILO_STATUS[statusApi]}>{{ verificando: 'Verificando...', ok: ' Online', erro: ' Offline' }[statusApi]}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: 13, color: 'var(--cinza)' }}>Banco de Dados</span>
                    <span style={ESTILO_STATUS[statusApi]}>{{ verificando: 'Verificando...', ok: ' Conectado', erro: ' Desconectado' }[statusApi]}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                    <span style={{ fontSize: 13, color: 'var(--cinza)' }}>Usuário</span>
                    <span style={ESTILO_STATUS.ok}>Autenticado</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
