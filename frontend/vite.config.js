import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import prefixer from 'postcss-prefix-selector';

// Rotas da API do Spring — em dev o Vite repassa para o backend em :8080.
const API = ['/usuarios', '/times', '/atividades', '/calendarios', '/desempenhos',
  '/exames', '/escalacoes', '/visitantes', '/assistente'];

// Todas as telas agora vivem no mesmo bundle, então o CSS de cada uma
// (src/styles/pages/<tela>.css) fica preso à raiz .pg-<tela>, e o Bootstrap
// (que antes só 10 telas carregavam) fica preso à raiz .bs. Usa :where() para
// não mudar a especificidade — a cascata fica igual à das páginas originais.
// body/html/:root do CSS original passam a apontar para a própria raiz.
function escopoDe(arquivo) {
  const tela = arquivo.match(/styles[\\/]pages[\\/]([\w-]+)\.css$/);
  if (tela) return ':where(.pg-' + tela[1] + ')';
  if (/bootstrap[\\/]dist[\\/]css[\\/]/.test(arquivo)) return ':where(.bs)';
  return null;
}

function escopoPorTela() {
  return {
    postcssPlugin: 'escopo-por-tela',
    prepare(result) {
      const prefixo = escopoDe(result.root.source?.input?.file || '');
      if (!prefixo) return {};
      return prefixer({
        prefix: prefixo,
        transform(prefix, sel, prefixado) {
          if (/^(html|body|:root)$/.test(sel)) return prefix;
          const raiz = sel.match(/^(html|body|:root)([.:#[][^\s>+~]*)?\s*(.*)$/);
          if (raiz) {
            if (raiz[2]) return `${raiz[1]}${raiz[2]} ${prefix}${raiz[3] ? ' ' + raiz[3] : ''}`;
            return raiz[3] ? `${prefix} ${raiz[3]}` : prefix;
          }
          return prefixado;
        },
      }).prepare(result) || {};
    },
  };
}
escopoPorTela.postcss = true;

export default defineConfig({
  plugins: [react()],
  css: { postcss: { plugins: [escopoPorTela()] } },
  build: { outDir: '../src/main/resources/static', emptyOutDir: true },
  server: {
    port: 5173,
    // regex: '/atividades' não pode casar com a tela '/atividades.html'
    proxy: Object.fromEntries(API.map((p) => ['^' + p + '(/|\\?|$)', 'http://localhost:8080'])),
  },
});
