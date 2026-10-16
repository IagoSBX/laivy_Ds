import { useState } from 'react';

// Campos "nova senha" + "confirmar", com barra de força e requisitos. Usado na
// troca obrigatória do primeiro acesso (Login) e no "esqueci minha senha"
// (RedefinirSenha) — as mesmas regras nos dois lugares. Estilos em login.css.

const CORES_FORCA = ['#FF6B6B', '#FF6B6B', '#FFB020', '#FFB020', '#00C97A'];

function requisitos(val) {
  return {
    upper: /[A-Z]/.test(val),
    num: /[0-9]/.test(val),
    spec: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(val),
    len: val.length >= 8,
  };
}

// mesmo ícone de olho do cadastro de usuário (padrão do sistema)
const IconeOlho = ({ aberto }) => (aberto
  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>);

/** onConfirmar(nova) pode ser assíncrono; o botão fica travado enquanto ele roda. */
export default function NovaSenha({ onConfirmar, textoBotao = 'Confirmar Nova Senha', inputRef }) {
  const [nova, setNova] = useState('');
  const [conf, setConf] = useState('');
  const [verNova, setVerNova] = useState(false);
  const [verConf, setVerConf] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const reqs = requisitos(nova);
  const metCount = Object.values(reqs).filter(Boolean).length;
  const allMet = metCount === 4;
  const confere = nova === conf;
  const pronto = allMet && confere && conf.length > 0 && !enviando;

  async function confirmar(e) {
    e.preventDefault();
    if (!pronto) return;
    setEnviando(true);
    try { await onConfirmar(nova); } finally { setEnviando(false); }
  }

  return (
    <form onSubmit={confirmar}>
      <div className="ps-field">
        <label htmlFor="psNova">Nova Senha</label>
        <input type={verNova ? 'text' : 'password'} id="psNova" ref={inputRef} placeholder="••••••••" autoComplete="new-password"
          className={allMet ? 'ok' : nova.length > 0 ? 'err' : ''} value={nova} onChange={(e) => setNova(e.target.value)} />
        <button type="button" className="ps-eye" onClick={() => setVerNova((v) => !v)} aria-label={verNova ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={verNova}><IconeOlho aberto={verNova} /></button>
      </div>

      {/* Barra de força (0–4 requisitos = 0–100%) */}
      <div className="ps-strength-wrap">
        <div className="ps-strength-bar" style={{ width: metCount * 25 + '%', background: CORES_FORCA[metCount] }}></div>
      </div>

      <div className="ps-reqs">
        <div className={'ps-req' + (reqs.upper ? ' met' : '')}>Letra maiúscula</div>
        <div className={'ps-req' + (reqs.num ? ' met' : '')}>Número</div>
        <div className={'ps-req' + (reqs.spec ? ' met' : '')}>Caractere especial</div>
        <div className={'ps-req' + (reqs.len ? ' met' : '')}>Mínimo 8 caracteres</div>
      </div>

      <div className="ps-field">
        <label htmlFor="psConf">Confirmar Senha</label>
        <input type={verConf ? 'text' : 'password'} id="psConf" placeholder="••••••••" autoComplete="new-password"
          className={conf.length > 0 ? (confere ? 'ok' : 'err') : ''} value={conf} onChange={(e) => setConf(e.target.value)} />
        <button type="button" className="ps-eye" onClick={() => setVerConf((v) => !v)} aria-label={verConf ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={verConf}><IconeOlho aberto={verConf} /></button>
      </div>
      <div className={'ps-match' + (conf.length > 0 ? (confere ? ' ok' : ' err') : '')}>
        {conf.length > 0 && (confere ? '✅ Senhas conferem' : '❌ Senhas não conferem')}
      </div>

      <button type="submit" className={'ps-btn' + (pronto ? ' ready' : '')}>
        {enviando ? 'Salvando…' : '✅ ' + textoBotao}
      </button>
    </form>
  );
}
