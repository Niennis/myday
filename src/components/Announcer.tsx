// Mensajes para lectores de pantalla ("«Diseño» quedó en el horario a las 10:00").
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

const AnnounceContext = createContext<(msg: string) => void>(() => {});

export const useAnnounce = () => useContext(AnnounceContext);

export function Announcer({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState('');
  const announce = useCallback((m: string) => {
    // Se vacía primero para que un mensaje repetido también se lea.
    setMsg('');
    requestAnimationFrame(() => setMsg(m));
  }, []);
  return (
    <AnnounceContext.Provider value={announce}>
      {children}
      <p className="sr-only" aria-live="polite">{msg}</p>
    </AnnounceContext.Provider>
  );
}
