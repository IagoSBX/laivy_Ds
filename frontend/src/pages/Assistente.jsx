import { useEffect, useRef, useState } from 'react';
import Sidebar from '../components/Sidebar.jsx';
import { authFetch, getJson } from '../lib/api.js';
import { timeSelecionado, usuarioLogado } from '../lib/sessao.js';
import useTitulo from '../lib/useTitulo.js';
import '../styles/pages/assistente.css';

const PERGUNTAS = [
  ['O que é o LAIVY?', 'O que é o LAIVY?'],
  ['Quais tecnologias foram usadas no projeto?', 'Tecnologias usadas'],
  ['Explique a arquitetura do sistema LAIVY', 'Arquitetura do sistema'],
  ['Quais são as funcionalidades principais do LAIVY?', 'Funcionalidades'],
  ['Como funciona o banco de dados do LAIVY?', 'Banco de dados'],
  ['Quais são as próximas atividades do time?', 'Próximas atividades'],
  ['Quem tem o melhor desempenho no time?', 'Ranking desempenho'],
];

const IconeRobo = ({ size = 20, stroke = 'white', sw = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><line x1="12" y1="7" x2="12" y2="11" /><line x1="8" y1="16" x2="8" y2="16" /><line x1="16" y1="16" x2="16" y2="16" /></svg>
);

// escapa o HTML e só então aplica quebra de linha, **negrito** e *itálico*
function formatarTexto(txt) {
  return txt
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
}

function lerBase64(file) {
  return new Promise((ok, erro) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(',')[1]);
    r.onerror = erro;
    r.readAsDataURL(file);
  });
}

const agora = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export default function Assistente() {
  useTitulo('Assistente IA — LAIVY');
  const usuario = usuarioLogado();
  const time = timeSelecionado();
  const podeRecomendar = Number(usuario.tipo_usuario) <= 2;

  // uma sessão por aba: é a chave da memória da conversa no n8n
  const [sessaoChat] = useState(() => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()));
  const [msgs, setMsgs] = useState([]); // { texto, tipo: user|bot|erro, hora }
  const [digitando, setDigitando] = useState(false);
  const [pergunta, setPergunta] = useState('');
  const [anexo, setAnexo] = useState(null);
  const [atletas, setAtletas] = useState([]);
  const [seletorAberto, setSeletorAberto] = useState(false);
  const boxRef = useRef(null);
  const inputRef = useRef(null);
  const anexoRef = useRef(null);
  const seletorRef = useRef(null);

  useEffect(() => {
    if (!podeRecomendar) return;
    const ehAdmin = Number(usuario.tipo_usuario) === 1;
    if (!ehAdmin && !time?.id) return;
    const filtroTime = ehAdmin ? '' : `?idTime=${encodeURIComponent(time.id)}`;
    getJson('/usuarios' + filtroTime).then((lista) => setAtletas(lista.filter((u) => Number(u.tipo_usuario) === 3))).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [msgs, digitando]);

  useEffect(() => {
    if (seletorAberto) seletorRef.current?.focus();
  }, [seletorAberto]);

  const addMsg = (texto, tipo) => setMsgs((m) => [...m, { texto, tipo, hora: agora() }]);

  function selecionarAnexo(e) {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { alert('Arquivo maior que 5 MB.'); e.target.value = ''; return; }
    setAnexo(f);
  }

  function removerAnexo() {
    setAnexo(null);
    if (anexoRef.current) anexoRef.current.value = '';
  }

  async function enviar(textoForcado, idAtleta = null) {
    if (digitando) return;
    const arquivo = anexo;
    const texto = (textoForcado ?? pergunta).trim() || (arquivo ? 'Analise o arquivo anexado.' : '');
    if (!texto) return;

    addMsg(arquivo ? `📎 ${arquivo.name}\n${texto}` : texto, 'user');
    removerAnexo();
    setPergunta('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setDigitando(true);

    try {
      const res = await authFetch('/assistente/chat', {
        method: 'POST',
        body: JSON.stringify({
          pergunta: texto,
          sessaoChat,
          idUsuario: usuario.id_usuario,
          idTime: time ? time.id : null,
          idAtleta,
          tipo_usuario: usuario.tipo_usuario,
          anexoNome: arquivo ? arquivo.name : undefined,
          anexoBase64: arquivo ? await lerBase64(arquivo) : undefined,
        }),
      });
      if (!res.ok) {
        // o backend explica o motivo (sem permissão, anexo inválido, IA fora do ar...)
        const e = await res.json().catch(() => ({}));
        addMsg(e.erro || (res.status === 400 ? 'Não consegui processar o pedido.' : 'Não consegui me conectar ao assistente. Tente novamente em instantes.'), 'erro');
        return;
      }
      const data = await res.json();
      addMsg(data.output || data.resposta || data.erro || 'Não consegui gerar uma resposta.', 'bot');
    } catch {
      addMsg('Não consegui me conectar ao assistente. Tente novamente em instantes.', 'erro');
    } finally {
      setDigitando(false);
      inputRef.current?.focus();
    }
  }

  function solicitarRecomendacao(e) {
    const id = e.target.value;
    if (!id) return;
    const nome = e.target.selectedOptions[0]?.textContent;
    setSeletorAberto(false);
    enviar(`Sou treinador. Recomende um plano de treino individual para ${nome}, considerando o contextoAtleta incluído nesta solicitação. Avalie os dados recentes e as observações de saúde, não invente lesões nem diagnósticos e sinalize quando for necessária avaliação profissional.`, Number(id));
  }

  function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  return (
    <div className="pagina pg-assistente">
      <Sidebar />

      <main className="main">
        <div className="topbar">
          <div className="topbar-inner">
            <div className="topbar-left">
              <h1>Assistente <span>IA</span></h1>
              <p>Pergunte sobre o sistema ou os dados do seu time</p>
            </div>
            <div className="badge-ia">IA Online</div>
          </div>
        </div>

        <div className="chips-wrap">
          <div className="chips-label">Perguntas rápidas</div>
          <div className="chips">
            {PERGUNTAS.map(([texto, rotulo]) => <button key={rotulo} className="chip" onClick={() => enviar(texto)}>{rotulo}</button>)}
            {podeRecomendar && (
              <button className="chip" onClick={() => setSeletorAberto((v) => !v)} aria-expanded={seletorAberto} aria-controls="recomendacaoAtleta">Recomendação para atleta</button>
            )}
          </div>
          <div id="recomendacaoAtleta" className="rec-atleta" hidden={!seletorAberto}>
            <label htmlFor="selectAtletaRecomendacao" className="chips-label">Escolha o atleta</label>
            <select id="selectAtletaRecomendacao" ref={seletorRef} className="select-laivy" value="" onChange={solicitarRecomendacao}>
              <option value="">Selecione um atleta</option>
              {atletas.map((u) => <option key={u.id_usuario} value={u.id_usuario}>{u.nome_usuario}</option>)}
            </select>
          </div>
        </div>

        <div className="chat-container">
          <div className="chat-box" ref={boxRef}>
            {!msgs.length && !digitando && (
              <div className="msg-bv">
                <div className="ia-icon"><IconeRobo size={40} stroke="#00C97A" sw={1.5} /></div>
                <h3>Assistente LAIVY</h3>
                <p>Olá! Posso responder perguntas sobre o sistema,<br />a arquitetura do projeto ou os dados do seu time.</p>
              </div>
            )}
            {msgs.map((m, i) => {
              const ehBot = m.tipo === 'bot' || m.tipo === 'erro';
              return (
                <div key={i} className={`msg ${ehBot ? 'bot' : 'user'} ${m.tipo === 'erro' ? 'msg-erro' : ''}`}>
                  <div className="msg-avatar">{ehBot ? <IconeRobo /> : (usuario.nome_usuario || 'U')[0].toUpperCase()}</div>
                  <div>
                    <div className="msg-bubble" dangerouslySetInnerHTML={{ __html: formatarTexto(m.texto) }} />
                    <div className="msg-time">{m.hora}</div>
                  </div>
                </div>
              );
            })}
            {digitando && (
              <div className="msg bot">
                <div className="msg-avatar"><IconeRobo /></div>
                <div className="msg-bubble">
                  <div className="typing"><div className="typing-dot"></div><div className="typing-dot"></div><div className="typing-dot"></div></div>
                </div>
              </div>
            )}
          </div>

          <div className="anexo-chip" style={anexo ? { display: 'flex' } : undefined}>📎 <span>{anexo?.name}</span>
            <button type="button" onClick={removerAnexo} aria-label="Remover anexo">✕</button>
          </div>
          <div className="input-wrap">
            <input type="file" ref={anexoRef} accept=".pdf,.txt,.csv" hidden onChange={selecionarAnexo} />
            <button type="button" className="btn-anexo" onClick={() => anexoRef.current.click()}
              title="Anexar PDF, TXT ou CSV (ex.: lista de atletas)" aria-label="Anexar arquivo">📎</button>
            <textarea ref={inputRef} placeholder="Digite sua pergunta..." rows={1} value={pergunta}
              onChange={(e) => { setPergunta(e.target.value); autoResize(e.target); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }} />
            <button className="btn-send" disabled={digitando} onClick={() => enviar()}>➤</button>
          </div>
          <div className="input-hint">Enter para enviar · Shift+Enter para nova linha · 📎 anexe um PDF com a lista de atletas para cadastrá-los</div>
        </div>
      </main>
    </div>
  );
}
