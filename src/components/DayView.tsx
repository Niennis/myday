// Vista diaria: el día completo en dos columnas (ver HALVES en lib/schedule.ts) que se desplazan juntas, como
// una agenda con scroll. Los bloques se arrastran, se estiran desde el borde inferior y se mueven con el teclado.
// Un bloque que cruza de una columna a otra sigue en la segunda.
// Muestra hoy u otro día; los días pasados se pueden ver y abrir, pero sus bloques no se mueven.
import { useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { fmt } from '../lib/dates.ts';
import { clamp, DAY_END, DAY_START, DEFAULT_LEN, edgeScroller, HALVES, halfOf, isOver, position, snap, SPLIT, STEP, timeAt, USUAL } from '../lib/schedule.ts';
import type { Item } from '../data/types.ts';
import type { DayActions } from '../state/useDay.ts';
import { useAnnounce } from './Announcer.tsx';
import { stepCount, ToneTag } from './Steps.tsx';

type Block = Item & { start: number; end: number };

interface Props {
  /** El día que se ve: al cambiar, el horario se ubica de nuevo. */
  day: string;
  blocks: Block[];
  /** Si el día que se ve ya pasó, es hoy o viene. */
  when: 'past' | 'today' | 'future';
  nowMin: number;
  actions: DayActions;
  lanes: RefObject<HTMLElement[]>;
  blockEls: RefObject<Map<string, HTMLButtonElement>>;
  taskCard: RefObject<HTMLElement | null>;
  /** Lo que se está arrastrando desde la lista de tareas. */
  preview: { title: string; start: number | null } | null;
  onDropState: (s: '' | 'drop-ready' | 'drop-ready drop-target') => void;
  /** Se soltó un bloque sobre la lista de tareas de hoy. */
  onToList: (b: Block) => void;
  openBlock: (b: Block) => void;
}

export function DayView({ day, blocks, when, nowMin, actions, lanes, blockEls, taskCard, preview, onDropState, onToList, openBlock }: Props) {
  const past = when === 'past';
  const isPast = (b: Block) => past || (when === 'today' && b.end <= nowMin);
  const announce = useAnnounce();
  const dayRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Al abrir un día, el horario se desplaza a algo útil: hoy, a la hora actual (con una hora antes a la vista);
  // otro día, a lo primero que esté anotado en cualquiera de las dos columnas; sin nada, al inicio del horario habitual.
  useLayoutEffect(() => {
    const box = scrollRef.current;
    const lane = lanes.current?.[0];
    if (!box || !lane) return;
    const inColumn = (m: number) => m % SPLIT;
    const target = when === 'today'
      ? inColumn(nowMin) - 60
      : (blocks.length ? Math.min(...blocks.map((b) => inColumn(b.start))) : USUAL.start) - 30;
    box.scrollTop = (Math.max(0, target) / (SPLIT - DAY_START)) * lane.clientHeight;
    // Solo al cambiar de día: no se mueve mientras la persona usa el horario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);
  // Mientras se arrastra, la nueva hora se dibuja aquí y se guarda solo al soltar.
  const [draft, setDraft] = useState<{ id: string; start: number; end: number } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const shown = blocks.map((b) => (draft?.id === b.id ? { ...b, start: draft.start, end: draft.end } : b));

  // Con títulos largos o letra grande, un bloque corto crece más que su espacio y puede pasarse del fondo:
  // en ese caso, la columna deja espacio abajo para que el fondo lo cubra.
  useLayoutEffect(() => {
    const fit = () => {
      for (const lane of lanes.current ?? []) {
        if (!lane?.isConnected) continue;
        let bottom = lane.clientHeight;
        lane.querySelectorAll<HTMLElement>('.block').forEach((b) => { bottom = Math.max(bottom, b.offsetTop + b.offsetHeight); });
        const extra = bottom - lane.clientHeight;
        lane.style.marginBottom = extra > 0 ? `${extra + 8}px` : '';
      }
    };
    fit();
    // También cuando cambia el tamaño de la ventana o de la letra.
    const ro = new ResizeObserver(fit);
    (lanes.current ?? []).forEach((l) => l && ro.observe(l));
    return () => ro.disconnect();
  });

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = (e.target as Element).closest<HTMLElement>('.block');
    if (!el || e.button !== 0 || past) return;
    const b = blocks.find((x) => x.id === el.dataset.id);
    if (!b) return;
    const ls = lanes.current ?? [];
    const mode = (e.target as Element).closest('.handle') ? 'resize' : 'move';
    const offset = timeAt(ls, e.clientX, e.clientY) - b.start;
    const len = b.end - b.start;
    let cur = { id: b.id, start: b.start, end: b.end };
    let moved = false;
    let toList = false;
    const day = e.currentTarget;
    day.setPointerCapture(e.pointerId);
    setDragId(b.id);
    // Cerca del borde del horario, se desplaza solo; la hora se recalcula con la última posición del puntero.
    let last: PointerEvent | null = null;
    const scroller = edgeScroller(scrollRef.current, () => { if (last) onMove(last); });

    const onMove = (ev: PointerEvent) => {
      last = ev;
      scroller.update(ev.clientY);
      // Sobre la lista de tareas: el bloque queda quieto y la lista se marca para soltarlo ahí.
      if (mode === 'move') {
        toList = isOver(taskCard.current, ev.clientX, ev.clientY);
        onDropState(toList ? 'drop-ready drop-target' : 'drop-ready');
        if (toList) { moved = true; return; }
      }
      const t = timeAt(ls, ev.clientX, ev.clientY);
      const next = mode === 'resize'
        ? { ...cur, end: clamp(snap(t), cur.start + STEP, DAY_END) }
        : (() => { const start = clamp(snap(t - offset), DAY_START, DAY_END - len); return { ...cur, start, end: start + len }; })();
      if (next.start !== cur.start || next.end !== cur.end) {
        moved = true;
        cur = next;
        setDraft(next);
      }
    };
    const onUp = (ev: PointerEvent) => {
      scroller.stop();
      day.removeEventListener('pointermove', onMove);
      day.removeEventListener('pointerup', onUp);
      day.removeEventListener('pointercancel', onUp);
      setDragId(null);
      setDraft(null);
      onDropState('');
      if (toList && ev.type === 'pointerup') {
        onToList(b);
      } else if (moved) {
        actions.moveBlock(b.id, cur.start, cur.end);
        announce(`${b.title}: ${fmt(cur.start)} a ${fmt(cur.end)}`);
      } else if (mode === 'move' && ev.type === 'pointerup') {
        // Un clic sin arrastrar abre los pasos del bloque.
        openBlock(b);
      }
    };
    day.addEventListener('pointermove', onMove);
    day.addEventListener('pointerup', onUp);
    day.addEventListener('pointercancel', onUp);
  };

  // Teclado: flechas mueven 15 min; con Mayús cambian la duración.
  const onKeyDown = (e: KeyboardEvent, b: Block) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    if (past) { announce('Ese día ya pasó.'); return; }
    const d = e.key === 'ArrowUp' ? -STEP : STEP;
    let { start, end } = b;
    if (e.shiftKey) {
      end = clamp(end + d, start + STEP, DAY_END);
    } else {
      start = clamp(start + d, DAY_START, DAY_END - (end - start));
      end = start + (b.end - b.start);
    }
    actions.moveBlock(b.id, start, end);
    announce(`${b.title}: ${fmt(start)} a ${fmt(end)}`);
    // El bloque sigue a la vista aunque se mueva fuera de lo que se ve del horario.
    requestAnimationFrame(() => blockEls.current?.get(b.id)?.scrollIntoView({ block: 'nearest' }));
  };

  const previewStart = preview?.start ?? null;

  return (
    <div className={`card day${preview ? ' drop-ready' : ''}`} ref={dayRef} onPointerDown={onPointerDown}>
      {/* Se puede enfocar para desplazarlo con el teclado (flechas, Re Pág, Av Pág) aunque el día esté vacío. */}
      <div className="day-scroll" ref={scrollRef} tabIndex={0} role="region" aria-label="Horario del día, de 0:00 a 24:00">
      <div className="day-cols">
      {HALVES.map((h, i) => {
        const hours = [];
        for (let m = h.start; m < h.end; m += 60) hours.push(<li key={m}>{fmt(m)}</li>);
        return (
          <div className="half" key={h.start}>
            {/* Sin título visible: las horas ya dicen de qué parte del día es. */}
            <h3 id={`half-${i}`} className="sr-only">De {fmt(h.start)} a {fmt(h.end)}</h3>
            <div className="half-grid">
              <ul className="hours" aria-hidden="true">{hours}</ul>
              <div className="lane" ref={(el) => { if (lanes.current && el) lanes.current[i] = el; }}>
                <ul aria-labelledby={`half-${i}`}>
                  {shown.filter((b) => halfOf(b.start) === i).map((b) => {
                    const crosses = i === 0 && b.end > SPLIT;
                    return (
                      <li key={b.id}>
                        <button type="button" data-id={b.id} aria-describedby="day-hint"
                          ref={(el) => { if (el) blockEls.current?.set(b.id, el); else blockEls.current?.delete(b.id); }}
                          className={`block${crosses ? ' continues' : ''}${isPast(b) ? ' past' : ''}${dragId === b.id ? ' dragging' : ''}`}
                          style={position(i, b.start, Math.min(b.end, h.end))}
                          onClick={(e) => { if (e.detail === 0 || past) openBlock(b); }}
                          onKeyDown={(e) => onKeyDown(e, b)}>
                          {/* Los espacios entre las partes hacen que el nombre se lea separado ("Diseño, 9:00 – 11:00"). */}
                          <span className="b-title">{b.title}</span>{' '}
                          <span className="b-time">{fmt(b.start)} – {fmt(b.end)}</span>{' '}
                          {b.steps.length > 0 && (
                            <span className="b-steps"><span aria-hidden="true">✓ </span>{stepCount(b)}<span className="sr-only"> pasos</span></span>
                          )}{' '}
                          {b.tone && <span className="b-tone"><ToneTag tone={b.tone} /></span>}
                          <span className="handle" aria-hidden="true" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {i === 1 && shown.filter((b) => b.start < SPLIT && b.end > SPLIT).map((b) => (
                  <div key={b.id} data-id={b.id} aria-hidden="true"
                    className={`block cont${isPast(b) ? ' past' : ''}${dragId === b.id ? ' dragging' : ''}`}
                    style={position(1, SPLIT, b.end)}>
                    <span className="b-title">{b.title}</span><span className="b-time">continúa</span><span className="handle" />
                  </div>
                ))}
                {when === 'today' && nowMin >= h.start && nowMin < h.end && (
                  <div className="now-line" aria-hidden="true" style={{ top: `${((nowMin - h.start) / (h.end - h.start)) * 100}%` }} />
                )}
                {previewStart !== null && halfOf(previewStart) === i && (
                  <div className="drop-preview" aria-hidden="true" style={position(i, previewStart, Math.min(previewStart + DEFAULT_LEN, h.end))}>
                    {fmt(previewStart)}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
      </div>
      </div>
    </div>
  );
}
