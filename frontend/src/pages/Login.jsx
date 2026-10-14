import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import IntroLogin from '../components/IntroLogin.jsx';
import useTitulo from '../lib/useTitulo.js';
import '../styles/pages/login.css';

const PERFIS = { 1: 'Administrador', 2: 'Treinador', 3: 'Atleta' };
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

export default function Login() {
  useTitulo('LAIVY — For those who live the game');
  const navigate = useNavigate();
  const stageRef = useRef(null);
  const marcaRef = useRef(null);
  const errRef = useRef(null);
  const senhaRef = useRef(null);
  const novaRef = useRef(null);

  // splash só na primeira visita da sessão (decidido na leitura; o efeito grava a marca)
  const [rapido, setRapido] = useState(() =>
    !!sessionStorage.getItem('splashVisto') || matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [tipo, setTipo] = useState('1');
  const [erro, setErro] = useState(null); // { msg, login: bool, senha: bool }
  const [shake, setShake] = useState(0);

  const [userPendente, setUserPendente] = useState(null); // aguardando troca de senha
  const [nova, setNova] = useState('');
  const [conf, setConf] = useState('');
  const [verNova, setVerNova] = useState(false);
  const [verConf, setVerConf] = useState(false);

  const [loading, setLoading] = useState(null); // { nome, perfil, done }

  // ---------- SPLASH ----------
  // O símbolo nasce no centro da tela (onde os jogadores se juntam) e depois desliza até o lugar dele.
  useLayoutEffect(() => {
    const st = stageRef.current, m = marcaRef.current;
    function centraliza() {
      const r = st.getBoundingClientRect();
      m.style.setProperty('--dx', (innerWidth / 2 - (r.left + m.offsetLeft + m.offsetWidth / 2)) + 'px');
      // no eixo Y quem fica no centro é o símbolo (não o bloco todo), já com o scale(1.35) aplicado
      const ic = m.querySelector('.marca-icone'), oy = ic.offsetTop + ic.offsetHeight / 2 - m.offsetHeight / 2;
      m.style.setProperty('--dy', (innerHeight / 2 - (r.top + m.offsetTop + m.offsetHeight / 2) - 1.35 * oy) + 'px');
    }
    const pular = () => setRapido(true);
    if (rapido) return;
    sessionStorage.setItem('splashVisto', '1');
    centraliza();
    document.fonts.ready.then(centraliza);
    addEventListener('resize', centraliza);
    st.addEventListener('click', pular);
    addEventListener('keydown', pular, { once: true });
    return () => {
      removeEventListener('resize', centraliza);
      st.removeEventListener('click', pular);
      removeEventListener('keydown', pular);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // reinicia a animação de "shake" a cada erro
  useEffect(() => {
    const el = errRef.current;
    if (!el || !shake) return;
    el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
  }, [shake]);

  function mostrarErro(msg, errLogin, errSenha) {
    setErro({ msg, login: errLogin, senha: errSenha });
    setShake((n) => n + 1);
    if (errSenha) { setSenha(''); senhaRef.current?.focus(); }
  }

  function limparErro() { setErro(null); }

  async function fazerLogin(e) {
    e.preventDefault();
    try {
      const res = await fetch('/usuarios/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login_usuario: login.trim(), senha_usuario: senha, tipo_usuario: tipo }),
      });

      if (res.status === 401 || res.status === 429) {
        const data = await res.json().catch(() => ({}));
        const msg = data.erro || 'Credenciais inválidas.';
        if (msg.includes('não encontrado') || msg.includes('perfil')) mostrarErro(msg, true, false);
        else mostrarErro(msg, false, true);
        return;
      }
      if (!res.ok) { mostrarErro('Erro no servidor. Tente novamente.', false, false); return; }

      const { usuario: u } = await res.json();
      // O token vai em cookie HttpOnly (setado pelo backend) — aqui só ficam os dados de exibição.
      localStorage.setItem('usuario', JSON.stringify(u));

      if (u.primeiro_login === 1 || u.primeiro_login === '1') {
        setUserPendente(u);
        setTimeout(() => novaRef.current?.focus(), 0);
      } else {
        mostrarLoginLoading();
      }
    } catch {
      mostrarErro('Servidor offline. Verifique a conexão com o backend.', true, true);
    }
  }

  // ---------- POPUP: TROCA DE SENHA NO PRIMEIRO LOGIN ----------
  const reqs = requisitos(nova);
  const metCount = Object.values(reqs).filter(Boolean).length;
  const allMet = metCount === 4;
  const confere = nova === conf;
  const pronto = allMet && confere && conf.length > 0;

  async function psConfirmar() {
    if (!userPendente) return;
    try {
      const res = await fetch('/usuarios/' + userPendente.id_usuario + '/senha', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha_usuario: nova }),
      });
      if (res.ok) {
        const data = await res.json();
        // /senha renova o cookie do token no backend; aqui só atualizamos os dados exibidos
        localStorage.setItem('usuario', JSON.stringify(data.usuario || data));
        setUserPendente(null);
        mostrarLoginLoading();
      } else {
        alert('Erro ao salvar a senha. Tente novamente.');
      }
    } catch {
      // Fallback offline: salva localmente e prossegue
      localStorage.setItem('usuario', JSON.stringify({ ...userPendente, primeiro_login: 0 }));
      setUserPendente(null);
      mostrarLoginLoading();
    }
  }

  // ---------- TELA DE SUCESSO ----------
  function mostrarLoginLoading() {
    const u = JSON.parse(localStorage.getItem('usuario') || '{}');
    const nome = u.nome_usuario || u.login_usuario || '';
    setLoading({ nome: nome ? 'Bem-vindo, ' + nome.split(' ')[0] : 'Bem-vindo', perfil: PERFIS[Number(u.tipo_usuario)] || '', done: false });
    const destino = Number(u.tipo_usuario) === 1 ? '/painel-admin.html' : '/selecionar-time.html';
    setTimeout(() => setLoading((l) => l && { ...l, done: true }), 2500);
    setTimeout(() => navigate(destino), 3100);
  }

  // o overlay precisa ser pintado com display:flex antes de ganhar .show (para animar)
  const [overlayVisivel, setOverlayVisivel] = useState(false);
  useEffect(() => {
    if (!loading) return;
    const id = requestAnimationFrame(() => setOverlayVisivel(true));
    return () => cancelAnimationFrame(id);
  }, [loading]);

  const classeCampo = (v, ok) => (ok ? 'ok' : v.length > 0 ? 'err' : '');

  return (
    <div className="pagina pg-login">
      {/* LOGIN LOADING OVERLAY */}
      <div id="loginLoading" aria-live="polite"
        className={[overlayVisivel && 'show', loading?.done && 'done'].filter(Boolean).join(' ')}
        style={loading ? { display: 'flex' } : undefined}>
        <div style={{ position: 'relative' }}>
          <div className="ll-ring"></div>
          <div className="ll-mark">
            <img className="ll-L" src="/img/logo/icone/laivy-icone-claro.svg" alt="LAIVY" />
            <svg viewBox="0 0 100 100"><path d="M18 54 L42 76 L84 28" pathLength="1" fill="none" stroke="#00C97A" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
        </div>
        <div className="ll-txt">
          <div className="ll-nome">{loading?.nome || 'Bem-vindo'}</div>
          <div className="ll-perfil">{loading?.perfil}</div>
          <div className="ll-bar"><i></i></div>
          <div className="ll-status">
            <span className="carregando">Carregando seu painel…</span>
            <span className="ok">Acesso liberado</span>
          </div>
        </div>
      </div>

      <main className={'stage' + (rapido ? ' rapido' : '')} id="stage" ref={stageRef}>
        <IntroLogin />

        <section className="marca" id="marca" ref={marcaRef}>
          <div className="marca-icone"><img src="/img/logo/icone/laivy-icone-claro.svg" alt="LAIVY" style={{ display: 'block', width: '100%', height: '100%' }} /></div>
          <div className="marca-nome">
            {['L', 'A', 'I', 'V', 'Y'].map((l, i) => <span key={i} style={{ '--i': i }}>{l}</span>)}
          </div>
          <div className="marca-slogan">For those who live the game</div>
        </section>

        <section className="form-side">
          <div className="form-header">
            <h2>Bem-vindo</h2>
          </div>

          <div className="error-msg" ref={errRef} style={{ display: erro ? 'block' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF6B6B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              <span>{erro?.msg || 'Usuário ou senha inválidos.'}</span>
            </div>
          </div>

          <form id="formLogin" onSubmit={fazerLogin}>
            <div className="form-group">
              <label htmlFor="loginInput">Login</label>
              <input type="text" id="loginInput" placeholder="Digite seu login" required autoComplete="username"
                className={erro?.login ? 'err-field' : ''}
                value={login} onChange={(e) => { setLogin(e.target.value); limparErro(); }} />
            </div>

            <div className="form-group">
              <label htmlFor="senhaInput">Senha</label>
              <input type="password" id="senhaInput" ref={senhaRef} placeholder="••••••••" required autoComplete="current-password"
                className={erro?.senha ? 'err-field' : ''}
                value={senha} onChange={(e) => { setSenha(e.target.value); limparErro(); }} />
            </div>

            <div className="form-group">
              <label htmlFor="tipoSelect">Perfil</label>
              <select className="select-tipo" id="tipoSelect" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="1">Administrador</option>
                <option value="2">Treinador</option>
                <option value="3">Atleta</option>
              </select>
            </div>

            <button type="submit" className="btn-login">Entrar</button>
          </form>
        </section>
      </main>

      {/* POPUP TROCA DE SENHA — PRIMEIRO LOGIN */}
      <div id="popupSenha" className={userPendente ? 'show' : ''}>
        <div className="ps-card">
          <div className="ps-icon">🔐</div>
          <div className="ps-title">Criar Nova Senha</div>
          <div className="ps-sub">
            Este é seu primeiro acesso.<br />
            Crie uma senha segura para continuar.
          </div>

          <div className="ps-field">
            <label htmlFor="psNova">Nova Senha</label>
            <input type={verNova ? 'text' : 'password'} id="psNova" ref={novaRef} placeholder="••••••••" autoComplete="new-password"
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
              className={conf.length > 0 ? classeCampo(conf, confere) : ''} value={conf} onChange={(e) => setConf(e.target.value)} />
            <button type="button" className="ps-eye" onClick={() => setVerConf((v) => !v)} aria-label={verConf ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={verConf}><IconeOlho aberto={verConf} /></button>
          </div>
          <div className={'ps-match' + (conf.length > 0 ? (confere ? ' ok' : ' err') : '')}>
            {conf.length > 0 && (confere ? '✅ Senhas conferem' : '❌ Senhas não conferem')}
          </div>

          <button className={'ps-btn' + (pronto ? ' ready' : '')} onClick={psConfirmar}>
            ✅ Confirmar Nova Senha
          </button>
        </div>
      </div>
    </div>
  );
}
