// El horario del día: dos columnas, de 9:00 a 16:00 y de 16:00 a 23:00, en pasos de 15 minutos.
// Para cambiar el horario, basta con cambiar estas horas (las dos columnas deben durar lo mismo).

export const STEP = 15;
export const HALVES = [
  { start: 9 * 60, end: 16 * 60 },
  { start: 16 * 60, end: 23 * 60 },
] as const;
export const DAY_START = HALVES[0].start;
export const DAY_END = HALVES[1].end;
export const SPLIT = HALVES[0].end;
export const DEFAULT_LEN = 30;

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export const snap = (m: number) => Math.round(m / STEP) * STEP;
export const halfOf = (m: number) => (m < SPLIT ? 0 : 1);

/** Posición vertical (en %) de un tramo dentro de su columna. */
export function position(half: number, s: number, e: number) {
  const h = HALVES[half];
  const span = h.end - h.start;
  // Algo anotado fuera del horario (por ejemplo, a las 7:00) se dibuja en el borde, no fuera de la columna.
  s = clamp(s, h.start, h.end - STEP);
  e = clamp(e, s + STEP, h.end);
  return { top: `${((s - h.start) / span) * 100}%`, height: `calc(${((e - s) / span) * 100}% - 3px)` };
}

/** Hora que corresponde a un punto de la pantalla: se usa la columna más cercana al puntero. */
export function timeAt(lanes: HTMLElement[], x: number, y: number) {
  let best = 0;
  let bestDist = Infinity;
  lanes.forEach((lane, i) => {
    const r = lane.getBoundingClientRect();
    const dx = x < r.left ? r.left - x : x > r.right ? x - r.right : 0;
    const dy = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0;
    if (dx + dy < bestDist) { bestDist = dx + dy; best = i; }
  });
  const r = lanes[best].getBoundingClientRect();
  const h = HALVES[best];
  return h.start + clamp((y - r.top) / r.height, 0, 1) * (h.end - h.start);
}

export const isOver = (el: Element | null, x: number, y: number) => {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
};

/** Primer espacio libre desde ahora; si no hay, desde el inicio del día. */
export function nextFreeSlot(blocks: { start: number; end: number }[], nowMin: number, len = DEFAULT_LEN) {
  const free = (s: number) => blocks.every((b) => b.end <= s || b.start >= s + len);
  const from = Math.max(DAY_START, Math.ceil(nowMin / STEP) * STEP);
  for (let s = from; s + len <= DAY_END; s += STEP) if (free(s)) return s;
  for (let s = DAY_START; s + len <= DAY_END; s += STEP) if (free(s)) return s;
  return DAY_END - len;
}

/** Un bloque nuevo a partir de una hora escrita: dentro del horario; hasta `end` si se escribió un rango, si no, de 30 minutos. */
export const blockAt = (time: number, end: number | null = null) => {
  if (end === null) {
    const start = clamp(snap(time), DAY_START, DAY_END - DEFAULT_LEN);
    return { start, end: start + DEFAULT_LEN };
  }
  const start = clamp(snap(time), DAY_START, DAY_END - STEP);
  return { start, end: clamp(snap(end), start + STEP, DAY_END) };
};
