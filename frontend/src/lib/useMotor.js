import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Inicia um "motor" imperativo (editor da prancheta, biblioteca) depois que a
 * casca da tela foi montada, e chama a limpeza que ele devolve ao sair da tela.
 *
 * O motor mexe direto no DOM da casca, então não pode rodar duas vezes no
 * mesmo DOM. O StrictMode do React (só em dev) desmonta e remonta o efeito na
 * hora: a limpeza fica agendada e é cancelada se o efeito voltar logo em
 * seguida — numa saída de verdade da tela ela roda normalmente.
 */
export default function useMotor(iniciar) {
  const navigate = useNavigate();
  const motor = useRef(null);
  const navegar = useRef(navigate);
  navegar.current = navigate;

  useEffect(() => {
    if (motor.current?.agendada) {
      clearTimeout(motor.current.agendada);
      motor.current.agendada = null;
    } else {
      motor.current = { limpar: iniciar({ navegar: (...a) => navegar.current(...a) }), agendada: null };
    }
    return () => {
      const m = motor.current;
      m.agendada = setTimeout(() => { m.limpar?.(); motor.current = null; }, 0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
