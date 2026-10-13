import { useRef, useState } from 'react';
import { iniciais, lerImagem } from '../lib/api.js';

const CATEGORIAS = ['Sub-13', 'Sub-15', 'Sub-17', 'Sub-20', 'Adulto', 'Feminino', 'Misto'];

// Formulário de time + pré-visualização, usado por Novo Time e Editar Time.
// `inicial` é o time vindo da API (ou {} no cadastro); onSalvar recebe o payload pronto.
export default function TimeForm({ inicial = {}, responsaveis, erroResponsaveis, editando, onSalvar, toast }) {
  const inputLogoRef = useRef(null);
  const corRef = useRef(null);
  const [nome, setNome] = useState(inicial.nome_time || '');
  const [categoria, setCategoria] = useState(inicial.categoria_time || 'Sub-17');
  const [cor, setCor] = useState(inicial.cor_time || '#00C97A');
  const [ativo, setAtivo] = useState(inicial.ativo_time === 0 || inicial.ativo_time === '0' ? '0' : '1');
  const [descricao, setDescricao] = useState(inicial.descricao_time || '');
  const [logo, setLogo] = useState(inicial.logo_time || null);
  const [treinador, setTreinador] = useState(inicial.treinador ? { id: inicial.treinador.id_usuario, nome: inicial.treinador.nome_usuario } : null);
  const [hintNome, setHintNome] = useState(null);
  const [hintTreinador, setHintTreinador] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const ini = nome.trim() ? iniciais(nome.trim()) : (editando ? '—' : '?');

  async function carregarLogo(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try { setLogo(await lerImagem(file)); } catch { toast('Logo muito grande. Máx 2MB.', false); }
  }

  function escolherTreinador(u) {
    setTreinador({ id: u.id_usuario, nome: u.nome_usuario });
    setHintTreinador({ msg: 'Treinador selecionado', ok: true });
  }

  async function enviar(e) {
    e.preventDefault();
    const nomeOk = !!nome.trim();
    setHintNome(nomeOk ? { valido: true } : { msg: 'Nome é obrigatório', ok: false });
    if (!treinador) setHintTreinador({ msg: 'Selecione um treinador responsável', ok: false });
    if (!nomeOk || !treinador) return;
    setSalvando(true);
    const ok = await onSalvar({
      nome_time: nome,
      modalidade_time: 'Basquete',
      categoria_time: categoria,
      cor_time: cor || '#00C97A',
      logo_time: logo || null,
      descricao_time: descricao || '',
      ativo_time: parseInt(ativo),
      treinador: { id_usuario: parseInt(treinador.id) },
    });
    if (!ok) setSalvando(false);
  }

  const classeHint = (h) => 'field-hint' + (h?.msg ? ' show ' + (h.ok ? 'ok' : 'err') : '');

  return (
    <div className="row g-4" style={{ alignItems: 'flex-start' }}>
      {/* FORMULÁRIO */}
      <div className="col-lg-7">
        <div className="card-dark">
          <form noValidate onSubmit={enviar}>
            <div className="row g-3">
              {/* LOGO DO TIME */}
              <div className="col-12">
                <div className="logo-upload-wrap">
                  <div className="logo-circle" onClick={() => inputLogoRef.current.click()}>
                    {logo ? <img src={logo} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 16 }} alt="logo" /> : <span className="logo-initials">{ini === '—' ? '?' : ini}</span>}
                    <div className="logo-ov">Alterar</div>
                  </div>
                  <input type="file" ref={inputLogoRef} accept="image/*" style={{ display: 'none' }} onChange={carregarLogo} />
                  <div className="logo-hint">
                    Logo do time · JPG, PNG · máx 2MB
                    {!editando && <><br />Opcional — se não adicionar, usamos as iniciais</>}
                  </div>
                  <button type="button" className={'btn-rm-logo' + (logo ? ' show' : '')} onClick={() => setLogo(null)}>Remover logo</button>
                </div>
              </div>

              {/* Nome */}
              <div className="col-12">
                <label className="form-label" htmlFor="inp-nome">Nome do Time <span className="required">*</span></label>
                <input className={'form-control' + (hintNome ? (hintNome.valido ? ' is-valid' : ' is-invalid') : '')} id="inp-nome"
                  placeholder="Ex: Basquete Sub-17" required value={nome} onChange={(e) => setNome(e.target.value)} />
                <div className={classeHint(hintNome)}>{hintNome?.msg}</div>
              </div>

              {/* Modalidade (só Basquete) */}
              <div className="col-md-6">
                <label className="form-label">Modalidade</label>
                <input className="form-control" value="Basquete" readOnly style={{ opacity: 0.6, cursor: 'not-allowed' }} />
              </div>

              {/* Categoria */}
              <div className="col-md-6">
                <label className="form-label">Categoria</label>
                <select className="form-select" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                  {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Cor */}
              <div className="col-md-6">
                <label className="form-label">Cor do Time</label>
                <div className="color-picker-wrap">
                  <div className="color-swatch" style={{ background: cor }} onClick={() => corRef.current.click()}></div>
                  <input type="color" ref={corRef} value={cor} style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} onChange={(e) => setCor(e.target.value)} />
                  <span style={{ fontSize: 13, color: 'var(--cinza)' }}>{cor}</span>
                </div>
              </div>

              {/* Status */}
              <div className="col-md-6">
                <label className="form-label">Status</label>
                <select className="form-select" value={ativo} onChange={(e) => setAtivo(e.target.value)}>
                  <option value="1">Ativo</option>
                  <option value="0">Inativo</option>
                </select>
              </div>

              {/* Treinador */}
              <div className="col-12">
                <label className="form-label">Treinador Responsável <span className="required">*</span></label>
                <div className={classeHint(hintTreinador)}>{hintTreinador?.msg}</div>
                <div className="treinador-grid">
                  {erroResponsaveis ? (
                    <div style={{ padding: 16, textAlign: 'center', color: '#FF6B6B', fontSize: 13 }}>Erro ao carregar treinadores. Verifique o servidor.</div>
                  ) : !responsaveis ? (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--cinza)', fontSize: 13 }}>
                      <div style={{ width: 28, height: 28, border: '3px solid rgba(0,201,122,0.2)', borderTopColor: 'var(--verde)', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 10px' }}></div>
                      Carregando treinadores...
                    </div>
                  ) : !responsaveis.length ? (
                    <div style={{ padding: 16, textAlign: 'center', color: 'var(--cinza)', fontSize: 13 }}>Nenhum treinador cadastrado ainda.</div>
                  ) : responsaveis.map((u) => {
                    const admin = u.tipo_usuario === 1;
                    const corU = admin ? '#00C97A' : '#4EC9FF';
                    return (
                      <div key={u.id_usuario} className={'tr-option' + (treinador?.id == u.id_usuario ? ' selected' : '')} onClick={() => escolherTreinador(u)}>
                        <div className="tr-av" style={{ background: admin ? 'rgba(0,201,122,0.15)' : 'rgba(78,201,255,0.15)' }}>
                          {u.foto_usuario ? <img src={u.foto_usuario} alt="" /> : <span style={{ color: corU }}>{iniciais(u.nome_usuario)}</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="tr-nome">{u.nome_usuario}</div>
                          <div className="tr-tipo">{admin ? 'Administrador' : 'Treinador'}</div>
                        </div>
                        <div className="tr-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0A1628" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg></div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Descrição */}
              <div className="col-12">
                <label className="form-label">Descrição</label>
                <textarea className="form-control" rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)}
                  placeholder={editando ? 'Observações sobre o time...' : 'Observações sobre o time, objetivos da temporada...'}></textarea>
              </div>

              <div className={'col-12 d-flex gap-3 ' + (editando ? 'mt-2' : 'mt-4')}>
                <button type="submit" className={editando ? 'btn-salvar' : 'btn-cadastrar'} disabled={salvando}>
                  {salvando ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Cadastrar Time'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* PREVIEW */}
      <div className="col-lg-5">
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--cinza)', marginBottom: 12, paddingLeft: 4 }}>Pré-visualização</div>
        <div className="preview-card">
          <div className="preview-banner" style={{ background: cor }}></div>
          <div className="preview-body">
            {logo ? (
              <div className="preview-logo" style={{ background: 'none', border: '2px solid ' + cor + '44' }}><img src={logo} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} alt="" /></div>
            ) : (
              <div className="preview-logo" style={{ background: cor + '22', border: '2px solid ' + cor + '44', color: cor }}>{nome.trim() ? iniciais(nome.trim()) : '—'}</div>
            )}
            <div className="preview-nome" style={editando ? undefined : { color: 'var(--branco)' }}>{nome.trim() || 'Nome do Time'}</div>
            <div className="preview-sub">Basquete · {categoria}</div>
            <div className="preview-info">
              <div className="preview-info-row">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="5" /><path d="M3 21v-2a7 7 0 0 1 14 0v2" /></svg>
                Treinador: <strong>{treinador?.nome || 'Não selecionado'}</strong>
              </div>
              <div className="preview-info-row">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                Status: <strong>{ativo === '1' ? 'Ativo' : 'Inativo'}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
