import { useEffect, useState } from 'react';
import { getJson } from '../lib/api.js';

// Aba "Log de atividades" do Painel Admin: quem fez o quê, quando e de onde.
// Os registros são gravados pelo backend (AuditoriaFilter / login); aqui só consulta.

const ACOES = [
  ['', 'Todas as ações'],
  ['CRIAR', 'Criações'],
  ['EDITAR', 'Edições'],
  ['EXCLUIR', 'Exclusões'],
  ['LOGIN', 'Entradas'],
  ['LOGOUT', 'Saídas'],
  ['LOGIN_FALHA', 'Logins com erro'],
  ['LOGIN_BLOQUEADO', 'Logins bloqueados'],
  ['SENHA', 'Trocas de senha'],
  ['ACESSO_NEGADO', 'Acessos negados'],
  ['IA', 'Assistente IA'],
];
// selo de cada linha (no singular; o filtro usa o plural)
const ROTULO_ACAO = {
  CRIAR: 'Criação', EDITAR: 'Edição', EXCLUIR: 'Exclusão', LOGIN: 'Entrada', LOGOUT: 'Saída',
  LOGIN_FALHA: 'Login com erro', LOGIN_BLOQUEADO: 'Login bloqueado', SENHA: 'Troca de senha',
  ACESSO_NEGADO: 'Acesso negado', IA: 'Assistente IA',
};
const PERFIS = { 1: 'Admin', 2: 'Treinador', 3: 'Atleta' };
const RECURSOS = {
  usuarios: 'Usuário', times: 'Time', atividades: 'Atividade', calendarios: 'Evento', desempenhos: 'Desempenho',
  exames: 'Exame', escalacoes: 'Escalação', visitantes: 'Visitante', jogadas: 'Jogada',
};
const ALERTA = new Set(['LOGIN_FALHA', 'LOGIN_BLOQUEADO', 'ACESSO_NEGADO']);
const FILTROS_VAZIOS = { idUsuario: '', acao: '', idTime: '', busca: '', de: '', ate: '' };

const dataHora = (s) => (s ? new Date(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' }) : '—');

export default function LogAtividades({ ativo, usuarios = [], times = [] }) {
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS);
  const [busca, setBusca] = useState(''); // digitação; vira filtro após uma pausa
  const [pagina, setPagina] = useState(0);
  const [dados, setDados] = useState(null); // { itens, total, pagina, paginas }
  const [erro, setErro] = useState(false);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setFiltros((f) => (f.busca === busca ? f : { ...f, busca }));
      setPagina(0);
    }, 400);
    return () => clearTimeout(t);
  }, [busca]);

  useEffect(() => {
    if (!ativo) return;
    let cancelado = false;
    const qs = new URLSearchParams({ pagina, tamanho: 50 });
    Object.entries(filtros).forEach(([k, v]) => { if (v) qs.set(k, v); });
    setErro(false);
    getJson('/auditoria?' + qs)
      // resposta de erro do servidor não pode derrubar a tela
      .then((d) => { if (!cancelado) { if (Array.isArray(d?.itens)) setDados(d); else setErro(true); } })
      .catch(() => { if (!cancelado) setErro(true); });
    return () => { cancelado = true; };
  }, [ativo, filtros, pagina, recarga]);

  const filtrar = (campo) => (e) => { setFiltros((f) => ({ ...f, [campo]: e.target.value })); setPagina(0); };
  const limpar = () => { setFiltros(FILTROS_VAZIOS); setBusca(''); setPagina(0); };
  const temFiltro = Object.values(filtros).some(Boolean) || busca;
  const listaUsuarios = [...usuarios].sort((a, b) => (a.nome_usuario || '').localeCompare(b.nome_usuario || ''));

  return (
    <div className="card-dark log-card">
      <div className="toolbar log-toolbar">
        <div className="search-wrap">
          <input className="search-bar" placeholder="Buscar por usuário ou ação..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <select className="select-filtro" value={filtros.idUsuario} onChange={filtrar('idUsuario')} aria-label="Filtrar por usuário">
          <option value="">Todos os usuários</option>
          {listaUsuarios.map((u) => <option key={u.id_usuario} value={u.id_usuario}>{u.nome_usuario}</option>)}
        </select>
        <select className="select-filtro" value={filtros.acao} onChange={filtrar('acao')} aria-label="Filtrar por ação">
          {ACOES.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
        </select>
        <select className="select-filtro" value={filtros.idTime} onChange={filtrar('idTime')} aria-label="Filtrar por time">
          <option value="">Todos os times</option>
          {times.map((t) => <option key={t.id_time} value={t.id_time}>{t.nome_time}</option>)}
        </select>
        <label className="log-data">De <input type="date" className="select-filtro" value={filtros.de} max={filtros.ate || undefined} onChange={filtrar('de')} /></label>
        <label className="log-data">Até <input type="date" className="select-filtro" value={filtros.ate} min={filtros.de || undefined} onChange={filtrar('ate')} /></label>
        {temFiltro && <button type="button" className="btn-acao-sm btn-edit" onClick={limpar}>Limpar filtros</button>}
        <button type="button" className="btn-acao-sm btn-ver ml-auto" onClick={() => setRecarga((n) => n + 1)}>Atualizar</button>
      </div>

      {erro && <div className="empty-state"><p>Não consegui carregar o log. Tente atualizar.</p></div>}
      {!erro && !dados && <div className="empty-state"><p>Carregando...</p></div>}
      {!erro && dados && !dados.itens.length && (
        <div className="empty-state"><p>{temFiltro ? 'Nenhum registro com esses filtros.' : 'Nenhuma atividade registrada ainda.'}</p></div>
      )}

      {!erro && dados && dados.itens.length > 0 && (
        <>
          <div className="table-responsive">
            <table className="log-tabela">
              <thead>
                <tr><th>Data e hora</th><th>Usuário</th><th>Ação</th><th>O que aconteceu</th><th>IP</th></tr>
              </thead>
              <tbody>
                {dados.itens.map((l) => {
                  const alerta = ALERTA.has(l.acao) || !l.sucesso;
                  const item = l.id_recurso && RECURSOS[l.recurso] ? `${RECURSOS[l.recurso]} #${l.id_recurso}` : null;
                  return (
                    <tr key={l.id_log} className={alerta ? 'log-alerta' : undefined}>
                      <td className="log-quando">{dataHora(l.data_hora)}</td>
                      <td>
                        <div className="log-nome">{l.nome_usuario || (l.id_usuario ? `Usuário #${l.id_usuario}` : 'Desconhecido')}</div>
                        {PERFIS[l.tipo_usuario] && <div className="log-sub">{PERFIS[l.tipo_usuario]}</div>}
                      </td>
                      <td><span className={'log-badge log-' + l.acao.toLowerCase()}>{ROTULO_ACAO[l.acao] || l.acao}</span></td>
                      <td>
                        <div>{l.descricao}</div>
                        {(item || l.detalhe) && <div className="log-sub">{[item, l.detalhe].filter(Boolean).join(' · ')}</div>}
                      </td>
                      <td className="log-ip">{l.ip || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="log-paginacao">
            <span>{dados.total.toLocaleString('pt-BR')} registro{dados.total === 1 ? '' : 's'}</span>
            <div>
              <button type="button" className="btn-acao-sm btn-edit" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}>Anterior</button>
              <span>Página {dados.pagina + 1} de {Math.max(dados.paginas, 1)}</span>
              <button type="button" className="btn-acao-sm btn-edit" disabled={pagina + 1 >= dados.paginas} onClick={() => setPagina((p) => p + 1)}>Próxima</button>
            </div>
          </div>
        </>
      )}
      <p className="log-rodape">Os registros ficam guardados por 180 dias. O conteúdo enviado (senhas, exames, dados pessoais) nunca é gravado no log.</p>
    </div>
  );
}
