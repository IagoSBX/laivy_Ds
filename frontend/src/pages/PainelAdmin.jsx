import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import CampoData from '../components/CampoData.jsx';
import LogAtividades from '../components/LogAtividades.jsx';
import Modal from '../components/Modal.jsx';
import Sidebar from '../components/Sidebar.jsx';
import ToastsIcone from '../components/ToastsIcone.jsx';
import { authFetch, getJson, iniciais, lerImagem } from '../lib/api.js';
import { ordenar } from '../lib/ordenacao.js';
import { usuarioLogado } from '../lib/sessao.js';
import useTitulo from '../lib/useTitulo.js';
import useToasts from '../lib/useToasts.js';
import { buscarCep, cpfValido, mascaraCEP, mascaraCPF, mascaraTelefone } from '../lib/validacao.js';
import '../styles/pages/painel-admin.css';

const ORD_TIMES = [
  { valor: 'nome_asc', label: 'Nome (A-Z)', campo: 'nome_time', tipo: 'texto', direcao: 'asc' },
  { valor: 'nome_desc', label: 'Nome (Z-A)', campo: 'nome_time', tipo: 'texto', direcao: 'desc' },
  { valor: 'criacao_asc', label: 'Criação (mais antigo)', campo: 'id_time', tipo: 'numero', direcao: 'asc' },
  { valor: 'criacao_desc', label: 'Criação (mais recente)', campo: 'id_time', tipo: 'numero', direcao: 'desc' },
];
const ORD_TREINADORES = [
  { valor: 'nome_asc', label: 'Nome (A-Z)', campo: 'nome_usuario', tipo: 'texto', direcao: 'asc' },
  { valor: 'nome_desc', label: 'Nome (Z-A)', campo: 'nome_usuario', tipo: 'texto', direcao: 'desc' },
  { valor: 'registro_asc', label: 'Registro (mais antigo)', campo: 'id_usuario', tipo: 'numero', direcao: 'asc' },
  { valor: 'registro_desc', label: 'Registro (mais recente)', campo: 'id_usuario', tipo: 'numero', direcao: 'desc' },
];

const FORM_TREINADOR = {
  nome_usuario: '', email_usuario: '', cel_usuario: '', cpf_usuario: '', data_nasc_usuario: '', cep_usuario: '',
  endereco_usuario: '', bairro_usuario: '', cidade_usuario: '', estado_usuario: '',
};

// Contadores mostram apenas atividades que ainda vão acontecer (não conta canceladas/finalizadas).
// Recorrentes contam enquanto a recorrência não tiver terminado, mesmo com data-âncora no passado.
function aindaVaiAcontecer(a) {
  if (a.status_atividade !== 1) return false;
  const agora = new Date();
  if (a.recorrente) return !a.fim_recorrencia || new Date(a.fim_recorrencia + 'T23:59:59') >= agora;
  return !!a.data_atividade && new Date(a.data_atividade) >= agora;
}
const doTime = (x, id) => x.time && (x.time.id_time === id || x.time === id);
const ehAtivo = (t) => t.ativo_time === 1 || t.ativo_time === '1';

function SeletorOrdem({ opcoes, ordem, setOrdem }) {
  const valor = opcoes.find((o) => o.campo === ordem.campo && o.direcao === ordem.direcao)?.valor || '';
  return (
    <select className="select-filtro sort-dropdown" value={valor}
      onChange={(e) => { const o = opcoes.find((x) => x.valor === e.target.value); if (o) setOrdem({ campo: o.campo, tipo: o.tipo, direcao: o.direcao }); }}>
      {opcoes.map((o) => <option key={o.valor} value={o.valor}>{o.label}</option>)}
    </select>
  );
}

// Grade de seleção de time (cadastro de treinador e modal "Atribuir Time")
function SeletorTime({ times, selecionado, onSelecionar, onEnter }) {
  if (!times.length) return <div style={{ padding: 14, textAlign: 'center', color: 'var(--cinza)', fontSize: 13, gridColumn: '1/-1' }}>Nenhum time ativo cadastrado.</div>;
  return times.map((t) => (
    <div key={t.id_time} className={'ts-option' + (selecionado && t.id_time == selecionado ? ' selected' : '')} tabIndex={0} role="button"
      onClick={() => onSelecionar(t.id_time)}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
        e.preventDefault();
        const jaSelecionado = selecionado && t.id_time == selecionado;
        onSelecionar(t.id_time);
        if (jaSelecionado) onEnter?.();
      }}>
      <div className="ts-dot" style={{ background: t.cor_time || '#00C97A' }}></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="ts-nome">{t.nome_time}</div>
        <div className="ts-cat">{t.categoria_time || '—'}</div>
      </div>
      <div className="ts-check"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#0A1628" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg></div>
    </div>
  ));
}

const Avatar = ({ u }) => (u.foto_usuario ? <img src={u.foto_usuario} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} alt="" /> : iniciais(u.nome_usuario));

export default function PainelAdmin() {
  useTitulo('Painel Admin — LAIVY');
  // Painel Admin é um hub global (todos os times): entrar aqui limpa o time selecionado,
  // antes da sidebar ler a sessão — senão ela mostraria a marca do time antigo.
  useState(() => localStorage.removeItem('timeSelecionado'));
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const user = usuarioLogado();
  const [toasts, toast] = useToasts();

  const abaUrl = params.get('tab');
  const aba = ['visao', 'times', 'treinadores', 'log'].includes(abaUrl) ? abaUrl : 'visao';
  const mudarAba = (id) => setParams({ tab: id }, { replace: true });

  // ---------- TIMES ----------
  const [times, setTimes] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [atividades, setAtividades] = useState([]);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [ordemTimes, setOrdemTimes] = useState({ campo: 'nome_time', tipo: 'texto', direcao: 'asc' });
  const [gerenciarId, setGerenciarId] = useState(null);
  const [buscaAtleta, setBuscaAtleta] = useState('');
  const [delTime, setDelTime] = useState(null);

  // ---------- TREINADORES ----------
  const [timesAtivos, setTimesAtivos] = useState([]);
  const [treinadores, setTreinadores] = useState(null);
  const [ordemTrein, setOrdemTrein] = useState({ campo: 'nome_usuario', tipo: 'texto', direcao: 'asc' });
  const [form, setForm] = useState(FORM_TREINADOR);
  const [foto, setFoto] = useState(null);
  const [timeForm, setTimeForm] = useState(null);
  const [hints, setHints] = useState({});
  const [invalidos, setInvalidos] = useState({});
  const [cepCarregando, setCepCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [trocar, setTrocar] = useState(null); // { id, nome, timeId }
  const formRef = useRef(null);
  const inputFotoRef = useRef(null);
  const gridTimesRef = useRef(null);

  function carregarTimes() {
    Promise.all([
      getJson('/times').catch(() => []),
      getJson('/usuarios').catch(() => []),
      getJson('/atividades').catch(() => []),
    ]).then(([t, u, a]) => { setTimes(t); setUsuarios(u); setAtividades(a); });
  }

  async function carregarTreinadores() {
    const [us, ts] = await Promise.all([getJson('/usuarios').catch(() => []), getJson('/times').catch(() => [])]);
    setTimesAtivos(ts.filter(ehAtivo));
    setTreinadores(us.filter((u) => u.tipo_usuario === 1 || u.tipo_usuario === 2));
  }

  useEffect(() => {
    if (user.tipo_usuario !== 1) return;
    carregarTimes();
    carregarTreinadores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (user.id_usuario && user.tipo_usuario !== 1) return <Navigate to="/dashboard.html" replace />;

  // Clique no card do time — entra direto no dashboard daquele time (igual a selecionar-time)
  function entrarNoTime(t) {
    localStorage.setItem('timeSelecionado', JSON.stringify({ id: t.id_time, nome: t.nome_time, cor: t.cor_time || '#00C97A', logo: t.logo_time || null }));
    navigate('/dashboard.html');
  }

  async function membro(idTime, idUsuario, metodo) {
    try {
      const r = await authFetch('/times/' + idTime + '/membros/' + idUsuario, { method: metodo });
      if (!r.ok) throw new Error();
      toast(metodo === 'PUT' ? 'Atleta adicionado ao time!' : 'Membro removido do time!');
      carregarTimes();
    } catch {
      toast(metodo === 'PUT' ? 'Erro ao adicionar.' : 'Erro ao remover.', false);
    }
  }

  async function excluirTime() {
    if (!delTime) return;
    try {
      await authFetch('/times/' + delTime.id, { method: 'DELETE' });
      toast('Time excluído!');
      setDelTime(null);
      carregarTimes();
    } catch {
      toast('Erro ao excluir.', false);
    }
  }

  // ---------- CADASTRO DE TREINADOR ----------
  const set = (campo, valor) => { setForm((f) => ({ ...f, [campo]: valor })); setInvalidos((x) => ({ ...x, [campo]: false })); };
  const hint = (campo, msg, ok) => setHints((h) => ({ ...h, [campo]: msg ? { msg, ok } : null }));

  const VALIDA = {
    nome_usuario: (v) => (v.trim().length < 3 ? 'Mínimo 3 caracteres' : null),
    email_usuario: (v) => (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Email inválido' : null),
    cel_usuario: (v) => (v.replace(/\D/g, '').length < 10 ? 'Telefone inválido (mínimo 10 dígitos)' : null),
    cpf_usuario: (v) => (!cpfValido(v) ? 'CPF inválido' : null),
  };
  function validar(campo, valor = form[campo]) {
    const erro = VALIDA[campo](valor);
    setInvalidos((x) => ({ ...x, [campo]: !!erro }));
    hint(campo, erro, false);
    return !erro;
  }

  const ID_CAMPO = { 'inp-nome': 'nome_usuario', 'inp-email': 'email_usuario', 'inp-cel': 'cel_usuario', 'inp-cpf': 'cpf_usuario' };
  function aoTeclar(e) {
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
    const atual = e.target;
    if (!atual.matches('input, select')) return;
    const campos = Array.from(e.currentTarget.querySelectorAll('input, select'))
      .filter((c) => c.type !== 'hidden' && c.type !== 'file' && !c.disabled && c.offsetParent !== null && !c.classList.contains('campo-data-nativo'));
    const i = campos.indexOf(atual);
    if (i === -1) return;
    e.preventDefault();
    const campo = ID_CAMPO[atual.id];
    if ((campo && !validar(campo)) || !atual.checkValidity()) return;
    if (campos[i + 1]) campos[i + 1].focus();
    else gridTimesRef.current?.querySelector('.ts-option')?.focus();
  }

  async function aoSairDoCep() {
    if (form.cep_usuario.replace(/\D/g, '').length !== 8) return;
    setCepCarregando(true);
    setInvalidos((x) => ({ ...x, cep_usuario: false }));
    try {
      const end = await buscarCep(form.cep_usuario);
      if (!end) { setInvalidos((x) => ({ ...x, cep_usuario: true })); hint('cep', 'CEP não encontrado', false); return; }
      setForm((f) => ({ ...f, endereco_usuario: end.endereco, bairro_usuario: end.bairro, cidade_usuario: end.cidade, estado_usuario: end.estado }));
      hint('cep', 'CEP encontrado ✓', true);
      toast('Endereço preenchido automaticamente!');
    } catch {
      hint('cep', 'Erro ao buscar CEP', false);
    } finally {
      setCepCarregando(false);
    }
  }

  async function carregarFoto(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try { setFoto(await lerImagem(file)); } catch { toast('Foto muito grande. Máximo 2MB.', false); }
  }

  function selecionarTimeForm(id) {
    setTimeForm(id);
    hint('time', 'Time selecionado ✓', true);
  }

  function resetFormTreinador() {
    setForm(FORM_TREINADOR);
    setFoto(null);
    setTimeForm(null);
    setHints({});
    setInvalidos({});
  }

  async function cadastrarTreinador(e) {
    e.preventDefault();
    const ok = ['nome_usuario', 'email_usuario', 'cel_usuario', 'cpf_usuario'].map((c) => validar(c)).every(Boolean);
    if (!timeForm) hint('time', 'Selecione um time responsável', false);
    if (!formRef.current.checkValidity()) { formRef.current.reportValidity(); return; }
    if (!ok || !timeForm) return;
    const payload = {
      ...form,
      data_nasc_usuario: form.data_nasc_usuario || null,
      tipo_usuario: 2,
      foto_usuario: foto || null,
      time: { id_time: parseInt(timeForm) },
    };
    setSalvando(true);
    try {
      const r = await authFetch('/usuarios', { method: 'POST', body: JSON.stringify(payload) });
      if (!r.ok) {
        const erro = await r.json().catch(() => ({}));
        throw new Error(erro.erro || 'Erro ao cadastrar. Verifique o servidor.');
      }
      // a senha temporária vai direto para o e-mail do treinador; aqui só sabemos se saiu
      const salvo = await r.json().catch(() => ({}));
      if (salvo.acesso_enviado) toast('Treinador cadastrado com o login "' + salvo.login_usuario + '". Login e senha temporária foram enviados para ' + salvo.email_usuario + '.');
      else toast('Treinador cadastrado com o login "' + salvo.login_usuario + '", mas o e-mail com o acesso não foi enviado. Confira o endereço e use "Reenviar acesso" em Usuários.', false);
      resetFormTreinador();
      carregarTreinadores();
      carregarTimes();
    } catch (err) {
      toast(err.message || 'Erro ao cadastrar. Verifique o servidor.', false);
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarTrocarTime() {
    if (!trocar.timeId) { toast('Selecione um time.', false); return; }
    try {
      const r = await authFetch('/times/' + trocar.timeId + '/membros/' + trocar.id, { method: 'PUT' });
      if (!r.ok) throw new Error();
      toast('Time atribuído com sucesso!');
      carregarTreinadores();
    } catch {
      toast('Erro ao atribuir time.', false);
    }
    setTrocar(null);
  }

  async function removerDoTime() {
    if (!trocar) return;
    try { await authFetch('/times/0/membros/' + trocar.id, { method: 'DELETE' }); } catch { /* segue */ }
    await authFetch('/usuarios/' + trocar.id, { method: 'PUT', body: JSON.stringify({ time: null }) }).catch(() => {});
    setTrocar(null);
    toast('Treinador removido do time.');
    carregarTreinadores();
  }

  // ---------- DERIVADOS ----------
  const listaTimes = ordenar((times || []).filter((t) => {
    const b = busca.toLowerCase();
    const mb = !b || t.nome_time?.toLowerCase().includes(b) || t.modalidade_time?.toLowerCase().includes(b) || t.categoria_time?.toLowerCase().includes(b);
    return mb && (!filtroStatus || String(t.ativo_time) === filtroStatus);
  }), ordemTimes);

  const tg = gerenciarId ? (times || []).find((x) => x.id_time === gerenciarId) : null;
  const membros = tg ? usuarios.filter((u) => doTime(u, tg.id_time)) : [];
  const ativsTg = tg ? atividades.filter((a) => doTime(a, tg.id_time)).filter(aindaVaiAcontecer) : [];
  const semTime = usuarios.filter((u) => u.tipo_usuario === 3 && !u.time && (!buscaAtleta || u.nome_usuario?.toLowerCase().includes(buscaAtleta.toLowerCase())));

  const contar = (tipo) => (times ? usuarios.filter((u) => u.tipo_usuario === tipo).length : '—');
  const cls = (campo) => 'form-control' + (invalidos[campo] ? ' is-invalid' : '');
  const campoHint = (k) => <div className={'field-hint' + (hints[k] ? ' show ' + (hints[k].ok ? 'ok' : 'err') : '')}>{hints[k]?.msg}</div>;

  return (
    <div className="pagina pg-painel-admin bs">
      <Sidebar />

      <main className="main">
        <div className="page-header">
          <div>
            <h1>Painel Admin</h1>
            <p>Visão consolidada de times e treinadores</p>
          </div>
        </div>

        {/* TABS PRINCIPAIS */}
        <div className="tabs">
          <button className={'tab' + (aba === 'visao' ? ' active' : '')} onClick={() => mudarAba('visao')}>Visão Geral</button>
          <button className={'tab' + (aba === 'times' ? ' active' : '')} onClick={() => mudarAba('times')}>Times</button>
          <button className={'tab' + (aba === 'treinadores' ? ' active' : '')} onClick={() => mudarAba('treinadores')}>Treinadores</button>
          <button className={'tab' + (aba === 'log' ? ' active' : '')} onClick={() => mudarAba('log')}>Log de atividades</button>
        </div>

        {/* ═══════════ VISÃO GERAL ═══════════ */}
        <div className={'secao' + (aba === 'visao' ? ' visible' : '')}>
          <div className="stats-row">
            <div className="stat-card"><div className="stat-dot" style={{ background: 'var(--verde)' }}></div><div><div className="stat-num" style={{ color: 'var(--verde)' }}>{times ? times.length : '—'}</div><div className="stat-label">Times</div></div></div>
            <div className="stat-card"><div className="stat-dot" style={{ background: '#4EC9FF' }}></div><div><div className="stat-num" style={{ color: '#4EC9FF' }}>{contar(1)}</div><div className="stat-label">Administradores</div></div></div>
            <div className="stat-card"><div className="stat-dot" style={{ background: '#FFB020' }}></div><div><div className="stat-num" style={{ color: '#FFB020' }}>{contar(2)}</div><div className="stat-label">Treinadores</div></div></div>
            <div className="stat-card"><div className="stat-dot" style={{ background: '#A78FFF' }}></div><div><div className="stat-num" style={{ color: '#A78FFF' }}>{contar(3)}</div><div className="stat-label">Atletas</div></div></div>
          </div>

          <div className="cta-card" style={{ marginBottom: 22 }}>
            <div>
              <h3>Entrar no Sistema</h3>
              <p>Clique em um time na aba Times para entrar no dashboard dele e gerenciar atividades, exames, desempenho e escalação.</p>
            </div>
            <button className="btn-cadastrar" onClick={() => mudarAba('times')}>Ver Times →</button>
          </div>

          <div className="card-dark">
            <h4>Acesso Rápido</h4>
            <div className="quick-grid-vg">
              <a className="quick-btn-vg" onClick={() => mudarAba('times')}>
                <div><div className="quick-nome-vg">Gerenciar Times</div><div className="quick-desc-vg">Criar, editar e administrar membros</div></div>
              </a>
              <a className="quick-btn-vg" onClick={() => mudarAba('treinadores')}>
                <div><div className="quick-nome-vg">Gerenciar Treinadores</div><div className="quick-desc-vg">Cadastrar e atribuir times</div></div>
              </a>
              <Link className="quick-btn-vg" to="/usuarios.html">
                <div><div className="quick-nome-vg">Usuários</div><div className="quick-desc-vg">Ver todos os cadastros</div></div>
              </Link>
              <Link className="quick-btn-vg" to="/dashboard.html">
                <div><div className="quick-nome-vg">Dashboard</div><div className="quick-desc-vg">Voltar à tela inicial</div></div>
              </Link>
            </div>
          </div>
        </div>

        {/* ═══════════ TIMES ═══════════ */}
        <div className={'secao' + (aba === 'times' ? ' visible' : '')}>
          <div className="card-dark" style={{ padding: '18px 24px' }}>
            <div className="toolbar">
              <div className="search-wrap">
                <input className="search-bar" placeholder="Buscar por nome ou modalidade..." value={busca} onChange={(e) => setBusca(e.target.value)} />
              </div>
              <select className="select-filtro" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
                <option value="">Todos</option>
                <option value="1">Ativos</option>
                <option value="0">Inativos</option>
              </select>
              <div><SeletorOrdem opcoes={ORD_TIMES} ordem={ordemTimes} setOrdem={setOrdemTimes} /></div>
              <Link to="/novo-time.html" className="btn-novo ml-auto">+ Novo Time</Link>
            </div>
            <div className="times-grid">
              {times && !listaTimes.length && (
                <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                  <p>Nenhum time encontrado</p>
                </div>
              )}
              {listaTimes.map((t) => {
                const cor = t.cor_time || '#00C97A';
                const ms = usuarios.filter((u) => doTime(u, t.id_time));
                const as = atividades.filter((a) => doTime(a, t.id_time)).filter(aindaVaiAcontecer);
                return (
                  <div key={t.id_time} className="time-card" title="Clique para entrar no time" onClick={() => entrarNoTime(t)}>
                    <div className="time-card-banner" style={{ background: cor }}></div>
                    <div className="time-card-body">
                      <div className="time-card-top">
                        <div className="time-logo" style={{ background: cor + '22', border: '2px solid ' + cor + '44' }}>
                          {t.logo_time ? <img src={t.logo_time} alt="" /> : <span style={{ color: '#fff', fontFamily: "'Bebas Neue',cursive", fontSize: 18 }}>{iniciais(t.nome_time)}</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <div className="time-nome">{t.nome_time}</div>
                            {ehAtivo(t) ? <span className="badge-ativo">Ativo</span> : <span className="badge-inativo">Inativo</span>}
                          </div>
                          <div className="time-modalidade">{t.modalidade_time || '—'} &bull; {t.categoria_time || '—'}</div>
                        </div>
                      </div>
                      <div className="time-stats">
                        <div className="ts-box"><div className="ts-num" style={{ color: cor }}>{ms.filter((u) => u.tipo_usuario === 3).length}</div><div className="ts-label">Atletas</div></div>
                        <div className="ts-box"><div className="ts-num" style={{ color: '#4EC9FF' }}>{as.filter((a) => a.tipo_atividade === 1).length}</div><div className="ts-label">Treinos</div></div>
                        <div className="ts-box"><div className="ts-num" style={{ color: '#FFB020' }}>{as.filter((a) => a.tipo_atividade === 2).length}</div><div className="ts-label">Jogos</div></div>
                      </div>
                      <div className="time-treinador"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="5" /><path d="M3 21v-2a7 7 0 0 1 14 0v2" /></svg> Treinador: <strong>{t.treinador?.nome_usuario || '—'}</strong></div>
                      <div className="time-footer">
                        <button className="btn-acao-sm btn-ver" onClick={(e) => { e.stopPropagation(); setBuscaAtleta(''); setGerenciarId(t.id_time); }}>Gerenciar</button>
                        <Link to={'/editar-time.html?id=' + t.id_time} className="btn-acao-sm btn-edit" onClick={(e) => e.stopPropagation()} style={{ textDecoration: 'none' }}>Editar</Link>
                        <button className="btn-acao-sm btn-del" onClick={(e) => { e.stopPropagation(); setDelTime({ id: t.id_time, nome: t.nome_time }); }}>Excluir</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ═══════════ LOG DE ATIVIDADES ═══════════ */}
        <div className={'secao' + (aba === 'log' ? ' visible' : '')}>
          <LogAtividades ativo={aba === 'log'} usuarios={usuarios} times={times || []} />
        </div>

        {/* ═══════════ TREINADORES ═══════════ */}
        <div className={'secao' + (aba === 'treinadores' ? ' visible' : '')}>
          <div className="row g-4">
            <div className="col-lg-6">
              <div className="card-dark">
                <h4>Novo Treinador</h4>
                <form ref={formRef} noValidate onSubmit={cadastrarTreinador} onKeyDown={aoTeclar}>
                  <div className="row g-3">
                    <div className="col-12">
                      <div className="foto-wrap">
                        <div className="foto-circle" onClick={() => inputFotoRef.current.click()}>
                          {foto
                            ? <img src={foto} style={{ display: 'block' }} alt="" />
                            : <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--cinza)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>}
                          <div className="foto-ov">Alterar</div>
                        </div>
                        <input type="file" ref={inputFotoRef} accept="image/*" style={{ display: 'none' }} onChange={carregarFoto} />
                        <div className="foto-hint">Foto opcional · JPG, PNG · máx 2MB</div>
                        <button type="button" className={'btn-rm-foto' + (foto ? ' show' : '')} onClick={() => setFoto(null)}>Remover foto</button>
                      </div>
                    </div>
                    <div className="col-12">
                      <label className="form-label" htmlFor="inp-nome">Nome Completo <span className="required">*</span></label>
                      <input className={cls('nome_usuario')} id="inp-nome" placeholder="Nome do treinador" required
                        value={form.nome_usuario} onChange={(e) => { set('nome_usuario', e.target.value); validar('nome_usuario', e.target.value); }} />
                      {campoHint('nome_usuario')}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label" htmlFor="inp-email">Email <span className="required">*</span></label>
                      <input className={cls('email_usuario')} id="inp-email" placeholder="email@exemplo.com" required
                        value={form.email_usuario} onChange={(e) => { set('email_usuario', e.target.value); validar('email_usuario', e.target.value); }} />
                      {campoHint('email_usuario')}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label" htmlFor="inp-cel">Celular <span className="required">*</span></label>
                      <input className={cls('cel_usuario')} id="inp-cel" placeholder="(00) 00000-0000" maxLength={15} required
                        value={form.cel_usuario} onChange={(e) => {
                          const v = mascaraTelefone(e.target.value);
                          set('cel_usuario', v);
                          if (v.replace(/\D/g, '').length >= 10) validar('cel_usuario', v);
                        }} />
                      {campoHint('cel_usuario')}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label" htmlFor="inp-cpf">CPF <span className="required">*</span></label>
                      <input className={cls('cpf_usuario')} id="inp-cpf" placeholder="000.000.000-00" maxLength={14} required
                        value={form.cpf_usuario} onChange={(e) => {
                          const v = mascaraCPF(e.target.value);
                          set('cpf_usuario', v);
                          if (v.replace(/\D/g, '').length === 11) validar('cpf_usuario', v);
                        }} />
                      {campoHint('cpf_usuario')}
                    </div>
                    <div className="col-md-6">
                      <label className="form-label" htmlFor="inp-nasc">Data de Nascimento <span className="required">*</span></label>
                      <CampoData id="inp-nasc" required value={form.data_nasc_usuario} onChange={(v) => set('data_nasc_usuario', v)} />
                    </div>
                    <div className="col-12"><div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }}></div></div>
                    <div className="col-md-4">
                      <label className="form-label" htmlFor="inp-cep">CEP <span className="required">*</span></label>
                      <input className={cls('cep_usuario')} id="inp-cep" placeholder="00000-000" maxLength={9} required
                        value={form.cep_usuario} onChange={(e) => set('cep_usuario', mascaraCEP(e.target.value))} onBlur={aoSairDoCep} />
                      <div className={'cep-loading' + (cepCarregando ? ' show' : '')}>Buscando endereço...</div>
                      {campoHint('cep')}
                    </div>
                    <div className="col-md-8">
                      <label className="form-label" htmlFor="inp-end">Endereço <span className="required">*</span></label>
                      <input className="form-control" id="inp-end" placeholder="Rua, número" required value={form.endereco_usuario} onChange={(e) => set('endereco_usuario', e.target.value)} />
                    </div>
                    <div className="col-md-5">
                      <label className="form-label" htmlFor="inp-bairro">Bairro <span className="required">*</span></label>
                      <input className="form-control" id="inp-bairro" placeholder="Bairro" required value={form.bairro_usuario} onChange={(e) => set('bairro_usuario', e.target.value)} />
                    </div>
                    <div className="col-md-5">
                      <label className="form-label" htmlFor="inp-cidade">Cidade <span className="required">*</span></label>
                      <input className="form-control" id="inp-cidade" placeholder="Cidade" required value={form.cidade_usuario} onChange={(e) => set('cidade_usuario', e.target.value)} />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label" htmlFor="inp-estado">Estado <span className="required">*</span></label>
                      <input className="form-control" id="inp-estado" placeholder="SP" required value={form.estado_usuario} onChange={(e) => set('estado_usuario', e.target.value)} />
                    </div>
                    <div className="col-12"><div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }}></div></div>
                    <div className="col-12">
                      <label className="form-label">Acesso</label>
                      <div className="field-hint ok show" style={{ fontSize: 12, marginTop: 4 }}>O login é gerado automaticamente pelo sistema. Login e senha temporária vão para o e-mail do treinador, que cria a senha dele no primeiro acesso.</div>
                    </div>
                    <div className="col-12">
                      <label className="form-label">Time Responsável <span className="required">*</span></label>
                      {campoHint('time')}
                      <div className="time-selector" ref={gridTimesRef}>
                        {treinadores === null
                          ? <div style={{ padding: 16, textAlign: 'center', color: 'var(--cinza)', fontSize: 13, gridColumn: '1/-1' }}>Carregando times...</div>
                          : <SeletorTime times={timesAtivos} selecionado={timeForm} onSelecionar={selecionarTimeForm} onEnter={() => formRef.current.requestSubmit()} />}
                      </div>
                    </div>
                    <div className="col-12 d-flex gap-3 mt-2">
                      <button type="submit" className="btn-cadastrar" disabled={salvando}>{salvando ? 'Salvando...' : 'Cadastrar Treinador'}</button>
                      <button type="button" className="btn-cancelar" onClick={resetFormTreinador}>Limpar</button>
                    </div>
                  </div>
                </form>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="card-dark">
                <h4 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <span>Treinadores Cadastrados</span>
                  <span><SeletorOrdem opcoes={ORD_TREINADORES} ordem={ordemTrein} setOrdem={setOrdemTrein} /></span>
                </h4>
                <div>
                  {treinadores === null ? (
                    <div style={{ textAlign: 'center', padding: 32, color: 'var(--cinza)' }}>
                      <div style={{ width: 28, height: 28, border: '3px solid rgba(0,201,122,0.2)', borderTopColor: 'var(--verde)', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 12px' }}></div>
                      Carregando...
                    </div>
                  ) : !treinadores.length ? (
                    <div style={{ textAlign: 'center', padding: 32, color: 'var(--cinza)', fontSize: 13 }}>Nenhum treinador cadastrado ainda.</div>
                  ) : ordenar(treinadores, ordemTrein).map((u) => (
                    <div key={u.id_usuario} className="trein-row">
                      <div className="trein-av">{u.foto_usuario ? <img src={u.foto_usuario} alt="" /> : iniciais(u.nome_usuario)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="trein-nome">{u.nome_usuario}</div>
                        <div style={{ fontSize: 11, color: 'var(--cinza)', marginBottom: 3 }}>{u.tipo_usuario === 1 ? '👑 Admin' : '🏋️ Treinador'}</div>
                        {u.time
                          ? <div className="trein-time"><div className="trein-time-dot" style={{ background: u.time.cor_time || '#00C97A' }}></div><span style={{ color: 'var(--branco)', fontWeight: 600 }}>{u.time.nome_time}</span></div>
                          : <div className="trein-sem-time">Sem time atribuído</div>}
                      </div>
                      <button className="btn-trocar-time" onClick={() => setTrocar({ id: u.id_usuario, nome: u.nome_usuario, timeId: u.time ? u.time.id_time : null })}>Atribuir Time</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL GERENCIAR TIME */}
      <Modal id="modalTime" tamanho="lg" aberto={!!tg} onFechar={() => setGerenciarId(null)}>
        {tg && (
          <>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 46, height: 46, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: (tg.cor_time || '#00C97A') + '22', border: '2px solid ' + (tg.cor_time || '#00C97A') + '44' }}>
                  {tg.logo_time ? <img src={tg.logo_time} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} alt="" /> : <span style={{ color: '#fff', fontFamily: "'Bebas Neue',cursive", fontSize: 18 }}>{iniciais(tg.nome_time)}</span>}
                </div>
                <div>
                  <h5 className="modal-title" style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 24, letterSpacing: 1 }}>{tg.nome_time}</h5>
                  <div style={{ fontSize: 12, color: 'var(--cinza)' }}>{(tg.modalidade_time || '—') + ' · ' + (tg.categoria_time || '—') + ' · ' + (tg.treinador?.nome_usuario || '—')}</div>
                </div>
              </div>
              <button className="btn-close" onClick={() => setGerenciarId(null)}></button>
            </div>
            <div className="modal-body">
              <div className="time-stats" style={{ marginBottom: 20 }}>
                <div className="ts-box"><div className="ts-num" style={{ color: 'var(--verde)' }}>{membros.filter((u) => u.tipo_usuario === 3).length}</div><div className="ts-label">Atletas</div></div>
                <div className="ts-box"><div className="ts-num" style={{ color: '#4EC9FF' }}>{ativsTg.filter((a) => a.tipo_atividade === 1).length}</div><div className="ts-label">Treinos</div></div>
                <div className="ts-box"><div className="ts-num" style={{ color: '#FFB020' }}>{ativsTg.filter((a) => a.tipo_atividade === 2).length}</div><div className="ts-label">Jogos</div></div>
              </div>
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="membros-header">Membros</div>
                  <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                    {!membros.length ? <div style={{ textAlign: 'center', padding: 20, color: 'var(--cinza)', fontSize: 13 }}>Nenhum membro neste time</div> : membros.map((u) => (
                      <div key={u.id_usuario} className="membro-row">
                        <div className="membro-av" style={{ background: { 1: 'rgba(0,201,122,0.2)', 2: 'rgba(78,201,255,0.2)', 3: 'rgba(255,176,32,0.2)' }[u.tipo_usuario] || 'rgba(136,136,136,0.2)', color: { 1: '#00C97A', 2: '#4EC9FF', 3: '#FFB020' }[u.tipo_usuario] || '#888' }}><Avatar u={u} /></div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="membro-nome">{u.nome_usuario}</div>
                          <div className="membro-tipo">{{ 1: 'Administrador', 2: 'Treinador', 3: 'Atleta' }[u.tipo_usuario] || '—'}</div>
                        </div>
                        <button className="membro-remove" onClick={() => membro(tg.id_time, u.id_usuario, 'DELETE')}>Remover</button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="membros-header">Adicionar atleta</div>
                  <input className="form-control mb-2" placeholder="Buscar atleta sem time..." value={buscaAtleta} onChange={(e) => setBuscaAtleta(e.target.value)} />
                  <div style={{ maxHeight: 230, overflowY: 'auto' }}>
                    {!semTime.length ? <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 16, color: 'var(--cinza)', fontSize: 12 }}>Todos os atletas já estão em um time</div> : semTime.map((u) => (
                      <div key={u.id_usuario} className="atleta-add-row">
                        <div className="membro-av" style={{ background: 'rgba(255,176,32,0.2)', color: '#FFB020' }}><Avatar u={u} /></div>
                        <div style={{ minWidth: 0, flex: 1 }}><div style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.nome_usuario}</div></div>
                        <button className="add-btn" onClick={() => membro(tg.id_time, u.id_usuario, 'PUT')}>+ Add</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-acao-sm btn-edit" onClick={() => { const id = tg.id_time; setGerenciarId(null); setTimeout(() => navigate('/editar-time.html?id=' + id), 300); }}>Editar time</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setGerenciarId(null)}>Fechar</button>
            </div>
          </>
        )}
      </Modal>

      {/* MODAL EXCLUIR TIME */}
      <Modal id="modalDel" tamanho="sm" aberto={!!delTime} onFechar={() => setDelTime(null)}>
        <div className="modal-body" style={{ padding: 28, textAlign: 'center' }}>
          <div style={{ fontSize: 38, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 20, marginBottom: 8 }}>Excluir Time?</div>
          <div style={{ fontSize: 13, color: 'var(--cinza)', marginBottom: 20 }}>{delTime ? 'Excluir "' + delTime.nome + '"? Os membros não serão excluídos.' : ''}</div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setDelTime(null)}>Cancelar</button>
            <button onClick={excluirTime} style={{ background: 'rgba(255,80,80,0.15)', border: '1px solid rgba(255,80,80,0.3)', color: '#FF6B6B', padding: '7px 20px', borderRadius: 8, fontFamily: "'Bebas Neue',cursive", fontSize: 15, cursor: 'pointer' }}>Excluir</button>
          </div>
        </div>
      </Modal>

      {/* MODAL TROCAR TIME DO TREINADOR */}
      <Modal id="modalTrocarTime" aberto={!!trocar} onFechar={() => setTrocar(null)}>
        {trocar && (
          <>
            <div className="modal-header">
              <h5 className="modal-title" style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 20, letterSpacing: 1 }}>Atribuir Time ao Treinador</h5>
              <button className="btn-close" onClick={() => setTrocar(null)}></button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 14, fontSize: 13, color: 'var(--cinza)' }}>Selecionando time para: <strong style={{ color: 'var(--branco)' }}>{trocar.nome}</strong></div>
              <div className="time-selector">
                <SeletorTime times={timesAtivos} selecionado={trocar.timeId} onSelecionar={(id) => setTrocar((x) => ({ ...x, timeId: id }))} />
              </div>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <button style={{ background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.2)', color: '#FF6B6B', borderRadius: 8, padding: '8px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }} onClick={removerDoTime}>Remover do Time</button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-cancelar" style={{ fontSize: 14, padding: '8px 20px' }} onClick={() => setTrocar(null)}>Cancelar</button>
                <button className="btn-cadastrar" style={{ fontSize: 14, padding: '8px 24px' }} onClick={confirmarTrocarTime}>Confirmar</button>
              </div>
            </div>
          </>
        )}
      </Modal>

      <ToastsIcone toasts={toasts} />
    </div>
  );
}
