// Lo de hoy (bloques y tareas), lo de los días que se ven en la semana o el mes, y lo que quedó
// de días anteriores, con las acciones que lo cambian. Cada cambio se ve al instante y se guarda en segundo plano.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isoDate, type Day } from '../lib/dates.ts';
import type { Parsed } from '../lib/parse.ts';
import { blockAt, clamp, DAY_END, DAY_START, DEFAULT_LEN, snap } from '../lib/schedule.ts';
import type { Tone } from '../lib/tones.ts';
import { isBlock, newItem, type Item, type Repo, type Step } from '../data/types.ts';

export interface Range { from: Day; to: Day }

export function useDay(repo: Repo | null, today: Day, range: Range | null) {
  const [items, setItems] = useState<Item[]>([]);
  const [others, setOthers] = useState<Item[]>([]);
  const [overdue, setOverdue] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);
  const all = useRef<Item[]>([]);
  all.current = [...items, ...others, ...overdue];
  const rangeRef = useRef(range);
  rangeRef.current = range;

  useEffect(() => {
    if (!repo) return;
    let alive = true;
    Promise.all([repo.listDay(today), repo.listOverdue(today)]).then(([day, old]) => {
      if (!alive) return;
      setItems(day);
      setOverdue(old);
      setLoaded(true);
    });
    return () => { alive = false; };
  }, [repo, today]);

  // Lo de los otros días visibles en la semana o el mes (hoy ya está en `items`).
  const from = range?.from;
  const to = range?.to;
  useEffect(() => {
    if (!repo || !from || !to) { setOthers([]); return; }
    let alive = true;
    repo.listRange(from, to).then((list) => { if (alive) setOthers(list.filter((i) => i.date !== today)); });
    return () => { alive = false; };
  }, [repo, today, from, to]);

  /** Pone algo en la lista que le corresponde según su fecha (o lo saca si dejó de verse). */
  const place = useCallback((next: Item) => {
    const r = rangeRef.current;
    const visible = !next.deletedAt;
    const isToday = next.date === today;
    const inRange = !!r && next.date !== null && next.date >= r.from && next.date <= r.to;
    const without = (l: Item[]) => l.filter((i) => i.id !== next.id);
    setItems((l) => without(l).concat(visible && isToday ? [next] : []));
    setOthers((l) => without(l).concat(visible && !isToday && inRange ? [next] : []));
    // Lo atrasado se queda en "Quedó de ayer" solo si sigue atrasado.
    setOverdue((l) => l.flatMap((i) => (i.id !== next.id ? [i]
      : visible && next.date !== null && next.date < today && next.start === null && !next.done ? [next] : [])));
  }, [today]);

  /** Cambia algo (de hoy o de otro día) y lo guarda. */
  const update = useCallback((id: string, patch: Partial<Item>) => {
    const old = all.current.find((i) => i.id === id);
    if (!old) return;
    const next = { ...old, ...patch, updatedAt: new Date().toISOString() };
    place(next);
    repo?.save(next);
  }, [repo, place]);

  const insert = useCallback((item: Item) => {
    place(item);
    repo?.save(item);
  }, [repo, place]);

  const actions = useMemo(() => ({
    update,
    toggleDone: (id: string, done: boolean) => update(id, { done }),
    setSteps: (id: string, steps: Step[]) => update(id, { steps }),
    setTone: (id: string, tone: Tone | null) => update(id, { tone }),
    rename: (id: string, title: string) => update(id, { title }),
    /** Borrado lógico. Devuelve lo borrado, para poder deshacerlo. */
    remove(id: string): Item | undefined {
      const old = all.current.find((i) => i.id === id);
      if (old) update(id, { deletedAt: new Date().toISOString() });
      return old;
    },
    /** Deshacer un borrado: vuelve tal como estaba. */
    restore: (item: Item) => insert({ ...item, deletedAt: null, updatedAt: new Date().toISOString() }),
    moveBlock: (id: string, start: number, end: number) => update(id, { start, end }),
    /** De la lista al horario de `day` (hoy si no se indica); los pasos y la marca viajan con ella. */
    toBlock: (id: string, start: number, day: Day = today) =>
      update(id, { start, end: Math.min(start + DEFAULT_LEN, DAY_END), date: day, done: false }),
    /** Del horario a la lista de tareas (al final), de su mismo día o de `day`. */
    toTask: (id: string, day?: Day) => update(id, { start: null, end: null, sort: Date.now(), ...(day ? { date: day } : {}) }),

    /** A otro día. Si llega a hoy con hora, queda dentro del horario; sin hora, como tarea. */
    moveToDate(id: string, day: Day) {
      const old = all.current.find((i) => i.id === id);
      if (!old) return;
      const patch: Partial<Item> = { date: day, sort: Date.now() };
      if (day === today && old.start !== null && old.end !== null) {
        const len = Math.min(old.end - old.start, DAY_END - DAY_START);
        const start = clamp(snap(old.start), DAY_START, DAY_END - len);
        Object.assign(patch, { start, end: start + len });
      }
      update(id, patch);
    },

    /** Lo escrito en la captura: con hora y para hoy → bloque; sin hora → tarea; otro día → queda en ese día. */
    add(p: Parsed, date: Date | null): Item {
      const day = date ? isoDate(date) : today;
      const slot = p.time !== null ? blockAt(p.time, p.end) : null;
      const item = newItem({ title: p.title, date: day, alert: p.alert, tone: p.tone, start: slot?.start ?? null, end: slot?.end ?? null });
      insert(item);
      return item;
    },

    /** "¿La pasamos a hoy?": sí → a la lista de hoy; más adelante → al día que se elija en el calendario. */
    resolveOverdue(id: string, day: Day) {
      update(id, { date: day, sort: Date.now() });
    },
  }), [update, insert, today]);

  const blocks = useMemo(() => items.filter(isBlock).sort((a, b) => a.start - b.start), [items]);
  const tasks = useMemo(() => items.filter((i) => !isBlock(i)).sort((a, b) => a.sort - b.sort), [items]);

  return { loaded, items, blocks, tasks, others, overdue, actions };
}

export type DayActions = ReturnType<typeof useDay>['actions'];
