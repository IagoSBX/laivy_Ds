import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import IntroLogin from '../components/IntroLogin.jsx';
import NovaSenha from '../components/NovaSenha.jsx';
import { destinoInicial, TIPOS as PERFIS } from '../lib/sessao.js';
import useTitulo from '../lib/useTitulo.js';
import '../styles/pages/login.css';

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
  const [erro, setErro] = useState(null); // { msg, login: bool, senha: bool, confirmar: bool }
  const [reenvio, setReenvio] = useState(null); // mensagem depois de reenviar a confirmação
  const [shake, setShake] = useState(0);

  const [userPendente, setUserPendente] = useState(null); // aguardando troca de senha

  // "Esqueci minha senha": null = fechado; { valor, enviando, erro, msg } = aberto
  const [params] = useSearchParams();
  const [esqueci, setEsqueci] = useState(() => (params.get('esqueci') ? { valor: '' } : null));
  const esqueciRef = useRef(null);

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

  function limparErro() { setErro(null); setReenvio(null); }

  // Treinador que se cadastrou e ainda não clicou no link do e-mail
  async function reenviarConfirmacao() {
    try {
      const res = await fetch('/usuarios/reenviar-confirmacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: login.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      setReenvio(d.mensagem || d.erro || 'Tente novamente em instantes.');
    } catch {
      setReenvio('Servidor offline. Tente novamente em instantes.');
    }
  }

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
      if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        setErro({ msg: data.erro || 'Confirme seu e-mail antes de entrar.', confirmar: true });
        setShake((n) => n + 1);
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

  // ---------- ESQUECI MINHA SENHA ----------
  // Só pede o link; quem cria a senha nova é o próprio usuário, pelo e-mail.
  function abrirEsqueci() { setEsqueci({ valor: login.trim() }); }
  function fecharEsqueci() { setEsqueci(null); }

  useEffect(() => {
    if (!esqueci) return;
    esqueciRef.current?.focus();
    const esc = (e) => e.key === 'Escape' && setEsqueci(null);
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [!!esqueci]); // eslint-disable-line react-hooks/exhaustive-deps

  async function pedirLink(e) {
    e.preventDefault();
    const valor = esqueci.valor.trim();
    if (!valor || esqueci.enviando) return;
    setEsqueci((s) => ({ ...s, enviando: true, erro: null }));
    try {
      const res = await fetch('/usuarios/esqueci-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: valor }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setEsqueci((s) => ({ ...s, enviando: false, erro: data.erro || 'Não foi possível enviar agora. Tente novamente.' })); return; }
      setEsqueci((s) => ({ ...s, enviando: false, msg: data.mensagem }));
    } catch {
      setEsqueci((s) => ({ ...s, enviando: false, erro: 'Servidor offline. Tente novamente em instantes.' }));
    }
  }

  // ---------- POPUP: TROCA DE SENHA NO PRIMEIRO LOGIN ----------
  async function psConfirmar(nova) {
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
        localStorage.setItem('usuario', JSON.stringify({ situacao: userPendente.situacao, ...(data.usuario || data) }));
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
    const destino = destinoInicial(u);
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
            {erro?.confirmar && (
              reenvio
                ? <div style={{ marginTop: 8, fontSize: 13 }}>{reenvio}</div>
                : <button type="button" className="link-esqueci" style={{ marginTop: 8 }} onClick={reenviarConfirmacao}>Reenviar e-mail de confirmação</button>
            )}
          </div>

          <form id="formLogin" onSubmit={fazerLogin}>
            <div className="form-group">
              <label htmlFor="loginInput">Login ou e-mail</label>
              <input type="text" id="loginInput" placeholder="Seu login ou e-mail" required autoComplete="username"
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
                <option value="4">Preparador Físico</option>
              </select>
            </div>

            <button type="submit" className="btn-login">Entrar</button>
            <button type="button" className="link-esqueci" onClick={abrirEsqueci}>Esqueci minha senha</button>
            <Link to="/cadastro.html" className="link-esqueci" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
              É treinador e ainda não tem conta? <strong>Cadastre-se</strong>
            </Link>
          </form>
        </section>
      </main>

      {/* POPUP ESQUECI MINHA SENHA */}
      <div className={'ps-overlay' + (esqueci ? ' show' : '')} onMouseDown={(e) => { if (e.target === e.currentTarget) fecharEsqueci(); }}>
        <div className="ps-card" role="dialog" aria-modal="true" aria-labelledby="esqTitulo">
          <div className="ps-title" id="esqTitulo">Esqueci minha senha</div>
          {esqueci?.msg ? (
            <>
              <div className="ps-sub">{esqueci.msg}<br />O link vale por 30 minutos.</div>
              <button type="button" className="ps-btn ready" onClick={fecharEsqueci}>Voltar ao login</button>
            </>
          ) : (
            <form onSubmit={pedirLink}>
              <div className="ps-sub">Informe seu login ou e-mail. Vamos enviar um link para você criar uma senha nova.</div>
              <div className="ps-field">
                <label htmlFor="esqLogin">Login ou e-mail</label>
                <input id="esqLogin" ref={esqueciRef} autoComplete="username" placeholder="seu login ou e-mail"
                  value={esqueci?.valor || ''} onChange={(e) => setEsqueci((s) => ({ ...s, valor: e.target.value, erro: null }))} />
              </div>
              {esqueci?.erro && <div className="ps-match err">{esqueci.erro}</div>}
              <button type="submit" className={'ps-btn' + (esqueci?.valor?.trim() && !esqueci?.enviando ? ' ready' : '')}>
                {esqueci?.enviando ? 'Enviando…' : 'Enviar link'}
              </button>
              <button type="button" className="link-esqueci" onClick={fecharEsqueci}>Cancelar</button>
            </form>
          )}
        </div>
      </div>

      {/* POPUP TROCA DE SENHA — PRIMEIRO LOGIN */}
      <div id="popupSenha" className={userPendente ? 'show' : ''}>
        <div className="ps-card">
          <div className="ps-icon">🔐</div>
          <div className="ps-title">Criar Nova Senha</div>
          <div className="ps-sub">
            Este é seu primeiro acesso.<br />
            Crie uma senha segura para continuar.
          </div>

          <NovaSenha onConfirmar={psConfirmar} inputRef={novaRef} />
        </div>
      </div>
    </div>
  );
}
