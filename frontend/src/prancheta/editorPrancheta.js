import { criarStore } from './editor/store.js';
import { criarHistorico } from './editor/historico.js';
import { ativarArrasto } from './editor/arrasto.js';
import { ativarFerramentas, FERRAMENTAS, TIPOS_TRACO_INFO } from './editor/ferramentas.js';
import { criarComandos } from './editor/comandos.js';
import { criarTimeline } from './editor/timeline.js';
import { salvarRascunho, lerRascunho, apagarRascunho, comDebounce } from './editor/autosave.js';
import { montarQuadra, aplicarEnquadramento } from './render/quadraSvg.js';
import { criarRenderizador } from './render/cena.js';
import { criarPlayer } from './player/player.js';
import { criarJogada, TIPOS, posicoesAtaquePadrao } from './dominio/schema.js';
import { PRESETS_DEFESA, gerarPosicoesDefesa } from './dominio/presets.js';
import { migrar } from './dominio/migracoes.js';
import { cenaDoFrame } from './dominio/interpolacao.js';
import { validarJogada } from './dominio/validacao.js';
import * as api from './api/jogadas.js';
import { iniciarChatIA } from './ia/chat.js';

/**
 * Editor da prancheta (antes js/prancheta/index.js, que rodava no import).
 * Agora é iniciado pela tela React (pages/Prancheta.jsx) depois que a casca
 * HTML existe, e devolve uma função que desfaz o que é global (listeners em
 * document/window, animação, toasts) quando a tela sai.
 */
export function iniciarPrancheta({ navegar }) {
  let encerrado = false;
  const limpezas = [];
  const ouvir = (alvo, evento, fn) => { alvo.addEventListener(evento, fn); limpezas.push(() => alvo.removeEventListener(evento, fn)); };

  // O time vem da URL quando o link já sabe qual é (ex.: biblioteca abrindo uma
  // jogada específica); sem isso, cai no mesmo timeSelecionado do localStorage
  // que atividades.html/calendario.html já usam — é assim que o link "Jogadas"
  // da sidebar, sem query string nenhuma, sabe de qual time mostrar a prancheta.
  const params = new URLSearchParams(location.search);
  const _timeSelecionado = JSON.parse(localStorage.getItem('timeSelecionado') || 'null');
  const ID_TIME = Number(params.get('time')) || _timeSelecionado?.id || null;
  if (!ID_TIME) { navegar('/selecionar-time.html', { replace: true }); return () => {}; }

  const ID_JOGADA = params.get('jogada') ? Number(params.get('jogada')) : null;
  const CHAVE_RASCUNHO = `jogada:${ID_TIME}:${ID_JOGADA ?? 'nova'}`;

  const el = id => document.getElementById(id);
  const svg = el('quadra');

  const store = criarStore({
    jogada: criarJogada(),
    frameAtual: 0,
    ferramenta: 'mover',
    selecionado: null,
    idJogada: ID_JOGADA,
    versao: null,
    sujo: false
  });

  const historico = criarHistorico(50);
  let renderizador;
  let timeline;
  let player;
  let comandos;

  // ---------------------------------------------------------------------
  // helpers de estado
  // ---------------------------------------------------------------------

  const frameAtual = () => store.get().jogada.frames[store.get().frameAtual];
  const enquadramento = () => store.get().jogada.enquadramento;

  function aplicarNoFrame(receita) {
    store.aplicar(s => {
      receita(s.jogada.frames[s.frameAtual]);
      s.sujo = true;
    });
    desenhar();
    agendarRascunho();
  }

  // ---------------------------------------------------------------------
  // render
  // ---------------------------------------------------------------------

  function desenhar(extra = {}) {
    const cena = cenaDoFrame(frameAtual());
    if (extra.tracoEmConstrucao) {
      cena.tracos = [...cena.tracos, { ...extra.tracoEmConstrucao, id: '__previa__' }];
    }
    renderizador.render(cena, { selecionado: store.get().selecionado });
    timeline.render();
    atualizarCabecalho();
    atualizarElencoSelecionado();
  }

  function atualizarCabecalho() {
    const s = store.get();
    el('nome-jogada').value = s.jogada.nome;
    el('tipo-jogada').value = s.jogada.tipo;
    el('btn-desfazer').disabled = !historico.podeDesfazer();
    el('btn-refazer').disabled  = !historico.podeRefazer();
    el('status').textContent = s.sujo ? 'Rascunho não salvo' : (s.idJogada ? 'Salva' : 'Nova');
    el('btn-exportar').disabled = !s.idJogada;
    atualizarBotaoVincular();
  }

  // ---------------------------------------------------------------------
  // autosave
  // ---------------------------------------------------------------------

  const agendarRascunho = comDebounce(() => {
    salvarRascunho(CHAVE_RASCUNHO, store.get().jogada).catch(() => {});
  }, 2000);

  // ---------------------------------------------------------------------
  // ações
  // ---------------------------------------------------------------------

  async function salvar() {
    const s = store.get();
    const erros = validarJogada(s.jogada);
    if (erros.length) {
      alert('Não dá para salvar ainda:\n\n' + erros.join('\n'));
      return;
    }
    try {
      const salva = s.idJogada
        ? await api.atualizar(ID_TIME, s.idJogada, s.jogada.nome, s.jogada, s.versao)
        : await api.criar(ID_TIME, s.jogada.nome, s.jogada);
      store.aplicar(x => { x.idJogada = salva.id; x.versao = salva.versao; x.sujo = false; });
      await apagarRascunho(CHAVE_RASCUNHO);
      atualizarCabecalho();
      if (!ID_JOGADA) navegar(`/prancheta.html?time=${ID_TIME}&jogada=${salva.id}`, { replace: true });
      mostrarToast('Jogada salva com sucesso!');
    } catch (e) {
      alert(e.conflito
        ? e.message
        : 'Falha ao salvar: ' + e.message + (e.detalhes?.length ? '\n\n' + e.detalhes.join('\n') : ''));
    }
  }

  /** Popup no estilo LAIVY, canto superior direito — some sozinho depois de alguns segundos. */
  function mostrarToast(mensagem, tipo = 'sucesso') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      // dentro da raiz da tela: o CSS da prancheta é isolado nela
      (document.querySelector('.pg-prancheta') || document.body).appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    const icone = document.createElement('span');
    icone.className = 'toast-icone';
    icone.textContent = tipo === 'sucesso' ? '✓' : '!';
    const texto = document.createElement('span');
    texto.textContent = mensagem;
    toast.append(icone, texto);
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('mostrar'));
    setTimeout(() => {
      toast.classList.remove('mostrar');
      toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, 3200);
  }

  function desfazer() {
    const anterior = historico.desfazer(store.get());
    if (anterior) { store.substituir(anterior); desenhar(); agendarRascunho(); }
  }

  function refazer() {
    const proximo = historico.refazer(store.get());
    if (proximo) { store.substituir(proximo); desenhar(); agendarRascunho(); }
  }

  function resetarJogada() {
    if (!confirm('Resetar esta jogada? Todos os frames, bonecos e traços voltam ao estado inicial — o que não estiver salvo se perde.')) return;
    historico.registrar(store.get());
    store.aplicar(s => {
      s.jogada = criarJogada();
      s.frameAtual = 0;
      s.selecionado = null;
      s.sujo = true;
    });
    aplicarEnquadramento(svg, enquadramento());
    desenhar();
    agendarRascunho();
  }

  /**
   * Troca de "tipo" da jogada entre ataque e defesa. Não é só metadado: como o
   * treinador pediu, ataque<->defesa TROCA DE LADO quem ataca e quem defende —
   * nosso time (o grupo que tinha o papel antigo) assume o papel novo, com a
   * posição padrão desse papel, em TODOS os frames.
   */
  function aoMudarTipoJogada(novoTipo) {
    const tipoAntigo = store.get().jogada.tipo;
    if (novoTipo === tipoAntigo) return;

    historico.registrar(store.get());
    store.aplicar(s => {
      s.jogada.tipo = novoTipo;
      if (novoTipo === 'ataque' || novoTipo === 'defesa') {
        const posAtaque = posicoesAtaquePadrao();
        const posDefesa = gerarPosicoesDefesa('zona_2_3');
        s.jogada.frames.forEach(frame => {
          const eraAtaque = frame.tokens.filter(t => t.papel === 'ataque');
          const eraDefesa = frame.tokens.filter(t => t.papel === 'defesa');
          // quem defendia passa a atacar (formação padrão de ataque)
          eraDefesa.forEach((t, i) => {
            t.papel = 'ataque';
            const p = posAtaque[i]; if (p) { t.x = p.x; t.y = p.y; }
            if (!t.numero) t.numero = String(i + 1);
          });
          // quem atacava passa a defender (zona 2-3) — mantém atletaId e numero,
          // então dá pra ver qual dos NOSSOS jogadores está em cada posição.
          eraAtaque.forEach((t, i) => {
            t.papel = 'defesa';
            const p = posDefesa[i]; if (p) { t.x = p.x; t.y = p.y; }
          });
          // a bola tem que ficar com quem ATACA agora — nunca com a defesa.
          // Sem isso ela ficava presa no mesmo token, que virou defensor.
          const novoAtacante = eraDefesa[0] ?? eraAtaque[0];
          if (novoAtacante) frame.bola = { posseDoTokenId: novoAtacante.id, x: null, y: null };
        });
      }
      s.sujo = true;
    });
    desenhar();
    agendarRascunho();
  }

  function alternarEnquadramento() {
    store.aplicar(s => {
      s.jogada.enquadramento = s.jogada.enquadramento === 'meia' ? 'inteira' : 'meia';
      s.sujo = true;
    });
    // Nada de migrar coordenada: elas SEMPRE foram fração da quadra inteira,
    // então trocar o enquadramento é só recortar o viewBox.
    aplicarEnquadramento(svg, enquadramento());
    desenhar();
  }

  // ---------------------------------------------------------------------
  // elenco em quadra
  // ---------------------------------------------------------------------
  // Não existe número de camisa fora de Escalacao (que é por Atividade, não
  // por Time) — associar um atleta aqui só grava o atletaId. O número que
  // aparece no boneco continua sendo o que o preset inicial deu a ele.

  let elenco = [];

  async function carregarElenco() {
    const lista = el('lista-elenco');
    try {
      // /times/{id}/membros existe mas está quebrado no LAIVY hoje (coleção LAZY
      // lida fora de sessão, com open-in-view=false — sempre dá 500). /usuarios
      // com filtro idTime é o mesmo dado, servido por uma query que funciona.
      const res = await fetch(`/usuarios?idTime=${ID_TIME}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const membros = await res.json();
      elenco = membros
        .filter(m => m.tipo_usuario === 3)
        .sort((a, b) => a.nome_usuario.localeCompare(b.nome_usuario, 'pt-BR'));
      renderElenco();
    } catch (e) {
      lista.innerHTML = '';
      const li = document.createElement('li');
      li.className = 'vazio';
      li.textContent = 'Não foi possível carregar o elenco.';
      lista.appendChild(li);
    }
  }

  function renderElenco() {
    const lista = el('lista-elenco');
    lista.innerHTML = '';
    if (!elenco.length) {
      const li = document.createElement('li');
      li.className = 'vazio';
      li.textContent = 'Este time ainda não tem atletas cadastrados.';
      lista.appendChild(li);
      return;
    }
    elenco.forEach(atleta => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'item-elenco';
      b.dataset.atletaId = atleta.id_usuario;
      const nome = document.createElement('span');
      nome.textContent = atleta.nome_usuario;
      const marca = document.createElement('span');
      marca.className = 'numero-atual';
      b.append(nome, marca);
      b.onclick = () => associarAtleta(atleta);
      li.appendChild(b);
      lista.appendChild(li);
    });
    atualizarElencoSelecionado();
  }

  /** Marca no painel qual atleta já está vinculado ao boneco selecionado — sem
   *  isso, clicar num atleta parece "não fazer nada" (só o atletaId interno
   *  mudava, nada na tela confirmava o vínculo). */
  function atualizarElencoSelecionado() {
    const lista = el('lista-elenco');
    if (!lista) return;
    const sel = store.get().selecionado;
    const token = sel ? frameAtual().tokens.find(t => t.id === sel) : null;
    lista.querySelectorAll('.item-elenco').forEach(btn => {
      const vinculado = !!token && token.atletaId != null
        && Number(btn.dataset.atletaId) === Number(token.atletaId);
      btn.classList.toggle('selecionado', vinculado);
      const marca = btn.querySelector('.numero-atual');
      if (marca) marca.textContent = vinculado ? 'Vinculado ✓' : '';
    });
  }

  function associarAtleta(atleta) {
    const sel = store.get().selecionado;
    if (!sel) {
      alert('Selecione um boneco na quadra antes de escolher um atleta.');
      return;
    }
    historico.registrar(store.get());
    store.aplicar(s => {
      // Grava em TODOS os frames: o mesmo boneco (mesmo id) representa o
      // mesmo atleta do início ao fim da jogada.
      s.jogada.frames.forEach(f => {
        const t = f.tokens.find(k => k.id === sel);
        if (t) t.atletaId = atleta.id_usuario;
      });
      s.sujo = true;
    });
    desenhar();
    agendarRascunho();
  }

  // ---------------------------------------------------------------------
  // vincular a uma atividade
  // ---------------------------------------------------------------------

  /** Quando a atividade escolhida em "Vincular a" já tem escalação, o elenco
   *  em quadra passa a mostrar só quem foi escalado — é para esses atletas que
   *  a jogada de fato vai. Sem escalação (ou sem atividade selecionada), volta
   *  pro elenco completo do time. */
  async function atualizarElencoPorAtividade(idAtividade) {
    const info = el('vincular-escalacao-info');
    if (!idAtividade) {
      if (info) info.hidden = true;
      await carregarElenco();
      return;
    }
    try {
      const res = await fetch(`/escalacoes/atividade/${idAtividade}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const escalados = await res.json();
      if (!escalados.length) {
        if (info) {
          info.hidden = false;
          info.textContent = 'Esta atividade ainda não tem escalação — mostrando o elenco completo do time.';
        }
        await carregarElenco();
        return;
      }
      elenco = escalados
        .map(e => e.usuario)
        .filter(Boolean)
        .sort((a, b) => a.nome_usuario.localeCompare(b.nome_usuario, 'pt-BR'));
      renderElenco();
      if (info) {
        info.hidden = false;
        info.textContent = `Mostrando os ${elenco.length} jogador${elenco.length === 1 ? '' : 'es'} escalado${elenco.length === 1 ? '' : 's'} nesta atividade.`;
      }
    } catch (e) {
      // painel opcional: falha aqui não deve travar a prancheta
      if (info) info.hidden = true;
      await carregarElenco();
    }
  }

  async function carregarAtividades() {
    const sel = el('vincular-atividade');
    try {
      const res = await fetch(`/atividades/time/${ID_TIME}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const todas = await res.json();
      const agora = Date.now();
      const futuras = todas
        .filter(a => a.status_atividade !== 0 && a.data_atividade && new Date(a.data_atividade).getTime() >= agora)
        .sort((a, b) => new Date(a.data_atividade) - new Date(b.data_atividade));
      futuras.forEach(a => {
        const quando = new Date(a.data_atividade).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        sel.appendChild(new Option(`${a.nome_atividade} · ${quando}`, a.id_atividade));
      });
    } catch (e) {
      // painel opcional: falha aqui não deve travar a prancheta
    }
  }

  function atualizarBotaoVincular() {
    const temAtividade = !!el('vincular-atividade').value;
    el('btn-vincular').disabled = !store.get().idJogada || !temAtividade;
  }

  /** Mostra, sob o botão "Enviar para atletas", a que atividades esta jogada
   *  já está vinculada — sem isso não há como saber, olhando a prancheta, se
   *  ela já foi atribuída a algum treino/jogo. */
  async function carregarVinculos() {
    const lista = el('lista-vinculos');
    const idJogada = store.get().idJogada;
    if (!lista) return;
    if (!idJogada) { lista.hidden = true; lista.innerHTML = ''; return; }

    let vinculos;
    try {
      vinculos = await api.listarVinculos(ID_TIME, idJogada);
    } catch (e) {
      lista.hidden = true;
      return;
    }

    lista.innerHTML = '';
    if (!vinculos.length) { lista.hidden = true; return; }

    vinculos.forEach(v => {
      const li = document.createElement('li');
      li.className = 'item-vinculo';
      const quando = v.dataAtividade
        ? new Date(v.dataAtividade).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        : '';
      li.innerHTML = `<span><span class="item-vinculo-nome"></span> <span class="item-vinculo-data"></span></span>`;
      li.querySelector('.item-vinculo-nome').textContent = v.nomeAtividade;
      li.querySelector('.item-vinculo-data').textContent = quando ? `· ${quando}` : '';

      const btnRemover = document.createElement('button');
      btnRemover.type = 'button';
      btnRemover.title = 'Desvincular desta atividade';
      btnRemover.setAttribute('aria-label', `Desvincular de ${v.nomeAtividade}`);
      btnRemover.textContent = '×';
      btnRemover.onclick = async () => {
        btnRemover.disabled = true;
        try {
          await api.desvincular(ID_TIME, idJogada, v.idAtividade);
          await carregarVinculos();
        } catch (e) {
          alert('Falha ao desvincular: ' + e.message);
          btnRemover.disabled = false;
        }
      };

      li.appendChild(btnRemover);
      lista.appendChild(li);
    });
    lista.hidden = false;
  }

  async function vincularAtividade() {
    const s = store.get();
    const idAtividade = Number(el('vincular-atividade').value);
    if (!s.idJogada || !idAtividade) return;
    try {
      await api.vincular(ID_TIME, s.idJogada, idAtividade, 0, null);
      alert('Jogada vinculada à atividade selecionada.');
      el('vincular-atividade').value = '';
      atualizarBotaoVincular();
      await atualizarElencoPorAtividade(null);
      await carregarVinculos();
    } catch (e) {
      alert('Falha ao vincular: ' + e.message);
    }
  }

  // ---------------------------------------------------------------------
  // boot
  // ---------------------------------------------------------------------

  async function iniciar() {
    await montarQuadra(svg, 'meia');
    renderizador = criarRenderizador(svg);

    timeline = criarTimeline({
      elemento: el('linha-frames'), store, historico, aoMudar: () => { desenhar(); agendarRascunho(); }
    });

    player = criarPlayer({
      obterJogada: () => store.get().jogada,
      aoQuadro: (cena, ms, total) => {
        renderizador.render(cena, { revelacao: cena.progresso ?? 1 });
        el('barra-tempo').value = total ? (ms / total) * 100 : 0;
        // Quando a animação termina sozinha (chegou ao fim sem o usuário pausar),
        // player.js já marca estaTocando()=false ANTES deste quadro final — só
        // falta o ícone do botão acompanhar, senão fica preso em "❚❚".
        if (!player.estaTocando()) el('btn-tocar').textContent = '▶';
      }
    });

    ativarArrasto({
      svg, grupoQuadra: svg, store, historico, enquadramento,
      aoSoltar: (id, pos) => aplicarNoFrame(frame => {
        const t = frame.tokens.find(k => k.id === id);
        if (t) { t.x = pos.x; t.y = pos.y; }
      }),
      aoSelecionar: id => {
        if (store.get().selecionado === id) return;
        store.aplicar(s => { s.selecionado = id; });
        desenhar();
      }
    });

    ativarFerramentas({
      svg, grupoQuadra: svg, store, historico, enquadramento,
      frameAtual, aplicarNoFrame, render: desenhar, agendarRascunho
    });

    comandos = criarComandos({ store, historico, frameAtual, render: desenhar, agendarRascunho });

    montarBarraFerramentas();
    montarPainelFormacaoDefensiva();
    ligarBotoes();
    await carregarElenco();
    await carregarAtividades();
    atualizarBotaoVincular();

    iniciarChatIA({ comandos, idTime: ID_TIME });

    if (ID_JOGADA) {
      const dados = await api.buscar(ID_TIME, ID_JOGADA);
      store.aplicar(s => {
        s.jogada = { ...migrar(dados.conteudo), nome: dados.nome };
        s.versao = dados.versao;
        s.sujo = false;
      });
      await carregarVinculos();
    }

    // Rascunho local ganha da versão do servidor se for mais recente: o
    // treinador que perdeu a rede no ginásio não pode perder a jogada.
    const rascunho = await lerRascunho(CHAVE_RASCUNHO).catch(() => null);
    if (rascunho?.jogada && confirm('Existe um rascunho não salvo desta jogada. Recuperar?')) {
      store.aplicar(s => { s.jogada = migrar(rascunho.jogada); s.sujo = true; });
    }

    aplicarEnquadramento(svg, enquadramento());
    desenhar();
  }

  // Botão "Seta" agrupa os 4 traços (corte/passe/bloqueio/drible) — evita 4
  // botões soltos disputando espaço com mover/bola/atacante/defensor/etc.
  function montarBarraFerramentas() {
    const barra = el('barra-ferramentas');
    const subBarra = el('barra-seta-subtipos');
    let ultimoTraco = 'corte';

    const criarBotao = (alvo, chave, f) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ferramenta';
      b.textContent = f.rotulo;
      b.title = f.dica;
      b.dataset.ferramenta = chave;
      alvo.appendChild(b);
      return b;
    };

    function selecionarFerramenta(chave) {
      store.aplicar(s => { s.ferramenta = chave; });
      svg.dataset.ferramenta = chave;
      atualizarEstadoBotoes();
    }

    function atualizarEstadoBotoes() {
      const atual = store.get().ferramenta;
      const ehTraco = Object.hasOwn(TIPOS_TRACO_INFO, atual);
      if (ehTraco) ultimoTraco = atual;

      barra.querySelectorAll('.ferramenta').forEach(btn => {
        const chave = btn.dataset.ferramenta;
        btn.classList.toggle('ativa', chave === 'seta' ? ehTraco : chave === atual);
      });
      subBarra.querySelectorAll('.ferramenta').forEach(btn =>
        btn.classList.toggle('ativa', btn.dataset.ferramenta === atual));
      subBarra.hidden = !ehTraco;
    }

    Object.entries(FERRAMENTAS).forEach(([chave, f]) => {
      if (chave === 'mover') criarBotao(barra, 'mover', f).onclick = () => selecionarFerramenta('mover');
    });
    criarBotao(barra, 'seta', {
      rotulo: 'Seta', dica: 'Desenhar um movimento: corte, passe, bloqueio, drible ou arremesso'
    }).onclick = () => selecionarFerramenta(ultimoTraco);
    Object.entries(FERRAMENTAS).forEach(([chave, f]) => {
      if (chave !== 'mover') criarBotao(barra, chave, f).onclick = () => selecionarFerramenta(chave);
    });

    Object.entries(TIPOS_TRACO_INFO).forEach(([chave, f]) => {
      const b = criarBotao(subBarra, chave, f);
      b.classList.add('ferramenta-sub');
      b.onclick = () => selecionarFerramenta(chave);
    });

    atualizarEstadoBotoes();
  }

  function montarPainelFormacaoDefensiva() {
    const lista = el('lista-formacoes');
    if (!lista) return;
    Object.entries(PRESETS_DEFESA).forEach(([chave, rotulo]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn largura-total formacao-defensiva';
      b.textContent = rotulo;
      b.onclick = () => {
        const r = comandos.aplicarFormacaoDefensiva(chave);
        if (!r.ok) alert('Não foi possível aplicar a formação: ' + r.erro);
      };
      lista.appendChild(b);
    });
  }

  /** Menu "Exportar" — PNG do frame atual ou PDF da sequência. Era um
   *  prompt() com "1"/"2"; agora é um menuzinho de verdade ancorado no botão. */
  function ligarMenuExportar() {
    const botao = el('btn-exportar');
    const menu = el('menu-exportar-lista');

    function fechar() {
      menu.hidden = true;
      botao.setAttribute('aria-expanded', 'false');
    }
    function abrir() {
      const s = store.get();
      if (!s.idJogada) return;
      menu.hidden = false;
      botao.setAttribute('aria-expanded', 'true');
    }

    botao.onclick = e => {
      e.stopPropagation();
      if (menu.hidden) abrir(); else fechar();
    };
    ouvir(document, 'click', e => {
      if (!menu.hidden && !menu.contains(e.target) && e.target !== botao) fechar();
    });
    ouvir(document, 'keydown', e => { if (e.key === 'Escape') fechar(); });

    el('exportar-png').onclick = () => {
      const s = store.get();
      fechar();
      window.open(api.urlPng(ID_TIME, s.idJogada, s.frameAtual), '_blank');
    };
    el('exportar-pdf').onclick = () => {
      const s = store.get();
      fechar();
      window.open(api.urlPdf(ID_TIME, s.idJogada), '_blank');
    };
  }

  function ligarBotoes() {
    el('btn-salvar').onclick   = salvar;
    el('btn-desfazer').onclick = desfazer;
    el('btn-refazer').onclick  = refazer;
    el('btn-quadra').onclick   = alternarEnquadramento;
    el('btn-resetar').onclick  = resetarJogada;

    el('btn-tocar').onclick = () => {
      if (player.estaTocando()) { player.pausar(); el('btn-tocar').textContent = '▶'; }
      else { player.tocar(); el('btn-tocar').textContent = '❚❚'; }
    };
    el('barra-tempo').oninput = e => player.irPara((e.target.value / 100) * player.total());
    el('velocidade').onchange = e => player.velocidade(Number(e.target.value));

    el('nome-jogada').oninput = e =>
      store.aplicar(s => { s.jogada.nome = e.target.value; s.sujo = true; });
    el('tipo-jogada').onchange = e => aoMudarTipoJogada(e.target.value);

    el('vincular-atividade').onchange = e => {
      atualizarBotaoVincular();
      atualizarElencoPorAtividade(e.target.value ? Number(e.target.value) : null);
    };
    el('btn-vincular').onclick = vincularAtividade;

    ligarMenuExportar();

    Object.entries(TIPOS).forEach(([v, r]) => el('tipo-jogada').appendChild(new Option(r, v)));

    ouvir(document, 'keydown', e => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); desfazer(); }
      if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault(); refazer();
      }
      if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); salvar(); }
    });

    ouvir(window, 'beforeunload', e => {
      if (store.get().sujo) { e.preventDefault(); e.returnValue = ''; }
    });
  }

  iniciar().catch(e => {
    if (encerrado) return; // a tela saiu antes de terminar de carregar
    console.error(e);
    alert('Falha ao iniciar a prancheta: ' + e.message);
  });

  return () => {
    encerrado = true;
    player?.pausar();
    limpezas.forEach(fn => fn());
    document.getElementById('toastContainer')?.remove();
  };
}
