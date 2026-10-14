/**
 * Chat de IA flutuante da prancheta — ícone no canto da tela que abre um
 * mini-chat. A pergunta vai para /assistente/chat junto com o estado atual
 * da jogada; quem decide "o que fazer" é o workflow do n8n (fora deste
 * repositório), não este arquivo.
 *
 * CONTRATO da resposta esperada do n8n (além de output/resposta/erro, que já
 * existiam para o assistente comum):
 *
 *   { "resposta": "Prontinho, montei a zona 2-3.",
 *     "acoes": [
 *       { "tipo": "aplicarFormacaoDefensiva", "chave": "zona_2_3" },
 *       { "tipo": "moverToken", "id": "tk_ab12cd34", "x": 0.32, "y": 0.5 },
 *       { "tipo": "definirPosseBola", "id": "tk_ab12cd34" },
 *       { "tipo": "adicionarToken", "papel": "defesa", "x": 0.4, "y": 0.5, "numero": "" },
 *       { "tipo": "removerToken", "id": "tk_xxxx" }
 *     ] }
 *
 * "acoes" é opcional — sem ela, o chat só responde texto, como o assistente
 * comum. Cada item de "acoes" é executado em ORDEM, na mesma jogada que foi
 * enviada no pedido; cada um só é aceito se passar pelas mesmas checagens do
 * editor (ids existentes, no máx. 5 por papel etc. — ver editor/comandos.js).
 * "chave" de aplicarFormacaoDefensiva é uma das chaves de PRESETS_DEFESA
 * (dominio/presets.js): zona_2_3, zona_3_2, um_tres_um, individual.
 */

const ROTULO_ACAO = Object.freeze({
  moverToken: 'mover um jogador',
  definirPosseBola: 'trocar a posse de bola',
  adicionarToken: 'adicionar um jogador',
  removerToken: 'remover um jogador',
  aplicarFormacaoDefensiva: 'trocar a formação defensiva'
});

export function iniciarChatIA({ comandos, idTime }) {
  const el = id => document.getElementById(id);
  const botao = el('iaBotao');
  const painel = el('iaPainel');
  const box = el('iaChatBox');
  const input = el('iaInput');
  const enviarBtn = el('iaEnviar');
  const fecharBtn = el('iaFechar');
  if (!botao || !painel || !box || !input || !enviarBtn) return;

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  let enviando = false;

  const EXECUTORES = Object.freeze({
    moverToken: a => comandos.moverToken(a.id, Number(a.x), Number(a.y)),
    definirPosseBola: a => comandos.definirPosseBola(a.id ?? null),
    adicionarToken: a => comandos.adicionarToken(a),
    removerToken: a => comandos.removerToken(a.id),
    aplicarFormacaoDefensiva: a => comandos.aplicarFormacaoDefensiva(a.chave)
  });

  function executarAcoes(acoes) {
    if (!Array.isArray(acoes)) return [];
    return acoes.map(a => {
      const fn = a && EXECUTORES[a.tipo];
      if (!fn) return { ok: false, tipo: a?.tipo, erro: `Ação "${a?.tipo}" desconhecida.` };
      try { return { ...fn(a), tipo: a.tipo }; }
      catch (e) { return { ok: false, tipo: a.tipo, erro: e?.message || String(e) }; }
    });
  }

  function addMsg(texto, tipo) {
    const bv = box.querySelector('.ia-msg-bv');
    if (bv) bv.remove();
    const div = document.createElement('div');
    div.className = `ia-msg ${tipo}`;
    div.textContent = texto;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }

  function addTyping() {
    const div = document.createElement('div');
    div.className = 'ia-msg bot ia-typing';
    div.id = 'iaTyping';
    div.innerHTML = '<span></span><span></span><span></span>';
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }
  function removeTyping() { el('iaTyping')?.remove(); }

  async function enviarPergunta() {
    if (enviando) return;
    const pergunta = input.value.trim();
    if (!pergunta) return;

    addMsg(pergunta, 'user');
    input.value = '';
    enviando = true;
    enviarBtn.disabled = true;
    addTyping();

    try {
      const res = await fetch('/assistente/chat', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pergunta,
          idUsuario: usuario.id_usuario,
          idTime,
          tipo_usuario: usuario.tipo_usuario,
          contexto: 'jogada',
          jogada: comandos.obterEstado(),
          frameAtual: comandos.obterFrameAtualIndice()
        })
      });

      removeTyping();

      if (res.status === 401 || res.status === 403) {
        addMsg('Sem permissão para usar a IA neste time (ou sessão expirada).', 'erro');
        return;
      }
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        addMsg(e.erro || 'Não consegui me conectar ao assistente. Tente novamente em instantes.', 'erro');
        return;
      }

      const data = await res.json();
      const resultados = executarAcoes(data.acoes);
      const texto = data.output || data.resposta || data.erro || 'Não consegui gerar uma resposta.';
      addMsg(texto, 'bot');
      resultados.filter(r => !r.ok).forEach(r =>
        addMsg(`Não consegui ${ROTULO_ACAO[r.tipo] || 'executar uma ação'}: ${r.erro}`, 'erro'));
    } catch (e) {
      removeTyping();
      addMsg('Não consegui me conectar ao assistente. Tente novamente em instantes.', 'erro');
    } finally {
      enviando = false;
      enviarBtn.disabled = false;
      input.focus();
    }
  }

  botao.onclick = () => { painel.classList.toggle('aberto'); if (painel.classList.contains('aberto')) input.focus(); };
  fecharBtn && (fecharBtn.onclick = () => painel.classList.remove('aberto'));
  enviarBtn.onclick = enviarPergunta;
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarPergunta(); }
  });
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 100) + 'px';
  });
}
