import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import NovaSenha from '../components/NovaSenha.jsx';
import useTitulo from '../lib/useTitulo.js';
import '../styles/pages/login.css';

// Aberta pelo link do e-mail de "esqueci minha senha" (?token=...). O próprio
// usuário cria a senha nova aqui; ninguém da equipe vê ou define essa senha.
export default function RedefinirSenha() {
  useTitulo('Redefinir senha — LAIVY');
  const [params] = useSearchParams();
  // o token sai da barra de endereço (histórico, prints) mas fica guardado aqui
  const [token] = useState(() => params.get('token') || '');
  const [estado, setEstado] = useState(token ? 'form' : 'invalido'); // form | ok | invalido
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (params.get('token')) window.history.replaceState(null, '', '/redefinir-senha.html');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function confirmar(nova) {
    setErro('');
    try {
      const res = await fetch('/usuarios/redefinir-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, senha_usuario: nova }),
      });
      if (res.ok) { setEstado('ok'); return; }
      const d = await res.json().catch(() => ({}));
      if (/inválido ou expirado/i.test(d.erro || '')) { setEstado('invalido'); return; }
      setErro(d.erro || 'Não foi possível redefinir a senha. Tente novamente.');
    } catch {
      setErro('Servidor offline. Tente novamente em instantes.');
    }
  }

  return (
    <div className="pagina pg-login">
      <div className="ps-overlay show">
        <div className="ps-card">
          <div className="ps-title">Redefinir senha</div>
          {estado === 'form' && (
            <>
              <div className="ps-sub">Crie a sua nova senha. Só você vai conhecê-la.</div>
              <NovaSenha onConfirmar={confirmar} textoBotao="Salvar Nova Senha" />
              {erro && <div className="ps-match err" style={{ marginTop: 12 }}>{erro}</div>}
            </>
          )}
          {estado === 'ok' && (
            <>
              <div className="ps-sub">Senha redefinida! Entre com a sua nova senha.<br />Por segurança, as sessões abertas em outros aparelhos foram encerradas.</div>
              <Link to="/login.html" className="ps-btn ready" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>Ir para o login</Link>
            </>
          )}
          {estado === 'invalido' && (
            <>
              <div className="ps-sub">Este link é inválido, já foi usado ou expirou (ele vale por 30 minutos).<br />Peça um novo na tela de login.</div>
              <Link to="/login.html?esqueci=1" className="ps-btn ready" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>Pedir novo link</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
