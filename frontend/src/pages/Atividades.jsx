import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CampoData from '../components/CampoData.jsx';
import Modal from '../components/Modal.jsx';
import QuadraAtividade from '../components/QuadraAtividade.jsx';
import Sidebar from '../components/Sidebar.jsx';
import ThOrdenavel from '../components/ThOrdenavel.jsx';
import ToastsIcone from '../components/ToastsIcone.jsx';
import { authFetch, getJson, iniciais } from '../lib/api.js';
import { ordenar } from '../lib/ordenacao.js';
import { ehGestor, ehPreparo, timeSelecionado, usuarioLogado } from '../lib/sessao.js';
import useTitulo from '../lib/useTitulo.js';
import useToasts from '../lib/useToasts.js';
import { enterAvanca } from '../lib/validacao.js';
import '../styles/pages/atividades.css';

const TIPO = {
  1: { label: 'Treino', emoji: '🏋️', cor: '#00C97A', bg: 'rgba(0,201,122,0.15)' },
  2: { label: 'Jogo', emoji: '🏀', cor: '#FFB020', bg: 'rgba(255,176,32,0.15)' },
};
const POS_BASK = { Armador: { l: 52, t: 50 }, 'Ala-Armador': { l: 65, t: 22 }, Ala: { l: 65, t: 78 }, 'Ala-Pivo': { l: 78, t: 28 }, Pivo: { l: 81, t: 50 } };
const POS_COR = { Armador: '#FFB020', 'Ala-Armador': '#4EC9FF', Ala: '#00C97A', 'Ala-Pivo': '#A78FFF', Pivo: '#FF6B6B' };
const POS_NUM = { Armador: '1', 'Ala-Armador': '2', Ala: '3', 'Ala-Pivo': '4', Pivo: '5' };
const corP = (p) => POS_COR[p] || '#8899BB';
const ehTitular = (e) => e.titular == 1 || e.titular === '1';
const ehReserva = (e) => e.titular == 0 || e.titular === '0';

const ORDENACAO = [
  { valor: 'nome_asc', label: 'Nome (A-Z)', campo: 'nome_atividade', tipo: 'texto', direcao: 'asc' },
  { valor: 'nome_desc', label: 'Nome (Z-A)', campo: 'nome_atividade', tipo: 'texto', direcao: 'desc' },
  { valor: 'data_asc', label: 'Data (mais antiga)', campo: 'data_atividade', tipo: 'data', direcao: 'asc' },
  { valor: 'data_desc', label: 'Data (mais recente)', campo: 'data_atividade', tipo: 'data', direcao: 'desc' },
];

const FORM_VAZIO = {
  nome_atividade: '', usuario_id: '', lugar_atividade: '', data_atividade: '', tipo_atividade: '1',
  status_atividade: '1', time_oponente: '', recorrente: false, fim_recorrencia: '',
};

// Contadores mostram apenas atividades que ainda vão acontecer (não conta canceladas/finalizadas).
// Recorrentes contam enquanto a recorrência não tiver terminado, mesmo com data-âncora no passado.
function aindaVaiAcontecer(a, agora) {
  if (a.status_atividade !== 1) return false;
  if (a.recorrente) return !a.fim_recorrencia || new Date(a.fim_recorrencia + 'T23:59:59') >= agora;
  return !!a.data_atividade && new Date(a.data_atividade) >= agora;
}

const status = (s) => ({
  cor: s === 2 ? '#4EC9FF' : s === 1 ? '#00C97A' : '#FF6B6B',
  bg: s === 2 ? 'rgba(78,201,255,0.12)' : s === 1 ? 'rgba(0,201,122,0.15)' : 'rgba(255,80,80,0.12)',
  label: s === 2 ? 'Finalizado' : s === 1 ? 'Ativo' : 'Cancelado',
});

const ESTILO_BTN_CINZA = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#8899BB', fontFamily: "'Bebas Neue',cursive", letterSpacing: 2, borderRadius: 10, cursor: 'pointer' };

export default function Atividades() {
  useTitulo('Atividades — LAIVY');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const user = usuarioLogado();
  // atividades: Admin, Treinador e Preparador Físico editam; atleta e período de teste só veem
  const somenteLeitura = !ehPreparo(user);
  const isAdmin = ehPreparo(user);
  const ts = timeSelecionado();
  const urlTime = (base) => (ts ? base + '?idTime=' + ts.id : base);

  const [dados, setDados] = useState(null);
  const [responsaveis, setResponsaveis] = useState([]);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [ordem, setOrdem] = useState({ campo: 'data_atividade', tipo: 'data', direcao: 'desc' });
  const [visao, setVisao] = useState('cards');
  const [aba, setAba] = useState('lista');
  const [toasts, toast] = useToasts();

  const [verId, setVerId] = useState(null);
  const [delId, setDelId] = useState(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [editId, setEditId] = useState('');

  // popup de escalação (só leitura, para o atleta)
  const [esc, setEsc] = useState(null); // { nome, dados }
  // finalizar jogo
  const [fj, setFj] = useState(null); // { id, nome, oponente, pro, contra, escalacao, pontos }

  function carregar() {
    getJson(urlTime('/atividades')).then((d) => {
      setDados(d);
      const v = params.get('ver');
      if (v) setVerId(Number(v));
    }).catch(() => setDados([]));
  }

  useEffect(() => {
    // Responsável só pode ser Admin ou Treinador (tipo 1 ou 2), não atleta
    getJson(urlTime('/usuarios')).then((d) => setResponsaveis(d.filter((u) => u.tipo_usuario === 1 || u.tipo_usuario === 2 || u.tipo_usuario === 4))).catch(() => {});
    carregar();
    if (params.get('novo') === '1') mudarAba('form');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lista0 = dados || [];
  const agora = new Date();
  const pendentes = lista0.filter((a) => aindaVaiAcontecer(a, agora));
  const lista = ordenar(lista0.filter((a) => {
    const b = busca.toLowerCase();
    const mb = !b || a.nome_atividade.toLowerCase().includes(b) || (a.lugar_atividade || '').toLowerCase().includes(b) || (a.usuario?.nome_usuario || '').toLowerCase().includes(b);
    return mb && (!filtroTipo || String(a.tipo_atividade) === filtroTipo) && (filtroStatus === '' || String(a.status_atividade) === filtroStatus);
  }), ordem);
  const valorOrdem = ORDENACAO.find((o) => o.campo === ordem.campo && o.direcao === ordem.direcao)?.valor || '';

  function mudarAba(id) {
    if (id === 'form' && somenteLeitura) { toast('Acesso restrito: você não tem permissão para criar atividades.', false); return; }
    setAba(id);
  }

  function filtrarTipo(v) {
    setFiltroTipo(v);
    setAba('lista');
  }

  // ---------- FORM ----------
  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }));
  const ehJogo = String(form.tipo_atividade) === '2';

  function cancelarForm() {
    setForm(FORM_VAZIO);
    setEditId('');
    setAba('lista');
  }

  function abrirEdicao(id) {
    if (somenteLeitura) { toast('Acesso restrito.', false); return; }
    const a = lista0.find((x) => x.id_atividade === id);
    if (!a) return;
    setForm({
      nome_atividade: a.nome_atividade || '', usuario_id: a.usuario?.id_usuario ? String(a.usuario.id_usuario) : '',
      lugar_atividade: a.lugar_atividade || '', data_atividade: a.data_atividade ? a.data_atividade.slice(0, 16) : '',
      tipo_atividade: String(a.tipo_atividade || 1), status_atividade: String(a.status_atividade || 0),
      time_oponente: a.time_oponente || '', recorrente: !!a.recorrente, fim_recorrencia: a.fim_recorrencia || '',
    });
    setEditId(String(a.id_atividade));
    mudarAba('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function salvar(e) {
    e.preventDefault();
    if (somenteLeitura) { toast('Acesso restrito.', false); return; }
    if (form.recorrente && form.fim_recorrencia && form.fim_recorrencia < form.data_atividade.slice(0, 10)) {
      toast('A data final da recorrência não pode ser anterior ao primeiro treino.', false);
      return;
    }
    const payload = {
      nome_atividade: form.nome_atividade, lugar_atividade: form.lugar_atividade, data_atividade: form.data_atividade,
      tipo_atividade: parseInt(form.tipo_atividade), status_atividade: parseInt(form.status_atividade),
      time_oponente: form.time_oponente || null,
      usuario: { id_usuario: parseInt(form.usuario_id) },
      recorrente: form.recorrente, fim_recorrencia: form.recorrente ? (form.fim_recorrencia || null) : null,
    };
    try {
      const r = await authFetch(editId ? '/atividades/' + editId : '/atividades', { method: editId ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      if (!r.ok) { const erro = await r.json().catch(() => ({})); throw new Error(erro.erro || 'Não foi possível salvar a atividade.'); }
      toast(editId ? 'Atualizada!' : 'Cadastrada!');
      cancelarForm();
      carregar();
    } catch (err) {
      toast(err.message || 'Erro ao salvar atividade.', false);
    }
  }

  async function excluir() {
    if (!delId) return;
    try {
      await authFetch('/atividades/' + delId, { method: 'DELETE' });
      toast('Excluída!');
      setDelId(null);
      carregar();
    } catch {
      toast('Erro.', false);
    }
  }

  // ---------- ESCALAÇÃO ----------
  function abrirEscalacao(a) {
    // Treinador/Admin monta a escalação de verdade na tela dedicada; o popup
    // aqui é só o "ver rápido" do atleta, que não pode editar mesmo.
    if (isAdmin) { navigate('/escalacao.html?atividade=' + a.id_atividade); return; }
    setEsc({ nome: a.nome_atividade, dados: [] });
    getJson('/escalacoes/atividade/' + a.id_atividade).then((d) => setEsc({ nome: a.nome_atividade, dados: d })).catch(() => {});
  }

  // ---------- FINALIZAR JOGO ----------
  async function abrirFinalizarJogo(id) {
    if (somenteLeitura) { toast('Acesso restrito.', false); return; }
    const a = lista0.find((x) => x.id_atividade === id);
    if (!a) return;
    let escalacao = [];
    try { escalacao = await getJson('/escalacoes/atividade/' + id); } catch { escalacao = []; }
    setFj({
      id, nome: a.nome_atividade, oponente: a.time_oponente ? 'vs ' + a.time_oponente : '',
      pro: a.placar_pro || '', contra: a.placar_contra || '', escalacao,
      pontos: Object.fromEntries(escalacao.map((e) => [e.id_escalacao, e.pontos_jogo || 0])),
    });
  }

  async function confirmarFinalizarJogo() {
    if (somenteLeitura) { toast('Acesso restrito.', false); return; }
    // 1. placar e status da atividade
    try {
      await authFetch('/atividades/' + fj.id, {
        method: 'PUT',
        body: JSON.stringify({ placar_pro: parseInt(fj.pro) || 0, placar_contra: parseInt(fj.contra) || 0, status_atividade: 2 }),
      });
    } catch (e) { console.warn('Atividade update failed', e); }
    // 2. pontos de cada jogador na escalação
    await Promise.all(fj.escalacao.map((e) => authFetch('/escalacoes/' + e.id_escalacao, {
      method: 'PUT', body: JSON.stringify({ pontos_jogo: parseInt(fj.pontos[e.id_escalacao]) || 0 }),
    }).catch(() => {})));
    setFj(null);
    toast('Jogo finalizado! Pontos registrados com sucesso. ');
    carregar();
  }

  const va = verId ? lista0.find((x) => x.id_atividade === verId) : null;
  const vt = va && (TIPO[va.tipo_atividade] || TIPO[1]);

  const escTit = esc ? esc.dados.filter(ehTitular) : [];
  const escRes = esc ? esc.dados.filter(ehReserva) : [];
  const escItem = (e) => {
    const nome = e.usuario?.nome_usuario || '—', cor = corP(e.posicao);
    return (
      <div key={e.id_escalacao} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', marginBottom: 7 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: cor + '22', color: cor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{iniciais(nome)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nome}</div>
          <div style={{ fontSize: 10, color: '#8899BB' }}>{(e.posicao || '—') + (e.numero_camisa ? ' · #' + e.numero_camisa : '')}</div>
        </div>
      </div>
    );
  };

  const linhaPontos = (e) => {
    const nome = e.usuario?.nome_usuario || '—';
    const cor = corP(e.posicao);
    return (
      <div key={e.id_escalacao} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: cor + '22', color: cor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{iniciais(nome)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{nome}</div>
          <div style={{ fontSize: 11, color: '#8899BB' }}>{(e.posicao || '—') + (e.numero_camisa ? ' · #' + e.numero_camisa : '')}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 11, color: '#8899BB', whiteSpace: 'nowrap' }}>Pontos:</label>
          <input type="number" min="0" max="99" value={fj.pontos[e.id_escalacao]}
            onChange={(ev) => setFj((x) => ({ ...x, pontos: { ...x.pontos, [e.id_escalacao]: ev.target.value } }))}
            style={{ width: 64, background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#F0F4FF', fontFamily: 'Barlow,sans-serif', fontSize: 15, fontWeight: 700, padding: '5px 8px', textAlign: 'center', outline: 'none' }} />
        </div>
      </div>
    );
  };

  return (
    <div className="pagina pg-atividades bs">
      <Sidebar />

      <main className="main">
        <div className="page-header"><h1>Atividades</h1><p>Gerencie treinos e jogos</p></div>

        <div className="stats-row">
          <div className="stat-card" onClick={() => filtrarTipo('')}><div className="stat-dot" style={{ background: 'var(--cinza)' }}></div><div><div className="stat-num" style={{ color: 'var(--branco)' }}>{dados ? pendentes.length : '—'}</div><div className="stat-label">Total</div></div></div>
          <div className="stat-card" onClick={() => filtrarTipo('1')}><div className="stat-dot" style={{ background: 'var(--t1)' }}></div><div><div className="stat-num" style={{ color: 'var(--t1)' }}>{dados ? pendentes.filter((a) => a.tipo_atividade === 1).length : '—'}</div><div className="stat-label">Treinos</div></div></div>
          <div className="stat-card" onClick={() => filtrarTipo('2')}><div className="stat-dot" style={{ background: 'var(--t2)' }}></div><div><div className="stat-num" style={{ color: 'var(--t2)' }}>{dados ? pendentes.filter((a) => a.tipo_atividade === 2).length : '—'}</div><div className="stat-label">Jogos</div></div></div>
        </div>

        <div className="tabs">
          <button className={'tab' + (aba === 'lista' ? ' active' : '')} onClick={() => mudarAba('lista')}> Lista</button>
          {!somenteLeitura && <button className={'tab' + (aba === 'form' ? ' active' : '')} onClick={() => mudarAba('form')}> Nova Atividade</button>}
        </div>

        <div className={'secao' + (aba === 'lista' ? ' visible' : '')}>
          <div className="card-dark" style={{ padding: '18px 24px' }}>
            <div className="toolbar">
              <div className="search-wrap"><input className="search-bar" placeholder="Buscar atividade..." value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
              <select className="select-filtro" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
                <option value="">Todos os tipos</option>
                <option value="1">Treino</option><option value="2">Jogo</option><option value="3">Evento</option><option value="4">Competição</option>
              </select>
              <select className="select-filtro" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
                <option value="">Qualquer status</option>
                <option value="1"> Ativo</option><option value="0"> Cancelado</option><option value="2"> Finalizado</option>
              </select>
              <div>
                <select className="select-filtro sort-dropdown" value={valorOrdem}
                  onChange={(e) => { const o = ORDENACAO.find((x) => x.valor === e.target.value); if (o) setOrdem({ campo: o.campo, tipo: o.tipo, direcao: o.direcao }); }}>
                  {!valorOrdem && <option value="" hidden></option>}
                  {ORDENACAO.map((o) => <option key={o.valor} value={o.valor}>{o.label}</option>)}
                </select>
              </div>
              <div className="view-toggle ml-auto">
                <button className={'view-btn' + (visao === 'cards' ? ' active' : '')} onClick={() => setVisao('cards')}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg></button>
                <button className={'view-btn' + (visao === 'tabela' ? ' active' : '')} onClick={() => setVisao('tabela')}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg></button>
              </div>
              {!somenteLeitura && <button className="btn-novo" onClick={() => mudarAba('form')}>+ Nova</button>}
            </div>

            <div className={'cards-wrapper' + (visao === 'cards' ? ' visible' : '')}>
              <div className="cards-grid">
                {!lista.length ? (
                  <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                    <div className="empty-icon" style={{ color: '#8899BB', marginBottom: 8, opacity: 0.6 }}><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg></div>
                    <p>Nenhuma atividade encontrada</p>
                  </div>
                ) : lista.map((a) => {
                  const t = TIPO[a.tipo_atividade] || TIPO[1];
                  const st = status(a.status_atividade);
                  const data = a.data_atividade ? new Date(a.data_atividade).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
                  return (
                    <div key={a.id_atividade} className="ativ-card" style={{ borderLeftColor: t.cor }} onClick={() => setVerId(a.id_atividade)}>
                      <div className="ativ-card-top">
                        <div className="ativ-card-nome">{(a.recorrente ? '🔁 ' : '') + a.nome_atividade}</div>
                        <span className="ativ-tipo-badge" style={{ background: t.bg, color: t.cor }}>{t.emoji} {t.label}</span>
                      </div>
                      <div className="ativ-card-meta">
                        <span> {data}</span><span> {a.lugar_atividade || 'Sem local'}</span><span> {a.usuario?.nome_usuario || '—'}</span>
                        {a.time_oponente && <span> {a.time_oponente}</span>}
                      </div>
                      <div className="ativ-card-footer">
                        <span className="status-pill" style={{ background: st.bg, color: st.cor }}> {st.label}</span>
                        <div className="ativ-acoes">
                          <button className="btn-acao-sm btn-ver" onClick={(e) => { e.stopPropagation(); setVerId(a.id_atividade); }}>Ver</button>
                          {isAdmin && (
                            <>
                              <button className="btn-acao-sm btn-edit" onClick={(e) => { e.stopPropagation(); abrirEdicao(a.id_atividade); }}>Editar</button>
                              <button className="btn-acao-sm btn-del" onClick={(e) => { e.stopPropagation(); setDelId(a.id_atividade); }}>Excluir</button>
                            </>
                          )}
                        </div>
                      </div>
                      <button className="btn-esc-card" onClick={(e) => { e.stopPropagation(); abrirEscalacao(a); }}> {!ehGestor(user) ? 'Ver Escalação' : 'Montar Escalação'}</button>
                      {isAdmin && a.tipo_atividade === 2 && a.status_atividade !== 2 && (
                        <button className="btn-esc-card" style={{ background: 'rgba(0,201,122,0.08)', borderColor: 'rgba(0,201,122,0.3)', color: '#00C97A', marginTop: 6 }}
                          onClick={(e) => { e.stopPropagation(); abrirFinalizarJogo(a.id_atividade); }}> Finalizar Jogo / Lançar Pontos</button>
                      )}
                      {a.status_atividade === 2 && a.tipo_atividade === 2 && (
                        <div style={{ background: 'rgba(0,201,122,0.06)', border: '1px solid rgba(0,201,122,0.15)', borderRadius: 8, padding: '8px 12px', marginTop: 6, fontSize: 12, color: '#00C97A', fontWeight: 700, textAlign: 'center' }}>
                          {' Finalizado' + (a.placar_pro != null ? ' · ' + a.placar_pro + '×' + (a.placar_contra || 0) : '') + (a.time_oponente ? ' vs ' + a.time_oponente : '')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={'table-wrapper' + (visao === 'tabela' ? ' visible' : '')}>
              <div className="table-responsive">
                <table className="table">
                  <thead><tr>
                    <ThOrdenavel campo="id_atividade" tipo="numero" ordem={ordem} setOrdem={setOrdem}>ID</ThOrdenavel>
                    <ThOrdenavel campo="nome_atividade" tipo="texto" ordem={ordem} setOrdem={setOrdem}>Nome</ThOrdenavel>
                    <th>Responsável</th><th>Local</th>
                    <ThOrdenavel campo="data_atividade" tipo="data" ordem={ordem} setOrdem={setOrdem}>Data</ThOrdenavel>
                    <th>Tipo</th><th>Status</th><th>Ações</th>
                  </tr></thead>
                  <tbody>
                    {!lista.length ? (
                      <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--cinza)', padding: 32 }}>Nenhuma atividade encontrada</td></tr>
                    ) : lista.map((a) => {
                      const t = TIPO[a.tipo_atividade] || TIPO[1];
                      const st = status(a.status_atividade);
                      return (
                        <tr key={a.id_atividade}>
                          <td style={{ color: 'var(--cinza)' }}>#{a.id_atividade}</td>
                          <td style={{ fontWeight: 700 }}>{a.nome_atividade}</td>
                          <td>{a.usuario?.nome_usuario || '—'}</td>
                          <td>{a.lugar_atividade || '—'}</td>
                          <td style={{ color: 'var(--cinza)', fontSize: 13 }}>{a.data_atividade ? a.data_atividade.replace('T', ' ').slice(0, 16) : '—'}</td>
                          <td><span style={{ background: t.bg, color: t.cor, padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>{t.emoji} {t.label}</span></td>
                          <td><span style={{ background: st.bg, color: st.cor, padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>{st.label}</span></td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <button className="btn-acao-sm btn-ver" onClick={() => setVerId(a.id_atividade)}>Ver</button>
                            {isAdmin && (
                              <>
                                <button className="btn-acao-sm btn-edit" onClick={() => abrirEdicao(a.id_atividade)}>Editar</button>
                                <button className="btn-acao-sm btn-del" onClick={() => setDelId(a.id_atividade)}>Excluir</button>
                              </>
                            )}
                            <button className="btn-acao-sm btn-bask" onClick={() => abrirEscalacao(a)}>Escalar</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className={'secao' + (aba === 'form' ? ' visible' : '')}>
          <div className="card-dark">
            <h4>{editId ? ' Editar Atividade' : ' Nova Atividade'}</h4>
            {/* Enter avança apenas pelos campos visíveis; no último campo, confirma o envio. */}
            <form onSubmit={salvar} onKeyDown={(e) => { if (e.target.type !== 'checkbox') enterAvanca(e, (c) => c.checkValidity()); }}>
              <div className="row g-3">
                <div className="col-md-6"><label className="form-label">Nome da Atividade</label><input className="form-control" placeholder="Ex: Treino, Jogo Amistoso..." required value={form.nome_atividade} onChange={set('nome_atividade')} /></div>
                <div className="col-md-6"><label className="form-label">Responsável</label>
                  <select className="form-select" required value={form.usuario_id} onChange={set('usuario_id')}>
                    <option value="">Selecionar...</option>
                    {responsaveis.map((u) => <option key={u.id_usuario} value={u.id_usuario}>{' ' + u.nome_usuario}</option>)}
                  </select>
                </div>
                <div className="col-md-4"><label className="form-label">Local</label><input className="form-control" placeholder="Ginásio, Quadra..." value={form.lugar_atividade} onChange={set('lugar_atividade')} /></div>
                <div className="col-md-4"><label className="form-label">Data e Hora</label><input type="datetime-local" className="form-control" required value={form.data_atividade} onChange={set('data_atividade')} /></div>
                <div className="col-md-2"><label className="form-label">Tipo</label>
                  <select className="form-select" value={form.tipo_atividade} onChange={set('tipo_atividade')}>
                    <option value="1">Treino</option><option value="2">Jogo</option><option value="3">Evento</option><option value="4">Competição</option>
                  </select>
                </div>
                <div className="col-md-2"><label className="form-label">Status</label>
                  <select className="form-select" value={form.status_atividade} onChange={set('status_atividade')}><option value="1">Ativo</option><option value="0">Cancelado</option><option value="2">Finalizado</option></select>
                </div>
                {/* Campo time oponente - só aparece para jogos */}
                {ehJogo && (
                  <div className="col-md-6">
                    <label className="form-label" htmlFor="inpOponente">Time Oponente / Adversário *</label>
                    <input className="form-control" id="inpOponente" required placeholder="Ex: Escola Municipal ABC, Time Estrela..." value={form.time_oponente} onChange={set('time_oponente')} />
                  </div>
                )}
                <div className="col-12">
                  <div className="form-check" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" className="form-check-input" id="chkRecorrente" style={{ margin: 0, cursor: 'pointer' }} checked={form.recorrente} onChange={set('recorrente')} />
                    <label className="form-label" htmlFor="chkRecorrente" style={{ cursor: 'pointer', display: 'inline', margin: 0 }}>Repetir toda semana no mesmo dia e horário</label>
                  </div>
                </div>
                {form.recorrente && (
                  <div className="col-md-4">
                    <label className="form-label" htmlFor="inp-fim-rec">Repetir até (opcional)</label>
                    <CampoData id="inp-fim-rec" min={form.data_atividade.slice(0, 10) || undefined} value={form.fim_recorrencia} onChange={set('fim_recorrencia')} />
                  </div>
                )}
                <div className="col-12 d-flex gap-2 mt-2">
                  <button type="submit" className="btn-cadastrar">{editId ? 'Salvar Alterações' : 'Cadastrar Atividade'}</button>
                  <button type="button" className="btn-cancelar-form" onClick={cancelarForm}>Cancelar</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* MODAL VER */}
      <Modal id="modalVer" aberto={!!va} onFechar={() => setVerId(null)}>
        {va && (
          <>
            <div className="modal-header"><h5 className="modal-title" style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 22, letterSpacing: 1 }}>Detalhes</h5><button className="btn-close" onClick={() => setVerId(null)}></button></div>
            <div className="modal-body">
              <div style={{ background: vt.bg, border: '1px solid ' + vt.cor + '33', borderRadius: 12, padding: '14px 18px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 28 }}>{vt.emoji}</span>
                <div>
                  <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 22, color: vt.cor, letterSpacing: 1 }}>{vt.label}</div>
                  <div style={{ fontSize: 12, color: vt.cor, opacity: 0.7 }}>{va.nome_atividade}</div>
                </div>
              </div>
              <div className="detalhe-grid">
                <div className="detalhe-item full"><div className="detalhe-label">Nome</div><div className="detalhe-valor">{va.nome_atividade}</div></div>
                <div className="detalhe-item"><div className="detalhe-label">Data</div><div className="detalhe-valor" style={{ fontSize: 12 }}>{va.data_atividade ? new Date(va.data_atividade).toLocaleString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : '—'}</div></div>
                <div className="detalhe-item"><div className="detalhe-label">Horário</div><div className="detalhe-valor">{va.data_atividade ? new Date(va.data_atividade).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}</div></div>
                <div className="detalhe-item"><div className="detalhe-label">Local</div><div className="detalhe-valor">{va.lugar_atividade || '—'}</div></div>
                <div className="detalhe-item"><div className="detalhe-label">Responsável</div><div className="detalhe-valor">{va.usuario?.nome_usuario || '—'}</div></div>
                <div className="detalhe-item"><div className="detalhe-label">Status</div><div className="detalhe-valor"> {status(va.status_atividade).label}</div></div>
                {va.recorrente && (
                  <div className="detalhe-item full" style={{ background: 'rgba(0,201,122,0.06)', borderColor: 'rgba(0,201,122,0.15)' }}>
                    <div className="detalhe-label">Recorrência</div>
                    <div className="detalhe-valor">🔁 Toda {va.data_atividade ? new Date(va.data_atividade).toLocaleDateString('pt-BR', { weekday: 'long' }) : 'semana'}{va.fim_recorrencia ? ', até ' + new Date(va.fim_recorrencia + 'T00:00:00').toLocaleDateString('pt-BR') : ''}</div>
                  </div>
                )}
                {va.tipo_atividade === 2 && (
                  <>
                    <div className="detalhe-item full" style={{ background: 'rgba(255,176,32,0.06)', borderColor: 'rgba(255,176,32,0.15)' }}><div className="detalhe-label">Adversário</div><div className="detalhe-valor">{va.time_oponente || 'Não informado'}</div></div>
                    {va.status_atividade === 2 && va.placar_pro != null && (
                      <div className="detalhe-item full" style={{ background: 'rgba(0,201,122,0.06)', borderColor: 'rgba(0,201,122,0.15)', textAlign: 'center' }}>
                        <div className="detalhe-label">Placar Final</div>
                        <div className="detalhe-valor" style={{ fontFamily: 'Bebas Neue,cursive', fontSize: 26, color: '#00C97A' }}>{va.placar_pro} × {va.placar_contra || 0}</div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="modal-footer"><button className="btn btn-sm btn-secondary" onClick={() => setVerId(null)}>Fechar</button></div>
          </>
        )}
      </Modal>

      {/* MODAL EXCLUIR */}
      <Modal id="modalDel" tamanho="sm" aberto={!!delId} onFechar={() => setDelId(null)}>
        <div className="modal-body" style={{ padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}></div>
          <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 20, marginBottom: 8 }}>Excluir Atividade?</div>
          <div style={{ fontSize: 13, color: 'var(--cinza)', marginBottom: 20 }}>Esta ação não pode ser desfeita.</div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setDelId(null)}>Cancelar</button>
            <button onClick={excluir} style={{ background: 'rgba(255,80,80,0.15)', border: '1px solid rgba(255,80,80,0.3)', color: '#FF6B6B', padding: '7px 20px', borderRadius: 8, fontFamily: "'Bebas Neue',cursive", fontSize: 15, cursor: 'pointer' }}>Excluir</button>
          </div>
        </div>
      </Modal>

      {/* MODAL ESCALAÇÃO (só leitura, atleta) */}
      <Modal id="modalEscalacao" tamanho="xl" aberto={!!esc} onFechar={() => setEsc(null)}>
        {esc && (
          <>
            <div className="modal-header">
              <div>
                <h5 className="modal-title" style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 26, letterSpacing: 2, color: '#FFB020' }}> Escalação de Basquete</h5>
                <div style={{ fontSize: 13, color: '#8899BB', marginTop: 2, fontWeight: 600 }}>{esc.nome}</div>
              </div>
              <button className="btn-close" style={{ filter: 'invert(1)' }} onClick={() => setEsc(null)}></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 28, color: '#00C97A' }}>{esc.dados.length}</div>
                  <div style={{ fontSize: 10, color: '#8899BB', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Convocados</div>
                </div>
                <div style={{ background: 'rgba(255,176,32,0.06)', border: '1px solid rgba(255,176,32,0.15)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 28, color: '#FFB020' }}>{escTit.length}</div>
                  <div style={{ fontSize: 10, color: '#8899BB', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Titulares</div>
                </div>
                <div style={{ background: 'rgba(78,201,255,0.06)', border: '1px solid rgba(78,201,255,0.15)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 28, color: '#4EC9FF' }}>{escRes.length}</div>
                  <div style={{ fontSize: 10, color: '#8899BB', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Reservas</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 310px', gap: 20, alignItems: 'start' }}>
                {/* QUADRA SVG */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 16 }}>
                  <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 16, letterSpacing: 1, color: '#8899BB', marginBottom: 12 }}> Quadra</div>
                  <div style={{ position: 'relative', width: '100%', paddingBottom: '58%', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                    <QuadraAtividade />
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                      {escTit.filter((e) => POS_BASK[e.posicao]).map((e) => {
                        const coord = POS_BASK[e.posicao];
                        const nome = e.usuario?.nome_usuario || '?', cor = corP(e.posicao);
                        return (
                          <div key={e.id_escalacao} style={{ position: 'absolute', transform: 'translate(-50%,-50%)', textAlign: 'center', left: coord.l + '%', top: coord.t + '%' }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: cor, color: '#0A1628', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, margin: '0 auto', border: '2px solid rgba(255,255,255,0.6)', boxShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{e.numero_camisa || POS_NUM[e.posicao] || iniciais(nome)}</div>
                            <div style={{ fontSize: 8, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.9)', whiteSpace: 'nowrap', maxWidth: 54, overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2, fontWeight: 700 }}>{nome.split(' ')[0]}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6, marginTop: 12 }}>
                    {[['#FFB020', '1', 'Armador'], ['#4EC9FF', '2', 'Ala-Arm.'], ['#00C97A', '3', 'Ala'], ['#A78FFF', '4', 'Ala-Pivô'], ['#FF6B6B', '5', 'Pivô']].map(([c, n, nome]) => (
                      <div key={n} style={{ textAlign: 'center' }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: c, margin: '0 auto 3px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#0A1628' }}>{n}</div>
                        <div style={{ fontSize: 9, color: 'var(--cinza)' }}>{nome}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* LISTAS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 460, overflowY: 'auto', paddingRight: 4 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#8899BB', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>Titulares <span style={{ background: 'rgba(255,176,32,0.15)', color: '#FFB020', padding: '2px 8px', borderRadius: 6, fontSize: 12, fontFamily: "'Bebas Neue',cursive" }}>{escTit.length}/5</span></div>
                    <div>{escTit.length ? escTit.map(escItem) : <div style={{ textAlign: 'center', padding: 12, color: '#8899BB', fontSize: 12 }}>Nenhum titular</div>}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#8899BB', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>Reservas <span style={{ background: 'rgba(78,201,255,0.15)', color: '#4EC9FF', padding: '2px 8px', borderRadius: 6, fontSize: 12, fontFamily: "'Bebas Neue',cursive" }}>{escRes.length}</span></div>
                    <div>{escRes.length ? escRes.map(escItem) : <div style={{ textAlign: 'center', padding: 12, color: '#8899BB', fontSize: 12 }}>Nenhum reserva</div>}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <a href="/escalacao.html" onClick={(e) => { e.preventDefault(); navigate('/escalacao.html'); }} style={{ fontSize: 13, color: '#FFB020', textDecoration: 'none', fontWeight: 700 }}>Abrir página completa de escalação →</a>
              <button style={{ ...ESTILO_BTN_CINZA, fontSize: 16, padding: '9px 24px' }} onClick={() => setEsc(null)}>Fechar</button>
            </div>
          </>
        )}
      </Modal>

      {/* MODAL FINALIZAR JOGO */}
      <Modal id="modalFinalizarJogo" tamanho="lg" aberto={!!fj} onFechar={() => setFj(null)}>
        {fj && (
          <>
            <div className="modal-header">
              <div>
                <h5 className="modal-title" style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 24, letterSpacing: 1 }}> Finalizar Jogo</h5>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#FFB020', marginTop: 2 }}>{fj.nome}</div>
                <div style={{ fontSize: 12, color: '#8899BB', marginTop: 2 }}>{fj.oponente}</div>
              </div>
              <button className="btn-close" style={{ filter: 'invert(1)' }} onClick={() => setFj(null)}></button>
            </div>
            <div className="modal-body">
              {/* PLACAR */}
              <div style={{ background: 'rgba(255,176,32,0.06)', border: '1px solid rgba(255,176,32,0.2)', borderRadius: 14, padding: '18px 24px', marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#8899BB', marginBottom: 14, textAlign: 'center' }}>Placar Final</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#00C97A', fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>NOSSO TIME</div>
                    <input type="number" min="0" max="999" placeholder="0" value={fj.pro} onChange={(e) => setFj({ ...fj, pro: e.target.value })}
                      style={{ width: 90, background: 'rgba(0,201,122,0.08)', border: '2px solid rgba(0,201,122,0.35)', borderRadius: 12, color: '#00C97A', fontFamily: "'Bebas Neue',cursive", fontSize: 40, textAlign: 'center', padding: 8, outline: 'none' }} />
                  </div>
                  <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 40, color: '#8899BB' }}>×</div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#FF6B6B', fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>ADVERSÁRIO</div>
                    <input type="number" min="0" max="999" placeholder="0" value={fj.contra} onChange={(e) => setFj({ ...fj, contra: e.target.value })}
                      style={{ width: 90, background: 'rgba(255,80,80,0.08)', border: '2px solid rgba(255,80,80,0.25)', borderRadius: 12, color: '#FF6B6B', fontFamily: "'Bebas Neue',cursive", fontSize: 40, textAlign: 'center', padding: 8, outline: 'none' }} />
                  </div>
                </div>
              </div>

              {/* PONTOS JOGADORES */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '16px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#8899BB', marginBottom: 12 }}> Pontos por Jogador</div>
                <div style={{ maxHeight: 320, overflowY: 'auto', paddingRight: 4 }}>
                  {!fj.escalacao.length ? (
                    <div style={{ textAlign: 'center', padding: 20, color: '#8899BB', fontSize: 13 }}>Nenhum jogador escalado neste jogo.<br />Escale jogadores antes de finalizar.</div>
                  ) : (
                    <>
                      {fj.escalacao.some(ehTitular) && <><div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#FFB020', marginBottom: 4 }}>Titulares</div>{fj.escalacao.filter(ehTitular).map(linhaPontos)}</>}
                      {fj.escalacao.some(ehReserva) && <><div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#4EC9FF', margin: '12px 0 4px' }}>Reservas</div>{fj.escalacao.filter(ehReserva).map(linhaPontos)}</>}
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 12, color: '#8899BB' }}>Os pontos serão usados para calcular a média no Desempenho</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setFj(null)} style={{ ...ESTILO_BTN_CINZA, fontSize: 15, letterSpacing: 1, padding: '9px 20px', borderRadius: 9 }}>Cancelar</button>
                <button onClick={confirmarFinalizarJogo} style={{ background: 'linear-gradient(135deg,#00C97A,#00A865)', border: 'none', color: '#0A1628', fontFamily: "'Bebas Neue',cursive", fontSize: 16, letterSpacing: 2, padding: '9px 28px', borderRadius: 9, cursor: 'pointer' }}> Confirmar e Finalizar</button>
              </div>
            </div>
          </>
        )}
      </Modal>

      <ToastsIcone toasts={toasts} />
    </div>
  );
}
