import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { authFetch, getJson, sair } from '../lib/api.js';
import { atualizarUsuario, usuarioLogado } from '../lib/sessao.js';
import useTitulo from '../lib/useTitulo.js';
import '../styles/pages/planos.css';

const reais = (centavos) => (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const data = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—');

// Treinador que se cadastrou sozinho: começa o teste grátis ou paga um plano
// por PIX. A tela consulta o pagamento a cada poucos segundos e libera sozinha.
export default function Planos() {
  useTitulo('Planos — LAIVY');
  const navigate = useNavigate();
  const user = usuarioLogado();
  const [info, setInfo] = useState(null);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(null); // id do plano (ou 'teste') sendo processado
  const [copiado, setCopiado] = useState(false);

  function receber(d) {
    setInfo(d);
    atualizarUsuario({ situacao: d.situacao, teste_fim: d.teste_fim });
  }

  async function chamar(url, corpo, marca) {
    setErro('');
    setOcupado(marca);
    try {
      const r = await authFetch(url, { method: 'POST', body: corpo ? JSON.stringify(corpo) : undefined });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErro(d.erro || 'Não foi possível concluir agora. Tente novamente.'); return null; }
      receber(d);
      return d;
    } catch {
      return null;
    } finally {
      setOcupado(null);
    }
  }

  useEffect(() => {
    getJson('/assinaturas/minha').then(receber).catch(() => setErro('Não foi possível carregar os planos.'));
  }, []);

  // PIX pendente: confere o pagamento a cada 5 s
  const aguardando = !!info?.pix && info.situacao !== 'ATIVO';
  useEffect(() => {
    if (!aguardando) return;
    const id = setInterval(() => getJson('/assinaturas/minha').then(receber).catch(() => {}), 5000);
    return () => clearInterval(id);
  }, [aguardando]);

  if (!user.id_usuario) return <Navigate to="/login.html" replace />;

  async function comecarTeste() {
    if (await chamar('/assinaturas/teste', null, 'teste')) navigate('/selecionar-time.html');
  }

  async function copiar() {
    try { await navigator.clipboard.writeText(info.pix.pix_copia_cola); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { /* sem permissão */ }
  }

  const nomePlano = (id) => info?.planos.find((p) => p.id === id)?.nome || id;
  const continuar = () => navigate(info?.tem_time ? '/selecionar-time.html' : '/novo-time.html');

  return (
    <div className="pagina pg-planos">
      <header className="pl-topo">
        <div className="pl-marca"><img src="/img/logo/icone/laivy-icone-claro.svg" alt="" /> LAIVY</div>
        <div className="pl-acoes">
          {(info?.situacao === 'TESTE' || info?.situacao === 'ATIVO') && (
            <button type="button" className="pl-link" onClick={continuar}>Voltar ao sistema</button>
          )}
          <button type="button" className="pl-link" onClick={sair}>Sair</button>
        </div>
      </header>

      <main className="pl-main">
        <h1>Planos</h1>
        {!info && !erro && <p className="pl-sub">Carregando…</p>}
        {info?.situacao === 'TESTE' && <p className="pl-sub">Você está no período de teste até <strong>{data(info.teste_fim)}</strong>. Assine para criar o seu time e cadastrar atletas.</p>}
        {info?.situacao === 'SEM_PLANO' && <p className="pl-sub">{info.teste_disponivel ? 'Escolha um plano ou teste grátis por ' + info.dias_teste + ' dias.' : 'Seu acesso terminou. Escolha um plano para continuar.'}</p>}
        {info?.situacao === 'ATIVO' && (
          <div className="pl-ativo">
            <div>
              <strong>Plano {nomePlano(info.plano)} ativo</strong> até {data(info.valida_ate)}
              {info.atletas != null && <> · {info.atletas} de {info.limite_atletas} atletas</>}
            </div>
            <button type="button" className="pl-btn" onClick={continuar}>{info.tem_time ? 'Ir para o sistema' : 'Criar meu time'}</button>
          </div>
        )}
        {erro && <div className="pl-erro">{erro}</div>}

        {info?.pix && info.situacao !== 'ATIVO' && (
          <section className="pl-pix">
            <h2>Pague com PIX — Plano {nomePlano(info.pix.plano)} · {reais(info.pix.valor_centavos)}</h2>
            <div className="pl-pix-corpo">
              {info.pix.pix_qr_base64 && <img className="pl-qr" src={'data:image/png;base64,' + info.pix.pix_qr_base64} alt="QR Code do PIX" />}
              <div className="pl-pix-texto">
                <label htmlFor="pixCopiaCola">PIX copia e cola</label>
                <textarea id="pixCopiaCola" readOnly value={info.pix.pix_copia_cola || ''} onFocus={(e) => e.target.select()} />
                <button type="button" className="pl-btn" onClick={copiar}>{copiado ? 'Copiado!' : 'Copiar código'}</button>
                <p className="pl-sub">Válido até {new Date(info.pix.pix_expira).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}. <span className="pl-pulso">Aguardando o pagamento…</span> A liberação é automática.</p>
                {info.pagamento_simulado && (
                  <button type="button" className="pl-btn pl-sec" disabled={!!ocupado} onClick={() => chamar('/assinaturas/simular-pagamento', null, 'sim')}>
                    Simular pagamento (ambiente de desenvolvimento)
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {info && (
          <div className="pl-grade">
            {info.teste_disponivel && (
              <div className="pl-card pl-teste">
                <div className="pl-nome">Teste grátis</div>
                <div className="pl-preco">{info.dias_teste} dias</div>
                <ul>
                  <li>Conheça a plataforma com um time de demonstração</li>
                  <li>Somente visualização</li>
                  <li>Sem cobrança</li>
                </ul>
                <button type="button" className="pl-btn pl-sec" disabled={!!ocupado} onClick={comecarTeste}>
                  {ocupado === 'teste' ? 'Começando…' : 'Começar teste'}
                </button>
              </div>
            )}
            {info.planos.map((p) => (
              <div key={p.id} className={'pl-card' + (p.id === 'PRO' ? ' pl-destaque' : '') + (info.plano === p.id ? ' pl-atual' : '')}>
                <div className="pl-nome">{p.nome}</div>
                <div className="pl-preco">{reais(p.valor_centavos)}<span>/mês</span></div>
                <ul>
                  <li>Até {p.limite_atletas} atletas</li>
                  <li>{p.ia ? 'Assistente com IA' : 'Sem IA'}</li>
                  <li>Treinos, jogos, exames e prancheta tática</li>
                </ul>
                <button type="button" className="pl-btn" disabled={!!ocupado} onClick={() => chamar('/assinaturas/pix', { plano: p.id }, p.id)}>
                  {ocupado === p.id ? 'Gerando PIX…' : info.plano === p.id ? 'Renovar com PIX' : 'Assinar com PIX'}
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="pl-sub pl-rodape">Pagamento mensal por PIX. Cada pagamento libera 30 dias de acesso; se pagar antes de vencer, os dias se somam.</p>
      </main>
    </div>
  );
}
