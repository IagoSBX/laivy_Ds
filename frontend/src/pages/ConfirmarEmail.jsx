import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import useTitulo from '../lib/useTitulo.js';
import '../styles/pages/login.css';

// Aberta pelo link do e-mail de confirmação do cadastro (?token=...).
export default function ConfirmarEmail() {
  useTitulo('Confirmar e-mail — LAIVY');
  const [params] = useSearchParams();
  const [token] = useState(() => params.get('token') || '');
  const [estado, setEstado] = useState(token ? { fase: 'confirmando' } : { fase: 'erro' });
  const enviado = useRef(false); // StrictMode roda o efeito duas vezes em dev; o token é de uso único

  useEffect(() => {
    if (params.get('token')) window.history.replaceState(null, '', '/confirmar-email.html');
    if (!token || enviado.current) return;
    enviado.current = true;
    fetch('/usuarios/confirmar-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const d = await res.json().catch(() => ({}));
        setEstado(res.ok ? { fase: 'ok', login: d.login } : { fase: 'erro', msg: d.erro });
      })
      .catch(() => setEstado({ fase: 'erro', msg: 'Servidor offline. Tente abrir o link de novo em instantes.' }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="pagina pg-login">
      <div className="ps-overlay show">
        <div className="ps-card">
          <div className="ps-title">Confirmação de e-mail</div>
          {estado.fase === 'confirmando' && <div className="ps-sub">Confirmando…</div>}
          {estado.fase === 'ok' && (
            <>
              <div className="ps-sub">
                E-mail confirmado! Sua conta está ativa.<br />
                Entre com seu e-mail (ou o login <strong>{estado.login}</strong>), sua senha e o perfil <strong>Treinador</strong>.
              </div>
              <Link to="/login.html" className="ps-btn ready" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>Entrar</Link>
            </>
          )}
          {estado.fase === 'erro' && (
            <>
              <div className="ps-sub">{estado.msg || 'Link de confirmação inválido ou expirado.'}<br />Tente entrar: na tela de login dá para pedir um novo link.</div>
              <Link to="/login.html" className="ps-btn ready" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>Ir para o login</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
