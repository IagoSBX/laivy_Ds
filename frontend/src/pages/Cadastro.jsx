import { useState } from 'react';
import { Link } from 'react-router-dom';
import NovaSenha from '../components/NovaSenha.jsx';
import useTitulo from '../lib/useTitulo.js';
import { mascaraTelefone, validarEmail, validarNome } from '../lib/validacao.js';
import '../styles/pages/login.css';

// Treinador cria a própria conta. Ela só vale depois do clique no link que
// vai para o e-mail informado; aí ele entra e escolhe um plano (ou o teste).
export default function Cadastro() {
  useTitulo('Criar conta — LAIVY');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cel, setCel] = useState('');
  const [erro, setErro] = useState('');
  const [feito, setFeito] = useState(null); // { email, login }

  async function cadastrar(senha) {
    setErro('');
    if (!validarNome(nome).ok) { setErro('Informe seu nome completo.'); return; }
    if (!validarEmail(email.trim()).ok) { setErro('Informe um e-mail válido.'); return; }
    try {
      const res = await fetch('/usuarios/cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome_usuario: nome.trim(), email_usuario: email.trim(), cel_usuario: cel, senha_usuario: senha }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setErro(d.erro || 'Não foi possível criar a conta. Tente novamente.'); return; }
      setFeito(d);
    } catch {
      setErro('Servidor offline. Tente novamente em instantes.');
    }
  }

  return (
    <div className="pagina pg-login">
      <div className="ps-overlay show">
        <div className="ps-card" style={{ maxHeight: '94vh', overflowY: 'auto' }}>
          <div className="ps-title">Criar conta de treinador</div>
          {feito ? (
            <>
              <div className="ps-sub">
                Enviamos um link de confirmação para <strong>{feito.email}</strong>.<br />
                Abra o e-mail e clique no link para ativar a conta (vale por 24 horas). Confira também o spam.<br /><br />
                Depois, entre com o seu e-mail (ou o login <strong>{feito.login}</strong>), a senha que você criou e o perfil <strong>Treinador</strong>.
              </div>
              <Link to="/login.html" className="ps-btn ready" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>Ir para o login</Link>
            </>
          ) : (
            <>
              <div className="ps-sub">Teste grátis por 7 dias ou escolha um plano depois de confirmar seu e-mail.</div>
              <div className="ps-field">
                <label htmlFor="cadNome">Nome completo</label>
                <input id="cadNome" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" />
              </div>
              <div className="ps-field">
                <label htmlFor="cadEmail">E-mail</label>
                <input id="cadEmail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" />
              </div>
              <div className="ps-field">
                <label htmlFor="cadCel">Celular (opcional)</label>
                <input id="cadCel" type="tel" autoComplete="tel" value={cel} onChange={(e) => setCel(mascaraTelefone(e.target.value))} placeholder="(11) 98765-4321" />
              </div>
              <NovaSenha onConfirmar={cadastrar} textoBotao="Criar conta" />
              {erro && <div className="ps-match err" style={{ marginTop: 12 }}>{erro}</div>}
              <Link to="/login.html" className="link-esqueci" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>Já tenho conta</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
