import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import TimeForm from '../components/TimeForm.jsx';
import ToastsIcone from '../components/ToastsIcone.jsx';
import { authFetch, getJson } from '../lib/api.js';
import { usuarioLogado } from '../lib/sessao.js';
import useTitulo from '../lib/useTitulo.js';
import useToasts from '../lib/useToasts.js';
import '../styles/pages/editar-time.css';

export default function EditarTime() {
  useTitulo('Editar Time — LAIVY');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const timeId = parseInt(params.get('id'));
  const user = usuarioLogado();
  const [toasts, toast] = useToasts();
  const [dados, setDados] = useState(null); // null = carregando, false = não encontrado, { time, responsaveis }

  useEffect(() => {
    if (!timeId) return;
    Promise.all([
      authFetch('/times/' + timeId).then((r) => { if (!r.ok) throw new Error(); return r.json(); }),
      getJson('/usuarios'),
    ])
      .then(([time, usuarios]) => setDados({ time, responsaveis: usuarios.filter((u) => u.tipo_usuario === 1 || u.tipo_usuario === 2) }))
      .catch(() => setDados(false));
  }, [timeId]);

  if (user.id_usuario && user.tipo_usuario !== 1) return <Navigate to="/dashboard.html" replace />; // só admin
  if (!timeId) return <Navigate to="/painel-admin.html?tab=times" replace />;

  async function salvar(payload) {
    try {
      const r = await authFetch('/times/' + timeId, { method: 'PUT', body: JSON.stringify(payload) });
      if (!r.ok) throw new Error();
      await r.json();
      toast('Time atualizado com sucesso!');
      setTimeout(() => navigate('/painel-admin.html?tab=times'), 1200);
      return true;
    } catch {
      toast('Erro ao salvar. Verifique o servidor.', false);
      return false;
    }
  }

  return (
    <div className="pagina pg-editar-time bs">
      <Sidebar />
      <main className="main">
        {dados === null && (
          <div className="loading-full"><div className="spin"></div>Carregando dados do time...</div>
        )}
        {dados === false && (
          <div className="loading-full">
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 22, marginBottom: 8 }}>Time não encontrado</div>
            <div style={{ color: 'var(--cinza)' }}>Verifique o ID ou volte para a lista.</div><br />
          </div>
        )}
        {dados && (
          <>
            <div className="page-header">
              <div>
                <h1>Editar Time</h1>
                <p>Atualize as informações do time <strong style={{ color: 'var(--verde)' }}>{dados.time.nome_time}</strong></p>
              </div>
            </div>
            <TimeForm editando inicial={dados.time} responsaveis={dados.responsaveis} onSalvar={salvar} toast={toast} />
          </>
        )}
      </main>
      <ToastsIcone toasts={toasts} />
    </div>
  );
}
