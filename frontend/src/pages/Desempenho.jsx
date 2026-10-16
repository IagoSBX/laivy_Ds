import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import CampoData from '../components/CampoData.jsx';
import Modal from '../components/Modal.jsx';
import Sidebar from '../components/Sidebar.jsx';
import ThOrdenavel from '../components/ThOrdenavel.jsx';
import { authFetch, getJson, iniciais } from '../lib/api.js';
import { ordenar } from '../lib/ordenacao.js';
import { ehPreparo, timeSelecionado, usuarioLogado } from '../lib/sessao.js';
import useTitulo from '../lib/useTitulo.js';
import useToasts from '../lib/useToasts.js';
import { enterAvanca } from '../lib/validacao.js';
import '../styles/pages/desempenho.css';

const ORDENACAO = [
  { valor: 'nome_asc', label: 'Atleta (A-Z)', campo: 'nome_usuario', tipo: 'texto', direcao: 'asc' },
  { valor: 'nome_desc', label: 'Atleta (Z-A)', campo: 'nome_usuario', tipo: 'texto', direcao: 'desc' },
  { valor: 'data_asc', label: 'Data (mais antiga)', campo: 'data_desempenho', tipo: 'data', direcao: 'asc' },
  { valor: 'data_desc', label: 'Data (mais recente)', campo: 'data_desempenho', tipo: 'data', direcao: 'desc' },
  { valor: 'pontos_desc', label: 'Pontuação (maior)', campo: 'pontuacao', tipo: 'numero', direcao: 'desc' },
  { valor: 'pontos_asc', label: 'Pontuação (menor)', campo: 'pontuacao', tipo: 'numero', direcao: 'asc' },
];
const getter = (item, campo) => (campo === 'nome_usuario' ? item.usuario?.nome_usuario : item[campo]);

const FORM_VAZIO = { usuario_id: '', data_desempenho: '', posicao_usuario: '' };
const MEDALHAS = ['', '', ''];
const BG_PODIO = ['rgba(255,215,0,0.12)', 'rgba(192,192,192,0.1)', 'rgba(205,127,50,0.1)'];
const COR_PODIO = ['#FFD700', '#C0C0C0', '#CD7F32'];

const dataBr = (iso) => (iso ? new Date(iso + ' ').toLocaleDateString('pt-BR') : '—');
const posIcon = (p) => (p === 1 || p === 2 || p === 3 ? '' : p ? `${p}º` : '—');

function Vazio({ texto, style }) {
  return (
    <div className="empty-state" style={style}>
      <div className="empty-icon" style={{ color: '#8899BB', marginBottom: 8, opacity: 0.6 }}><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg></div>
      <p>{texto}</p>
    </div>
  );
}

export default function Desempenho() {
  useTitulo('Desempenho — LAIVY');
  const [params] = useSearchParams();
  const user = usuarioLogado();
  const isAtleta = user.tipo_usuario === 3;
  // desempenho: Admin, Treinador e Preparador Físico editam; atleta e período de teste só veem
  const somenteLeitura = !ehPreparo(user);
  const isAdmin = ehPreparo(user);
  const ts = timeSelecionado();
  const urlTime = (base) => (ts ? base + '?idTime=' + ts.id : base);

  const [dados, setDados] = useState(null);
  const [jogosFinalizados, setJogosFinalizados] = useState([]);
  const [pontosJogos, setPontosJogos] = useState([]); // pontos de jogos via escalação
  const [atletas, setAtletas] = useState([]);
  const [busca, setBusca] = useState('');
  const [filtroAtleta, setFiltroAtleta] = useState('');
  const [ordem, setOrdem] = useState({ campo: 'data_desempenho', tipo: 'data', direcao: 'desc' });
  const [visao, setVisao] = useState('cards');
  const [aba, setAba] = useState('lista');
  const [toasts, toast] = useToasts();

  const [verId, setVerId] = useState(null);
  const [delAlvo, setDelAlvo] = useState(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [editId, setEditId] = useState('');

  async function carregar() {
    // avaliações de desempenho e atividades em paralelo
    const [desempenhos, atividades] = await Promise.all([
      getJson(urlTime('/desempenhos')).catch(() => []),
      getJson(urlTime('/atividades')).catch(() => []),
    ]);
    const finalizados = atividades.filter((a) => a.tipo_atividade === 2 && a.status_atividade === 2);
    // escalações de todos os jogos finalizados, para pegar os pontos
    const escalacoes = await Promise.all(finalizados.map((j) => getJson('/escalacoes/atividade/' + j.id_atividade).catch(() => [])));
    setDados(isAtleta ? desempenhos.filter((x) => x.usuario?.id_usuario === user.id_usuario) : desempenhos);
    setJogosFinalizados(finalizados);
    setPontosJogos(escalacoes.flat().filter((e) => e.pontos_jogo != null));
  }

  useEffect(() => {
    carregar();
    // Selectors mostram apenas Atletas (tipo=3) — quem tem avaliação de desempenho
    getJson(urlTime('/usuarios')).then((d) => setAtletas(d.filter((u) => u.tipo_usuario === 3))).catch(() => {});
    if (params.get('novo') === '1') mudarAba('form');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lista0 = dados || [];

  // ---------- MÉDIAS (avaliações manuais + pontos de jogos) ----------
  const todasPts = [...lista0.filter((d) => d.pontuacao).map((d) => d.pontuacao), ...pontosJogos.filter((p) => p.pontos_jogo).map((p) => p.pontos_jogo)];
  const mediaGlobal = todasPts.length ? (todasPts.reduce((a, b) => a + b, 0) / todasPts.length).toFixed(1) : '—';

  function mediaAtleta(idU) {
    if (!idU) return '—';
    const vals = [
      ...lista0.filter((d) => d.usuario?.id_usuario === idU && d.pontuacao).map((d) => d.pontuacao),
      ...pontosJogos.filter((e) => e.usuario?.id_usuario === idU && e.pontos_jogo).map((e) => e.pontos_jogo),
    ];
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '—';
  }

  function pontosJogoAtleta(idU) {
    if (!idU) return null;
    const jogos = pontosJogos.filter((e) => e.usuario?.id_usuario === idU && e.pontos_jogo != null);
    return jogos.length ? { total: jogos.reduce((s, e) => s + (e.pontos_jogo || 0), 0), jogos: jogos.length } : null;
  }

  const lista = ordenar(lista0.filter((d) => {
    const b = busca.toLowerCase();
    return (!b || (d.usuario?.nome_usuario || '').toLowerCase().includes(b)) && (!filtroAtleta || String(d.usuario?.id_usuario) === filtroAtleta);
  }), { ...ordem, getter });
  const valorOrdem = ORDENACAO.find((o) => o.campo === ordem.campo && o.direcao === ordem.direcao)?.valor || '';
  const maxPts = Math.max(...lista.map((d) => d.pontuacao || 0), 1);

  // ---------- RANKINGS ----------
  const topPts = [...lista0].filter((d) => d.pontuacao).sort((a, b) => b.pontuacao - a.pontuacao).slice(0, 10);
  const mapa = {};
  pontosJogos.filter((e) => e.pontos_jogo && e.usuario).forEach((e) => {
    const id = e.usuario.id_usuario;
    if (!mapa[id]) mapa[id] = { id, nome: e.usuario.nome_usuario, total: 0, jogos: 0 };
    mapa[id].total += e.pontos_jogo || 0;
    mapa[id].jogos++;
  });
  const topJogos = Object.values(mapa).sort((a, b) => b.total - a.total).slice(0, 10);

  // ---------- AÇÕES ----------
  function mudarAba(id) {
    if (id === 'form' && somenteLeitura) { toast('Acesso restrito: você não tem permissão para criar avaliações.', false); return; }
    setAba(id);
  }

  function abrirEdicao(id) {
    if (somenteLeitura) { toast('Acesso restrito.', false); return; }
    const d = lista0.find((x) => x.id_desempenho === id);
    if (!d) return;
    setForm({ usuario_id: d.usuario?.id_usuario ? String(d.usuario.id_usuario) : '', data_desempenho: d.data_desempenho || '', posicao_usuario: d.posicao_usuario || '' });
    setEditId(String(d.id_desempenho));
    mudarAba('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelarForm() {
    setForm(FORM_VAZIO);
    setEditId('');
    setAba('lista');
  }

  async function salvar(e) {
    e.preventDefault();
    if (somenteLeitura) { toast('Acesso restrito.', false); return; }
    const payload = {
      usuario: { id_usuario: parseInt(form.usuario_id) },
      data_desempenho: form.data_desempenho,
      posicao_usuario: parseInt(form.posicao_usuario) || null,
      pontuacao: null, // pontuação agora vem dos jogos
    };
    try {
      await authFetch(editId ? '/desempenhos/' + editId : '/desempenhos', { method: editId ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      toast(editId ? 'Registro atualizado!' : 'Desempenho registrado!');
      cancelarForm();
      carregar();
    } catch {
      toast('Erro ao salvar.', false);
    }
  }

  function confirmarDel(d) {
    if (somenteLeitura) { toast('Acesso restrito.', false); return; }
    setDelAlvo({ id: d.id_desempenho, nome: d.usuario?.nome_usuario || '—' });
  }

  async function excluir() {
    if (!delAlvo) return;
    try {
      await authFetch('/desempenhos/' + delAlvo.id, { method: 'DELETE' });
      toast('Registro excluído!');
      setDelAlvo(null);
      carregar();
    } catch {
      toast('Erro ao excluir.', false);
    }
  }

  const vd = verId ? lista0.find((x) => x.id_desempenho === verId) : null;

  return (
    <div className="pagina pg-desempenho bs">
      <Sidebar />

      <main className="main">
        <div className="page-header">
          <h1>Desempenho</h1>
          <p>Avaliações físicas e ranking competitivo dos atletas</p>
        </div>

        {/* STATS */}
        <div className="stats-row">
          <div className="stat-card"><div className="stat-dot" style={{ background: 'var(--cinza)' }}></div><div><div className="stat-num" style={{ color: 'var(--branco)' }}>{dados ? dados.length : '—'}</div><div className="stat-label">Avaliações</div></div></div>
          <div className="stat-card"><div className="stat-dot" style={{ background: '#FFB020' }}></div><div><div className="stat-num" style={{ color: '#FFB020' }}>{dados ? jogosFinalizados.length : '—'}</div><div className="stat-label">Jogos Finalizados</div></div></div>
          <div className="stat-card"><div className="stat-dot" style={{ background: '#FF6B6B' }}></div><div><div className="stat-num" style={{ color: '#FF6B6B' }}>{dados ? mediaGlobal : '—'}</div><div className="stat-label">Média de Pontos</div></div></div>
        </div>

        {/* TABS */}
        <div className="tabs">
          <button className={'tab' + (aba === 'lista' ? ' active' : '')} onClick={() => mudarAba('lista')}> Lista</button>
          {!somenteLeitura && <button className={'tab' + (aba === 'form' ? ' active' : '')} onClick={() => mudarAba('form')}> Novo Registro</button>}
          <button className={'tab' + (aba === 'ranking' ? ' active' : '')} onClick={() => mudarAba('ranking')}> Ranking</button>
        </div>

        {/* TAB LISTA */}
        <div className={'secao' + (aba === 'lista' ? ' visible' : '')}>
          <div className="card-dark" style={{ padding: '18px 24px' }}>
            <div className="toolbar">
              <div className="search-wrap"><input className="search-bar" placeholder="Buscar por atleta..." value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
              <select className="select-filtro" value={filtroAtleta} onChange={(e) => setFiltroAtleta(e.target.value)}>
                <option value="">Todos os atletas</option>
                {atletas.map((u) => <option key={u.id_usuario} value={u.id_usuario}>{u.nome_usuario}</option>)}
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
              {!somenteLeitura && <button className="btn-novo" onClick={() => mudarAba('form')}>+ Novo</button>}
            </div>

            {/* CARDS */}
            <div className={'cards-wrapper' + (visao === 'cards' ? ' visible' : '')}>
              <div className="cards-grid">
                {!lista.length ? <Vazio texto="Nenhuma avaliação encontrada" style={{ gridColumn: '1/-1' }} /> : lista.map((d) => {
                  const nome = d.usuario?.nome_usuario || '—';
                  const gp = pontosJogoAtleta(d.usuario?.id_usuario);
                  return (
                    <div key={d.id_desempenho} className="desemp-card" onClick={() => setVerId(d.id_desempenho)}>
                      <div className="desemp-card-top">
                        <div className="desemp-avatar">{iniciais(nome)}</div>
                        <div>
                          <div className="desemp-nome">{nome}</div>
                          <div className="desemp-data"> {dataBr(d.data_desempenho)}</div>
                        </div>
                        {d.posicao_usuario ? <span style={{ marginLeft: 'auto', fontSize: 22 }} title={'Posição ' + d.posicao_usuario + 'º'}>{posIcon(d.posicao_usuario)}</span> : null}
                      </div>
                      <div className="metricas-mini">
                        <div className="met-box">
                          <div className="met-val" style={{ color: '#FF6B6B' }}>{mediaAtleta(d.usuario?.id_usuario)}</div>
                          <div className="met-label">Média Pts</div>
                        </div>
                      </div>
                      {gp && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 11, background: 'rgba(255,176,32,0.06)', borderRadius: 6, padding: '5px 10px' }}>
                          <span style={{ color: '#FFB020' }}></span>
                          <span style={{ color: '#8899BB' }}>Jogos: <strong style={{ color: '#FFB020' }}>{gp.jogos}</strong></span>
                          <span style={{ color: '#8899BB', marginLeft: 4 }}>Total pts: <strong style={{ color: '#FFB020' }}>{gp.total}</strong></span>
                        </div>
                      )}
                      {d.pontuacao ? <div className="pts-bar"><div className="pts-fill" style={{ width: Math.min((d.pontuacao || 0) / maxPts * 100, 100).toFixed(0) + '%' }}></div></div> : null}
                      <div className="desemp-footer">
                        <span style={{ fontSize: 11, color: 'var(--cinza)' }}>#{d.id_desempenho}</span>
                        <div className="desemp-acoes">
                          <button className="btn-acao-sm btn-ver" onClick={(e) => { e.stopPropagation(); setVerId(d.id_desempenho); }}>Ver</button>
                          {isAdmin && (
                            <>
                              <button className="btn-acao-sm btn-edit" onClick={(e) => { e.stopPropagation(); abrirEdicao(d.id_desempenho); }}>Editar</button>
                              <button className="btn-acao-sm btn-del" onClick={(e) => { e.stopPropagation(); confirmarDel(d); }}>Excluir</button>
                            </>
                          )}
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
                    <ThOrdenavel campo="id_desempenho" tipo="numero" ordem={ordem} setOrdem={setOrdem}>ID</ThOrdenavel>
                    <ThOrdenavel campo="nome_usuario" tipo="texto" ordem={ordem} setOrdem={setOrdem}>Atleta</ThOrdenavel>
                    <ThOrdenavel campo="data_desempenho" tipo="data" ordem={ordem} setOrdem={setOrdem}>Data</ThOrdenavel>
                    <th>Posição</th>
                    <ThOrdenavel campo="pontuacao" tipo="numero" ordem={ordem} setOrdem={setOrdem}>Pontuação</ThOrdenavel>
                    <th>Ações</th>
                  </tr></thead>
                  <tbody>
                    {!lista.length ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--cinza)', padding: 32 }}>Nenhuma avaliação encontrada</td></tr>
                    ) : lista.map((d) => (
                      <tr key={d.id_desempenho}>
                        <td style={{ color: 'var(--cinza)', fontSize: 12 }}>#{d.id_desempenho}</td>
                        <td style={{ fontWeight: 700 }}>{d.usuario?.nome_usuario || '—'}</td>
                        <td style={{ color: 'var(--cinza)' }}>{dataBr(d.data_desempenho)}</td>
                        <td style={{ fontSize: 16 }}>{posIcon(d.posicao_usuario)}</td>
                        <td><span style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 20, color: '#FFB020' }}>{d.pontuacao || '—'}</span></td>
                        <td>
                          <button className="btn-acao-sm btn-ver" onClick={() => setVerId(d.id_desempenho)}>Ver</button>
                          <button className="btn-acao-sm btn-edit" onClick={() => abrirEdicao(d.id_desempenho)}>Editar</button>
                          <button className="btn-acao-sm btn-del" onClick={() => confirmarDel(d)}>Excluir</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* TAB FORM */}
        <div className={'secao' + (aba === 'form' ? ' visible' : '')}>
          <div className="card-dark">
            <h4>{editId ? ' Editar Registro de Desempenho' : ' Novo Registro de Desempenho'}</h4>
            {/* Enter avança pelos campos válidos; no último campo, confirma o envio. */}
            <form onSubmit={salvar} onKeyDown={(e) => enterAvanca(e, (c) => c.checkValidity())}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label" htmlFor="selectAtleta">Atleta</label>
                  <select className="form-select" id="selectAtleta" required value={form.usuario_id} onChange={(e) => setForm({ ...form, usuario_id: e.target.value })}>
                    <option value="">Selecionar atleta...</option>
                    {atletas.map((u) => <option key={u.id_usuario} value={u.id_usuario}>{u.nome_usuario}</option>)}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="inp-data-desemp">Data da Avaliação</label>
                  <CampoData id="inp-data-desemp" required value={form.data_desempenho} onChange={(v) => setForm((f) => ({ ...f, data_desempenho: v }))} />
                </div>
                <div className="col-12"><div className="form-sep"></div></div>
                <div className="col-md-4">
                  <label className="form-label">Posição</label>
                  <input type="number" className="form-control" placeholder="Ex: 1, 2, 3..." value={form.posicao_usuario} onChange={(e) => setForm({ ...form, posicao_usuario: e.target.value })} />
                </div>

                <div className="col-12 d-flex gap-2 mt-2">
                  <button type="submit" className="btn-cadastrar">{editId ? 'Salvar Alterações' : 'Registrar Desempenho'}</button>
                  <button type="button" className="btn-cancelar-form" onClick={cancelarForm}>Cancelar</button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* TAB RANKING */}
        <div className={'secao' + (aba === 'ranking' ? ' visible' : '')}>
          <div className="card-dark">
            <h4> Top 10 — Maior Pontuação</h4>
            <div className="ranking-wrap">
              {!topPts.length ? <Vazio texto="Sem dados suficientes" /> : topPts.map((d, i) => {
                const nome = d.usuario?.nome_usuario || '—';
                return (
                  <div key={d.id_desempenho} className="rank-item" style={i < 3 ? { background: BG_PODIO[i] } : undefined}>
                    <div className="rank-num" style={{ color: i < 3 ? COR_PODIO[i] : 'var(--cinza)' }}>{MEDALHAS[i] || i + 1}</div>
                    <div className="rank-avatar" style={{ background: 'rgba(0,201,122,0.15)', color: 'var(--verde)' }}>{iniciais(nome)}</div>
                    <div className="rank-info">
                      <div className="rank-nome">{nome}</div>
                      <div className="rank-sub"> {dataBr(d.data_desempenho)}</div>
                    </div>
                    <div className="rank-pts" style={{ color: '#FFB020' }}>{d.pontuacao} pts</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="card-dark">
            <h4> Top 10 — Pontos em Jogos</h4>
            <div className="ranking-wrap">
              {!pontosJogos.length ? <Vazio texto="Nenhum jogo finalizado ainda" /> : !topJogos.length ? <Vazio texto="Sem dados de jogos" /> : topJogos.map((p, i) => (
                <div key={p.id} className="rank-item" style={i < 3 ? { background: BG_PODIO[i] } : undefined}>
                  <div className="rank-num" style={{ color: i < 3 ? COR_PODIO[i] : 'var(--cinza)' }}>{MEDALHAS[i] || i + 1}</div>
                  <div className="rank-avatar" style={{ background: 'rgba(255,176,32,0.15)', color: '#FFB020' }}>{iniciais(p.nome)}</div>
                  <div className="rank-info"><div className="rank-nome">{p.nome}</div><div className="rank-sub"> {p.jogos} jogo{p.jogos !== 1 ? 's' : ''}</div></div>
                  <div className="rank-pts" style={{ color: '#FFB020' }}>{p.total} pts</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* MODAL VER */}
      <Modal id="modalVer" tamanho="lg" aberto={!!vd} onFechar={() => setVerId(null)}>
        {vd && (
          <>
            <div className="modal-header">
              <h5 className="modal-title" style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 22, letterSpacing: 1 }}>Detalhes do Desempenho</h5>
              <button className="btn-close" onClick={() => setVerId(null)}></button>
            </div>
            <div className="modal-body">
              <div style={{ textAlign: 'center', marginBottom: 18 }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(0,201,122,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 22, color: 'var(--verde)', margin: '0 auto 10px' }}>{iniciais(vd.usuario?.nome_usuario || '—')}</div>
                <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 22, letterSpacing: 1 }}>{vd.usuario?.nome_usuario || '—'}</div>
                <div style={{ fontSize: 12, color: 'var(--cinza)', marginTop: 4 }}>
                  {vd.data_desempenho ? new Date(vd.data_desempenho + ' ').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
                </div>
                {vd.posicao_usuario ? <div style={{ fontSize: 28, marginTop: 8 }} title="Posição">{posIcon(vd.posicao_usuario)}</div> : null}
              </div>
              <div className="metricas-modal"></div>
              <div className="detalhe-grid">
                <div className="detalhe-item"><div className="detalhe-label">Posição</div><div className="detalhe-valor">{vd.posicao_usuario ? posIcon(vd.posicao_usuario) + ' ' + vd.posicao_usuario + 'º lugar' : '—'}</div></div>
                <div className="detalhe-item"><div className="detalhe-label">ID Registro</div><div className="detalhe-valor" style={{ color: 'var(--cinza)' }}>#{vd.id_desempenho}</div></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cadastrar" style={{ fontSize: 14, padding: '8px 20px' }}
                onClick={() => { const id = vd.id_desempenho; setVerId(null); setTimeout(() => abrirEdicao(id), 300); }}> Editar</button>
              <button className="btn-cancelar-form" style={{ fontSize: 14, padding: '8px 20px' }} onClick={() => setVerId(null)}>Fechar</button>
            </div>
          </>
        )}
      </Modal>

      {/* MODAL CONFIRMAR EXCLUSÃO */}
      <Modal id="modalDel" tamanho="sm" aberto={!!delAlvo} onFechar={() => setDelAlvo(null)}>
        <div className="modal-body" style={{ padding: 28, textAlign: 'center' }}>
          <div style={{ fontSize: 38, marginBottom: 12 }}></div>
          <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 20, marginBottom: 8 }}>Excluir Avaliação?</div>
          <div style={{ fontSize: 13, color: 'var(--cinza)', marginBottom: 20 }}>{delAlvo ? 'Avaliação de "' + delAlvo.nome + '" será excluída permanentemente.' : ''}</div>
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
