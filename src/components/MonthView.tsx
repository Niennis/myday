// Vista mensual: solo para ver qué días están cargados (un punto por cosa anotada).
// Un clic en un día lleva a su semana.
import { useRef } from 'react';
import { capFirst, isoDate, longDay, type Day } from '../lib/dates.ts';

interface Props {
  first: Date;
  today: Date;
  countFor: (day: Day) => number;
  openWeek: (d: Date) => void;
  offset: number;
  setOffset: (n: number) => void;
}

export function MonthView({ first, today, countFor, openWeek, offset, setOffset }: Props) {
  const nextRef = useRef<HTMLButtonElement>(null);
  const todayIso = isoDate(today);
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  // Espacios vacíos antes del día 1 (la semana empieza el lunes).
  const blanks = (first.getDay() + 6) % 7;

  return (
    <div className="card">
      <div className="period-nav">
        <button type="button" className="icon-btn" aria-label="Mes anterior" onClick={() => setOffset(offset - 1)}><span aria-hidden="true">‹</span></button>
        <p className="period" aria-live="polite">{capFirst(first.toLocaleDateString('es', { month: 'long', year: 'numeric' }))}</p>
        <button type="button" className="icon-btn" aria-label="Mes siguiente" ref={nextRef} onClick={() => setOffset(offset + 1)}><span aria-hidden="true">›</span></button>
        {offset !== 0 && (
          <button type="button" className="btn btn-small" onClick={() => { setOffset(0); nextRef.current?.focus(); }}>Volver a este mes</button>
        )}
      </div>
      <div className="month-head" aria-hidden="true">
        <span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span>
      </div>
      <div className="month-grid">
        {Array.from({ length: blanks }, (_, i) => <span key={`b${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const date = new Date(first.getFullYear(), first.getMonth(), i + 1);
          const iso = isoDate(date);
          const n = countFor(iso);
          const isToday = iso === todayIso;
          const isPast = iso < todayIso;
          const amount = n === 0 ? 'libre' : n === 1 ? '1 cosa' : `${n} cosas`;
          return (
            <button key={iso} type="button" className={`mday${isToday ? ' today' : ''}${isPast ? ' past' : ''}`} onClick={() => openWeek(date)}>
              <span className="m-num" aria-hidden="true">{i + 1}</span>
              <span className="m-dots" aria-hidden="true">{n ? '●'.repeat(Math.min(n, 4)) + (n > 4 ? '+' : '') : ''}</span>
              <span className="sr-only">{longDay(date)}{isToday ? ', hoy' : ''}{isPast ? '' : `: ${amount}`}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
