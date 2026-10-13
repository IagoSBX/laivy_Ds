import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Modal from '../components/Modal.jsx';
import QuadraEscalacao from '../components/QuadraEscalacao.jsx';
import Sidebar from '../components/Sidebar.jsx';
import { authFetch, getJson, iniciais } from '../lib/api.js';
import { timeSelecionado, usuarioLogado } from '../lib/sessao.js';
import useTitulo from '../lib/useTitulo.js';
import useToasts from '../lib/useToasts.js';
import '../styles/pages/escalacao.css';

// Posições na quadra: % left e % top do viewBox 600x336
const POS_QUADRA = {
  Armador: { l: 52, t: 50 },
  'Ala-Armador': { l: 65, t: 22 },
  Ala: { l: 65, t: 78 },
  'Ala-Pivo': { l: 78, t: 28 },
  Pivo: { l: 80, t: 50 },
};
const POS_COR = { Armador: '#FFB020', 'Ala-Armador': '#4EC9FF', Ala: '#00C97A', 'Ala-Pivo': '#A78FFF', Pivo: '#FF6B6B' };
const POS_NUM = { Armador: '1', 'Ala-Armador': '2', Ala: '3', 'Ala-Pivo': '4', Pivo: '5' };
const cor = (p) => POS_COR[p] || '#8899BB';
const ehTitular = (e) => e.titular == 1 || e.titular === '1';

const LEGENDA = [
  ['#FFB020', '1', 'Armador', 'PG'], ['#4EC9FF', '2', 'Ala-Arm.', 'SG'], ['#00C97A', '3', 'Ala', 'SF'],
  ['#A78FFF', '4', 'Ala-Pivô', 'PF'], ['#FF6B6B', '5', 'Pivô', 'C'],
];

export default function Escalacao() {
  useTitulo('Escalação — LAIVY');
  const [params] = useSearchParams();
  const user = usuarioLogado();
  const isAtleta = user.tipo_usuario === 3;
  const isAdmin = user.tipo_usuario === 1 || user.tipo_usuario === 2;
  const ts = timeSelecionado();
  const urlTime = (base) => (ts ? base + '?idTime=' + ts.id : base);

  const [atividades, setAtividades] = useState([]);
  const [todosAtletas, setTodosAtletas] = useState([]);
  const [idAtiv, setIdAtiv] = useState('');
  const [escDados, setEscDados] = useState([]);
  const [toasts, toast] = useToasts();

  // modal adicionar
  const [modalAberto, setModalAberto] = useState(false);
  const [tipoAdd, setTipoAdd] = useState(1);
  const [busca, setBusca] = useState('');
  const [atletaSel, setAtletaSel] = useState(null);
  const [pos, setPos] = useState('');
  const [num, setNum] = useState('');
  const [tipoSel, setTipoSel] = useState('1');

  function carregarEscalacao(id) {
    setIdAtiv(id);
    if (!id) return;
    getJson('/escalacoes/atividade/' + id).then(setEscDados).catch(() => setEscDados([]));
  }

  useEffect(() => {
    getJson(urlTime('/atividades')).then((data) => {
      setAtividades(data);
      // Vindo do card "Montar Escalação" (atividades.html) com a atividade já escolhida.
      const idUrl = params.get('atividade');
      if (idUrl && data.some((a) => String(a.id_atividade) === idUrl)) carregarEscalacao(idUrl);
    }).catch(() => {});
    getJson('/usuarios').then((d) => setTodosAtletas(d.filter((u) => u.tipo_usuario === 3))).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const atividadeSel = atividades.find((a) => String(a.id_atividade) === String(idAtiv));
  const tit = escDados.filter(ehTitular);
  const res = escDados.filter((e) => e.titular == 0 || e.titular === '0');
  const pronta = tit.length >= 5;

  function abrirModal(titular) {
    if (isAtleta) { toast('Acesso restrito: apenas treinadores podem modificar a escalação.', false); return; }
    setTipoAdd(titular);
    setAtletaSel(null);
    setTipoSel(String(titular));
    setBusca('');
    setModalAberto(true);
  }

  async function confirmarAdicao() {
    if (isAtleta) { toast('Acesso restrito.', false); return; }
    if (!atletaSel) { toast('Selecione um atleta!', false); return; }
    const camisa = parseInt(num) || null;
    const titular = parseInt(tipoSel);

    // camisa não pode repetir dentro da mesma escalação
    if (camisa != null && escDados.some((e) => e.numero_camisa === camisa)) {
      toast('Já existe um atleta escalado com a camisa ' + camisa + ' nesta atividade.', false);
      return;
    }
    // uma posição só pode aparecer uma vez entre os titulares
    if (titular === 1 && pos && escDados.some((e) => ehTitular(e) && (e.posicao || '').toLowerCase() === pos.toLowerCase())) {
      toast('Já existe um atleta escalado na posição ' + pos + '.', false);
      return;
    }

    try {
      const r = await authFetch('/escalacoes', {
        method: 'POST',
        body: JSON.stringify({
          atividade: { id_atividade: parseInt(idAtiv) },
          usuario: { id_usuario: atletaSel.id_usuario },
          posicao: pos || null, numero_camisa: camisa, titular,
        }),
      });
      if (!r.ok) {
        const erro = await r.json().catch(() => ({}));
        toast(erro.erro || 'Não foi possível escalar este atleta.', false);
        return;
      }
      const d = await r.json();
      setEscDados((x) => [...x, d]);
      toast(atletaSel.nome_usuario + ' adicionado!');
      setModalAberto(false);
      setAtletaSel(null);
    } catch {
      toast('Não foi possível salvar a escalação.', false);
    }
  }

  function remover(id) {
    if (isAtleta) { toast('Acesso restrito.', false); return; }
    authFetch('/escalacoes/' + id, { method: 'DELETE' }).catch(() => {});
    setEscDados((x) => x.filter((e) => e.id_escalacao !== id));
    toast('Jogador removido!');
  }

  function fecharEscalacao() {
    if (isAtleta) { toast('Acesso restrito.', false); return; }
    if (tit.length < 5) {
      toast('Para fechar a escalação são necessários pelo menos 5 titulares (tem ' + tit.length + ').', false);
      return;
    }
    toast('Escalação fechada com ' + tit.length + ' titulares e ' + (escDados.length - tit.length) + ' reservas!');
  }

  const item = (e) => {
    const nome = e.usuario?.nome_usuario || '—';
    const c = cor(e.posicao);
    return (
      <div key={e.id_escalacao} className="jog-item">
        <div className="jog-av" style={{ background: c + '22', color: c }}>{iniciais(nome)}</div>
        <div className="jog-info">
          <div className="jog-nome">{nome}{e.numero_camisa ? <> <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 5 }}>#{e.numero_camisa}</span></> : null}</div>
          <div className="jog-pos">{e.posicao || '—'}</div>
        </div>
        {isAdmin && (
          <button className="btn-rm" title="Retirar da escalação" aria-label={'Retirar ' + nome + ' da escalação'} onClick={() => remover(e.id_escalacao)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        )}
      </div>
    );
  };

  const jaEscalados = new Set(escDados.map((e) => e.usuario?.id_usuario));
  const grade = busca ? todosAtletas.filter((u) => u.nome_usuario.toLowerCase().includes(busca.toLowerCase())) : todosAtletas;

  return (
    <div className="pagina pg-escalacao bs">
      <Sidebar />

      <main className="main">
        <div className="page-header"><h1>Escalação</h1><p>Monte o time para cada jogo de basquete</p></div>

        <div className="card-dark">
          <div className="card-titulo"> Selecionar Atividade</div>
          <select className="select-jogo" value={idAtiv} onChange={(e) => carregarEscalacao(e.target.value)}>
            <option value="">— Selecione uma atividade para montar a escalação —</option>
            {atividades.map((a) => <option key={a.id_atividade} value={a.id_atividade}>{' ' + a.nome_atividade}</option>)}
          </select>
          {atividadeSel && (
            <div style={{ display: 'block', background: 'rgba(255,176,32,0.06)', border: '1px solid rgba(255,176,32,0.2)', borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ fontSize: 11, color: 'var(--cinza)', marginBottom: 3, letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase' }}>Atividade Selecionada</div>
              <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 20, letterSpacing: 1, color: '#FFB020' }}>{' ' + atividadeSel.nome_atividade}</div>
            </div>
          )}
        </div>

        {idAtiv ? (
          <div>
            <div className="esc-stats">
              <div className="esc-stat"><div className="esc-stat-num" style={{ color: 'var(--verde)' }}>{escDados.length}</div><div className="esc-stat-label">Convocados</div></div>
              <div className="esc-stat"><div className="esc-stat-num" style={{ color: '#FFB020' }}>{tit.length}</div><div className="esc-stat-label">Titulares</div></div>
              <div className="esc-stat"><div className="esc-stat-num" style={{ color: '#4EC9FF' }}>{res.length}</div><div className="esc-stat-label">Reservas</div></div>
            </div>

            {/* Fechar escalação exige pelo menos 5 titulares */}
            <button className="btn-fechar-esc" disabled={!pronta} onClick={fecharEscalacao}>Fechar Escalação</button>
            <div className="fechar-esc-aviso" style={{ color: pronta ? 'var(--verde)' : 'var(--cinza)' }}>
              {pronta ? 'Escalação pronta pra fechar (' + tit.length + ' titulares).' : 'Faltam titulares para fechar a escalação (' + tit.length + '/5)'}
            </div>

            <div className="layout">
              {/* QUADRA */}
              <div className="card-dark">
                <div className="card-titulo"> Quadra de Basquete</div>
                <div className="quadra-wrap">
                  <QuadraEscalacao />
                  {/* Jogadores sobrepostos */}
                  <div className="jogadores-quadra">
                    {tit.filter((e) => POS_QUADRA[e.posicao]).map((e) => {
                      const coord = POS_QUADRA[e.posicao];
                      const nome = e.usuario?.nome_usuario || '?';
                      const c = cor(e.posicao);
                      return (
                        <div key={e.id_escalacao} style={{ position: 'absolute', left: coord.l + '%', top: coord.t + '%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
                          <div style={{ width: 38, height: 38, borderRadius: '50%', background: c, color: '#0A1628', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, margin: '0 auto', border: '2.5px solid rgba(255,255,255,0.6)', boxShadow: '0 3px 10px rgba(0,0,0,0.5)' }}>
                            {e.numero_camisa || POS_NUM[e.posicao] || iniciais(nome)}
                          </div>
                          <div style={{ fontSize: 9, color: '#fff', fontWeight: 700, marginTop: 3, textShadow: '0 1px 4px rgba(0,0,0,1)', whiteSpace: 'nowrap', maxWidth: 56, overflow: 'hidden', textOverflow: 'ellipsis' }}>{nome.split(' ')[0]}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Legenda posições */}
                <div className="pos-legenda">
                  {LEGENDA.map(([c, n, nome, sigla]) => (
                    <div key={n} className="pos-leg-item">
                      <div className="pos-leg-circulo" style={{ background: c }}>{n}</div>
                      {nome}<br /><span style={{ fontSize: 9, color: '#666' }}>{sigla}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* LISTAS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="card-dark">
                  <div className="sec-label">
                    Titulares
                    <span style={{ background: 'rgba(255,176,32,0.15)', color: '#FFB020', padding: '2px 8px', borderRadius: 6, fontSize: 10 }}>{tit.length}/5</span>
                  </div>
                  <div>
                    {tit.length ? tit.map(item)
                      : <div style={{ textAlign: 'center', padding: 14, color: '#8899BB', fontSize: 12 }}>Nenhum titular ainda</div>}
                  </div>
                  {!isAtleta && <button className="btn-add btn-add-tit" onClick={() => abrirModal(1)}>+ Adicionar Titular</button>}
                </div>
                <div className="card-dark">
                  <div className="sec-label">
                    Reservas
                    <span style={{ background: 'rgba(78,201,255,0.15)', color: '#4EC9FF', padding: '2px 8px', borderRadius: 6, fontSize: 10 }}>{res.length}</span>
                  </div>
                  <div>
                    {res.length ? res.map(item)
                      : <div style={{ textAlign: 'center', padding: 14, color: '#8899BB', fontSize: 12 }}>Nenhum reserva ainda</div>}
                  </div>
                  {!isAtleta && <button className="btn-add btn-add-res" onClick={() => abrirModal(0)}>+ Adicionar Reserva</button>}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="card-dark empty-st">
            <div style={{ fontSize: 52, marginBottom: 14 }}></div>
            <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 26, color: 'var(--cinza)', letterSpacing: 2 }}>Selecione uma atividade</div>
            <div style={{ fontSize: 13, color: 'var(--cinza)', marginTop: 8 }}>Escolha um jogo acima para montar a escalação</div>
          </div>
        )}
      </main>

      {/* MODAL ADICIONAR JOGADOR (atleta não modifica a escalação) */}
      <Modal id="modalAdd" tamanho="lg" aberto={modalAberto && !isAtleta} onFechar={() => setModalAberto(false)}>
        <div className="modal-header">
          <h5 className="modal-title" style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 22, letterSpacing: 1 }}>{tipoAdd ? ' Adicionar Titular' : ' Adicionar Reserva'}</h5>
          <button className="btn-close" onClick={() => setModalAberto(false)}></button>
        </div>
        <div className="modal-body">
          {/* busca */}
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}></span>
            <input className="inp-modal" style={{ paddingLeft: 36 }} placeholder="Buscar atleta pelo nome..." value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          {/* grade atletas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10, maxHeight: 290, overflowY: 'auto', paddingRight: 4, marginBottom: 14 }}>
            {!grade.length ? (
              <div style={{ textAlign: 'center', padding: 24, color: '#8899BB' }}>Nenhum atleta cadastrado no sistema</div>
            ) : grade.map((u) => {
              const jaE = jaEscalados.has(u.id_usuario);
              const sel = atletaSel?.id_usuario === u.id_usuario;
              return (
                <div key={u.id_usuario} className={'card-atleta' + (sel ? ' selected' : '') + (jaE ? ' escalado' : '')} onClick={jaE ? undefined : () => setAtletaSel(u)}>
                  {sel && <div style={{ position: 'absolute', top: 5, right: 5, fontSize: 12 }}></div>}
                  <div className="av-atleta">{iniciais(u.nome_usuario)}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.nome_usuario}</div>
                  <div style={{ fontSize: 9, color: '#8899BB', marginTop: 3 }}>{jaE ? 'Já escalado' : ({ 1: 'Admin', 2: 'Treinador', 3: 'Atleta' }[u.tipo_usuario] || '—')}</div>
                </div>
              );
            })}
          </div>
          {/* config selecionado */}
          {atletaSel && (
            <div style={{ display: 'block', background: 'rgba(255,176,32,0.06)', border: '1px solid rgba(255,176,32,0.15)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 11, color: '#FFB020', fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}> CONFIGURAR JOGADOR SELECIONADO</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label className="lbl-modal">Posição</label>
                  <select className="inp-modal" style={{ cursor: 'pointer' }} value={pos} onChange={(e) => setPos(e.target.value)}>
                    <option value="">— Selecionar —</option>
                    <option value="Armador">1 — Armador (PG)</option>
                    <option value="Ala-Armador">2 — Ala-Armador (SG)</option>
                    <option value="Ala">3 — Ala (SF)</option>
                    <option value="Ala-Pivo">4 — Ala-Pivô (PF)</option>
                    <option value="Pivo">5 — Pivô (C)</option>
                  </select>
                </div>
                <div>
                  <label className="lbl-modal">Nº Camisa</label>
                  <input type="number" className="inp-modal" min="0" max="99" placeholder="Ex: 23" value={num} onChange={(e) => setNum(e.target.value)} />
                </div>
                <div>
                  <label className="lbl-modal">Tipo</label>
                  <select className="inp-modal" style={{ cursor: 'pointer' }} value={tipoSel} onChange={(e) => setTipoSel(e.target.value)}>
                    <option value="1">Titular</option>
                    <option value="0">Reserva</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary btn-sm" onClick={() => setModalAberto(false)}>Cancelar</button>
          <button onClick={confirmarAdicao} style={{ background: 'linear-gradient(135deg,#FFB020,#e09010)', border: 'none', color: '#0A1628', fontFamily: "'Bebas Neue',cursive", fontSize: 16, letterSpacing: 2, padding: '9px 28px', borderRadius: 9, cursor: 'pointer' }}>Confirmar</button>
        </div>
      </Modal>

      <div className="toast-wrap">
        {toasts.map((t) => <div key={t.id} className={'toast-item' + (t.ok ? '' : ' erro')}> {t.msg}</div>)}
      </div>
    </div>
  );
}
