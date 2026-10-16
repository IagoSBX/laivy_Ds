import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

// Cada tela vira um chunk próprio (como as páginas antigas, que só carregavam o que usavam).
const Assistente = lazy(() => import('./pages/Assistente.jsx'));
const Atividades = lazy(() => import('./pages/Atividades.jsx'));
const BibliotecaJogadas = lazy(() => import('./pages/BibliotecaJogadas.jsx'));
const Cadastro = lazy(() => import('./pages/Cadastro.jsx'));
const Calendario = lazy(() => import('./pages/Calendario.jsx'));
const CompletarCadastro = lazy(() => import('./pages/CompletarCadastro.jsx'));
const ConfirmarEmail = lazy(() => import('./pages/ConfirmarEmail.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Desempenho = lazy(() => import('./pages/Desempenho.jsx'));
const EditarTime = lazy(() => import('./pages/EditarTime.jsx'));
const Escalacao = lazy(() => import('./pages/Escalacao.jsx'));
const Exames = lazy(() => import('./pages/Exames.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const NovoTime = lazy(() => import('./pages/NovoTime.jsx'));
const PainelAdmin = lazy(() => import('./pages/PainelAdmin.jsx'));
const PerfilAtleta = lazy(() => import('./pages/PerfilAtleta.jsx'));
const Planos = lazy(() => import('./pages/Planos.jsx'));
const Prancheta = lazy(() => import('./pages/Prancheta.jsx'));
const RedefinirSenha = lazy(() => import('./pages/RedefinirSenha.jsx'));
const SelecionarTime = lazy(() => import('./pages/SelecionarTime.jsx'));
const Usuarios = lazy(() => import('./pages/Usuarios.jsx'));

// As telas mantêm as URLs antigas (/login.html, /dashboard.html…), assim links,
// favoritos e o e-mail de cadastro continuam funcionando. O Spring devolve o
// index.html para qualquer /<tela>.html (ver SpaController).
export default function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/login.html" element={<Login />} />
        <Route path="/redefinir-senha.html" element={<RedefinirSenha />} />
        <Route path="/cadastro.html" element={<Cadastro />} />
        <Route path="/confirmar-email.html" element={<ConfirmarEmail />} />
        <Route path="/planos.html" element={<Planos />} />
        <Route path="/completar-cadastro.html" element={<CompletarCadastro />} />
        <Route path="/selecionar-time.html" element={<SelecionarTime />} />
        <Route path="/dashboard.html" element={<Dashboard />} />
        <Route path="/usuarios.html" element={<Usuarios />} />
        <Route path="/escalacao.html" element={<Escalacao />} />
        <Route path="/exames.html" element={<Exames />} />
        <Route path="/desempenho.html" element={<Desempenho />} />
        <Route path="/atividades.html" element={<Atividades />} />
        <Route path="/calendario.html" element={<Calendario />} />
        <Route path="/assistente.html" element={<Assistente />} />
        <Route path="/perfil-atleta.html" element={<PerfilAtleta />} />
        <Route path="/novo-time.html" element={<NovoTime />} />
        <Route path="/editar-time.html" element={<EditarTime />} />
        <Route path="/painel-admin.html" element={<PainelAdmin />} />
        <Route path="/biblioteca-jogadas.html" element={<BibliotecaJogadas />} />
        <Route path="/prancheta.html" element={<Prancheta />} />
        {/* telas antigas que só redirecionavam para abas do Painel Admin */}
        <Route path="/times.html" element={<Navigate to="/painel-admin.html?tab=times" replace />} />
        <Route path="/cadastrar-treinador.html" element={<Navigate to="/painel-admin.html?tab=treinadores" replace />} />
        <Route path="*" element={<Navigate to="/login.html" replace />} />
      </Routes>
    </Suspense>
  );
}
