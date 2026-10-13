import Sidebar from '../components/Sidebar.jsx';
import { iniciarPrancheta } from '../prancheta/editorPrancheta.js';
import useMotor from '../lib/useMotor.js';
import useTitulo from '../lib/useTitulo.js';
import '../styles/pages/prancheta.css';

// Casca da prancheta tática. O editor (quadra SVG, arraste, ferramentas,
// frames, player, exportação, chat de IA) é o motor em prancheta/, que
// preenche e controla os elementos com id abaixo — por isso eles não têm
// estado React: o motor é o dono deles.
export default function Prancheta() {
  useTitulo('Prancheta Tática · LAIVY');
  useMotor(iniciarPrancheta);

  return (
    <div className="pagina pg-prancheta">
      <Sidebar />

      <main className="main">
        <div className="page-header">
          <div>
            <h1>Prancheta Tática</h1>
            <p>Desenhe a jogada, anime a movimentação e vincule a um treino ou jogo.</p>
          </div>
        </div>

        <header className="topo">
          <div className="topo-esq">
            <input id="nome-jogada" className="campo-nome" type="text" placeholder="Nome da jogada" maxLength={120} autoComplete="off" />
            <select id="tipo-jogada" className="campo-tipo" aria-label="Tipo de jogada"></select>
            <span id="status" className="status"></span>
          </div>
          <div className="topo-dir">
            <div className="menu-exportar">
              <button id="btn-exportar" type="button" className="btn" aria-haspopup="true" aria-expanded="false">Exportar ▾</button>
              <div id="menu-exportar-lista" className="menu-exportar-lista" role="menu" hidden>
                <button type="button" className="item-menu" id="exportar-png" role="menuitem">
                  <span className="item-menu-titulo">PNG do frame atual</span>
                  <span className="item-menu-desc">Imagem do frame em exibição, pronta pra WhatsApp</span>
                </button>
                <button type="button" className="item-menu" id="exportar-pdf" role="menuitem">
                  <span className="item-menu-titulo">PDF da sequência completa</span>
                  <span className="item-menu-desc">Folha A4 com todos os frames e descrições</span>
                </button>
              </div>
            </div>
            <button id="btn-salvar" type="button" className="btn btn-primario">Salvar jogada</button>
          </div>
        </header>

        <div className="corpo">
          <section className="area-quadra">
            {/* preenchida pelo motor a partir de FERRAMENTAS */}
            <div id="barra-ferramentas" className="barra-ferramentas"></div>
            {/* preenchida pelo motor a partir de TIPOS_TRACO_INFO: corte/passe/bloqueio/drible */}
            <div id="barra-seta-subtipos" className="barra-ferramentas sub" hidden></div>
            <div className="barra-ferramentas secundaria">
              <button id="btn-desfazer" type="button" className="ferramenta" title="Ctrl+Z">Desfazer</button>
              <button id="btn-refazer" type="button" className="ferramenta" title="Ctrl+Shift+Z">Refazer</button>
              <button id="btn-quadra" type="button" className="ferramenta" title="Meia quadra / quadra inteira">Quadra</button>
              <button id="btn-resetar" type="button" className="ferramenta ferramenta-perigo" title="Volta a jogada inteira ao estado inicial">Resetar</button>
            </div>

            <div className="moldura-quadra">
              {/* viewBox e conteúdo injetados a partir de /img/quadra-fiba.svg */}
              <svg id="quadra" className="quadra" data-ferramenta="mover" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 15"></svg>
            </div>

            <div className="player">
              <button id="btn-tocar" type="button" className="btn-play" aria-label="Tocar animação">▶</button>
              <input id="barra-tempo" className="barra-tempo" type="range" min="0" max="100" defaultValue="0" aria-label="Posição na animação" />
              <select id="velocidade" className="campo-velocidade" aria-label="Velocidade" defaultValue="1">
                <option value="0.5">0,5×</option>
                <option value="1">1×</option>
                <option value="2">2×</option>
              </select>
            </div>

            <div id="linha-frames" className="linha-frames"></div>
          </section>

          <aside className="painel">
            <section className="bloco">
              <h2>Elenco em quadra</h2>
              <p className="ajuda">Selecione um boneco na quadra e clique num atleta para associá-lo.</p>
              <ul id="lista-elenco" className="lista-elenco">
                <li className="vazio">Carregando elenco…</li>
              </ul>
            </section>

            <section className="bloco">
              <h2>Formação defensiva</h2>
              <p className="ajuda">Reposiciona os 5 defensores da jogada (cria um novo frame com a marcação escolhida).</p>
              <div id="lista-formacoes" className="lista-formacoes"></div>
            </section>

            <section className="bloco">
              <h2>Vincular a</h2>
              <select id="vincular-atividade" className="campo" aria-label="Atividade do calendário" defaultValue="">
                <option value="">Nenhuma atividade</option>
              </select>
              <p id="vincular-escalacao-info" className="ajuda" hidden></p>
              <p className="ajuda">
                A jogada existe sozinha na biblioteca. O vínculo é opcional e pode
                apontar para vários treinos e jogos.
              </p>
              <button id="btn-vincular" type="button" className="btn largura-total" disabled>Enviar para atletas</button>
              <ul id="lista-vinculos" className="lista-vinculos" hidden></ul>
            </section>

            <section className="bloco legenda">
              <h2>Convenção de traços</h2>
              <ul>
                <li><span className="amostra corte"></span> Corte ou movimentação</li>
                <li><span className="amostra passe"></span> Passe</li>
                <li><span className="amostra bloqueio"></span> Bloqueio</li>
                <li><span className="amostra atacante">1</span> Atacante, com o número da camisa</li>
                <li><span className="amostra defensor">x</span> Defensor adversário</li>
                <li><span className="amostra bola"></span> Bola</li>
              </ul>
            </section>
          </aside>
        </div>
      </main>

      {/* IA FLUTUANTE */}
      <button type="button" id="iaBotao" className="ia-fab" title="Assistente IA — mexer na quadra" aria-label="Abrir assistente IA">🤖</button>
      <div id="iaPainel" className="ia-painel" role="dialog" aria-label="Assistente IA da prancheta">
        <div className="ia-painel-topo">
          <span>Assistente IA</span>
          <button type="button" id="iaFechar" className="ia-fechar" aria-label="Fechar">×</button>
        </div>
        <div id="iaChatBox" className="ia-chat-box">
          <div className="ia-msg-bv">Peça para eu montar uma formação, mover um jogador ou trocar a marcação — eu mexo na quadra pra você.</div>
        </div>
        <div className="ia-input-wrap">
          <textarea id="iaInput" className="ia-input" rows={1} placeholder="Ex.: monte a zona 2-3"></textarea>
          <button type="button" id="iaEnviar" className="ia-enviar" aria-label="Enviar">➤</button>
        </div>
      </div>
    </div>
  );
}
