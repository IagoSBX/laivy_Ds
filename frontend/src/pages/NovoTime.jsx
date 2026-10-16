import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import TimeForm from '../components/TimeForm.jsx';
import ToastsIcone from '../components/ToastsIcone.jsx';
import { authFetch, getJson } from '../lib/api.js';
import { atualizarUsuario, usuarioLogado } from '../lib/sessao.js';
import useTitulo from '../lib/useTitulo.js';
import useToasts from '../lib/useToasts.js';
import '../styles/pages/novo-time.css';

export default function NovoTime() {
  useTitulo('Novo Time — LAIVY');
  const navigate = useNavigate();
  const user = usuarioLogado();
  const [toasts, toast] = useToasts();
  const isAdmin = user.tipo_usuario === 1;
  // Treinador que pagou um plano cria o próprio time (ele é o responsável)
  const proprioTime = user.tipo_usuario === 2 && user.situacao === 'ATIVO' && !user.time;
  const [responsaveis, setResponsaveis] = useState(proprioTime ? [user] : null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    getJson('/usuarios')
      .then((us) => setResponsaveis(us.filter((u) => u.tipo_usuario === 1 || u.tipo_usuario === 2)))
      .catch(() => setErro(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (user.id_usuario && !isAdmin && !proprioTime) return <Navigate to="/dashboard.html" replace />;

  async function salvar(payload) {
    try {
      const r = await authFetch('/times', { method: 'POST', body: JSON.stringify(payload) });
      const t = await r.json().catch(() => ({}));
      if (!r.ok) { toast(t.erro || 'Erro ao cadastrar time.', false); return false; }
      toast('Time cadastrado com sucesso!');
      if (proprioTime) {
        // agora ele é membro do time: já entra nele
        atualizarUsuario({ time: { id_time: t.id_time, nome_time: t.nome_time } });
        localStorage.setItem('timeSelecionado', JSON.stringify({ id: t.id_time, nome: t.nome_time, cor: t.cor_time || '#00C97A', logo: t.logo_time || null }));
        setTimeout(() => navigate('/usuarios.html'), 1200);
      } else {
        setTimeout(() => navigate('/painel-admin.html?tab=times'), 1200);
      }
      return true;
    } catch {
      toast('Erro ao cadastrar time. Verifique o servidor.', false);
      return false;
    }
  }

  return (
    <div className="pagina pg-novo-time bs">
      <Sidebar />
      <main className="main">
        <div className="page-header">
          <div>
            <h1>Novo Time</h1>
            <p>{proprioTime ? 'Cadastre o seu time. Depois é só convidar os atletas por e-mail.' : 'Cadastre um novo time e defina o treinador responsável'}</p>
          </div>
        </div>
        <TimeForm responsaveis={responsaveis} erroResponsaveis={erro} onSalvar={salvar} toast={toast}
          inicial={proprioTime ? { treinador: user } : undefined} />
      </main>
      <ToastsIcone toasts={toasts} />
    </div>
  );
}
