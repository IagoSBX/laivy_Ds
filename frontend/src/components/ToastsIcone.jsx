// Toasts com ícone de ok/erro (estilo das telas de Atividades e Times).
const IconeOk = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ verticalAlign: -2 }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 17.01" /></svg>;
const IconeErro = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ verticalAlign: -2 }}><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>;

export default function ToastsIcone({ toasts }) {
  return (
    <div className="toast-wrap">
      {toasts.map((t) => <div key={t.id} className={'toast-item' + (t.ok ? '' : ' erro')}>{t.ok ? <IconeOk /> : <IconeErro />} {t.msg}</div>)}
    </div>
  );
}
