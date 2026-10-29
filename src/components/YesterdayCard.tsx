import { useRef, useState, type FormEvent } from 'react';
import { addDaysIso, dateLabel, fromIsoDate, type Day } from '../lib/dates.ts';
import type { Item } from '../data/types.ts';
import { useAnnounce } from './Announcer.tsx';
import { FoldCard } from './FoldCard.tsx';

interface Props {
  items: Item[];
  today: Day;
  onResolve: (id: string, day: Day) => void;
  folded: boolean;
  onFold: (f: boolean) => void;
  /** A dónde va el foco cuando ya no queda nada pendiente. */
  focusAfter: () => void;
}

// Las tareas atrasadas no se ponen rojas: se pregunta con amabilidad si pasan a hoy.
// "Más adelante" abre el calendario con mañana ya elegido, para decidir el día.
export function YesterdayCard({ items, today, onResolve, folded, onFold, focusAfter }: Props) {
  const announce = useAnnounce();
  const listRef = useRef<HTMLUListElement>(null);
  const [picking, setPicking] = useState<{ id: string; day: Day } | null>(null);
  if (items.length === 0) return null;
  const tomorrow = addDaysIso(today, 1);

  const resolve = (item: Item, i: number, day: Day) => {
    onResolve(item.id, day);
    setPicking(null);
    announce(day === today
      ? `Listo: «${item.title}» quedó en lo de hoy.`
      : `«${item.title}» quedó para ${dateLabel(fromIsoDate(day), fromIsoDate(today), true)}.`);
    // El foco va al siguiente pendiente o, si no quedan, a la lista de hoy.
    requestAnimationFrame(() => {
      const next = listRef.current?.querySelectorAll('li')[Math.min(i, items.length - 2)]?.querySelector('button');
      if (next) next.focus();
      else focusAfter();
    });
  };

  const cancel = (id: string) => {
    setPicking(null);
    requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>(`[data-later="${id}"]`)?.focus());
  };

  return (
    <FoldCard id="ayer" className="yesterday" title="Quedó de ayer" folded={folded} onFold={onFold}
      summary={`${items.length} ${items.length === 1 ? 'pendiente' : 'pendientes'}`}
      icon={<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M4 10a6 6 0 1 0 1.8-4.3M4 3.5v3h3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}>
      <ul ref={listRef}>
        {items.map((y, i) => (
          <li key={y.id}>
            <p id={`y-${y.id}`}>{y.title}</p>
            {picking?.id === y.id ? (
              <form className="later" onSubmit={(e: FormEvent) => { e.preventDefault(); resolve(y, i, picking.day); }}
                onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); cancel(y.id); } }}>
                <label htmlFor={`later-${y.id}`}>¿Para qué día?</label>
                <input type="date" id={`later-${y.id}`} min={tomorrow} required value={picking.day} autoFocus
                  aria-describedby={`y-${y.id}`} onChange={(e) => setPicking({ id: y.id, day: e.target.value })} />
                <div className="actions">
                  <button type="submit" className="btn btn-primary">Listo</button>
                  <button type="button" className="btn" onClick={() => cancel(y.id)}>Cancelar</button>
                </div>
              </form>
            ) : (
              <>
                <p className="ask">¿La pasamos a hoy?</p>
                <div className="actions">
                  <button type="button" className="btn btn-primary" aria-describedby={`y-${y.id}`} onClick={() => resolve(y, i, today)}>Sí, a hoy</button>
                  <button type="button" className="btn" data-later={y.id} aria-describedby={`y-${y.id}`}
                    onClick={() => setPicking({ id: y.id, day: tomorrow })}>Más adelante</button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </FoldCard>
  );
}
