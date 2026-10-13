import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import Modal from '../components/Modal.jsx';
import Sidebar from '../components/Sidebar.jsx';
import { getJson } from '../lib/api.js';
import { timeSelecionado } from '../lib/sessao.js';
import useTitulo from '../lib/useTitulo.js';
import '../styles/pages/calendario.css';

const TIPO = {
  1: { label: 'Treino', emoji: '🏋️', cor: '#00C97A', bg: 'rgba(0,201,122,0.15)', textCor: '#0A1628' },
  2: { label: 'Jogo', emoji: '🏀', cor: '#FFB020', bg: 'rgba(255,176,32,0.15)', textCor: '#0A1628' },
};
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

// ── RECORRÊNCIA (semanal) ──
const sameDay = (d1, d2) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
function toLocalIso(d) {
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':00';
}
function addDaysStr(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
// Ocorrência (Date) de uma atividade no dia `dataRef`, ou null. Recorrentes repetem
// semanalmente no mesmo dia da semana/horário de data_atividade.
export function ocorrenciaEm(a, dataRef) {
  if (!a.data_atividade) return null;
  const anchor = new Date(a.data_atividade);
  if (!a.recorrente) return sameDay(anchor, dataRef) ? anchor : null;
  const anchorDia = new Date(anchor); anchorDia.setHours(0, 0, 0, 0);
  const ref = new Date(dataRef); ref.setHours(0, 0, 0, 0);
  if (ref < anchorDia || ref.getDay() !== anchor.getDay()) return null;
  if (a.fim_recorrencia && ref > new Date(a.fim_recorrencia + 'T23:59:59')) return null;
  const occ = new Date(ref);
  occ.setHours(anchor.getHours(), anchor.getMinutes(), 0, 0);
  return occ;
}
// cópia da atividade com data_atividade na ocorrência clicada
const comOcorrencia = (a, occ) => ({ ...a, data_atividade: toLocalIso(occ) });

// próximas 5 ocorrências (considera futuras de recorrentes)
function proximasOcorrencias(data) {
  const agora = new Date();
  const ocorrencias = [];
  data.forEach((a) => {
    if (!a.data_atividade) return;
    if (a.recorrente) {
      for (let i = 0; i < 90; i++) {
        const occ = ocorrenciaEm(a, new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + i));
        if (occ && occ > agora) { ocorrencias.push({ a, occ }); break; }
      }
    } else {
      const occ = new Date(a.data_atividade);
      if (occ > agora) ocorrencias.push({ a, occ });
    }
  });
  return ocorrencias.sort((x, y) => x.occ - y.occ).slice(0, 5);
}

// todas as ocorrências (inclui recorrências semanais) dentro de um ano
function ocorrenciasNoAno(atividades, ano) {
  const ocorrencias = [];
  atividades.forEach((a) => {
    if (!a.data_atividade) return;
    if (a.recorrente) {
      const d = new Date(ano, 0, 1);
      const fim = new Date(ano, 11, 31);
      for (; d <= fim; d.setDate(d.getDate() + 1)) {
        const occ = ocorrenciaEm(a, d);
        if (occ) ocorrencias.push({ a, occ: new Date(occ) });
      }
    } else {
      const occ = new Date(a.data_atividade);
      if (occ.getFullYear() === ano) ocorrencias.push({ a, occ });
    }
  });
  return ocorrencias;
}

function Relatorio({ eventos, ano, nomeTime }) {
  const porMes = Array.from({ length: 12 }, () => []);
  ocorrenciasNoAno(eventos, ano).forEach((o) => porMes[o.occ.getMonth()].push(o));
  porMes.forEach((lista) => lista.sort((x, y) => x.occ - y.occ));
  return (
    <>
      <div className="relatorio-titulo">Calendário {ano} — {nomeTime}</div>
      <div className="relatorio-subtitulo">Relatório gerado em {new Date().toLocaleDateString('pt-BR')}</div>
      <div className="relatorio-grid">
        {MESES.map((nomeMes, mesIdx) => {
          const lista = porMes[mesIdx];
          const diasComAtividade = new Map();
          lista.forEach((o) => {
            const dia = o.occ.getDate();
            if (!diasComAtividade.has(dia)) diasComAtividade.set(dia, (TIPO[o.a.tipo_atividade] || TIPO[1]).cor);
          });
          const offset = new Date(ano, mesIdx, 1).getDay();
          const totalDias = new Date(ano, mesIdx + 1, 0).getDate();
          return (
            <div key={mesIdx} className="mes-card">
              <div className="mes-titulo">{nomeMes}</div>
              <div className="mes-dias-header">{DIAS_SEMANA.map((d, i) => <span key={i}>{d}</span>)}</div>
              <div className="mes-grid">
                {Array.from({ length: offset }, (_, i) => <div key={'v' + i} className="mes-dia vazio"></div>)}
                {Array.from({ length: totalDias }, (_, i) => {
                  const cor = diasComAtividade.get(i + 1);
                  return <div key={i} className={'mes-dia' + (cor ? ' marcado' : '')}>{i + 1}{cor && <span className="marcador" style={{ background: cor }}></span>}</div>;
                })}
              </div>
              <div className="mes-lista">
                {!lista.length ? <div className="mes-vazio">Nenhuma atividade</div> : lista.map((o, i) => {
                  const t = TIPO[o.a.tipo_atividade] || TIPO[1];
                  return (
                    <div key={i} className="mes-lista-item">
                      <span className="mes-lista-dia">{String(o.occ.getDate()).padStart(2, '0')}</span>
                      <span>{t.emoji} {o.a.nome_atividade}{o.a.lugar_atividade ? ' · ' + o.a.lugar_atividade : ''}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default function Calendario() {
  useTitulo('Calendário — LAIVY');
  const ts = timeSelecionado();
  const urlTime = (base) => (ts ? base + '?idTime=' + ts.id : base);

  const calRef = useRef(null);
  const calendario = useRef(null);
  const filtroRef = useRef(0);
  const [filtro, setFiltro] = useState(0);
  const [eventos, setEventos] = useState(null); // null = carregando, 'erro' = offline
  const [detalhe, setDetalhe] = useState(null);
  const [relatorioAberto, setRelatorioAberto] = useState(false);
  const [anoInput, setAnoInput] = useState('');
  const [anoRelatorio, setAnoRelatorio] = useState(new Date().getFullYear());

  useEffect(() => {
    const cal = new Calendar(calRef.current, {
      plugins: [dayGridPlugin, timeGridPlugin, listPlugin],
      initialView: 'dayGridMonth',
      locale: 'pt-br',
      height: 'auto',
      dayMaxEvents: 3,
      firstDay: 0,
      headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,listMonth' },
      buttonText: { today: 'Hoje', month: 'Mês', week: 'Semana', list: 'Lista' },

      events(info, ok) {
        getJson(urlTime('/atividades'))
          .then((data) => {
            // Todos veem todas as atividades no calendário (informativo): o atleta participa via escalação
            setEventos(data);
            const f = filtroRef.current;
            const filtrados = f === 0 ? data : data.filter((a) => a.tipo_atividade === f);
            ok(filtrados.filter((a) => a.data_atividade).map((a) => {
              const t = TIPO[a.tipo_atividade] || TIPO[1];
              const titulo = `${a.recorrente ? '🔁 ' : ''}${t.emoji} ${a.nome_atividade}`;
              if (a.recorrente) {
                const anchor = new Date(a.data_atividade);
                const p = (n) => String(n).padStart(2, '0');
                return {
                  title: titulo,
                  daysOfWeek: [anchor.getDay()],
                  startTime: `${p(anchor.getHours())}:${p(anchor.getMinutes())}`,
                  startRecur: a.data_atividade.slice(0, 10),
                  endRecur: a.fim_recorrencia ? addDaysStr(a.fim_recorrencia, 1) : undefined,
                  color: t.cor, textColor: t.textCor, extendedProps: { raw: a, recorrente: true },
                };
              }
              return { title: titulo, start: a.data_atividade, color: t.cor, textColor: t.textCor, extendedProps: { raw: a } };
            }));
          })
          .catch(() => { setEventos('erro'); ok([]); });
      },

      eventClick(info) {
        const raw = info.event.extendedProps.raw;
        setDetalhe(info.event.extendedProps.recorrente && info.event.start ? comOcorrencia(raw, info.event.start) : raw);
      },
      eventDidMount(info) { info.el.title = info.event.title; },
    });
    cal.render();
    calendario.current = cal;
    return () => cal.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function filtrar(tipo) {
    filtroRef.current = tipo;
    setFiltro(tipo);
    calendario.current?.refetchEvents();
  }

  function abrirRelatorio() {
    const ano = new Date().getFullYear();
    setAnoInput(String(ano));
    setAnoRelatorio(ano);
    setRelatorioAberto(true);
  }

  const lista = Array.isArray(eventos) ? eventos : [];
  const proximos = proximasOcorrencias(lista);
  const hoje = lista.map((a) => ({ a, occ: ocorrenciaEm(a, new Date()) })).filter((x) => x.occ);
  const offline = eventos === 'erro';

  const eventCard = ({ a, occ }, mostrarData) => {
    const t = TIPO[a.tipo_atividade] || TIPO[1];
    const hora = occ.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return (
      <div key={a.id_atividade} className="event-card" style={{ borderLeftColor: t.cor }} onClick={() => setDetalhe(comOcorrencia(a, occ))}>
        <div className="event-card-top">
          <div className="event-name">{(a.recorrente ? '🔁 ' : '') + a.nome_atividade}</div>
          <span className="event-badge" style={{ background: t.bg, color: t.cor }}>{mostrarData ? `${t.emoji} ${t.label}` : t.emoji}</span>
        </div>
        {mostrarData ? (
          <div className="event-meta">
            <span> {occ.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} às {hora}</span>
            {a.lugar_atividade && <span> {a.lugar_atividade}</span>}
          </div>
        ) : (
          <div className="event-meta"><span> {hora}{a.lugar_atividade ? ' · ' + a.lugar_atividade : ''}</span></div>
        )}
      </div>
    );
  };

  const t = detalhe && (TIPO[detalhe.tipo_atividade] || TIPO[1]);
  const d = detalhe?.data_atividade ? new Date(detalhe.data_atividade) : null;

  return (
    <div className="pagina pg-calendario bs">
      <Sidebar />

      <main className="main">
        {/* HEADER + FILTROS */}
        <div className="page-header">
          <div>
            <h1>Calendário</h1>
            <p>Acompanhe todas as atividades esportivas</p>
          </div>
          <div className="header-actions">
            <button className={'filter-btn all' + (filtro === 0 ? ' on' : '')} onClick={() => filtrar(0)}>Todos</button>
            <button className={'filter-btn t1' + (filtro === 1 ? ' on' : '')} onClick={() => filtrar(1)}> Treino</button>
            <button className={'filter-btn t2' + (filtro === 2 ? ' on' : '')} onClick={() => filtrar(2)}> Jogo</button>
            <button className="btn-relatorio" onClick={abrirRelatorio}> Gerar Relatório Anual</button>
          </div>
        </div>

        {/* STATS */}
        <div className="stats-row">
          <div className="stat-mini"><div className="stat-dot" style={{ background: 'var(--cinza)' }}></div><div><div className="stat-num" style={{ color: 'var(--branco)' }}>{eventos === null ? '—' : lista.length}</div><div className="stat-label">Total</div></div></div>
          <div className="stat-mini"><div className="stat-dot" style={{ background: 'var(--treino)' }}></div><div><div className="stat-num" style={{ color: 'var(--treino)' }}>{eventos === null ? '—' : lista.filter((a) => a.tipo_atividade === 1).length}</div><div className="stat-label">Treinos</div></div></div>
          <div className="stat-mini"><div className="stat-dot" style={{ background: 'var(--jogo)' }}></div><div><div className="stat-num" style={{ color: 'var(--jogo)' }}>{eventos === null ? '—' : lista.filter((a) => a.tipo_atividade === 2).length}</div><div className="stat-label">Jogos</div></div></div>
        </div>

        {/* CALENDÁRIO + COLUNA DIREITA */}
        <div className="cal-layout">
          <div className="card-dark">
            <div id="calendar" ref={calRef}></div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card-dark">
              <div className="card-title">⏭ Próximos Eventos</div>
              <div className="event-list">
                {eventos === null ? <div className="no-events">Carregando...</div>
                  : offline ? <div className="no-events">Backend offline</div>
                    : !proximos.length ? <div className="no-events">Nenhum evento futuro</div>
                      : proximos.map((o) => eventCard(o, true))}
              </div>
            </div>

            <div className="card-dark">
              <div className="card-title"> Hoje</div>
              <div className="event-list">
                {!hoje.length ? <div className="no-events">Nenhum evento hoje</div>
                  : hoje.map((o) => eventCard(o, false))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL DETALHES */}
      <Modal id="modalInfo" aberto={!!detalhe} onFechar={() => setDetalhe(null)}>
        {detalhe && (
          <>
            <div className="modal-header">
              <h5 className="modal-title" style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 22, letterSpacing: 1 }}>Detalhes da Atividade</h5>
              <button type="button" className="btn-close" onClick={() => setDetalhe(null)}></button>
            </div>
            <div className="modal-body">
              <div className="modal-tipo-banner" style={{ background: t.bg, border: '1px solid ' + t.cor + '33' }}>
                <div className="modal-tipo-icon">{t.emoji}</div>
                <div>
                  <div className="modal-tipo-nome" style={{ color: t.cor }}>{t.label}</div>
                  <div className="modal-tipo-sub" style={{ color: t.cor }}>{detalhe.nome_atividade}</div>
                </div>
              </div>
              <div className="detalhe-grid">
                <div className="detalhe-item full"><div className="detalhe-label">Nome da Atividade</div><div className="detalhe-valor">{detalhe.nome_atividade}</div></div>
                <div className="detalhe-item"><div className="detalhe-label">Data</div><div className="detalhe-valor" style={{ fontSize: 13 }}>{d ? d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : '—'}</div></div>
                <div className="detalhe-item"><div className="detalhe-label">Horário</div><div className="detalhe-valor">{d ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}</div></div>
                <div className="detalhe-item"><div className="detalhe-label">Local</div><div className="detalhe-valor">{detalhe.lugar_atividade || '—'}</div></div>
                <div className="detalhe-item"><div className="detalhe-label">Responsável</div><div className="detalhe-valor">{detalhe.usuario?.nome_usuario || '—'}</div></div>
                <div className="detalhe-item"><div className="detalhe-label">Status</div><div className="detalhe-valor">{detalhe.status_atividade ? ' Ativo' : ' Cancelado'}</div></div>
                <div className="detalhe-item"><div className="detalhe-label">Tipo</div><div className="detalhe-valor">
                  <span style={{ background: t.bg, color: t.cor, padding: '3px 10px', borderRadius: 10, fontSize: 12, fontWeight: 700 }}>{t.emoji} {t.label}</span>
                </div></div>
                {detalhe.recorrente && (
                  <div className="detalhe-item full">
                    <div className="detalhe-label">Recorrência</div>
                    <div className="detalhe-valor">🔁 Toda {d ? d.toLocaleDateString('pt-BR', { weekday: 'long' }) : 'semana'}{detalhe.fim_recorrencia ? ', até ' + new Date(detalhe.fim_recorrencia + 'T00:00:00').toLocaleDateString('pt-BR') : ''}</div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <Link to="/atividades.html" className="btn-acao">Ver Atividades</Link>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => setDetalhe(null)}>Fechar</button>
            </div>
          </>
        )}
      </Modal>

      {/* MODAL RELATÓRIO ANUAL */}
      <Modal id="modalRelatorio" tamanho="xl" aberto={relatorioAberto} onFechar={() => setRelatorioAberto(false)}>
        <div className="modal-header no-print">
          <h5 className="modal-title" style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 22, letterSpacing: 1 }}>Relatório Anual do Calendário</h5>
          <button type="button" className="btn-close" onClick={() => setRelatorioAberto(false)}></button>
        </div>
        <div className="modal-body">
          <div className="relatorio-controles no-print">
            <label className="form-label" style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--cinza)' }}>Ano</label>
            <input type="number" className="form-control" value={anoInput} onChange={(e) => setAnoInput(e.target.value)}
              style={{ width: 110, background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.1)', color: 'var(--branco)', borderRadius: 8 }} />
            <button className="btn-relatorio" onClick={() => setAnoRelatorio(parseInt(anoInput) || new Date().getFullYear())}>Gerar</button>
            <button className="btn-relatorio" onClick={() => window.print()}> Imprimir / Salvar PDF</button>
          </div>
          <div>
            {relatorioAberto && <Relatorio eventos={lista} ano={anoRelatorio} nomeTime={(ts && ts.nome) || 'Todos os Times'} />}
          </div>
        </div>
      </Modal>
    </div>
  );
}
