import type { Day } from '../lib/dates.ts';
import type { Tone } from '../lib/tones.ts';

export interface Step {
  id: string;
  title: string;
  done: boolean;
}

/**
 * Una tarea o un bloque: cada cosa vive en un solo lugar.
 * Con `start` es un bloque del horario; sin `start` es una tarea de la lista.
 */
export interface Item {
  id: string; // UUID
  title: string;
  date: Day | null;
  /** Minutos desde la medianoche; null = tarea sin hora. */
  start: number | null;
  end: number | null;
  done: boolean;
  alert: boolean;
  tone: Tone | null;
  steps: Step[];
  /** Orden dentro de la lista de tareas. */
  sort: number;
  createdAt: string;
  updatedAt: string;
  /** Borrado lógico, para poder sincronizar más adelante. */
  deletedAt: string | null;
}

export const isBlock = (i: Item): i is Item & { start: number; end: number } => i.start !== null && i.end !== null;

export interface Repo {
  /** Lo de un día (sin lo borrado). */
  listDay(day: Day): Promise<Item[]>;
  /** Lo de varios días, de `from` a `to` incluidos (para las vistas semanal y mensual). */
  listRange(from: Day, to: Day): Promise<Item[]>;
  /** Tareas sin terminar de días anteriores a `day`. */
  listOverdue(day: Day): Promise<Item[]>;
  save(item: Item): Promise<void>;
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;
}

export function newItem(fields: Partial<Item> & Pick<Item, 'title'>): Item {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    date: null,
    start: null,
    end: null,
    done: false,
    alert: false,
    tone: null,
    steps: [],
    sort: Date.now(),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...fields,
  };
}
