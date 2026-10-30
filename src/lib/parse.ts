// Reconoce fechas, horas, avisos y marcas escritos con palabras en la captura rápida.
// Se probó chrono-node, pero no entiende "pasado mañana", "la próxima semana", "el 20"
// ni "a las 5 de la tarde", y deja restos ("el", "que viene") en el título.

import { addDays, startOfDay } from './dates.ts';
import { DAY_END, DAY_START } from './schedule.ts';
import type { Tone } from './tones.ts';

export interface Parsed {
  title: string;
  date: Date | null;
  /** Minutos desde la medianoche. */
  time: number | null;
  /** Fin, si se escribió un rango ("de 13:00 a 14:00"). */
  end: number | null;
  alert: boolean;
  tone: Tone | null;
}

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'mi[eé]rcoles', 'jueves', 'viernes', 's[aá]bado'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const NUMBERS: Record<string, number> = { un: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10 };
const W = '(?<=^|\\s)'; // inicio de palabra
const E = '(?=\\s|$)'; // fin de palabra
const rx = (src: string) => new RegExp(W + src + E, 'i');

/** Día y mes sin año: si ya pasó este año, se entiende el próximo. */
function futureDate(today: Date, d: number, month: number, year?: number): Date | null {
  if (month < 0 || month > 11 || d < 1 || d > 31) return null;
  let date = new Date(year || today.getFullYear(), month, d);
  if (!year && date < today) date = new Date(today.getFullYear() + 1, month, d);
  return date;
}

export function parse(text: string, now: Date): Parsed {
  const today = startOfDay(now);
  let rest = ` ${text} `;
  let date: Date | null = null;
  let time: number | null = null;
  let end: number | null = null;
  let alert = false;
  let tone: Tone | null = null;
  const take = (re: RegExp) => {
    const m = rest.match(re);
    if (m) rest = rest.replace(m[0], ' ');
    return m;
  };
  let m: RegExpMatchArray | null;

  if (take(rx('(avisar|av[ií]same|avisame|🔔)'))) alert = true;

  // Marca: "sin falta", "rrrápido" (con dos r o más, para no confundirlo con un título), "con tiempo", "con calma".
  if (take(rx('sin falta'))) tone = 'urgente';
  else if (take(rx('r{2,}[aá]+pido'))) tone = 'rapido';
  else if (take(rx('con tiempo'))) tone = 'tiempo';
  else if (take(rx('con calma'))) tone = 'calma';

  // Rango: "de 13:00 a 14:00", "10:00 - 11:30", "desde las 9 hasta las 11", "de 4 a 6 de la tarde".
  // Sin ":", "las" ni "de la tarde" ("de 16 a 19") solo cuenta si empieza dentro del horario de la app,
  // para no confundirlo con "leer de 2 a 3 capítulos".
  const range = rest.match(rx('(?:(de|desde)\\s+)?(?:(las)\\s+)?(\\d{1,2})(?::(\\d{2}))?\\s*(?:a|hasta|-|–)\\s*(?:las\\s+)?(\\d{1,2})(?::(\\d{2}))?(?:\\s+de la\\s+(mañana|tarde|noche))?'));
  if (range) {
    const [, from, las, h1, m1, h2, m2, part] = range;
    const sh = Number(h1);
    if (m1 || m2 || las || part || (from && sh * 60 >= DAY_START && sh * 60 < DAY_END)) {
      const pm = part === 'tarde' || part === 'noche';
      let eh = Number(h2);
      if (pm && eh < 12) eh += 12;
      let st = sh * 60 + Number(m1 || 0);
      let en = eh * 60 + Number(m2 || 0);
      // "de 4 a 6 de la tarde": el inicio también es de la tarde; "de 11 a 1": la 1 es después de las 11.
      if (pm && sh < 12 && st + 12 * 60 < en) st += 12 * 60;
      if (en <= st && eh < 12 && en + 12 * 60 > st) en += 12 * 60;
      if (st < en && en <= 24 * 60 && Number(m1 || 0) < 60 && Number(m2 || 0) < 60) {
        rest = rest.replace(range[0], ' ');
        time = st;
        end = en;
      }
    }
  }

  // Hora: "10:00", "a las 10", "a las 5 de la tarde"
  if (time === null && ((m = take(rx('(?:a las\\s+)?(\\d{1,2}):(\\d{2})(?:\\s+de la (mañana|tarde|noche))?')))
    || (m = take(rx('a las\\s+(\\d{1,2})()(?:\\s+de la (mañana|tarde|noche))?'))))) {
    let h = Number(m[1]);
    const min = Number(m[2] || 0);
    if ((m[3] === 'tarde' || m[3] === 'noche') && h < 12) h += 12;
    if (h < 24 && min < 60) time = h * 60 + min;
  }

  // "por la mañana" o "en la mañana" hablan de la hora, no de la fecha: se dejan en el título.
  const morning = rest.match(/(por|en) la mañana/i);
  if (morning) rest = rest.replace(morning[0], '\u0000');

  if (take(rx('pasado mañana'))) date = addDays(today, 2);
  else if (take(rx('mañana'))) date = addDays(today, 1);
  else if (take(rx('hoy'))) date = today;
  else if ((m = take(rx('en (\\d+|un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez) (d[ií]as?|semanas?)')))) {
    const n = NUMBERS[m[1].toLowerCase()] ?? Number(m[1]);
    date = addDays(today, /semana/i.test(m[2]) ? n * 7 : n);
  } else if (take(rx('(la )?(pr[oó]xima semana|semana que viene)'))) {
    date = addDays(today, ((8 - today.getDay()) % 7) || 7); // el lunes siguiente
  } else if ((m = take(rx(`(?:el\\s+)?(?:pr[oó]ximo\\s+|este\\s+)?(${WEEKDAYS.join('|')})(?:\\s+(?:que viene|pr[oó]ximo))?`)))) {
    const day = m[1];
    const target = WEEKDAYS.findIndex((w) => new RegExp(`^${w}$`, 'i').test(day));
    date = addDays(today, ((target - today.getDay() + 7) % 7) || 7);
  } else if ((m = take(rx(`(?:el\\s+)?(\\d{1,2}) de (${MONTHS.join('|')})(?:\\s+de\\s+(\\d{4}))?`)))) {
    date = futureDate(today, Number(m[1]), MONTHS.indexOf(m[2].toLowerCase()), m[3] ? Number(m[3]) : undefined);
  } else if ((m = take(rx('(?:el\\s+)?(\\d{1,2})/(\\d{1,2})(?:/(\\d{2,4}))?')))) {
    const y = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : undefined;
    date = futureDate(today, Number(m[1]), Number(m[2]) - 1, y);
  } else if ((m = take(rx('el (\\d{1,2})')))) {
    const d = Number(m[1]);
    let candidate = new Date(today.getFullYear(), today.getMonth(), d);
    if (candidate < today) candidate = new Date(today.getFullYear(), today.getMonth() + 1, d);
    if (d >= 1 && d <= 31) date = candidate;
  }

  if (morning) rest = rest.replace('\u0000', morning[0]);
  let title = rest.replace(/\s+/g, ' ').trim();
  title = title.charAt(0).toUpperCase() + title.slice(1);
  if (time !== null && !date) date = today;
  return { title, date, time, end, alert, tone };
}
