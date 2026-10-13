import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import { authFetch } from '../lib/api.js';
import { timeSelecionado, usuarioLogado } from '../lib/sessao.js';
import useGrafico from '../lib/useGrafico.js';
import useTitulo from '../lib/useTitulo.js';
import { idade } from '../lib/validacao.js';
import '../styles/pages/perfil-atleta.css';

const TIPO_ATV = { 1: 'Treino', 2: 'Jogo' };
const TIPO_COR = { 1: '#00C97A', 2: '#FFB020' };

function iniciais(nome) {
  if (!nome) return '?';
  const p = nome.trim().split(' ');
  return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : p[0][0].toUpperCase();
}

function fmtData(d) {
  if (!d) return '—';
  // data pura (2026-10-05) vira meia-noite local; data com hora (atividades) já vem completa
  const dt = new Date(String(d).length === 10 ? d + 'T00:00:00' : d);
  return isNaN(dt) ? '—' : dt.toLocaleDateString('pt-BR');
}

const jsonOuVazio = (url) => authFetch(url).then((r) => (r.ok ? r.json() : []));

function GraficoPontuacao({ desempenhos }) {
  // últimos 12 desempenhos com pontuação, em ordem de data
  const comPts = desempenhos
    .filter((d) => d.pontuacao != null && d.data_desempenho)
    .sort((a, b) => new Date(a.data_desempenho) - new Date(b.data_desempenho))
    .slice(-12);
  const ref = useGrafico(() => (!comPts.length ? null : {
    type: 'line',
    data: {
      labels: comPts.map((d) => fmtData(d.data_desempenho)),
      datasets: [{
        label: 'Pontuação', data: comPts.map((d) => d.pontuacao),
        borderColor: '#00C97A', backgroundColor: 'rgba(0,201,122,0.12)', pointBackgroundColor: '#00C97A',
        pointRadius: 5, pointHoverRadius: 7, tension: 0.35, fill: true, borderWidth: 2.5,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0D1E3C', borderColor: 'rgba(0,201,122,0.3)', borderWidth: 1, titleColor: '#F0F4FF', bodyColor: '#00C97A',
          callbacks: { label: (c) => ' ' + c.raw + ' pts' },
        },
      },
      scales: {
        x: { ticks: { color: '#8899BB', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { ticks: { color: '#8899BB', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true },
      },
    },
  }), [desempenhos]);
  return <div className="chart-wrap">{comPts.length ? <canvas ref={ref} /> : <div className="empty-state">Sem pontuações registradas</div>}</div>;
}

export default function PerfilAtleta() {
  useTitulo('Perfil do Atleta — LAIVY');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const idAtleta = parseInt(params.get('id'));
  const sessao = usuarioLogado();
  const ts = timeSelecionado();
  const ehAtleta = sessao.tipo_usuario === 3;

  const [u, setU] = useState(null); // null = carregando, false = não encontrado
  const [extras, setExtras] = useState(null); // { exames, desempenhos, atividades }

  useEffect(() => {
    if (!idAtleta) { navigate('/usuarios.html', { replace: true }); return; }
    // atleta só pode ver o próprio perfil
    if (ehAtleta && sessao.id_usuario !== idAtleta) return;
    let ativo = true;
    setU(null);
    setExtras(null);
    (async () => {
      try {
        const res = await authFetch('/usuarios/' + idAtleta);
        if (!res.ok) throw new Error();
        const dados = await res.json();
        if (!ativo) return;
        setU(dados);
        const [exames, desempenhos, atividades] = await Promise.all([
          jsonOuVazio('/exames/usuario/' + idAtleta),
          jsonOuVazio('/desempenhos/usuario/' + idAtleta),
          jsonOuVazio('/atividades/usuario/' + idAtleta),
        ]);
        if (ativo) setExtras({ exames, desempenhos, atividades });
      } catch {
        if (ativo) setU(false);
      }
    })();
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idAtleta]);

  if (ehAtleta && idAtleta && sessao.id_usuario !== idAtleta) {
    return <Navigate to={'/perfil-atleta.html?id=' + sessao.id_usuario} replace />;
  }

  const exames = [...(extras?.exames || [])].sort((a, b) => new Date(b.data_inicio_exame) - new Date(a.data_inicio_exame));
  const atividades = [...(extras?.atividades || [])].sort((a, b) => new Date(b.data_atividade) - new Date(a.data_atividade)).slice(0, 20);
  const desempenhos = [...(extras?.desempenhos || [])].sort((a, b) => new Date(b.data_desempenho) - new Date(a.data_desempenho));
  const stat = (n) => (extras ? n : '—');

  return (
    <div className="pagina pg-perfil-atleta bs">
      <Sidebar ocultarGestao={ehAtleta} />

      <main className="main">
        <div className="page-header">
          <Link to="/usuarios.html" className="btn-back">← Voltar</Link>
          <h1>Perfil do Atleta</h1>
        </div>

        {/* HERO */}
        <div className="hero-card">
          <div className="hero-avatar">{u?.foto_usuario ? <img src={u.foto_usuario} alt="" /> : u ? iniciais(u.nome_usuario) : '?'}</div>
          <div className="hero-info">
            <div className="hero-nome">{u === null ? 'Carregando...' : u === false ? 'Atleta não encontrado' : u.nome_usuario || '—'}</div>
            <div className="hero-badges">
              <span className="badge-tipo">Atleta</span>
              <span className="badge-time">{u ? (u.time ? u.time.nome_time : (ts && ts.nome) || '—') : '—'}</span>
            </div>
            <div className="hero-stats">
              <div className="hero-stat"><div className="hero-stat-num">{stat(extras?.atividades.length)}</div><div className="hero-stat-label">Atividades</div></div>
              <div className="hero-stat"><div className="hero-stat-num">{stat(extras?.exames.length)}</div><div className="hero-stat-label">Exames</div></div>
              <div className="hero-stat"><div className="hero-stat-num">{stat(extras?.desempenhos.length)}</div><div className="hero-stat-label">Desempenhos</div></div>
              <div className="hero-stat"><div className="hero-stat-num">{u?.data_nasc_usuario ? idade(u.data_nasc_usuario) + ' anos' : '—'}</div><div className="hero-stat-label">Idade</div></div>
            </div>
          </div>
        </div>

        {/* INFO PESSOAL */}
        <div className="section-title">Informações Pessoais</div>
        <div className="info-grid">
          <div className="info-card"><div className="info-label">CPF</div><div className="info-valor">{u?.cpf_usuario || '—'}</div></div>
          <div className="info-card"><div className="info-label">Nascimento</div><div className="info-valor">{u ? fmtData(u.data_nasc_usuario) : '—'}</div></div>
          <div className="info-card"><div className="info-label">Celular</div><div className="info-valor">{u?.cel_usuario || '—'}</div></div>
        </div>

        {/* GRÁFICO + EXAMES */}
        <div className="content-grid">
          <div className="card-dark">
            <div className="section-title">Pontuação nos Jogos</div>
            {extras ? <GraficoPontuacao desempenhos={extras.desempenhos} /> : <div className="chart-wrap" />}
          </div>
          <div className="card-dark">
            <div className="section-title">Exames Médicos</div>
            <div>
              {!exames.length ? <div className="empty-state">Nenhum exame registrado</div> : exames.map((e) => (
                <div key={e.id_exame} className="exame-item">
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{fmtData(e.data_inicio_exame)}</div>
                    <div className="exame-medidas">
                      {e.peso_usuario ? e.peso_usuario + 'kg' : ''}
                      {e.altura_usuario ? ' · ' + e.altura_usuario + 'm' : ''}
                      {e.taxa_gordura_usuario ? ' · ' + e.taxa_gordura_usuario + '% gordura' : ''}
                      {e.observacoes_exame && <><br /><span style={{ color: 'var(--cinza)' }}>{e.observacoes_exame}</span></>}
                    </div>
                  </div>
                  <span className={'exame-status ' + (e.status_usuario === 1 ? 'st-apto' : 'st-inapto')}>{e.status_usuario === 1 ? 'Apto' : 'Inapto'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ATIVIDADES */}
        <div className="card-dark" style={{ marginBottom: 24 }}>
          <div className="section-title">Atividades Participadas</div>
          <div>
            {!atividades.length ? <div className="empty-state">Nenhuma atividade registrada</div> : atividades.map((a) => {
              const cor = TIPO_COR[a.tipo_atividade] || '#8899BB';
              return (
                <div key={a.id_atividade} className="atv-item">
                  <div className="atv-dot" style={{ background: cor }}></div>
                  <div style={{ flex: 1 }}>
                    <div className="atv-nome">{a.nome_atividade || '—'}</div>
                    <div className="atv-data">{fmtData(a.data_atividade)}{a.lugar_atividade ? ' · ' + a.lugar_atividade : ''}</div>
                  </div>
                  <span className="atv-tipo" style={{ background: cor + '22', color: cor }}>{TIPO_ATV[a.tipo_atividade] || 'Outro'}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* DESEMPENHOS */}
        <div className="card-dark" style={{ marginBottom: 24 }}>
          <div className="section-title">Histórico de Desempenho</div>
          <div>
            {!desempenhos.length ? <div className="empty-state">Nenhum desempenho registrado</div> : desempenhos.map((d) => (
              <div key={d.id_desempenho} className="desemp-item">
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{fmtData(d.data_desempenho)}</div>
                  <div className="desemp-extra">
                    {d.salto_horizontal ? 'Horiz: ' + d.salto_horizontal + 'm' : ''}
                    {d.salto_vertical ? ' · Vert: ' + d.salto_vertical + 'm' : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="desemp-pts">{d.pontuacao ?? '—'}</div>
                  <div className="desemp-data">pts</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
