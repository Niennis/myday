// "Lo que importa hoy": las tareas sin hora. Se pasan al horario que se está viendo (hoy u otro día)
// con el botón o arrastrándolas.
import { useRef, useState, type PointerEvent as ReactPointerEvent, type Ref, type RefObject } from 'react';
import { fmt } from '../lib/dates.ts';
import { clamp, DAY_END, DAY_START, DEFAULT_LEN, edgeScroller, isOver, snap, timeAt } from '../lib/schedule.ts';
import type { Item } from '../data/types.ts';
import type { DayActions } from '../state/useDay.ts';
import { useAnnounce } from './Announcer.tsx';
import { FoldCard } from './FoldCard.tsx';
import { IconButton } from './IconButton.tsx';
import { stepCount, Steps, ToneTag } from './Steps.tsx';

const CHEERS = ['Bien hecho.', 'Una menos.', 'Buen avance.', 'Así se hace.'];

interface Props {
  tasks: Item[];
  actions: DayActions;
  /** Hora del primer espacio libre en el horario que se está viendo. */
  freeSlot: () => number;
  /** Pasa una tarea al horario que se está viendo. */
  toBlock: (id: string, start: number) => void;
  /** " de mañana", " del lunes 2 de noviembre" o "" (hoy), para los mensajes. */
  where: string;
  /** Si se puede soltar en el horario (no en un día que ya pasó). */
  canDrop: boolean;
  lanes: RefObject<HTMLElement[]>;
  /** Muestra en el horario dónde quedará lo que se arrastra (null: fuera del horario). */
  onPreview: (p: { title: string; start: number | null } | null) => void;
  focusBlock: (id: string) => void;
  onDelete: (id: string) => void;
  folded: boolean;
  onFold: (f: boolean) => void;
  /** '' | 'drop-ready' | 'drop-ready drop-target' mientras se arrastra un bloque. */
  dropClass: string;
  cardRef: Ref<HTMLElement>;
  foldRef: Ref<HTMLButtonElement>;
}

export function TasksCard({ tasks, actions, freeSlot, toBlock, where, canDrop, lanes, onPreview, focusBlock, onDelete, folded, onFold, dropClass, cardRef, foldRef }: Props) {
  const [cheer, setCheer] = useState('');
  const left = tasks.filter((t) => !t.done).length;
  return (
    <FoldCard id="tareas" className={`task-card ${dropClass}`} title="Lo que importa hoy" ref={cardRef} foldRef={foldRef}
      summary={left ? `${left} ${left === 1 ? 'pendiente' : 'pendientes'}` : tasks.length ? 'todo listo' : ''}
      folded={folded} onFold={onFold}
      icon={<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M6.8 10.2l2.2 2.2 4.2-4.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      after={<p className="drop-msg" aria-hidden="true">Suelta aquí para pasarlo a la lista</p>}>
      {tasks.length === 0 && <p className="muted empty">Nada por ahora. Lo que anotes sin hora aparece aquí.</p>}
      <ul className="tasks">
        {tasks.map((t) => (
          <TaskRow key={t.id} task={t} actions={actions} lanes={lanes} onPreview={onPreview} where={where} canDrop={canDrop}
            toBlock={(start) => toBlock(t.id, start)}
            onDone={(done) => setCheer(done ? CHEERS[Math.floor(Math.random() * CHEERS.length)] : '')}
            toSchedule={() => {
              const start = freeSlot();
              toBlock(t.id, start);
              return start;
            }}
            focusBlock={focusBlock} onDelete={() => onDelete(t.id)} />
        ))}
      </ul>
      <p className="cheer" aria-live="polite">{cheer}</p>
    </FoldCard>
  );
}

interface RowProps {
  task: Item;
  actions: DayActions;
  lanes: RefObject<HTMLElement[]>;
  onPreview: Props['onPreview'];
  where: string;
  canDrop: boolean;
  toBlock: (start: number) => void;
  onDone: (done: boolean) => void;
  toSchedule: () => number;
  focusBlock: (id: string) => void;
  onDelete: () => void;
}

function TaskRow({ task: t, actions, lanes, onPreview, where, canDrop, toBlock, onDone, toSchedule, focusBlock, onDelete }: RowProps) {
  const announce = useAnnounce();
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const addRef = useRef<HTMLInputElement>(null);
  // Soltar después de arrastrar no debe marcar la casilla: se ignora el clic que llega al soltar.
  const justDragged = useRef(false);

  const toggle = () => {
    setOpen(!open);
    // Si todavía no tiene pasos, lo útil es escribir el primero.
    if (!open && t.steps.length === 0) requestAnimationFrame(() => addRef.current?.focus());
  };

  // Arrastrar la tarea al horario: una vista previa marca dónde quedará.
  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.button !== 0 || (e.target as Element).closest('input, button')) return;
    const x0 = e.clientX;
    const y0 = e.clientY;
    let ghost: HTMLDivElement | null = null;
    let dropStart: number | null = null;
    // Cerca del borde del horario, se desplaza solo (y la vista previa sigue al puntero).
    let last: PointerEvent | null = null;
    const scroller = edgeScroller(lanes.current?.[0]?.closest<HTMLElement>('.day-scroll') ?? null, () => { if (last) onMove(last); });
    // Se escucha en window (sin capturar el puntero) para que un clic normal siga marcando la casilla.
    const onMove = (ev: PointerEvent) => {
      last = ev;
      if (!ghost) {
        if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return;
        ghost = document.createElement('div');
        ghost.className = 'drag-ghost';
        ghost.setAttribute('aria-hidden', 'true');
        ghost.textContent = t.title;
        document.body.appendChild(ghost);
        setDragging(true);
      }
      ghost.style.left = `${ev.clientX + 14}px`;
      ghost.style.top = `${ev.clientY + 10}px`;
      const ls = lanes.current ?? [];
      dropStart = canDrop && ls.some((l) => isOver(l, ev.clientX, ev.clientY))
        ? clamp(snap(timeAt(ls, ev.clientX, ev.clientY)), DAY_START, DAY_END - DEFAULT_LEN)
        : null;
      onPreview({ title: t.title, start: dropStart });
      if (canDrop) scroller.update(ev.clientY);
    };
    const onUp = (ev: PointerEvent) => {
      scroller.stop();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      if (!ghost) return; // fue un clic, no un arrastre
      justDragged.current = true;
      setTimeout(() => { justDragged.current = false; });
      ghost.remove();
      setDragging(false);
      onPreview(null);
      if (dropStart !== null && ev.type === 'pointerup') {
        toBlock(dropStart);
        announce(`«${t.title}» quedó en el horario${where} a las ${fmt(dropStart)}.`);
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  return (
    <li data-task={t.id} className={`${t.done ? 'done' : ''}${dragging ? ' drag-source' : ''}`}>
      <div className="task-row" onPointerDown={onPointerDown}
        onClickCapture={(e) => { if (justDragged.current) { e.preventDefault(); e.stopPropagation(); } }}>
        <label className="check">
          <input type="checkbox" checked={t.done} onChange={(e) => { actions.toggleDone(t.id, e.target.checked); onDone(e.target.checked); }} />
          <span className="title">{t.title}</span>
        </label>
        {t.tone && <span className="t-tone"><ToneTag tone={t.tone} /></span>}
        {t.alert && <span className="bell"><span aria-hidden="true">🔔</span><span className="sr-only">Con aviso</span></span>}
        <IconButton className="to-cal" tip={`Poner en el horario${where} (o arrastra la tarea)`} label={`Poner «${t.title}» en el horario${where}`}
          onClick={() => {
            const start = toSchedule();
            requestAnimationFrame(() => focusBlock(t.id));
            announce(`«${t.title}» quedó en el horario${where} a las ${fmt(start)}. Puedes moverla con las flechas.`);
          }}>
          <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><rect x="3" y="4.5" width="14" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M3 8.5h14M7 2.75v3.5M13 2.75v3.5M10 10.5v4M8 12.5h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        </IconButton>
      </div>
      <button type="button" className="toggle-sub" ref={toggleRef} aria-expanded={open} aria-controls={`subs-${t.id}`} onClick={toggle}>
        <span className="chev" aria-hidden="true">›</span> <span className="count">{t.steps.length ? `${stepCount(t)} pasos` : 'Agregar pasos'}</span>
        <span className="sr-only"> de {t.title}</span>
      </button>
      <div className="subs" id={`subs-${t.id}`} hidden={!open}>
        <Steps item={t} addRef={addRef} onSteps={(s) => actions.setSteps(t.id, s)} onTone={(tone) => actions.setTone(t.id, tone)}
          onRename={(title) => actions.rename(t.id, title)} onDelete={onDelete}
          onEscape={() => { setOpen(false); toggleRef.current?.focus(); }} />
      </div>
    </li>
  );
}
