import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import CampoData from '../components/CampoData.jsx';
import { authFetch, getJson, sair } from '../lib/api.js';
import { destinoInicial, TIPOS, usuarioLogado } from '../lib/sessao.js';
import useTitulo from '../lib/useTitulo.js';
import {
  buscarCep, classeValidacao, hoje, mascaraCEP, mascaraCPF, mascaraTelefone,
  validarCPF, validarNascimento, validarNome, validarTelefone,
} from '../lib/validacao.js';
import '../styles/pages/completar-cadastro.css';

// Mesmos dados obrigatórios do cadastro completo de usuário (Usuarios.jsx)
const OBRIGATORIOS = [
  ['nome_usuario', 'Nome'], ['cel_usuario', 'Celular'], ['cpf_usuario', 'CPF'], ['data_nasc_usuario', 'Data de nascimento'],
  ['cep_usuario', 'CEP'], ['endereco_usuario', 'Endereço'], ['numero_usuario', 'Número'], ['bairro_usuario', 'Bairro'],
  ['cidade_usuario', 'Cidade'], ['estado_usuario', 'Estado'],
];
const VAZIO = Object.fromEntries([...OBRIGATORIOS.map(([c]) => [c, '']), ['complemento_usuario', '']]);

// Convidado por e-mail (atleta ou preparador): depois de criar a senha,
// preenche os próprios dados antes de usar o sistema (o JwtFilter barra o resto).
export default function CompletarCadastro() {
  useTitulo('Complete seu cadastro — LAIVY');
  const navigate = useNavigate();
  const user = usuarioLogado();
  const [form, setForm] = useState(VAZIO);
  const [val, setVal] = useState({});
  const [faltando, setFaltando] = useState({});
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [cepMsg, setCepMsg] = useState(null);

  useEffect(() => {
    if (!user.id_usuario) return;
    getJson('/usuarios/' + user.id_usuario).then((u) => {
      // o nome provisório do convite é a parte do e-mail antes do @: melhor começar vazio
      const nomeProvisorio = u.email_usuario && u.nome_usuario === u.email_usuario.split('@')[0];
      setForm((f) => ({
        ...f,
        ...Object.fromEntries(Object.keys(VAZIO).map((c) => [c, u[c] || ''])),
        nome_usuario: nomeProvisorio ? '' : u.nome_usuario || '',
        cpf_usuario: u.cpf_usuario ? mascaraCPF(u.cpf_usuario) : '',
      }));
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user.id_usuario) return <Navigate to="/login.html" replace />;

  // ao editar um campo, some o aviso antigo dele (a validação roda de novo no envio)
  const CHAVE = { nome_usuario: 'nome', cel_usuario: 'cel', cpf_usuario: 'cpf', data_nasc_usuario: 'nasc' };
  const set = (campo, valor) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    setFaltando((x) => ({ ...x, [campo]: false }));
    if (CHAVE[campo]) setVal((v) => ({ ...v, [CHAVE[campo]]: null }));
  };
  const valida = (chave, r) => setVal((v) => ({ ...v, [chave]: r }));
  const cls = (campo, chave) => 'form-control' + (faltando[campo] ? ' is-invalid' : classeValidacao(chave && val[chave]));
  const Hint = ({ r }) => <div className={'field-hint' + (r?.msg ? ' show ' + (r.ok ? 'ok' : 'err') : '')}>{r?.msg}</div>;

  async function aoSairDoCep() {
    if (form.cep_usuario.replace(/\D/g, '').length !== 8) return;
    setCepMsg({ msg: 'Buscando endereço…', ok: true });
    try {
      const end = await buscarCep(form.cep_usuario);
      if (!end) { setCepMsg({ msg: 'CEP não encontrado', ok: false }); return; }
      setForm((f) => ({ ...f, endereco_usuario: end.endereco, bairro_usuario: end.bairro, cidade_usuario: end.cidade, estado_usuario: end.estado }));
      setFaltando((x) => ({ ...x, endereco_usuario: !end.endereco, bairro_usuario: !end.bairro, cidade_usuario: !end.cidade, estado_usuario: !end.estado }));
      setCepMsg({ msg: 'Endereço preenchido pelo CEP', ok: true });
    } catch {
      setCepMsg({ msg: 'Não deu para buscar o CEP. Preencha o endereço.', ok: false });
    }
  }

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    const vazios = Object.fromEntries(OBRIGATORIOS.filter(([c]) => !String(form[c]).trim()).map(([c]) => [c, true]));
    setFaltando(vazios);
    const checagens = { nome: validarNome(form.nome_usuario), cel: validarTelefone(form.cel_usuario), cpf: validarCPF(form.cpf_usuario), nasc: validarNascimento(form.data_nasc_usuario) };
    setVal(checagens);
    if (Object.keys(vazios).length) { setErro('Preencha os campos destacados.'); return; }
    if (Object.values(checagens).some((r) => r && !r.ok)) { setErro('Confira os campos destacados.'); return; }

    setSalvando(true);
    try {
      const r = await authFetch('/usuarios/' + user.id_usuario + '/completar-cadastro', {
        method: 'PUT',
        body: JSON.stringify({ ...form, nome_usuario: form.nome_usuario.trim() }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErro(d.erro || 'Não foi possível salvar. Tente novamente.'); return; }
      const atualizado = { ...user, ...d };
      localStorage.setItem('usuario', JSON.stringify(atualizado));
      navigate(destinoInicial(atualizado));
    } catch {
      /* authFetch já tratou */
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="pagina pg-completar-cadastro bs">
      <main className="cc-main">
        <div className="cc-topo">
          <div>
            <h1>Complete seu cadastro</h1>
            <p>Bem-vindo ao LAIVY{user.time?.nome_time ? ', time ' + user.time.nome_time : ''}! Antes de começar, preencha seus dados de {TIPOS[user.tipo_usuario] || 'usuário'}.</p>
          </div>
          <button type="button" className="cc-sair" onClick={sair}>Sair</button>
        </div>
        <div className="card-dark">
          <form noValidate onSubmit={salvar}>
            <div className="row g-3">
              <div className="col-md-8">
                <label className="form-label" htmlFor="cc-nome">Nome completo <span className="required">*</span></label>
                <input className={cls('nome_usuario', 'nome')} id="cc-nome" autoComplete="name" value={form.nome_usuario} onChange={(e) => set('nome_usuario', e.target.value)} />
                <Hint r={val.nome?.ok ? null : val.nome} />
              </div>
              <div className="col-md-4">
                <label className="form-label" htmlFor="cc-nasc">Data de nascimento <span className="required">*</span></label>
                <CampoData id="cc-nasc" className={cls('data_nasc_usuario', 'nasc')} min="1900-01-01" max={hoje()}
                  value={form.data_nasc_usuario} onChange={(v) => { set('data_nasc_usuario', v); if (v) valida('nasc', validarNascimento(v)); }} />
                <Hint r={val.nasc} />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="cc-cel">Celular <span className="required">*</span></label>
                <input className={cls('cel_usuario', 'cel')} id="cc-cel" type="tel" autoComplete="tel" placeholder="(00) 00000-0000" maxLength={15}
                  value={form.cel_usuario} onChange={(e) => set('cel_usuario', mascaraTelefone(e.target.value))} />
                <Hint r={val.cel?.ok ? null : val.cel} />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="cc-cpf">CPF <span className="required">*</span></label>
                <input className={cls('cpf_usuario', 'cpf')} id="cc-cpf" placeholder="000.000.000-00" maxLength={14}
                  value={form.cpf_usuario} onChange={(e) => set('cpf_usuario', mascaraCPF(e.target.value))} />
                <Hint r={val.cpf?.ok ? null : val.cpf} />
              </div>
              <div className="col-12"><div className="cc-sep" /></div>
              <div className="col-md-3">
                <label className="form-label" htmlFor="cc-cep">CEP <span className="required">*</span></label>
                <input className={cls('cep_usuario')} id="cc-cep" placeholder="00000-000" maxLength={9} autoComplete="postal-code"
                  value={form.cep_usuario} onChange={(e) => set('cep_usuario', mascaraCEP(e.target.value))} onBlur={aoSairDoCep} />
                <Hint r={cepMsg} />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="cc-end">Endereço <span className="required">*</span></label>
                <input className={cls('endereco_usuario')} id="cc-end" placeholder="Rua, avenida..." value={form.endereco_usuario} onChange={(e) => set('endereco_usuario', e.target.value)} />
              </div>
              <div className="col-md-3">
                <label className="form-label" htmlFor="cc-num">Número <span className="required">*</span></label>
                <input className={cls('numero_usuario')} id="cc-num" placeholder="Nº ou S/N" maxLength={10} value={form.numero_usuario} onChange={(e) => set('numero_usuario', e.target.value)} />
              </div>
              <div className="col-md-3">
                <label className="form-label" htmlFor="cc-compl">Complemento</label>
                <input className="form-control" id="cc-compl" placeholder="Apto, bloco (opcional)" maxLength={60} value={form.complemento_usuario} onChange={(e) => set('complemento_usuario', e.target.value)} />
              </div>
              <div className="col-md-3">
                <label className="form-label" htmlFor="cc-bairro">Bairro <span className="required">*</span></label>
                <input className={cls('bairro_usuario')} id="cc-bairro" value={form.bairro_usuario} onChange={(e) => set('bairro_usuario', e.target.value)} />
              </div>
              <div className="col-md-4">
                <label className="form-label" htmlFor="cc-cidade">Cidade <span className="required">*</span></label>
                <input className={cls('cidade_usuario')} id="cc-cidade" value={form.cidade_usuario} onChange={(e) => set('cidade_usuario', e.target.value)} />
              </div>
              <div className="col-md-2">
                <label className="form-label" htmlFor="cc-uf">Estado <span className="required">*</span></label>
                <input className={cls('estado_usuario')} id="cc-uf" placeholder="SP" maxLength={2} value={form.estado_usuario} onChange={(e) => set('estado_usuario', e.target.value.toUpperCase())} />
              </div>
              {erro && <div className="col-12"><div className="cc-erro" role="alert">{erro}</div></div>}
              <div className="col-12 mt-3">
                <button type="submit" className="cc-btn" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar e entrar'}</button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
