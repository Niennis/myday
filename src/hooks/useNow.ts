import { useEffect, useState } from 'react';

/**
 * La hora actual, revisada cada 20 segundos (la app queda abierta todo el día: no hace falta más).
 * Para probar la interfaz a otra hora: `?hora=11:45` en la dirección (solo en desarrollo).
 */
export function useNow(): Date {
  const [now, setNow] = useState(readNow);
  useEffect(() => {
    const id = setInterval(() => setNow(readNow()), 20000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function readNow() {
  const d = new Date();
  const asked = import.meta.env.DEV && /^(\d{1,2}):(\d{2})$/.exec(new URLSearchParams(location.search).get('hora') || '');
  if (asked) d.setHours(Number(asked[1]), Number(asked[2]), 0, 0);
  return d;
}
