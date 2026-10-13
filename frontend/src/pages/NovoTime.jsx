import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import TimeForm from '../components/TimeForm.jsx';
import ToastsIcone from '../components/ToastsIcone.jsx';
import { authFetch, getJson } from '../lib/api.js';
import { usuarioLogado } from '../lib/sessao.js';
import useTitulo from '../lib/useTitulo.js';
import useToasts from '../lib/useToasts.js';
import '../styles/pages/novo-time.css';

export default function NovoTime() {
  useTitulo('Novo Time — LAIVY');
  const navigate = useNavigate();
  const user = usuarioLogado();
  const [toasts, toast] = useToasts();
  const [responsaveis, setResponsaveis] = useState(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    getJson('/usuarios')
      .then((us) => setResponsaveis(us.filter((u) => u.tipo_usuario === 1 || u.tipo_usuario === 2)))
      .catch(() => setErro(true));
  }, []);

  if (user.id_usuario && user.tipo_usuario !== 1) return <Navigate to="/dashboard.html" replace />; // só admin

  async function salvar(payload) {
    try {
      const r = await authFetch('/times', { method: 'POST', body: JSON.stringify(payload) });
      if (!r.ok) throw new Error();
      await r.json();
      toast('Time cadastrado com sucesso!');
      setTimeout(() => navigate('/painel-admin.html?tab=times'), 1200);
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
            <p>Cadastre um novo time e defina o treinador responsável</p>
          </div>
        </div>
        <TimeForm responsaveis={responsaveis} erroResponsaveis={erro} onSalvar={salvar} toast={toast} />
      </main>
      <ToastsIcone toasts={toasts} />
    </div>
  );
}
