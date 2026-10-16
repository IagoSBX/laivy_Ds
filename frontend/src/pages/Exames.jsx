import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import CampoData from '../components/CampoData.jsx';
import Modal from '../components/Modal.jsx';
import Sidebar from '../components/Sidebar.jsx';
import ThOrdenavel from '../components/ThOrdenavel.jsx';
import { authFetch, getJson, iniciais, lerImagem } from '../lib/api.js';
import { ordenar } from '../lib/ordenacao.js';
import { ehPreparo, timeSelecionado, usuarioLogado } from '../lib/sessao.js';
import useTitulo from '../lib/useTitulo.js';
import useToasts from '../lib/useToasts.js';
import { enterAvanca } from '../lib/validacao.js';
import '../styles/pages/exames.css';

const ORDENACAO = [
  { valor: 'nome_asc', label: 'Atleta (A-Z)', campo: 'nome_usuario', tipo: 'texto', direcao: 'asc' },
  { valor: 'nome_desc', label: 'Atleta (Z-A)', campo: 'nome_usuario', tipo: 'texto', direcao: 'desc' },
  { valor: 'data_asc', label: 'Data (mais antiga)', campo: 'data_inicio_exame', tipo: 'data', direcao: 'asc' },
  { valor: 'data_desc', label: 'Data (mais recente)', campo: 'data_inicio_exame', tipo: 'data', direcao: 'desc' },
];
const exameGetter = (item, campo) => (campo === 'nome_usuario' ? item.usuario?.nome_usuario : item[campo]);

const FORM_VAZIO = {
  foto_exame: '', usuario_id: '', data_inicio_exame: '', data_fim_exame: '', peso_usuario: '', altura_usuario: '',
  taxa_gordura_usuario: '', status_usuario: '1', observacoes_exame: '',
};

const DIA = 1000 * 60 * 60 * 24;
const dataBr = (iso) => (iso ? new Date(iso + ' ').toLocaleDateString('pt-BR') : '—');

// Contadores mostram apenas exames ainda válidos (não vencidos).
function exameValido(e) {
  if (!e.data_fim_exame) return true;
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  return new Date(e.data_fim_exame + ' ') >= hoje;
}

function imcInfo(peso, altura) {
  if (!peso || !altura || altura <= 0) return null;
  const v = peso / (altura * altura);
  let cls, cor;
  if (v < 18.5) { cls = 'Abaixo'; cor = '#4EC9FF'; } else if (v < 25) { cls = 'Normal'; cor = '#00C97A'; } else if (v < 30) { cls = 'Sobrepeso'; cor = '#FFB020'; } else { cls = 'Obeso'; cor = '#FF6B6B'; }
  return { val: v.toFixed(1), cls, cor };
}

// IMC detalhado do formulário (barra de 0–100%)
function imcForm(pesoTxt, alturaTxt) {
  const peso = parseFloat(pesoTxt), altura = parseFloat(alturaTxt);
  if (!peso || !altura || altura <= 0) return null;
  const imc = peso / (altura * altura);
  let cls, cor, pct;
  if (imc < 18.5) { cls = 'Abaixo do peso'; cor = '#4EC9FF'; pct = Math.min(imc / 18.5 * 30, 30); } else if (imc < 25) { cls = 'Peso normal '; cor = '#00C97A'; pct = 30 + ((imc - 18.5) / 6.5) * 30; } else if (imc < 30) { cls = 'Sobrepeso'; cor = '#FFB020'; pct = 60 + ((imc - 25) / 5) * 20; } else { cls = 'Obesidade'; cor = '#FF6B6B'; pct = Math.min(80 + ((imc - 30) / 10) * 20, 100); }
  return { valor: imc.toFixed(1), cls, cor, pct };
}

function BadgeVencimento({ fimIso }) {
  if (!fimIso) return null;
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const diff = Math.ceil((new Date(fimIso + ' ') - hoje) / DIA);
  if (diff < 0) return <span style={{ background: 'rgba(255,80,80,0.18)', color: '#FF6B6B', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, marginLeft: 6 }}>Vencido</span>;
  if (diff <= 30) return <span style={{ background: 'rgba(255,176,32,0.18)', color: '#FFB020', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, marginLeft: 6 }}>Vence em {diff}d </span>;
  return null;
}

export default function Exames() {
  useTitulo('Exames — LAIVY');
  const [params] = useSearchParams();
  const user = usuarioLogado();
  const isAtleta = user.tipo_usuario === 3;
  // exames: Admin, Treinador e Preparador Físico editam; atleta e período de teste só veem
  const somenteLeitura = !ehPreparo(user);
  const isAdmin = ehPreparo(user);
  const ts = timeSelecionado();
  const urlTime = (base) => (ts ? base + '?idTime=' + ts.id : base);

  const [todos, setTodos] = useState(null);
  const [atletas, setAtletas] = useState([]);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [ordem, setOrdem] = useState({ campo: 'data_inicio_exame', tipo: 'data', direcao: 'desc' });
  const [visao, setVisao] = useState('cards');
  const [aba, setAba] = useState(params.get('novo') === '1' ? 'form' : 'lista');
  const [toasts, toast] = useToasts();

  const [verId, setVerId] = useState(null);
  const [delAlvo, setDelAlvo] = useState(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [editId, setEditId] = useState('');
  const inputFotoRef = useRef(null);
  const inputFotoVerRef = useRef(null);

  const dados = !todos ? [] : isAtleta ? todos.filter((e) => e.usuario?.id_usuario === user.id_usuario) : todos;

  function carregar() {
    getJson(urlTime('/exames')).then(setTodos).catch(() => setTodos([]));
  }

  useEffect(() => {
    carregar();
    getJson(urlTime('/usuarios')).then((d) => setAtletas(d.filter((u) => u.tipo_usuario === 3))).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- STATS ----------
  const validos = dados.filter(exameValido);
  const pesos = validos.filter((e) => e.peso_usuario).map((e) => parseFloat(e.peso_usuario));
  const st = todos === null ? null : {
    total: validos.length,
    aptos: validos.filter((e) => e.status_usuario === 1 || e.status_usuario === '1').length,
    inaptos: validos.filter((e) => e.status_usuario === 0 || e.status_usuario === '0').length,
    peso: pesos.length ? (pesos.reduce((a, b) => a + b, 0) / pesos.length).toFixed(1) : '—',
  };

  // ---------- ALERTA DE VENCIMENTO (30 dias, só treinador/admin, lista completa) ----------
  const agora = new Date();
  const alerta30 = !isAdmin || !todos ? [] : todos.filter((e) => {
    if (!e.data_fim_exame) return false;
    const diff = (new Date(e.data_fim_exame + ' ') - agora) / DIA;
    return diff >= 0 && diff <= 30;
  });

  const lista = ordenar(dados.filter((e) => {
    const b = busca.toLowerCase();
    return (!b || (e.usuario?.nome_usuario || '').toLowerCase().includes(b)) && (filtroStatus === '' || String(e.status_usuario) === filtroStatus);
  }), { ...ordem, getter: exameGetter });
  const valorOrdem = ORDENACAO.find((o) => o.campo === ordem.campo && o.direcao === ordem.direcao)?.valor || '';

  // ---------- FORM ----------
  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e?.target ? e.target.value : e }));
  // Fim da validade não pode ser antes do início (o backend confere a mesma regra).
  const periodoOk = !form.data_inicio_exame || !form.data_fim_exame || form.data_fim_exame >= form.data_inicio_exame;
  const imc = imcForm(form.peso_usuario, form.altura_usuario);

  function cancelarForm() {
    setForm(FORM_VAZIO);
    setEditId('');
    setAba('lista');
  }

  function abrirEdicao(id) {
    if (somenteLeitura) { toast('Acesso restrito.', false); return; }
    const e = dados.find((x) => x.id_exame === id);
    if (!e) return;
    setForm({
      foto_exame: e.foto_exame || '',
      usuario_id: e.usuario?.id_usuario ? String(e.usuario.id_usuario) : '',
      data_inicio_exame: e.data_inicio_exame || '', data_fim_exame: e.data_fim_exame || '',
      peso_usuario: e.peso_usuario ?? '', altura_usuario: e.altura_usuario ?? '', taxa_gordura_usuario: e.taxa_gordura_usuario ?? '',
      status_usuario: String(e.status_usuario ?? 1), observacoes_exame: e.observacoes_exame || '',
    });
    setEditId(String(e.id_exame));
    setAba('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function salvar(ev) {
    ev.preventDefault();
    if (somenteLeitura) { toast('Acesso restrito.', false); return; }
    if (!periodoOk) { toast('A data de fim não pode ser anterior à data de início.', false); return; }
    const payload = {
      data_inicio_exame: form.data_inicio_exame,
      data_fim_exame: form.data_fim_exame,
      observacoes_exame: form.observacoes_exame,
      altura_usuario: parseFloat(form.altura_usuario) || null,
      peso_usuario: parseFloat(form.peso_usuario) || null,
      taxa_gordura_usuario: parseFloat(form.taxa_gordura_usuario) || null,
      status_usuario: parseInt(form.status_usuario),
      foto_exame: form.foto_exame || null,
      usuario: { id_usuario: parseInt(form.usuario_id) },
    };
    try {
      const r = await authFetch(editId ? '/exames/' + editId : '/exames', { method: editId ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      if (!r.ok) { const erro = await r.json().catch(() => ({})); throw new Error(erro.erro || 'Não foi possível salvar o exame.'); }
      toast(editId ? 'Exame atualizado!' : 'Exame cadastrado!');
      cancelarForm();
      carregar();
    } catch (e) {
      toast(e.message || 'Erro ao salvar.', false);
    }
  }

  async function carregarFoto(ev) {
    const file = ev.target.files[0];
    ev.target.value = '';
    if (!file) return;
    try { const b64 = await lerImagem(file); setForm((f) => ({ ...f, foto_exame: b64 })); } catch { toast('Foto muito grande. Máximo 2MB.', false); }
  }

  // ---------- ANEXAR FOTO EM EXAME EXISTENTE ----------
  async function carregarFotoVer(ev) {
    const file = ev.target.files[0];
    ev.target.value = '';
    if (!file || !verId) return;
    let base64;
    try { base64 = await lerImagem(file); } catch { toast('Foto muito grande. Máximo 2MB.', false); return; }
    try {
      const atualizado = await authFetch('/exames/' + verId, { method: 'PUT', body: JSON.stringify({ foto_exame: base64 }) }).then((r) => r.json());
      setTodos((lista) => lista.map((x) => (x.id_exame === verId ? { ...x, foto_exame: atualizado.foto_exame } : x)));
      toast('Foto anexada!');
    } catch {
      toast('Erro ao anexar foto.', false);
    }
  }

  async function excluir() {
    if (!delAlvo) return;
    try {
      await authFetch('/exames/' + delAlvo.id, { method: 'DELETE' });
      toast('Exame excluído!');
      setDelAlvo(null);
      carregar();
    } catch {
      toast('Erro ao excluir.', false);
    }
  }

  const acoes = (e, parar) => isAdmin && (
    <>
      <button className="btn-acao-sm btn-edit" onClick={(ev) => { if (parar) ev.stopPropagation(); abrirEdicao(e.id_exame); }}>Editar</button>
      <button className="btn-acao-sm btn-del" onClick={(ev) => { if (parar) ev.stopPropagation(); setDelAlvo({ id: e.id_exame, nome: e.usuario?.nome_usuario || '—' }); }}>Excluir</button>
    </>
  );

  const ve = verId ? dados.find((x) => x.id_exame === verId) : null;
  const veImc = ve && imcInfo(ve.peso_usuario, ve.altura_usuario);
  const veApto = ve?.status_usuario == 1;

  return (
    <div className="pagina pg-exames bs">
      <Sidebar />

      <main className="main">
        <div className="page-header">
          <div><h1>Exames</h1><p>Avaliações físicas e monitoramento de saúde dos atletas</p></div>
        </div>

        {/* ALERTA VENCIMENTO (só para admin/treinador) */}
        {alerta30.length > 0 && (
          <div style={{ display: 'flex', background: 'rgba(255,176,32,0.08)', border: '1px solid rgba(255,176,32,0.25)', borderRadius: 14, padding: '14px 20px', marginBottom: 18, alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}></span>
            <div>
              <div style={{ fontWeight: 700, color: '#FFB020' }}>{alerta30.length} exame(s) vencem em até 30 dias</div>
              <div style={{ fontSize: 12, color: 'var(--cinza)', marginTop: 2 }}>
                {alerta30.map((e) => (e.usuario?.nome_usuario || '—') + ' (' + Math.ceil((new Date(e.data_fim_exame + ' ') - agora) / DIA) + 'd)').join(', ')}
              </div>
            </div>
          </div>
        )}

        {/* STATS */}
        <div className="stats-row">
          <div className="stat-card"><div className="stat-dot" style={{ background: 'var(--cinza)' }}></div><div><div className="stat-num" style={{ color: 'var(--branco)' }}>{st ? st.total : '—'}</div><div className="stat-label">Total</div></div></div>
          <div className="stat-card"><div className="stat-dot" style={{ background: '#00C97A' }}></div><div><div className="stat-num" style={{ color: '#00C97A' }}>{st ? st.aptos : '—'}</div><div className="stat-label">Aptos</div></div></div>
          <div className="stat-card"><div className="stat-dot" style={{ background: '#FF6B6B' }}></div><div><div className="stat-num" style={{ color: '#FF6B6B' }}>{st ? st.inaptos : '—'}</div><div className="stat-label">Inaptos</div></div></div>
          <div className="stat-card"><div className="stat-dot" style={{ background: '#4EC9FF' }}></div><div><div className="stat-num" style={{ color: '#4EC9FF' }}>{st ? st.peso : '—'}</div><div className="stat-label">Peso Médio (kg)</div></div></div>
        </div>

        {/* TABS */}
        <div className="tabs">
          <button className={'tab' + (aba === 'lista' ? ' active' : '')} onClick={() => setAba('lista')}> Lista</button>
          {!somenteLeitura && <button className={'tab' + (aba === 'form' ? ' active' : '')} onClick={() => setAba('form')}> Novo Exame</button>}
        </div>

        {/* TAB LISTA */}
        <div className={'secao' + (aba === 'lista' ? ' visible' : '')}>
          <div className="card-dark" style={{ padding: '18px 24px' }}>
            <div className="toolbar">
              <div className="search-wrap"><input className="search-bar" placeholder="Buscar por atleta..." value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
              <select className="select-filtro" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
                <option value="">Todos os status</option>
                <option value="1"> Apto</option>
                <option value="0"> Inapto</option>
              </select>
              <div>
                <select className="select-filtro sort-dropdown" value={valorOrdem}
                  onChange={(e) => { const o = ORDENACAO.find((x) => x.valor === e.target.value); if (o) setOrdem({ campo: o.campo, tipo: o.tipo, direcao: o.direcao }); }}>
                  {!valorOrdem && <option value="" hidden></option>}
                  {ORDENACAO.map((o) => <option key={o.valor} value={o.valor}>{o.label}</option>)}
                </select>
              </div>
              <div className="view-toggle ml-auto">
                <button className={'view-btn' + (visao === 'cards' ? ' active' : '')} title="Cards" onClick={() => setVisao('cards')}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg></button>
                <button className={'view-btn' + (visao === 'tabela' ? ' active' : '')} title="Tabela" onClick={() => setVisao('tabela')}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg></button>
              </div>
              {!somenteLeitura && <button className="btn-novo" onClick={() => setAba('form')}>+ Novo</button>}
            </div>

            {/* CARDS */}
            <div className={'cards-wrapper' + (visao === 'cards' ? ' visible' : '')}>
              <div className="cards-grid">
                {!lista.length ? (
                  <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                    <div className="empty-icon" style={{ color: '#8899BB', marginBottom: 8, opacity: 0.6 }}><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg></div>
                    <p>Nenhum exame encontrado</p>
                  </div>
                ) : lista.map((e) => {
                  const apto = e.status_usuario == 1;
                  const imcE = imcInfo(e.peso_usuario, e.altura_usuario);
                  return (
                    <div key={e.id_exame} className="exam-card" style={{ borderLeftColor: apto ? '#00C97A' : '#FF6B6B' }} onClick={() => setVerId(e.id_exame)}>
                      <div className="exam-card-top">
                        <div className="exam-atleta">
                          <div className="exam-avatar" style={{ background: 'rgba(0,201,122,0.15)', color: '#00C97A' }}>{iniciais(e.usuario?.nome_usuario || '—')}</div>
                          <div>
                            <div className="exam-nome">{e.usuario?.nome_usuario || '—'}<BadgeVencimento fimIso={e.data_fim_exame} />{e.foto_exame && <span title="Possui foto anexada" style={{ marginLeft: 6, fontSize: 11 }}></span>}</div>
                            <div className="exam-data"> {dataBr(e.data_inicio_exame)}</div>
                          </div>
                        </div>
                        <span className="status-pill" style={{ background: apto ? 'rgba(0,201,122,0.15)' : 'rgba(255,80,80,0.12)', color: apto ? '#00C97A' : '#FF6B6B' }}>{apto ? ' Apto' : ' Inapto'}</span>
                      </div>
                      <div className="exam-metricas">
                        <div className="exam-metrica"><div className="exam-metrica-val" style={{ color: '#4EC9FF' }}>{e.peso_usuario || '—'}</div><div className="exam-metrica-label">Peso kg</div></div>
                        <div className="exam-metrica"><div className="exam-metrica-val" style={{ color: '#A78FFF' }}>{e.altura_usuario || '—'}</div><div className="exam-metrica-label">Altura m</div></div>
                        <div className="exam-metrica"><div className="exam-metrica-val" style={{ color: imcE ? imcE.cor : 'var(--cinza)' }}>{imcE ? imcE.val : '—'}</div><div className="exam-metrica-label">IMC{imcE ? ' · ' + imcE.cls : ''}</div></div>
                      </div>
                      {e.taxa_gordura_usuario ? <div style={{ fontSize: 12, color: 'var(--cinza)', marginBottom: 10 }}> Gordura corporal: <strong style={{ color: 'var(--branco)' }}>{e.taxa_gordura_usuario}%</strong></div> : null}
                      <div className="exam-footer">
                        <span style={{ fontSize: 11, color: 'var(--cinza)' }}>#{e.id_exame}</span>
                        <div className="exam-acoes">
                          <button className="btn-acao-sm btn-ver" onClick={(ev) => { ev.stopPropagation(); setVerId(e.id_exame); }}>Ver</button>
                          {acoes(e, true)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* TABELA */}
            <div className={'table-wrapper' + (visao === 'tabela' ? ' visible' : '')}>
              <div className="table-responsive">
                <table className="table">
                  <thead><tr>
                    <ThOrdenavel campo="id_exame" tipo="numero" ordem={ordem} setOrdem={setOrdem}>ID</ThOrdenavel>
                    <ThOrdenavel campo="nome_usuario" tipo="texto" ordem={ordem} setOrdem={setOrdem}>Atleta</ThOrdenavel>
                    <ThOrdenavel campo="data_inicio_exame" tipo="data" ordem={ordem} setOrdem={setOrdem}>Data Início</ThOrdenavel>
                    <th>Peso</th><th>Altura</th><th>IMC</th><th>Gordura</th><th>Status</th><th>Ações</th>
                  </tr></thead>
                  <tbody>
                    {!lista.length ? (
                      <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--cinza)', padding: 32 }}>Nenhum exame encontrado</td></tr>
                    ) : lista.map((e) => {
                      const apto = e.status_usuario == 1;
                      const imcE = imcInfo(e.peso_usuario, e.altura_usuario);
                      return (
                        <tr key={e.id_exame}>
                          <td style={{ color: 'var(--cinza)', fontSize: 12 }}>#{e.id_exame}</td>
                          <td style={{ fontWeight: 700 }}>{e.usuario?.nome_usuario || '—'}</td>
                          <td style={{ color: 'var(--cinza)' }}>{dataBr(e.data_inicio_exame)}</td>
                          <td>{e.peso_usuario ? e.peso_usuario + ' kg' : '—'}</td>
                          <td>{e.altura_usuario ? e.altura_usuario + ' m' : '—'}</td>
                          <td>{imcE ? <span style={{ color: imcE.cor, fontWeight: 700 }}>{imcE.val}</span> : '—'}</td>
                          <td>{e.taxa_gordura_usuario ? e.taxa_gordura_usuario + '%' : '—'}</td>
                          <td><span style={{ background: apto ? 'rgba(0,201,122,0.15)' : 'rgba(255,80,80,0.12)', color: apto ? '#00C97A' : '#FF6B6B', padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>{apto ? 'Apto' : 'Inapto'}</span></td>
                          <td>
                            <button className="btn-acao-sm btn-ver" onClick={() => setVerId(e.id_exame)}>Ver</button>
                            {acoes(e, false)}
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

        {/* TAB FORM */}
        <div className={'secao' + (aba === 'form' ? ' visible' : '')}>
          <div className="card-dark">
            <h4>{editId ? ' Editar Exame' : ' Novo Exame'}</h4>
            {/* Enter avança pelos campos válidos; no último campo, confirma o envio. */}
            <form onSubmit={salvar} onKeyDown={(e) => enterAvanca(e, (c) => c.checkValidity())}>
              <div className="row g-3">
                {/* FOTO DO EXAME */}
                <div className="col-12">
                  <div className="exame-foto-upload-wrap">
                    <div className="exame-foto-preview" onClick={() => inputFotoRef.current.click()}>
                      {form.foto_exame
                        ? <img src={form.foto_exame} style={{ display: 'block' }} alt="preview" />
                        : (
                          <div className="exame-foto-placeholder">
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                            <span style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>Foto do Exame</span>
                          </div>
                        )}
                      <div className="exame-foto-overlay">Alterar</div>
                    </div>
                    <input type="file" ref={inputFotoRef} accept="image/*" style={{ display: 'none' }} onChange={carregarFoto} />
                    <div className="exame-foto-hint">Clique para anexar a foto do exame &bull; JPG, PNG &mdash; máx. 2MB</div>
                    <button type="button" className={'exame-foto-remove-btn' + (form.foto_exame ? ' visible' : '')} onClick={() => setForm((f) => ({ ...f, foto_exame: '' }))}>Remover foto</button>
                  </div>
                </div>

                {/* ATLETA */}
                <div className="col-12">
                  <label className="form-label" htmlFor="selectUsuario">Atleta</label>
                  <select className="form-select" id="selectUsuario" required value={form.usuario_id} onChange={set('usuario_id')}>
                    <option value="">Selecionar atleta...</option>
                    {atletas.map((u) => <option key={u.id_usuario} value={u.id_usuario}>{u.nome_usuario}</option>)}
                  </select>
                </div>

                {/* DATAS */}
                <div className="col-md-6"><label className="form-label" htmlFor="inp-ex-inicio">Data Início</label>
                  <CampoData id="inp-ex-inicio" required value={form.data_inicio_exame} onChange={set('data_inicio_exame')} /></div>
                <div className="col-md-6"><label className="form-label" htmlFor="inp-ex-fim">Data Fim</label>
                  <CampoData id="inp-ex-fim" min={form.data_inicio_exame || undefined} invalido={!periodoOk} value={form.data_fim_exame} onChange={set('data_fim_exame')} />
                  <div style={{ display: periodoOk ? 'none' : 'block', fontSize: 11, marginTop: 4, color: '#FF6B6B' }}>A data de fim não pode ser anterior à data de início.</div></div>

                <div className="col-12"><div className="form-sep"></div></div>

                {/* MÉTRICAS */}
                <div className="col-md-4">
                  <label className="form-label">Peso (kg)</label>
                  <input type="number" step="0.1" className="form-control" placeholder="70.5" value={form.peso_usuario} onChange={set('peso_usuario')} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Altura (m)</label>
                  <input type="number" step="0.01" className="form-control" placeholder="1.75" value={form.altura_usuario} onChange={set('altura_usuario')} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Taxa de Gordura (%)</label>
                  <input type="number" step="0.1" className="form-control" placeholder="15.0" value={form.taxa_gordura_usuario} onChange={set('taxa_gordura_usuario')} />
                </div>

                {/* IMC CALCULADO */}
                {imc && (
                  <div className="col-12">
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--cinza)', marginBottom: 2 }}>IMC calculado</div>
                        <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 26 }}>{imc.valor}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="imc-bar"><div className="imc-fill" style={{ width: imc.pct + '%', background: imc.cor }}></div></div>
                        <div className="imc-label" style={{ color: imc.cor }}>{imc.cls}</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="col-12"><div className="form-sep"></div></div>

                {/* STATUS + OBS */}
                <div className="col-md-4">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.status_usuario} onChange={set('status_usuario')}>
                    <option value="1"> Apto</option>
                    <option value="0"> Inapto</option>
                  </select>
                </div>
                <div className="col-md-8">
                  <label className="form-label">Observações</label>
                  <input className="form-control" placeholder="Anotações clínicas ou observações gerais..." value={form.observacoes_exame} onChange={set('observacoes_exame')} />
                </div>

                <div className="col-12 d-flex gap-2 mt-2">
                  <button type="submit" className="btn-cadastrar">{editId ? 'Salvar Alterações' : 'Cadastrar Exame'}</button>
                  <button type="button" className="btn-cancelar-form" onClick={cancelarForm}>Cancelar</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* MODAL VER */}
      <Modal id="modalVer" tamanho="lg" aberto={!!ve} onFechar={() => setVerId(null)}>
        {ve && (
          <>
            <div className="modal-header">
              <h5 className="modal-title" style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 22, letterSpacing: 1 }}>Detalhes do Exame</h5>
              <button className="btn-close" onClick={() => setVerId(null)}></button>
            </div>
            <div className="modal-body">
              <div style={{ textAlign: 'center', marginBottom: 18 }}>
                <span style={{ background: veApto ? 'rgba(0,201,122,0.15)' : 'rgba(255,80,80,0.12)', color: veApto ? '#00C97A' : '#FF6B6B', padding: '5px 16px', borderRadius: 12, fontSize: 13, fontWeight: 700 }}>{veApto ? ' Apto' : ' Inapto'}</span>
                <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 22, marginTop: 10, letterSpacing: 1 }}>{ve.usuario?.nome_usuario || '—'}</div>
                <div style={{ fontSize: 12, color: 'var(--cinza)', marginTop: 2 }}>{dataBr(ve.data_inicio_exame)}{ve.data_fim_exame ? ' → ' + dataBr(ve.data_fim_exame) : ''}</div>
              </div>
              <div style={{ textAlign: 'center', marginBottom: 18 }}>
                {ve.foto_exame ? (
                  <>
                    <div className="exame-foto-ver-box" onClick={() => inputFotoVerRef.current.click()} title="Clique para trocar a foto"><img src={ve.foto_exame} alt="Foto do exame" /></div>
                    <button type="button" className="btn-anexar-foto" onClick={() => inputFotoVerRef.current.click()}>Trocar Foto</button>
                  </>
                ) : (
                  <>
                    <div className="exame-foto-ver-box" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.03)', color: 'var(--cinza)', fontSize: 12, cursor: 'default' }}>Nenhuma foto anexada</div>
                    <button type="button" className="btn-anexar-foto" onClick={() => inputFotoVerRef.current.click()}>Anexar Foto</button>
                  </>
                )}
              </div>
              <div className="metricas-destaque">
                <div className="metrica-box"><div className="metrica-box-val">{ve.peso_usuario || '—'}</div><div className="metrica-box-unit">kg</div><div className="metrica-box-label">Peso</div></div>
                <div className="metrica-box"><div className="metrica-box-val">{ve.altura_usuario || '—'}</div><div className="metrica-box-unit">m</div><div className="metrica-box-label">Altura</div></div>
                <div className="metrica-box" style={veImc ? { borderColor: veImc.cor + '33', background: veImc.cor + '0A' } : undefined}>
                  <div className="metrica-box-val" style={veImc ? { color: veImc.cor } : undefined}>{veImc ? veImc.val : '—'}</div>
                  <div className="metrica-box-unit" style={veImc ? { color: veImc.cor } : undefined}>{veImc ? veImc.cls : ''}</div>
                  <div className="metrica-box-label">IMC</div>
                </div>
              </div>
              <div className="detalhe-grid">
                <div className="detalhe-item"><div className="detalhe-label">Gordura Corporal</div><div className="detalhe-valor">{ve.taxa_gordura_usuario ? ve.taxa_gordura_usuario + '%' : '—'}</div></div>
                <div className="detalhe-item"><div className="detalhe-label">ID do Exame</div><div className="detalhe-valor" style={{ color: 'var(--cinza)' }}>#{ve.id_exame}</div></div>
                <div className="detalhe-item full"><div className="detalhe-label">Observações</div><div className="detalhe-valor" style={{ fontSize: 13 }}>{ve.observacoes_exame || '—'}</div></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancelar-form" style={{ fontSize: 14, padding: '8px 20px' }} onClick={() => setVerId(null)}>Fechar</button>
            </div>
          </>
        )}
      </Modal>
      <input type="file" ref={inputFotoVerRef} accept="image/*" style={{ display: 'none' }} onChange={carregarFotoVer} />

      {/* MODAL CONFIRMAR EXCLUSÃO */}
      <Modal id="modalDel" tamanho="sm" aberto={!!delAlvo} onFechar={() => setDelAlvo(null)}>
        <div className="modal-body" style={{ padding: 28, textAlign: 'center' }}>
          <div style={{ fontSize: 38, marginBottom: 12 }}></div>
          <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 20, marginBottom: 8 }}>Excluir Exame?</div>
          <div style={{ fontSize: 13, color: 'var(--cinza)', marginBottom: 20 }}>{delAlvo ? 'Exame de "' + delAlvo.nome + '" será excluído permanentemente.' : ''}</div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setDelAlvo(null)}>Cancelar</button>
            <button onClick={excluir} style={{ background: 'rgba(255,80,80,0.15)', border: '1px solid rgba(255,80,80,0.3)', color: '#FF6B6B', padding: '7px 20px', borderRadius: 8, fontFamily: "'Bebas Neue',cursive", fontSize: 15, cursor: 'pointer' }}>Excluir</button>
          </div>
        </div>
      </Modal>

      <div className="toast-wrap">
        {toasts.map((t) => <div key={t.id} className={'toast-item' + (t.ok ? '' : ' erro')}> {t.msg}</div>)}
      </div>
    </div>
  );
}
