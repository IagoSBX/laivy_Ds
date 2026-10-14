import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CampoData from '../components/CampoData.jsx';
import Modal from '../components/Modal.jsx';
import Sidebar from '../components/Sidebar.jsx';
import ThOrdenavel from '../components/ThOrdenavel.jsx';
import { authFetch, getJson, iniciais, lerImagem } from '../lib/api.js';
import { ordenar } from '../lib/ordenacao.js';
import { timeSelecionado, usuarioLogado } from '../lib/sessao.js';
import useTitulo from '../lib/useTitulo.js';
import useToasts from '../lib/useToasts.js';
import {
  buscarCep, classeValidacao, enterAvanca, hoje, idade, mascaraCEP, mascaraCPF, mascaraTelefone, regrasSenha,
  validarCPF, validarEmail, validarNascimento, validarNome, validarSenha, validarTelefone,
} from '../lib/validacao.js';
import '../styles/pages/usuarios.css';

const TIPO_COR = { 1: '#00C97A', 2: '#4EC9FF', 3: '#FFB020' };
const TIPO_BG = { 1: 'rgba(0,201,122,0.2)', 2: 'rgba(78,201,255,0.2)', 3: 'rgba(255,176,32,0.2)' };

const ORDENACAO = [
  { valor: 'nome_asc', label: 'Nome (A-Z)', campo: 'nome_usuario', tipo: 'texto', direcao: 'asc' },
  { valor: 'nome_desc', label: 'Nome (Z-A)', campo: 'nome_usuario', tipo: 'texto', direcao: 'desc' },
  { valor: 'registro_asc', label: 'Registro (mais antigo)', campo: 'id_usuario', tipo: 'numero', direcao: 'asc' },
  { valor: 'registro_desc', label: 'Registro (mais recente)', campo: 'id_usuario', tipo: 'numero', direcao: 'desc' },
];

const FORM_VAZIO = {
  foto_usuario: '', nome_usuario: '', email_usuario: '', login_usuario: '', senha_usuario: '', tipo_usuario: '3',
  cel_usuario: '', cpf_usuario: '', data_nasc_usuario: '', cep_usuario: '', endereco_usuario: '', numero_usuario: '',
  complemento_usuario: '', bairro_usuario: '', cidade_usuario: '', estado_usuario: '', time: '',
};

// campos obrigatórios no cadastro de usuário novo
const OBRIGATORIOS = [
  ['nome_usuario', 'Nome'], ['email_usuario', 'Email'], ['login_usuario', 'Login'], ['senha_usuario', 'Senha'],
  ['cel_usuario', 'Celular'], ['cpf_usuario', 'CPF'], ['data_nasc_usuario', 'Data de nascimento'], ['cep_usuario', 'CEP'],
  ['endereco_usuario', 'Endereço'], ['numero_usuario', 'Número'], ['bairro_usuario', 'Bairro'], ['cidade_usuario', 'Cidade'],
  ['estado_usuario', 'Estado'],
];

function Badge({ tipo }) {
  const m = { 1: ['badge-admin', ' Admin'], 2: ['badge-treinador', ' Treinador'], 3: ['badge-atleta', ' Atleta'] };
  const [cls, txt] = m[tipo] || ['badge-atleta', '—'];
  return <span className={cls}>{txt}</span>;
}

function Hint({ r }) {
  return <div className={'field-hint' + (r ? ' show ' + (r.ok ? 'ok' : 'err') : '')}>{r?.msg}</div>;
}

export default function Usuarios() {
  useTitulo('Usuários — LAIVY');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const user = usuarioLogado();
  const isAtleta = user.tipo_usuario === 3;
  const isTreina = user.tipo_usuario === 2;
  const isAdmin = user.tipo_usuario === 1;
  const ts = timeSelecionado();
  const urlTime = (base) => (ts ? base + '?idTime=' + ts.id : base);
  const podeEditar = isAdmin || isTreina;

  const [todos, setTodos] = useState(null); // null = ainda carregando
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [ordem, setOrdem] = useState({ campo: 'nome_usuario', tipo: 'texto', direcao: 'asc' });
  const [visao, setVisao] = useState('cards');
  const [aba, setAba] = useState('lista');
  const [toasts, toast] = useToasts();

  const [verUsuario, setVerUsuario] = useState(null);
  const [delAlvo, setDelAlvo] = useState(null);

  const [form, setForm] = useState(FORM_VAZIO);
  const [editId, setEditId] = useState('');
  const [val, setVal] = useState({}); // resultado das validações por campo
  const [invalidos, setInvalidos] = useState({}); // obrigatórios vazios no envio
  const [verSenha, setVerSenha] = useState(false);
  const [cepCarregando, setCepCarregando] = useState(false);
  const [timesForm, setTimesForm] = useState({ opcoes: [], placeholder: 'Carregando...' });

  const dados = !todos ? [] : isAtleta ? todos.filter((u) => u.id_usuario === user.id_usuario) : todos;
  const contar = (tipo) => (todos ? todos.filter((u) => u.tipo_usuario === tipo).length : '—');

  function carregar() {
    getJson(urlTime('/usuarios')).then(setTodos).catch(() => setTodos(null));
  }

  useEffect(() => {
    carregar();
    if (params.get('novo') === '1') abrirNovoUsuario();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lista = ordenar(dados.filter((u) => {
    const b = busca.toLowerCase();
    const mb = !b || u.nome_usuario?.toLowerCase().includes(b) || u.email_usuario?.toLowerCase().includes(b) || u.login_usuario?.toLowerCase().includes(b);
    return mb && (!filtroTipo || String(u.tipo_usuario) === filtroTipo);
  }), ordem);

  const valorOrdem = ORDENACAO.find((o) => o.campo === ordem.campo && o.direcao === ordem.direcao)?.valor || '';

  function filtrarTipo(v) {
    if (isAtleta) return;
    setFiltroTipo(v);
    setAba('lista');
  }

  // ---------- FORM ----------
  const set = (campo, valor) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    setInvalidos((x) => ({ ...x, [campo]: false }));
  };
  const valida = (campo, r) => setVal((v) => ({ ...v, [campo]: r }));

  // Admin aloca em qualquer time ativo; Treinador só no próprio (campo travado).
  function carregarTimesForm() {
    if (isTreina) {
      setTimesForm({ opcoes: user.time ? [user.time] : [], placeholder: user.time ? '' : 'Você não tem time vinculado', travado: true });
      return;
    }
    getJson('/times')
      .then((times) => {
        const ativos = times.filter((t) => t.ativo_time == 1);
        setTimesForm({ opcoes: ativos, placeholder: ativos.length ? 'Selecione um time' : 'Nenhum time ativo' });
      })
      .catch(() => setTimesForm({ opcoes: [], placeholder: 'Erro ao carregar times' }));
  }

  function limparForm() {
    setForm(FORM_VAZIO);
    setEditId('');
    setVal({});
    setInvalidos({});
    setVerSenha(false);
  }

  function abrirNovoUsuario() {
    limparForm();
    // treinador: o time já vem travado no dele
    if (isTreina && user.time) setForm((f) => ({ ...f, time: String(user.time.id_time) }));
    carregarTimesForm();
    setAba('form');
  }

  function abrirEdicao(id) {
    if (isAtleta) return;
    const u = dados.find((x) => x.id_usuario === id);
    if (!u) return;
    limparForm();
    setForm({
      foto_usuario: u.foto_usuario || '',
      nome_usuario: u.nome_usuario || '', email_usuario: u.email_usuario || '', login_usuario: u.login_usuario || '',
      senha_usuario: '', tipo_usuario: String(u.tipo_usuario || 3), cel_usuario: u.cel_usuario || '',
      cpf_usuario: u.cpf_usuario || '', data_nasc_usuario: u.data_nasc_usuario || '',
      endereco_usuario: u.endereco_usuario || '', bairro_usuario: u.bairro_usuario || '',
      numero_usuario: u.numero_usuario || '', complemento_usuario: u.complemento_usuario || '',
      cep_usuario: u.cep_usuario || '', cidade_usuario: u.cidade_usuario || '', estado_usuario: u.estado_usuario || '',
      time: u.time?.id_time ? String(u.time.id_time) : (isTreina && user.time ? String(user.time.id_time) : ''),
    });
    setEditId(String(u.id_usuario));
    carregarTimesForm();
    setAba('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelarForm() {
    limparForm();
    setAba('lista');
  }

  async function carregarFoto(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try { set('foto_usuario', await lerImagem(file)); } catch { toast('Foto muito grande. Máximo 2MB.', false); }
  }

  async function aoSairDoCep() {
    if (form.cep_usuario.replace(/\D/g, '').length !== 8) return;
    setCepCarregando(true);
    valida('cep', null);
    try {
      const end = await buscarCep(form.cep_usuario);
      if (!end) { valida('cep', { ok: false, msg: 'CEP não encontrado' }); return; }
      setForm((f) => ({ ...f, endereco_usuario: end.endereco, bairro_usuario: end.bairro, cidade_usuario: end.cidade, estado_usuario: end.estado }));
      valida('cep', { ok: true, msg: 'CEP encontrado ' });
      toast('Endereço preenchido automaticamente!');
    } catch {
      valida('cep', { ok: false, msg: 'Erro ao buscar CEP' });
    } finally {
      setCepCarregando(false);
    }
  }

  // validação de um campo pelo id do input (usada pelo Enter-avança)
  const VALIDADORES = {
    'inp-nome': () => validarNome(form.nome_usuario),
    'inp-email': () => validarEmail(form.email_usuario),
    'inp-senha': () => validarSenha(form.senha_usuario, !!editId),
    'inp-nasc': () => validarNascimento(form.data_nasc_usuario),
    'inp-cpf': () => validarCPF(form.cpf_usuario),
    'inp-cel': () => validarTelefone(form.cel_usuario),
  };
  const CHAVE_VAL = { 'inp-nome': 'nome', 'inp-email': 'email', 'inp-senha': 'senha', 'inp-nasc': 'nasc', 'inp-cpf': 'cpf', 'inp-cel': 'cel' };
  function campoValido(campo) {
    const fn = VALIDADORES[campo.id];
    if (fn) {
      const r = fn();
      valida(CHAVE_VAL[campo.id], r);
      if (r && !r.ok) return false;
    }
    const senhaOpcionalNaEdicao = campo.id === 'inp-senha' && editId;
    return !campo.required || senhaOpcionalNaEdicao || campo.value.trim() !== '';
  }

  async function salvar(e) {
    e.preventDefault();
    if (isAtleta) return;
    const r = {
      nome: validarNome(form.nome_usuario),
      email: validarEmail(form.email_usuario),
      cpf: validarCPF(form.cpf_usuario),
      cel: validarTelefone(form.cel_usuario),
      senha: validarSenha(form.senha_usuario, !!editId),
      nasc: validarNascimento(form.data_nasc_usuario),
    };
    setVal((v) => ({ ...v, ...r }));

    // Cadastro de usuário novo: todos os campos são obrigatórios
    if (!editId) {
      const faltando = OBRIGATORIOS.filter(([c]) => !String(form[c]).trim());
      let ok = true;
      if (faltando.length) {
        setInvalidos(Object.fromEntries(faltando.map(([c]) => [c, true])));
        toast('Preencha todos os campos obrigatórios: ' + faltando.map(([, l]) => l).join(', ') + '.', false);
        ok = false;
      }
      // Admin precisa escolher um time — sem isso o usuário fica "órfão" e some das listas filtradas por time
      if (isAdmin && !form.time) { toast('Selecione um time para o novo usuário.', false); ok = false; }
      if (!ok) return;
    }
    if (Object.values(r).some((x) => x && !x.ok)) { toast('Corrija os campos destacados antes de salvar.', false); return; }

    const { time, ...d } = form;
    // Novo usuário sempre tem primeiro_login=1 (deve trocar a senha no primeiro acesso)
    if (!editId) d.primeiro_login = 1;
    // o backend só aceita times que o usuário logado pode gerenciar
    if (time) d.time = { id_time: parseInt(time) };

    try {
      const res = await authFetch(editId ? '/usuarios/' + editId : '/usuarios', { method: editId ? 'PUT' : 'POST', body: JSON.stringify(d) });
      if (!res.ok) {
        const erro = await res.json().catch(() => ({}));
        toast(erro.erro || 'Não foi possível salvar. Confira os dados e tente novamente.', false);
        return;
      }
      toast(editId ? 'Usuário atualizado!' : 'Usuário cadastrado! O usuário deverá trocar a senha no primeiro acesso. ');
      cancelarForm();
      carregar();
    } catch {
      toast('Erro ao salvar.', false);
    }
  }

  // ---------- VER / EXCLUIR ----------
  async function ver(id) {
    let u = dados.find((x) => x.id_usuario === id);
    if (u && u.tipo_usuario === 3) { navigate('/perfil-atleta.html?id=' + id); return; }
    try {
      const r = await authFetch('/usuarios/' + id);
      if (!r.ok) throw new Error();
      u = await r.json();
    } catch {
      toast('Não foi possível carregar os dados deste usuário.', false);
      return;
    }
    if (!u) return;
    if (u.tipo_usuario === 3) { navigate('/perfil-atleta.html?id=' + id); return; }
    setVerUsuario(u);
  }

  async function excluir() {
    if (!delAlvo) return;
    try {
      const res = await authFetch('/usuarios/' + delAlvo.id, { method: 'DELETE' });
      if (!res.ok) {
        const erro = await res.json().catch(() => ({}));
        toast(erro.erro || 'Não foi possível excluir este usuário.', false);
        return;
      }
      toast('Usuário excluído!');
      setDelAlvo(null);
      carregar();
    } catch {
      toast('Erro ao excluir.', false);
    }
  }

  const botoesAcao = (u) => podeEditar && (
    <>
      <button className="btn-acao-sm btn-edit" onClick={(e) => { e.stopPropagation(); abrirEdicao(u.id_usuario); }}>Editar</button>
      <button className="btn-acao-sm btn-del" onClick={(e) => { e.stopPropagation(); setDelAlvo({ id: u.id_usuario, nome: u.nome_usuario }); }}>Excluir</button>
    </>
  );

  const reqs = regrasSenha(form.senha_usuario);
  const cls = (campo, chave) => 'form-control' + (invalidos[campo] ? ' is-invalid' : classeValidacao(val[chave]));
  const vu = verUsuario;

  return (
    <div className="pagina pg-usuarios bs">
      <Sidebar />

      <main className="main">
        {/* Banner atleta (visível apenas para atletas) */}
        {isAtleta && (
          <div className="banner-atleta" style={{ display: 'flex' }}>
            <span className="banner-atleta-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFB020" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="5" /><path d="M3 21v-2a7 7 0 0 1 14 0v2" /></svg></span>
            <div>
              <div className="banner-atleta-txt">Modo Atleta — Visualização Restrita</div>
              <div className="banner-atleta-sub">Você está visualizando apenas o seu perfil. Sem permissão para editar ou excluir.</div>
            </div>
          </div>
        )}

        <div className="page-header">
          <div><h1>Usuários</h1><p>Gerencie atletas, treinadores e administradores</p></div>
        </div>

        <div className="stats-row">
          <div className="stat-card" onClick={() => filtrarTipo('1')}><div className="stat-dot" style={{ background: 'var(--verde)' }}></div><div><div className="stat-num" style={{ color: 'var(--verde)' }}>{contar(1)}</div><div className="stat-label">Administradores</div></div></div>
          <div className="stat-card" onClick={() => filtrarTipo('2')}><div className="stat-dot" style={{ background: '#4EC9FF' }}></div><div><div className="stat-num" style={{ color: '#4EC9FF' }}>{contar(2)}</div><div className="stat-label">Treinadores</div></div></div>
          <div className="stat-card" onClick={() => filtrarTipo('3')}><div className="stat-dot" style={{ background: '#FFB020' }}></div><div><div className="stat-num" style={{ color: '#FFB020' }}>{contar(3)}</div><div className="stat-label">Atletas</div></div></div>
        </div>

        <div className="tabs">
          <button className={'tab' + (aba === 'lista' ? ' active' : '')} onClick={() => setAba('lista')}> Lista</button>
          {!isAtleta && <button className={'tab' + (aba === 'form' ? ' active' : '')} onClick={abrirNovoUsuario}> Novo Usuário</button>}
        </div>

        {/* LISTA */}
        <div className={'secao' + (aba === 'lista' ? ' visible' : '')}>
          <div className="card-dark" style={{ padding: '18px 24px' }}>
            <div className="toolbar">
              <div className="search-wrap"><input className="search-bar" placeholder="Buscar por nome, email ou login..." value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
              <select className="select-filtro" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
                <option value="">Todos os perfis</option>
                <option value="1"> Administrador</option>
                <option value="2"> Treinador</option>
                <option value="3"> Atleta</option>
              </select>
              <div>
                <select className="select-filtro sort-dropdown" value={valorOrdem}
                  onChange={(e) => { const o = ORDENACAO.find((x) => x.valor === e.target.value); if (o) setOrdem({ campo: o.campo, tipo: o.tipo, direcao: o.direcao }); }}>
                  {!valorOrdem && <option value="" hidden></option>}
                  {ORDENACAO.map((o) => <option key={o.valor} value={o.valor}>{o.label}</option>)}
                </select>
              </div>
              <div className="view-toggle ml-auto">
                <button className={'view-btn' + (visao === 'cards' ? ' active' : '')} onClick={() => setVisao('cards')}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg></button>
                <button className={'view-btn' + (visao === 'tabela' ? ' active' : '')} onClick={() => setVisao('tabela')}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg></button>
              </div>
              {!isAtleta && <button className="btn-novo" onClick={abrirNovoUsuario}>+ Novo</button>}
            </div>

            <div className={'cards-wrapper' + (visao === 'cards' ? ' visible' : '')}>
              <div className="cards-grid">
                {!lista.length ? (
                  <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                    <div className="empty-icon" style={{ color: '#8899BB', marginBottom: 8, opacity: 0.6 }}><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg></div>
                    <p>Nenhum usuário encontrado</p>
                  </div>
                ) : lista.map((u) => {
                  const cor = TIPO_COR[u.tipo_usuario] || '#888', bg = TIPO_BG[u.tipo_usuario] || 'rgba(136,136,136,0.2)';
                  const anos = idade(u.data_nasc_usuario);
                  return (
                    <div key={u.id_usuario} className="user-card" onClick={() => ver(u.id_usuario)}>
                      <div className="user-card-top">
                        {u.foto_usuario
                          ? <div className="user-avatar-card" style={{ background: 'none', overflow: 'hidden', padding: 0 }}><img src={u.foto_usuario} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block' }} alt="" /></div>
                          : <div className="user-avatar-card" style={{ background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: cor }}>{iniciais(u.nome_usuario)}</div>}
                        <div style={{ minWidth: 0 }}><div className="user-card-nome">{u.nome_usuario}</div><div className="user-card-email">{u.email_usuario}</div></div>
                      </div>
                      <div className="user-card-meta">
                        <span> {u.login_usuario || '—'}</span>
                        {u.cel_usuario && <span> {u.cel_usuario}</span>}
                        {anos !== null && <span> {anos} anos</span>}
                        {u.cidade_usuario && <span> {u.cidade_usuario}{u.estado_usuario ? ' / ' + u.estado_usuario : ''}</span>}
                      </div>
                      <div className="user-card-footer">
                        <Badge tipo={u.tipo_usuario} />
                        <div className="user-acoes">
                          <button className="btn-acao-sm btn-ver" onClick={(e) => { e.stopPropagation(); ver(u.id_usuario); }}>Ver</button>
                          {botoesAcao(u)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={'table-wrapper' + (visao === 'tabela' ? ' visible' : '')}>
              <div className="table-responsive">
                <table className="table">
                  <thead><tr>
                    <ThOrdenavel campo="id_usuario" tipo="numero" ordem={ordem} setOrdem={setOrdem}>ID</ThOrdenavel>
                    <ThOrdenavel campo="nome_usuario" tipo="texto" ordem={ordem} setOrdem={setOrdem}>Usuário</ThOrdenavel>
                    <th>Email</th><th>Login</th><th>Perfil</th><th style={{ textAlign: 'right' }}>Ações</th>
                  </tr></thead>
                  <tbody>
                    {!lista.length ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--cinza)', padding: 32 }}>Nenhum usuário encontrado</td></tr>
                    ) : lista.map((u) => (
                      <tr key={u.id_usuario} onClick={() => ver(u.id_usuario)}>
                        <td style={{ color: 'var(--cinza)', fontSize: 12 }}>#{u.id_usuario}</td>
                        <td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: TIPO_BG[u.tipo_usuario] || 'rgba(136,136,136,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: TIPO_COR[u.tipo_usuario] || '#888' }}>{iniciais(u.nome_usuario)}</div>
                          <span style={{ fontWeight: 700, color: 'var(--cinza)' }}>{u.nome_usuario}</span>
                        </div></td>
                        <td style={{ color: 'var(--cinza)', fontSize: 13 }}>{u.email_usuario}</td>
                        <td style={{ color: 'var(--cinza)', fontSize: 13 }}>{u.login_usuario || '—'}</td>
                        <td><Badge tipo={u.tipo_usuario} /></td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn-acao-sm btn-ver" onClick={(e) => { e.stopPropagation(); ver(u.id_usuario); }}>Ver</button>
                          {botoesAcao(u)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* FORM */}
        <div className={'secao' + (aba === 'form' ? ' visible' : '')}>
          <div className="card-dark">
            <h4>{editId ? ' Editar Usuário' : ' Novo Usuário'}</h4>
            <form noValidate onSubmit={salvar} onKeyDown={(e) => enterAvanca(e, campoValido)}>
              <div className="row g-3">
                {/* FOTO DO USUÁRIO */}
                <div className="col-12">
                  <div className="foto-upload-wrap">
                    <div className="foto-preview-circle" onClick={() => document.getElementById('inputFoto').click()}>
                      {form.foto_usuario
                        ? <img src={form.foto_usuario} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} alt="preview" />
                        : (
                          <div className="foto-placeholder">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                            <span style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>Foto</span>
                          </div>
                        )}
                      <div className="foto-overlay">Alterar</div>
                    </div>
                    <input type="file" id="inputFoto" accept="image/*" style={{ display: 'none' }} onChange={carregarFoto} />
                    <div className="foto-upload-hint">Clique para adicionar foto &bull; JPG, PNG &mdash; máx. 2MB</div>
                    <button type="button" className={'foto-remove-btn' + (form.foto_usuario ? ' visible' : '')} onClick={() => set('foto_usuario', '')}>Remover foto</button>
                  </div>
                </div>
                {/* Nome */}
                <div className="col-md-6">
                  <label className="form-label" htmlFor="inp-nome">Nome Completo</label>
                  <input className={cls('nome_usuario', 'nome')} id="inp-nome" placeholder="Nome completo" required
                    value={form.nome_usuario} onChange={(e) => { set('nome_usuario', e.target.value); valida('nome', validarNome(e.target.value)); }} />
                  <Hint r={val.nome} />
                </div>
                {/* Email */}
                <div className="col-md-6">
                  <label className="form-label" htmlFor="inp-email">Email</label>
                  <input type="email" className={cls('email_usuario', 'email')} id="inp-email" placeholder="email@exemplo.com" required
                    value={form.email_usuario} onChange={(e) => { set('email_usuario', e.target.value); valida('email', validarEmail(e.target.value)); }} />
                  <Hint r={val.email} />
                </div>
                {/* Login */}
                <div className="col-md-4">
                  <label className="form-label" htmlFor="inp-login">Login</label>
                  <input className={cls('login_usuario')} id="inp-login" placeholder="login de acesso" required
                    value={form.login_usuario} onChange={(e) => set('login_usuario', e.target.value)} />
                </div>
                {/* Senha */}
                <div className="col-md-4">
                  <label className="form-label" htmlFor="inp-senha">Senha</label>
                  <div className="senha-wrap">
                    <input type={verSenha ? 'text' : 'password'} className={cls('senha_usuario', 'senha')} id="inp-senha" placeholder="••••••••" aria-describedby="reqs-senha" required
                      value={form.senha_usuario} onChange={(e) => { set('senha_usuario', e.target.value); valida('senha', validarSenha(e.target.value, !!editId)); }} />
                    <button type="button" className="btn-olho" onClick={() => setVerSenha((v) => !v)} aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={verSenha}>
                      <svg className="ico-ver" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                      <svg className="ico-ocultar" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                    </button>
                  </div>
                  <ul className="senha-reqs" id="reqs-senha" aria-live="polite">
                    <li data-req="len" className={reqs.len ? 'ok' : ''}>Mín. 8 caracteres</li>
                    <li data-req="letra" className={reqs.letra ? 'ok' : ''}>Uma letra</li>
                    <li data-req="num" className={reqs.num ? 'ok' : ''}>Um número</li>
                  </ul>
                  <Hint r={val.senha} />
                </div>
                {/* Perfil: cadastro novo é sempre Atleta; edição mantém o perfil real do usuário */}
                <div className="col-md-4">
                  <label className="form-label">Perfil</label>
                  {editId ? (
                    <select className="form-select" required value={form.tipo_usuario} onChange={(e) => set('tipo_usuario', e.target.value)}>
                      <option value="1"> Administrador</option>
                      <option value="2"> Treinador</option>
                      <option value="3"> Atleta</option>
                    </select>
                  ) : (
                    <div className="form-control" style={{ background: 'rgba(255,176,32,0.1)', borderColor: 'rgba(255,176,32,0.3)', color: '#FFB020', fontWeight: 600, cursor: 'default' }}>Atleta</div>
                  )}
                </div>
                {/* Celular */}
                <div className="col-md-4">
                  <label className="form-label" htmlFor="inp-cel">Celular</label>
                  <input className={cls('cel_usuario', 'cel')} id="inp-cel" placeholder="(00) 00000-0000" maxLength={15} required
                    value={form.cel_usuario} onChange={(e) => {
                      const v = mascaraTelefone(e.target.value);
                      set('cel_usuario', v);
                      if (v.replace(/\D/g, '').length >= 10) valida('cel', validarTelefone(v));
                    }} />
                  <Hint r={val.cel} />
                </div>
                {/* CPF */}
                <div className="col-md-4">
                  <label className="form-label" htmlFor="inp-cpf">CPF</label>
                  <input className={cls('cpf_usuario', 'cpf')} id="inp-cpf" placeholder="000.000.000-00" maxLength={14} required
                    value={form.cpf_usuario} onChange={(e) => {
                      const v = mascaraCPF(e.target.value);
                      set('cpf_usuario', v);
                      if (v.replace(/\D/g, '').length === 11) valida('cpf', validarCPF(v));
                    }} />
                  <Hint r={val.cpf} />
                </div>
                {/* Nascimento */}
                <div className="col-md-4">
                  <label className="form-label" htmlFor="inp-nasc">Data de Nascimento</label>
                  <CampoData id="inp-nasc" className={cls('data_nasc_usuario', 'nasc')} min="1900-01-01" max={hoje()} required
                    value={form.data_nasc_usuario} onChange={(v) => { set('data_nasc_usuario', v); valida('nasc', validarNascimento(v)); }} />
                  <Hint r={val.nasc} />
                </div>
                {/* Time */}
                <div className="col-md-4">
                  <label className="form-label">Time</label>
                  <select className="form-select" disabled={timesForm.travado} value={form.time} onChange={(e) => set('time', e.target.value)}>
                    {timesForm.placeholder && <option value="">{timesForm.placeholder}</option>}
                    {timesForm.opcoes.map((t) => <option key={t.id_time} value={t.id_time}>{t.nome_time}{t.categoria_time ? ' · ' + t.categoria_time : ''}</option>)}
                  </select>
                </div>
                {/* Separador */}
                <div className="col-12"><div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }}></div></div>
                {/* CEP */}
                <div className="col-md-3">
                  <label className="form-label" htmlFor="inp-cep">CEP</label>
                  <input className={cls('cep_usuario', 'cep')} id="inp-cep" placeholder="00000-000" maxLength={9} required
                    value={form.cep_usuario} onChange={(e) => set('cep_usuario', mascaraCEP(e.target.value))} onBlur={aoSairDoCep} />
                  <div className={'cep-loading' + (cepCarregando ? ' show' : '')}> Buscando endereço...</div>
                  <Hint r={val.cep} />
                </div>
                {/* Endereço - preenchido pelo CEP */}
                <div className="col-md-6">
                  <label className="form-label" htmlFor="inp-end">Endereço</label>
                  <input className={cls('endereco_usuario')} id="inp-end" placeholder="Rua, avenida..." required value={form.endereco_usuario} onChange={(e) => set('endereco_usuario', e.target.value)} />
                </div>
                <div className="col-md-3">
                  <label className="form-label" htmlFor="inp-numero">Número</label>
                  <input className={cls('numero_usuario')} id="inp-numero" placeholder="Nº ou S/N" maxLength={10} required value={form.numero_usuario} onChange={(e) => set('numero_usuario', e.target.value)} />
                </div>
                <div className="col-md-3">
                  <label className="form-label" htmlFor="inp-compl">Complemento</label>
                  <input className="form-control" id="inp-compl" placeholder="Apto, bloco (opcional)" maxLength={60} value={form.complemento_usuario} onChange={(e) => set('complemento_usuario', e.target.value)} />
                </div>
                <div className="col-md-3">
                  <label className="form-label" htmlFor="inp-bairro">Bairro</label>
                  <input className={cls('bairro_usuario')} id="inp-bairro" placeholder="Bairro" required value={form.bairro_usuario} onChange={(e) => set('bairro_usuario', e.target.value)} />
                </div>
                <div className="col-md-4">
                  <label className="form-label" htmlFor="inp-cidade">Cidade</label>
                  <input className={cls('cidade_usuario')} id="inp-cidade" placeholder="Cidade" required value={form.cidade_usuario} onChange={(e) => set('cidade_usuario', e.target.value)} />
                </div>
                <div className="col-md-2">
                  <label className="form-label" htmlFor="inp-estado">Estado</label>
                  <input className={cls('estado_usuario')} id="inp-estado" placeholder="SP" required value={form.estado_usuario} onChange={(e) => set('estado_usuario', e.target.value)} />
                </div>
                <div className="col-12 d-flex gap-2 mt-4">
                  <button type="submit" className="btn-cadastrar">{editId ? 'Salvar Alterações' : 'Cadastrar Usuário'}</button>
                  <button type="button" className="btn-cancelar-form" onClick={cancelarForm}>Cancelar</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* MODAL VER */}
      <Modal id="modalVer" tamanho="lg" aberto={!!vu} onFechar={() => setVerUsuario(null)}>
        {vu && (
          <>
            <div className="modal-header"><h5 className="modal-title" style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 22, letterSpacing: 1 }}>Perfil do Usuário</h5><button className="btn-close" onClick={() => setVerUsuario(null)}></button></div>
            <div className="modal-body">
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                {vu.foto_usuario
                  ? <div className="modal-avatar" style={{ background: 'none', overflow: 'hidden', padding: 0 }}><img src={vu.foto_usuario} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block' }} alt="" /></div>
                  : <div className="modal-avatar" style={{ background: TIPO_BG[vu.tipo_usuario] || 'rgba(136,136,136,0.2)', color: TIPO_COR[vu.tipo_usuario] || '#888' }}>{iniciais(vu.nome_usuario)}</div>}
                <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 22, letterSpacing: 1 }}>{vu.nome_usuario}</div>
                <div style={{ marginTop: 6 }}><Badge tipo={vu.tipo_usuario} /></div>
              </div>
              <div className="detalhe-grid">
                <div className="detalhe-item"><div className="detalhe-label">Email</div><div className="detalhe-valor" style={{ fontSize: 13 }}>{vu.email_usuario}</div></div>
                <div className="detalhe-item"><div className="detalhe-label">Login</div><div className="detalhe-valor">{vu.login_usuario || '—'}</div></div>
                <div className="detalhe-item"><div className="detalhe-label">Celular</div><div className="detalhe-valor">{vu.cel_usuario || '—'}</div></div>
                <div className="detalhe-item"><div className="detalhe-label">CPF</div><div className="detalhe-valor">{vu.cpf_usuario || '—'}</div></div>
                <div className="detalhe-item"><div className="detalhe-label">Nascimento</div><div className="detalhe-valor">{vu.data_nasc_usuario ? new Date(vu.data_nasc_usuario + ' ').toLocaleDateString('pt-BR') : '—'}</div></div>
                <div className="detalhe-item"><div className="detalhe-label">Idade</div><div className="detalhe-valor">{vu.data_nasc_usuario ? idade(vu.data_nasc_usuario) + ' anos' : '—'}</div></div>
                <div className="detalhe-item full"><div className="detalhe-label">Endereço</div><div className="detalhe-valor">{([vu.endereco_usuario, vu.numero_usuario, vu.complemento_usuario].filter(Boolean).join(', ') + (vu.bairro_usuario ? ' — ' + vu.bairro_usuario : '')) || '—'}</div></div>
                <div className="detalhe-item"><div className="detalhe-label">Cidade / Estado</div><div className="detalhe-valor">{vu.cidade_usuario || '—'}{vu.estado_usuario ? ' / ' + vu.estado_usuario : ''}</div></div>
                <div className="detalhe-item"><div className="detalhe-label">CEP</div><div className="detalhe-valor">{vu.cep_usuario || '—'}</div></div>
              </div>
            </div>
            <div className="modal-footer">
              {!isAtleta && (
                <button className="btn-cadastrar" style={{ fontSize: 14, padding: '8px 20px' }}
                  onClick={() => { const id = vu.id_usuario; setVerUsuario(null); setTimeout(() => abrirEdicao(id), 300); }}> Editar</button>
              )}
              <button className="btn-cancelar-form" style={{ fontSize: 14, padding: '8px 20px' }} onClick={() => setVerUsuario(null)}>Fechar</button>
            </div>
          </>
        )}
      </Modal>

      {/* MODAL CONFIRMAR EXCLUSÃO */}
      <Modal id="modalDel" tamanho="sm" aberto={!!delAlvo} onFechar={() => setDelAlvo(null)}>
        <div className="modal-body" style={{ padding: 28, textAlign: 'center' }}>
          <div style={{ fontSize: 38, marginBottom: 12 }}></div>
          <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 20, marginBottom: 8 }}>Excluir Usuário?</div>
          <div style={{ fontSize: 13, color: 'var(--cinza)', marginBottom: 20 }}>{delAlvo ? 'Excluir "' + delAlvo.nome + '"? Esta ação não pode ser desfeita.' : ''}</div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setDelAlvo(null)}>Cancelar</button>
            <button onClick={excluir} style={{ background: 'rgba(255,80,80,0.15)', border: '1px solid rgba(255,80,80,0.3)', color: '#FF6B6B', padding: '7px 20px', borderRadius: 8, fontFamily: "'Bebas Neue',cursive", fontSize: 15, cursor: 'pointer' }}>Excluir</button>
          </div>
        </div>
      </Modal>

      <div className="toast-wrap">
        {toasts.map((t) => <div key={t.id} className={'toast-item' + (t.ok ? '' : ' erro')}> {t.msg}</div>)}
      </div>
    </div>
  );
}
