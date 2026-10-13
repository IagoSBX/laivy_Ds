import { useEffect } from 'react';

// Modal com a mesma marcação/classes do Bootstrap (antes aberto via bootstrap.Modal).
// Fecha com Esc e clique no fundo, como o padrão do Bootstrap.
export default function Modal({ aberto, onFechar, tamanho, id, children, dialogClassName = '' }) {
  useEffect(() => {
    if (!aberto) return;
    const esc = (e) => e.key === 'Escape' && onFechar?.();
    document.addEventListener('keydown', esc);
    document.body.classList.add('modal-open');
    return () => {
      document.removeEventListener('keydown', esc);
      document.body.classList.remove('modal-open');
    };
  }, [aberto, onFechar]);

  if (!aberto) return null;
  return (
    <>
      <div className="modal fade show" id={id} tabIndex={-1} role="dialog" aria-modal="true" style={{ display: 'block' }}
        onMouseDown={(e) => { if (e.target === e.currentTarget) onFechar?.(); }}>
        <div className={'modal-dialog modal-dialog-centered' + (tamanho ? ' modal-' + tamanho : '') + (dialogClassName ? ' ' + dialogClassName : '')}>
          <div className="modal-content">{children}</div>
        </div>
      </div>
      <div className="modal-backdrop fade show"></div>
    </>
  );
}
