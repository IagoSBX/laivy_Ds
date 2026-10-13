import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

// Monta um Chart.js no <canvas> do ref e destrói quando a config muda/desmonta.
// criarConfig() devolve a config do Chart, ou null para não desenhar nada.
export default function useGrafico(criarConfig, deps) {
  const ref = useRef(null);
  useEffect(() => {
    const config = criarConfig();
    if (!ref.current || !config) return;
    const grafico = new Chart(ref.current.getContext('2d'), config);
    return () => grafico.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}
