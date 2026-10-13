import { alternarOrdem } from '../lib/ordenacao.js';

// Cabeçalho de tabela clicável com seta de direção (antes ListSort.habilitarCabecalho).
export default function ThOrdenavel({ campo, tipo = 'texto', ordem, setOrdem, children, ...resto }) {
  return (
    <th {...resto} className={'th-ordenavel ' + (resto.className || '')} onClick={() => setOrdem(alternarOrdem(ordem, campo, tipo))}>
      {children}
      {ordem.campo === campo && <span className="sort-arrow">{ordem.direcao === 'asc' ? ' ▲' : ' ▼'}</span>}
    </th>
  );
}
