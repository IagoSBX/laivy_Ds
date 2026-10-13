import { useEffect, useRef, useState } from 'react';

// Campo de data com máscara dd/mm/aaaa (antes js/campo-data.js): digita número
// por número e mantém o calendário nativo num botão ao lado. O valor que entra
// e sai é sempre ISO (AAAA-MM-DD), como no <input type="date">.
export function mascara(txt) {
  const d = txt.replace(/\D/g, '').slice(0, 8);
  if (d.length > 4) return d.slice(0, 2) + '/' + d.slice(2, 4) + '/' + d.slice(4);
  if (d.length > 2) return d.slice(0, 2) + '/' + d.slice(2);
  return d;
}
// "dd/mm/aaaa" -> "aaaa-mm-dd", ou '' se incompleta/inexistente (ex.: 31/02)
export function paraIso(br) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br);
  if (!m) return '';
  const dia = +m[1], mes = +m[2], ano = +m[3];
  const dt = new Date(ano, mes - 1, dia);
  if (dt.getFullYear() !== ano || dt.getMonth() !== mes - 1 || dt.getDate() !== dia) return '';
  return m[3] + '-' + m[2] + '-' + m[1];
}
export function paraBr(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? m[3] + '/' + m[2] + '/' + m[1] : '';
}

export default function CampoData({ value = '', onChange, id, className = 'form-control', required, min, max, invalido, valido, ...resto }) {
  const [texto, setTexto] = useState(paraBr(value));
  const textoRef = useRef(null);
  const nativoRef = useRef(null);

  // valor vindo de fora (edição, reset do formulário) -> texto
  useEffect(() => {
    if (paraIso(texto) !== (value || '')) setTexto(paraBr(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function digitar(e) {
    const el = e.target;
    const pos = el.selectionStart, antes = el.value.length;
    const novo = mascara(el.value);
    setTexto(novo);
    const iso = paraIso(novo);
    el.setCustomValidity(novo && !iso ? 'Informe uma data válida (dd/mm/aaaa).' : '');
    onChange?.(iso);
    requestAnimationFrame(() => {
      const p = Math.max(0, pos + novo.length - antes);
      el.setSelectionRange(p, p);
    });
  }

  const classes = [className, invalido && 'is-invalid', valido && 'is-valid'].filter(Boolean).join(' ');

  return (
    <div className="campo-data">
      <input ref={textoRef} type="text" id={id} className={classes} placeholder="dd/mm/aaaa"
        inputMode="numeric" maxLength={10} autoComplete="off" required={required}
        value={texto} onChange={digitar} {...resto} />
      <button type="button" className="campo-data-btn" aria-label="Abrir calendário" title="Abrir calendário"
        onClick={() => { try { nativoRef.current.showPicker(); } catch { nativoRef.current.focus(); } }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      </button>
      <input ref={nativoRef} type="date" className={classes + ' campo-data-nativo'} tabIndex={-1} aria-hidden="true"
        min={min} max={max} value={value || ''}
        onChange={(e) => { setTexto(paraBr(e.target.value)); textoRef.current?.setCustomValidity(''); onChange?.(e.target.value); }} />
    </div>
  );
}
