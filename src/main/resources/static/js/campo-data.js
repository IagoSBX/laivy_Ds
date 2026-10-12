/* ============================================================
   LAIVY — Campo de data com máscara dd/mm/aaaa
   Troca a digitação do <input type="date"> nativo (que apaga por
   blocos dia/mês/ano) por um texto com máscara, que apaga número
   por número, e mantém o calendário num botão ao lado.
   O <input type="date"> original continua no formulário guardando
   o valor em AAAA-MM-DD: FormData, validações e preenchimento na
   edição seguem funcionando sem mudar cada tela.
   ============================================================ */
(function () {
  function mascara(txt) {
    const d = txt.replace(/\D/g, '').slice(0, 8);
    if (d.length > 4) return d.slice(0, 2) + '/' + d.slice(2, 4) + '/' + d.slice(4);
    if (d.length > 2) return d.slice(0, 2) + '/' + d.slice(2);
    return d;
  }
  // "dd/mm/aaaa" -> "aaaa-mm-dd", ou '' se incompleta/inexistente (ex.: 31/02)
  function paraIso(br) {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br);
    if (!m) return '';
    const dia = +m[1], mes = +m[2], ano = +m[3];
    const dt = new Date(ano, mes - 1, dia);
    if (dt.getFullYear() !== ano || dt.getMonth() !== mes - 1 || dt.getDate() !== dia) return '';
    return m[3] + '-' + m[2] + '-' + m[1];
  }
  function paraBr(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    return m ? m[3] + '/' + m[2] + '/' + m[1] : '';
  }

  const ICONE = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';

  function aprimorar(orig) {
    if (orig.dataset.mascara) return;
    orig.dataset.mascara = '1';

    const wrap = document.createElement('div');
    wrap.className = 'campo-data';
    orig.parentNode.insertBefore(wrap, orig);

    const texto = document.createElement('input');
    texto.type = 'text';
    texto.className = orig.className;
    texto.placeholder = 'dd/mm/aaaa';
    texto.inputMode = 'numeric';
    texto.maxLength = 10;
    texto.autocomplete = 'off';
    if (orig.id) {
      texto.id = orig.id + '-texto';
      document.querySelectorAll('label[for="' + orig.id + '"]').forEach(function (l) { l.htmlFor = texto.id; });
    }
    texto.required = orig.required;
    orig.required = false;   // o original fica escondido; a obrigatoriedade passa para o campo visível

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'campo-data-btn';
    btn.setAttribute('aria-label', 'Abrir calendário');
    btn.title = 'Abrir calendário';
    btn.innerHTML = ICONE;

    orig.classList.add('campo-data-nativo');
    orig.tabIndex = -1;
    orig.setAttribute('aria-hidden', 'true');
    wrap.append(texto, btn, orig);

    // texto -> original (e dispara os mesmos eventos que as telas já escutam)
    function enviar() {
      const iso = paraIso(texto.value);
      texto.setCustomValidity(texto.value && !iso ? 'Informe uma data válida (dd/mm/aaaa).' : '');
      setNativo(iso);
      orig.dispatchEvent(new Event('input', { bubbles: true }));
      orig.dispatchEvent(new Event('change', { bubbles: true }));
    }
    texto.addEventListener('input', function () {
      const pos = texto.selectionStart, antes = texto.value.length;
      texto.value = mascara(texto.value);
      const p = Math.max(0, pos + texto.value.length - antes);
      texto.setSelectionRange(p, p);
      enviar();
    });

    // original -> texto: atribuições via código (edição) e escolha no calendário
    const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    function setNativo(v) { desc.set.call(orig, v); }
    Object.defineProperty(orig, 'value', {
      configurable: true,
      get: function () { return desc.get.call(orig); },
      set: function (v) { desc.set.call(orig, v); texto.value = paraBr(v); }
    });
    orig.addEventListener('change', function (e) {
      if (e.isTrusted) texto.value = paraBr(desc.get.call(orig));  // veio do calendário
    });
    if (orig.form) orig.form.addEventListener('reset', function () {
      setTimeout(function () { texto.value = paraBr(desc.get.call(orig)); }, 0);
    });
    texto.value = paraBr(desc.get.call(orig));

    btn.addEventListener('click', function () {
      try { orig.showPicker(); } catch (e) { orig.focus(); }
    });

    // as telas marcam is-valid/is-invalid no original: espelha no campo visível
    new MutationObserver(function () {
      texto.classList.toggle('is-valid', orig.classList.contains('is-valid'));
      texto.classList.toggle('is-invalid', orig.classList.contains('is-invalid'));
    }).observe(orig, { attributes: true, attributeFilter: ['class'] });
  }

  function iniciar() { document.querySelectorAll('input[type="date"]').forEach(aprimorar); }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
    else iniciar();
  }

  if (typeof module !== 'undefined') module.exports = { mascara: mascara, paraIso: paraIso, paraBr: paraBr };
})();
