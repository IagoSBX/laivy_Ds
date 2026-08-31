import { montarQuadra, aplicarEnquadramento } from './render/quadraSvg.js';
import { criarRenderizador } from './render/cena.js';
import { criarPlayer } from './player/player.js';
import { migrar } from './dominio/migracoes.js';
import { cenaDoFrame } from './dominio/interpolacao.js';
import * as api from './api/jogadas.js';

/**
 * Modo leitura do atleta. Reaproveita renderizador, player e domínio do
 * editor sem uma linha duplicada — é o dividendo de manter dominio/ e
 * render/ sem nenhuma referência ao editor.
 */
const params = new URLSearchParams(location.search);
const ID_TIME = Number(params.get('time'));
const ID_JOGADA = Number(params.get('jogada'));
const ID_ATIVIDADE = params.get('atividade') ? Number(params.get('atividade')) : null;

const el = id => document.getElementById(id);
const svg = el('quadra');

async function iniciar() {
  const dados = await api.buscar(ID_TIME, ID_JOGADA);
  const jogada = migrar(dados.conteudo);

  el('nome-jogada-leitura').textContent = dados.nome;
  el('rotulo-atividade').textContent =
    `${rotuloTipo(jogada.tipo)} · ${jogada.frames.length} frames`;

  await montarQuadra(svg, jogada.enquadramento);
  aplicarEnquadramento(svg, jogada.enquadramento);
  const renderizador = criarRenderizador(svg);
  renderizador.render(cenaDoFrame(jogada.frames[0]));
  descrever(jogada, 0);

  const player = criarPlayer({
    obterJogada: () => jogada,
    aoQuadro: (cena, ms, total) => {
      renderizador.render(cena, { revelacao: cena.progresso ?? 1 });
      el('barra-progresso').style.width = total ? `${(ms / total) * 100}%` : '0%';
      descrever(jogada, indiceEm(jogada, ms));
    }
  });

  el('btn-tocar').onclick = () => {
    if (player.estaTocando()) { player.pausar(); el('btn-tocar').textContent = '▶'; }
    else { player.tocar(); el('btn-tocar').textContent = '❚❚'; }
  };

  // Os dois botões abaixo só fazem sentido com uma atividade no contexto
  // (o link que o treinador manda pro atleta inclui &atividade=). Sem isso,
  // desabilitados com um motivo — nada de botão que parece vivo e não faz nada.
  if (!ID_ATIVIDADE) {
    el('btn-visualizada').disabled = true;
    el('btn-visualizada').title = 'Esta jogada não está vinculada a um treino ou jogo específico.';
    el('btn-observacoes').disabled = true;
    el('btn-observacoes').title = 'Esta jogada não está vinculada a um treino ou jogo específico.';
    return;
  }

  el('btn-visualizada').onclick = async () => {
    try {
      await api.confirmarVisualizacao(ID_TIME, ID_JOGADA, ID_ATIVIDADE);
      el('btn-visualizada').textContent = 'Visualizada ✓';
      el('btn-visualizada').disabled = true;
    } catch (e) {
      alert('Não foi possível confirmar: ' + e.message);
    }
  };

  el('btn-observacoes').onclick = async () => {
    el('btn-observacoes').disabled = true;
    try {
      const vinculo = await api.buscarVinculo(ID_TIME, ID_JOGADA, ID_ATIVIDADE);
      alert(vinculo?.observacoes?.trim()
        ? 'Observações do treinador:\n\n' + vinculo.observacoes
        : 'O treinador não deixou observações para esta jogada.');
    } catch (e) {
      alert('Não foi possível carregar as observações: ' + e.message);
    } finally {
      el('btn-observacoes').disabled = false;
    }
  };
}

function indiceEm(jogada, ms) {
  let acumulado = 0;
  for (let i = 0; i < jogada.frames.length - 1; i++) {
    const dur = jogada.frames[i].duracaoMs ?? jogada.duracaoPadraoMs;
    if (ms < acumulado + dur) return i;
    acumulado += dur;
  }
  return jogada.frames.length - 1;
}

function descrever(jogada, i) {
  el('rotulo-frame').textContent = `Frame ${i + 1} de ${jogada.frames.length}`;
  el('descricao-frame').textContent = jogada.frames[i].descricao ?? '';
}

const rotuloTipo = t => ({
  ataque: 'Ataque', defesa: 'Defesa', bola_parada: 'Bola parada', transicao: 'Transição'
}[t] ?? t);

iniciar().catch(e => {
  console.error(e);
  el('rotulo-atividade').textContent = 'Não foi possível carregar a jogada.';
});
