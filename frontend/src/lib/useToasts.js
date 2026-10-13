import { useCallback, useState } from 'react';

// Lista de toasts que somem sozinhos. A marcação/estilo fica em cada tela.
export default function useToasts(duracao = 3200) {
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((msg, ok = true) => {
    const id = Math.random();
    setToasts((t) => [...t, { id, msg, ok }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), duracao);
  }, [duracao]);
  return [toasts, toast];
}
