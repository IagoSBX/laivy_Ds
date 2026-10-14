import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import { iniciarBiblioteca } from '../prancheta/biblioteca.js';
import useMotor from '../lib/useMotor.js';
import useTitulo from '../lib/useTitulo.js';
import { usuarioLogado } from '../lib/sessao.js';
import '../styles/pages/prancheta.css';

// Casca da biblioteca; a grade de cartões (com miniaturas desenhadas pelo
// mesmo renderizador do editor) é montada por prancheta/biblioteca.js.
export default function BibliotecaJogadas() {
  useTitulo('Biblioteca de jogadas · LAIVY');
  // atleta só visualiza as jogadas (criar/editar é do treinador)
  const somenteLeitura = usuarioLogado().tipo_usuario === 3;
  useMotor((opcoes) => iniciarBiblioteca({ ...opcoes, somenteLeitura }));

  return (
    <div className="pagina pg-prancheta">
      <Sidebar />

      <main className="main">
        <div className="page-header">
          <div>
            <h1>Biblioteca de Jogadas</h1>
            <p>Jogadas salvas do time, prontas pra reaproveitar em qualquer treino ou jogo.</p>
          </div>
          {!somenteLeitura && <a id="link-nova" className="btn btn-primario" href="#">+ Nova jogada</a>}
        </div>

        <div className="barra-filtros">
          <input id="busca" className="campo campo-busca" type="search" placeholder="Buscar por nome…" autoComplete="off" />
          <select id="filtro-tipo" className="campo campo-tipo" aria-label="Filtrar por tipo" defaultValue="">
            <option value="">Todos os tipos</option>
          </select>
        </div>

        <div id="grade" className="grade-biblioteca">
          <p className="ajuda">Carregando jogadas…</p>
        </div>

        <div className="rodape-biblioteca">
          <button id="btn-carregar-mais" type="button" className="btn" hidden>Carregar mais</button>
        </div>
      </main>

      {/* ASSISTENTE LAIVY */}
      <Link to="/assistente.html" id="iaBotao" className="ia-fab" title="Assistente LAIVY" aria-label="Abrir assistente LAIVY">🤖</Link>
    </div>
  );
}
