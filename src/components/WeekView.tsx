// Vista semanal: 7 columnas de lunes a domingo, hoy destacado.
// Se cambia de día arrastrando o con las flechas ← →. No se puede mover nada a un día que ya pasó.
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { addDays, capFirst, dateLabel, fmt, fromIsoDate, isoDate, longDay, monthName, shortDay, type Day } from '../lib/dates.ts';
import { isOver } from '../lib/schedule.ts';
import type { Item } from '../data/types.ts';
import { useAnnounce } from './Announcer.tsx';
import { stepCount, ToneTag } from './Steps.tsx';

interface Props {
  weekStart: Date;
  today: Date;
  /** Lo de un día, ya ordenado (bloques por hora y después tareas). */
  entriesFor: (day: Day) => Item[];
  onMove: (item: Item, day: Day) => void;
  openItem: (item: Item, el: HTMLElement, when: string) => void;
  /** Cambia de semana (para seguir algo que se movió a otra). */
  goToWeekOf: (d: Date) => void;
  offset: number;
  setOffset: (n: number) => void;
}

export const itemWhen = (item: Item, today: Date) =>
  `${capFirst(dateLabel(fromIsoDate(item.date!), today))}${item.start !== null ? ` · ${fmt(item.start)}` : ''}`;

export function WeekView({ weekStart, today, entriesFor, onMove, openItem, goToWeekOf, offset, setOffset }: Props) {
  const announce = useAnnounce();
  const gridRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [dropDay, setDropDay] = useState<Day | null>(null);
  const [dragKey, setDragKey] = useState<string | null>(null);
  // Soltar después de arrastrar no debe abrir la tarjeta de pasos.
  const justDragged = useRef(false);
  const todayIso = isoDate(today);
  const end = addDays(weekStart, 6);

  // Después de mover algo con el teclado, el foco lo sigue.
  useEffect(() => {
    if (!focusKey) return;
    gridRef.current?.querySelector<HTMLElement>(`[data-key="${focusKey}"]`)?.focus();
    setFocusKey(null);
  });

  const move = (item: Item, day: Day) => {
    onMove(item, day);
    announce(`«${item.title}» quedó para ${dateLabel(fromIsoDate(day), today, true)}.`);
  };

  const onKeyDown = (e: KeyboardEvent, item: Item, day: Date) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const target = addDays(day, e.key === 'ArrowLeft' ? -1 : 1);
    if (isoDate(target) < todayIso) { announce('Ese día ya pasó.'); return; }
    move(item, isoDate(target));
    if (target < weekStart || target > end) goToWeekOf(target);
    setFocusKey(item.id);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>, item: Item, day: Day) => {
    if (e.button !== 0) return;
    const btn = e.currentTarget;
    const x0 = e.clientX;
    const y0 = e.clientY;
    let ghost: HTMLDivElement | null = null;
    let target: Day | null = null;
    const onMove = (ev: PointerEvent) => {
      if (!ghost) {
        if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return;
        ghost = document.createElement('div');
        ghost.className = 'drag-ghost';
        ghost.setAttribute('aria-hidden', 'true');
        ghost.textContent = item.title;
        document.body.appendChild(ghost);
        setDragKey(item.id);
      }
      ghost.style.left = `${ev.clientX + 14}px`;
      ghost.style.top = `${ev.clientY + 10}px`;
      const over = [...(gridRef.current?.querySelectorAll<HTMLElement>('.wday:not(.past)') ?? [])]
        .find((s) => isOver(s, ev.clientX, ev.clientY));
      target = over?.dataset.date ?? null;
      setDropDay(target);
    };
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      if (!ghost) return; // fue un clic
      justDragged.current = true;
      setTimeout(() => { justDragged.current = false; });
      ghost.remove();
      setDragKey(null);
      setDropDay(null);
      if (target && ev.type === 'pointerup' && target !== day) move(item, target);
      btn.blur();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const sameMonth = weekStart.getMonth() === end.getMonth();
  const range = sameMonth
    ? `${weekStart.getDate()} – ${end.getDate()} de ${monthName(end)}`
    : `${weekStart.getDate()} de ${monthName(weekStart)} – ${end.getDate()} de ${monthName(end)}`;

  return (
    <div className="card">
      <div className="period-nav">
        <button type="button" className="icon-btn" aria-label="Semana anterior" onClick={() => setOffset(offset - 1)}><span aria-hidden="true">‹</span></button>
        <p className="period" aria-live="polite">{range}</p>
        <button type="button" className="icon-btn" aria-label="Semana siguiente" ref={nextRef} onClick={() => setOffset(offset + 1)}><span aria-hidden="true">›</span></button>
        {offset !== 0 && (
          <button type="button" className="btn btn-small" onClick={() => { setOffset(0); nextRef.current?.focus(); }}>Volver a esta semana</button>
        )}
      </div>
      <div className="week-grid" ref={gridRef}>
        {Array.from({ length: 7 }, (_, i) => {
          const date = addDays(weekStart, i);
          const iso = isoDate(date);
          const isToday = iso === todayIso;
          const isPast = iso < todayIso;
          const entries = entriesFor(iso);
          return (
            <section key={iso} data-date={iso} aria-labelledby={`wd-${iso}`}
              className={`wday${isToday ? ' today' : ''}${isPast ? ' past' : ''}${dropDay === iso ? ' drop-target' : ''}`}>
              <h3 id={`wd-${iso}`} tabIndex={-1}>
                <span aria-hidden="true">{shortDay(date)} <span className="wd-num">{date.getDate()}</span></span>
                <span className="sr-only">{longDay(date)}{isToday ? ', hoy' : ''}</span>
                {isToday && <span className="today-tag" aria-hidden="true">Hoy</span>}
              </h3>
              {entries.length ? (
                <ul>
                  {entries.map((r) => (
                    <li key={r.id}>
                      <button type="button" data-key={r.id} aria-describedby="week-hint"
                        className={`witem${r.start === null && r.done ? ' done' : ''}${dragKey === r.id ? ' drag-source' : ''}`}
                        onClick={(e) => { if (!justDragged.current) openItem(r, e.currentTarget, itemWhen(r, today)); }}
                        onKeyDown={(e) => onKeyDown(e, r, date)}
                        onPointerDown={(e) => onPointerDown(e, r, iso)}>
                        {r.start !== null && <span className="w-time">{fmt(r.start)}</span>}{' '}
                        <span className="w-title">
                          {r.title}
                          {r.alert && <><span aria-hidden="true"> 🔔</span><span className="sr-only">, con aviso</span></>}
                        </span>{' '}
                        {r.steps.length > 0 && (
                          <span className="w-steps"><span aria-hidden="true">✓ </span>{stepCount(r)}<span className="sr-only"> pasos</span></span>
                        )}{' '}
                        <ToneTag tone={r.tone} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : <p className="wempty">{isPast ? '' : 'Libre'}</p>}
            </section>
          );
        })}
      </div>
    </div>
  );
}
