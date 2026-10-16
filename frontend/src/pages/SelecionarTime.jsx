import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { authFetch, getJson, iniciais, lerImagem, sair } from '../lib/api.js';
import { TIPOS, usuarioLogado } from '../lib/sessao.js';
import useTitulo from '../lib/useTitulo.js';
import useToasts from '../lib/useToasts.js';
import '../styles/pages/selecionar-time.css';

// Contadores mostram apenas atividades que ainda vão acontecer (não conta canceladas/finalizadas).
// Recorrentes contam enquanto a recorrência não tiver terminado, mesmo com data-âncora no passado.
function aindaVaiAcontecer(a) {
  if (a.status_atividade !== 1) return false;
  const agora = new Date();
  if (a.recorrente) return !a.fim_recorrencia || new Date(a.fim_recorrencia + 'T23:59:59') >= agora;
  return !!a.data_atividade && new Date(a.data_atividade) >= agora;
}

const doTime = (x, t) => x.time && (x.time.id_time === t.id_time || x.time === t.id_time);

const FORM_VAZIO = { nome_time: '', categoria_time: 'Sub-17', ativo_time: '1', cor_time: '#00C97A' };

function TimeCard({ t, usuarios, atividades, onSelecionar }) {
  const cor = t.cor_time || '#00C97A';
  const membros = usuarios.filter((u) => doTime(u, t));
  const atletas = membros.filter((u) => u.tipo_usuario === 3).length;
  const ativ = atividades.filter((a) => doTime(a, t)).filter(aindaVaiAcontecer);
  const treinos = ativ.filter((a) => a.tipo_atividade === 1).length;
  const jogos = ativ.filter((a) => a.tipo_atividade === 2).length;
  const treinador = t.treinador ? t.treinador.nome_usuario : (membros.find((u) => u.tipo_usuario === 2)?.nome_usuario || '—');

  return (
    <div className="time-card" onClick={() => onSelecionar(t)}>
      <div className="tc-banner" style={{ background: cor }}></div>
      <div className="tc-body">
        <div className="tc-top">
          <div className="tc-logo" style={{ background: cor + '22', border: '2px solid ' + cor + '44' }}>
            {t.logo_time
              ? <img src={t.logo_time} alt="" />
              : <span style={{ color: '#fff', fontFamily: "'Bebas Neue',cursive", fontSize: 20 }}>{iniciais(t.nome_time)}</span>}
          </div>
          <div>
            <div className="tc-nome">{t.nome_time}</div>
            <div className="tc-sub">{t.modalidade_time || '—'} &bull; {t.categoria_time || '—'}</div>
          </div>
        </div>
        <div className="tc-stats">
          <div className="tc-stat"><div className="tc-stat-num" style={{ color: cor }}>{atletas}</div><div className="tc-stat-label">Atletas</div></div>
          <div className="tc-stat"><div className="tc-stat-num" style={{ color: '#4EC9FF' }}>{treinos}</div><div className="tc-stat-label">Treinos</div></div>
          <div className="tc-stat"><div className="tc-stat-num" style={{ color: '#FFB020' }}>{jogos}</div><div className="tc-stat-label">Jogos</div></div>
        </div>
        <div className="tc-treinador">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="5" /><path d="M3 21v-2a7 7 0 0 1 14 0v2" /></svg>
          {' '}Treinador: <strong>{treinador}</strong>
        </div>
      </div>
      <div className="tc-arrow"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A1628" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg></div>
    </div>
  );
}

function Carregando({ texto }) {
  return <div className="loading-state"><div className="loading-spin"></div><div>{texto}</div></div>;
}

export default function SelecionarTime() {
  useTitulo('Selecionar Time — LAIVY');
  const navigate = useNavigate();
  const user = usuarioLogado();
  const isAdmin = user.tipo_usuario === 1;
  const isTreina = user.tipo_usuario === 2;
  const isAtleta = user.tipo_usuario === 3 || user.tipo_usuario === 4; // atleta e preparador: só o próprio time
  const emTeste = user.situacao === 'TESTE';

  const [estado, setEstado] = useState({ fase: 'carregando' }); // carregando | erro | vazio | ok | entrando
  const [logoutAberto, setLogoutAberto] = useState(false);
  const [toasts, toast] = useToasts();

  // ---------- FORM NOVO TIME (admin) ----------
  const panelRef = useRef(null);
  const inputLogoRef = useRef(null);
  const corRef = useRef(null);
  const [formAberto, setFormAberto] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [logo, setLogo] = useState(null);
  const [treinadores, setTreinadores] = useState(null); // null = carregando, 'erro'
  const [treinadorId, setTreinadorId] = useState(null);
  const [hints, setHints] = useState({});
  const [salvando, setSalvando] = useState(false);

  async function carregarTimes() {
    try {
      const [times, usuarios, atividades] = await Promise.all([getJson('/times'), getJson('/usuarios'), getJson('/atividades')]);
      let lista = times.filter((t) => t.ativo_time === 1 || t.ativo_time === '1');

      if (isAtleta) {
        // Atleta só vê e seleciona o próprio time
        lista = lista.filter((t) => usuarios.find((u) => u.id_usuario === user.id_usuario && u.time && u.time.id_time === t.id_time));
      } else if (isTreina) {
        // Treinador vê o time ao qual está vinculado (user.time) OU onde é o responsável (t.treinador)
        lista = lista.filter((t) => {
          const eResponsavel = t.treinador && t.treinador.id_usuario === user.id_usuario;
          const eMembro = user.time && String(user.time.id_time) === String(t.id_time);
          // período de teste sem time próprio: o time de demonstração (só leitura)
          const demo = emTeste && !user.time && t.demo_time === 1;
          return eResponsavel || eMembro || demo;
        });
      }
      // Admin vê todos os times ativos
      setEstado(lista.length ? { fase: 'ok', lista, usuarios, atividades } : { fase: 'vazio' });
    } catch {
      setEstado({ fase: 'erro' });
    }
  }

  useEffect(() => {
    if (user.id_usuario) carregarTimes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user.id_usuario) return <Navigate to="/login.html" replace />;

  function selecionarTime(t) {
    // Salva na sessão a cada login
    localStorage.setItem('timeSelecionado', JSON.stringify({
      id: t.id_time, nome: t.nome_time, cor: t.cor_time || '#00C97A', logo: t.logo_time || null,
    }));
    setEstado({ fase: 'entrando', nome: t.nome_time });
    setTimeout(() => navigate('/dashboard.html'), 900);
  }

  function abrirFormPanel() {
    setFormAberto(true);
    setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    if (!treinadores || treinadores === 'erro') {
      getJson('/usuarios')
        .then((us) => setTreinadores(us.filter((u) => u.tipo_usuario === 1 || u.tipo_usuario === 2)))
        .catch(() => setTreinadores('erro'));
    }
  }

  function fecharFormPanel() {
    setFormAberto(false);
    setLogo(null);
    setForm(FORM_VAZIO);
    setTreinadorId(null);
    setHints({});
  }

  async function carregarLogo(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try { setLogo(await lerImagem(file)); } catch { toast('Logo muito grande. Máx 2MB.', false); }
  }

  async function criarTime(e) {
    e.preventDefault();
    const h = {};
    if (!form.nome_time.trim()) h.nome = { msg: 'Nome é obrigatório', ok: false };
    if (!treinadorId) h.treinador = { msg: 'Selecione um treinador responsável', ok: false };
    else h.treinador = { msg: 'Treinador selecionado ✓', ok: true };
    setHints(h);
    if (h.nome || !treinadorId) return;

    setSalvando(true);
    try {
      const r = await authFetch('/times', {
        method: 'POST',
        body: JSON.stringify({
          nome_time: form.nome_time,
          modalidade_time: 'Basquete',
          categoria_time: form.categoria_time,
          cor_time: form.cor_time || '#00C97A',
          logo_time: logo || null,
          ativo_time: parseInt(form.ativo_time) || 1,
          treinador: { id_usuario: parseInt(treinadorId) },
        }),
      });
      if (!r.ok) throw new Error();
      await r.json();
      fecharFormPanel();
      carregarTimes();
    } catch {
      setHints((x) => ({ ...x, nome: { msg: 'Erro ao salvar. Verifique o servidor.', ok: false } }));
    } finally {
      setSalvando(false);
    }
  }

  // iniciais do nome no círculo do logo enquanto não há imagem
  const partes = form.nome_time.trim().split(' ').filter(Boolean);
  const iniciaisLogo = partes.length ? (partes[0]?.[0] || '') + (partes[1]?.[0] || '').toUpperCase() : '?';
  const hint = (k) => <div className={'field-hint' + (hints[k] ? ' show ' + (hints[k].ok ? 'ok' : 'err') : '')}>{hints[k]?.msg}</div>;

  return (
    <div className="pagina pg-selecionar-time">
      {/* LOGOUT MODAL */}
      <div id="logoutModal" className={logoutAberto ? 'show' : ''}>
        <div className="logout-card">
          <div style={{ fontSize: 40, marginBottom: 16 }}>👋</div>
          <div className="logout-titulo">Sair do Sistema?</div>
          <div className="logout-msg">Sua sessão será encerrada.<br />Deseja realmente sair?</div>
          <div className="logout-btns">
            <button className="btn-cancel-l" onClick={() => setLogoutAberto(false)}>Cancelar</button>
            <button className="btn-confirm-l" onClick={sair}>Sair</button>
          </div>
        </div>
      </div>

      {/* HEADER */}
      <div className="page-header">
        <div className="logo-wrap">
          <div className="logo-icon"><img className="laivy-marca" src="/img/logo/icone/laivy-icone-claro.svg" alt="LAIVY" style={{ width: '100%', height: '100%' }} /></div>
          <div className="logo-name">LAIVY</div>
        </div>
        <div className="page-title">Selecionar Time</div>
        <div className="page-sub">Escolha o time para acessar o sistema</div>
      </div>

      {/* USER PILL */}
      <div className="user-pill">
        <div className="pill-av">{user.foto_usuario ? <img src={user.foto_usuario} alt="" /> : (user.nome_usuario || 'U')[0].toUpperCase()}</div>
        <div>
          <div className="pill-nome">{user.nome_usuario || '—'}</div>
          <div className="pill-tipo">{TIPOS[user.tipo_usuario] || '—'}</div>
        </div>
        <button className="pill-sair" onClick={() => setLogoutAberto(true)}>Sair</button>
      </div>

      {/* TIMES GRID */}
      <div className="times-wrap">
        <div id="timesContainer">
          {estado.fase === 'carregando' && <Carregando texto="Carregando times..." />}
          {estado.fase === 'entrando' && <Carregando texto={'Entrando em ' + estado.nome + '...'} />}
          {estado.fase === 'erro' && (
            <div className="empty-state">
              <div className="empty-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg></div>
              <div className="empty-title">Servidor offline</div>
              <div className="empty-msg">Não foi possível conectar ao backend.<br />Verifique se o Spring Boot está rodando na porta 8080.</div>
            </div>
          )}
          {estado.fase === 'vazio' && (
            <div className="empty-state">
              <div className="empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg></div>
              <div className="empty-title">Nenhum time disponível</div>
              {user.situacao === 'ATIVO' ? (
                <>
                  <div className="empty-msg">Seu plano está ativo. Cadastre o seu time para começar.</div>
                  <Link to="/novo-time.html" className="btn-criar" style={{ display: "inline-block", marginTop: 16, textDecoration: "none", width: "auto" }}>Criar meu time</Link>
                </>
              ) : (
                <div className="empty-msg">Você ainda não foi adicionado a um time.<br />Solicite ao administrador que faça isso.</div>
              )}
            </div>
          )}
          {estado.fase === 'ok' && (
            <div className="times-grid">
              {estado.lista.map((t) => (
                <TimeCard key={t.id_time} t={t} usuarios={estado.usuarios} atividades={estado.atividades} onSelecionar={selecionarTime} />
              ))}
              {isAdmin && (
                <div className="time-card-new" onClick={abrirFormPanel}>
                  <div className="new-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00C97A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg></div>
                  <div className="new-label">Novo Time</div>
                  <div className="new-sub">Cadastrar um novo time</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* FORM NOVO TIME (admin only) */}
      <div className={'form-panel' + (formAberto ? ' open' : '')} ref={panelRef}>
        <div className="fp-card">
          <div className="fp-title">
            Novo Time
            <button className="fp-close" onClick={fecharFormPanel} title="Fechar">×</button>
          </div>
          <form noValidate onSubmit={criarTime}>
            {/* LOGO */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <div className="fp-logo-circle" onClick={() => inputLogoRef.current.click()}>
                {logo ? <img src={logo} alt="" style={{ display: 'block' }} /> : <span className="fp-logo-initials">{iniciaisLogo}</span>}
                <div className="fp-logo-ov">Alterar</div>
              </div>
              <input type="file" ref={inputLogoRef} accept="image/*" style={{ display: 'none' }} onChange={carregarLogo} />
              <span style={{ fontSize: 11, color: 'var(--cinza)', textAlign: 'center' }}>Logo do time · opcional · máx 2MB</span>
              {logo && (
                <button type="button" onClick={() => setLogo(null)} style={{ display: 'inline-block', background: 'rgba(255,80,80,.1)', border: '1px solid rgba(255,80,80,.2)', color: '#FF6B6B', borderRadius: 7, padding: '4px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Remover</button>
              )}
            </div>

            <div className="row g-3">
              <div className="col-md-8">
                <label className="form-label" htmlFor="fp-nome">Nome do Time <span style={{ color: '#FF6B6B' }}>*</span></label>
                <input className={'form-control' + (hints.nome && !hints.nome.ok ? ' is-invalid' : '')} id="fp-nome" placeholder="Ex: Basquete Sub-17" required
                  value={form.nome_time} onChange={(e) => setForm({ ...form, nome_time: e.target.value })} />
                {hint('nome')}
              </div>

              <div className="col-md-4">
                <label className="form-label" htmlFor="fp-categoria">Categoria</label>
                <select className="form-select" id="fp-categoria" value={form.categoria_time} onChange={(e) => setForm({ ...form, categoria_time: e.target.value })}>
                  {['Sub-13', 'Sub-15', 'Sub-17', 'Sub-20', 'Adulto', 'Feminino', 'Misto'].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="col-md-4">
                <label className="form-label">Modalidade</label>
                <input className="form-control" value="Basquete" readOnly style={{ opacity: 0.55, cursor: 'not-allowed' }} />
              </div>

              <div className="col-md-4">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.ativo_time} onChange={(e) => setForm({ ...form, ativo_time: e.target.value })}>
                  <option value="1">Ativo</option>
                  <option value="0">Inativo</option>
                </select>
              </div>

              <div className="col-md-4">
                <label className="form-label">Cor do Time</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="color-swatch" style={{ background: form.cor_time }} onClick={() => corRef.current.click()}></div>
                  <input type="color" ref={corRef} value={form.cor_time} style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
                    onChange={(e) => setForm({ ...form, cor_time: e.target.value })} />
                  <span style={{ fontSize: 13, color: 'var(--cinza)' }}>{form.cor_time}</span>
                </div>
              </div>

              <div className="col-12">
                <label className="form-label">Treinador Responsável <span style={{ color: '#FF6B6B' }}>*</span></label>
                {hint('treinador')}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                  {treinadores === null && <div style={{ padding: 14, textAlign: 'center', color: 'var(--cinza)', fontSize: 13, gridColumn: '1/-1' }}>Carregando...</div>}
                  {treinadores === 'erro' && <div style={{ padding: 14, textAlign: 'center', color: '#FF6B6B', fontSize: 13, gridColumn: '1/-1' }}>Erro ao carregar. Verifique o servidor.</div>}
                  {Array.isArray(treinadores) && !treinadores.length && <div style={{ padding: 14, textAlign: 'center', color: 'var(--cinza)', fontSize: 13, gridColumn: '1/-1' }}>Nenhum treinador cadastrado.</div>}
                  {Array.isArray(treinadores) && treinadores.map((u) => {
                    const admin = u.tipo_usuario === 1;
                    const cor = admin ? '#00C97A' : '#4EC9FF';
                    return (
                      <div key={u.id_usuario} className={'tr-option' + (treinadorId === u.id_usuario ? ' selected' : '')}
                        onClick={() => { setTreinadorId(u.id_usuario); setHints((x) => ({ ...x, treinador: { msg: 'Treinador selecionado ✓', ok: true } })); }}>
                        <div className="tr-av" style={{ background: admin ? 'rgba(0,201,122,0.15)' : 'rgba(78,201,255,0.15)' }}>
                          {u.foto_usuario ? <img src={u.foto_usuario} alt="" /> : <span style={{ color: cor }}>{iniciais(u.nome_usuario)}</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{u.nome_usuario}</div>
                          <div style={{ fontSize: 10, color: 'var(--cinza)' }}>{admin ? 'Admin' : 'Treinador'}</div>
                        </div>
                        <div className="tr-check"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#0A1628" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg></div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="col-12 d-flex gap-3 mt-2">
                <button type="submit" className="btn-criar" disabled={salvando}>{salvando ? 'Criando...' : 'Criar Time'}</button>
                <button type="button" className="btn-fp-cancel" onClick={fecharFormPanel}>Cancelar</button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="toast-wrap">
        {toasts.map((t) => <div key={t.id} className={'toast-item' + (t.ok ? '' : ' erro')}>{t.ok ? '✅' : '❌'} {t.msg}</div>)}
      </div>
    </div>
  );
}
