// Fechas como texto "AAAA-MM-DD" (así se guardan) y horas como minutos desde la medianoche.

export type Day = string;

export const isoDate = (d: Date): Day =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const fromIsoDate = (s: Day): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const addDaysIso = (day: Day, n: number): Day => isoDate(addDays(fromIsoDate(day), n));

/** "9:05" a partir de minutos. */
export const fmt = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;

export const minutesOf = (d: Date) => d.getHours() * 60 + d.getMinutes();

/** "hoy", "mañana", "pasado mañana" o "viernes 16 de octubre"; con withArticle: "el viernes 16 de octubre". */
export function dateLabel(d: Date, today: Date, withArticle = false): string {
  const diff = Math.round((startOfDay(d).getTime() - startOfDay(today).getTime()) / 86400000);
  if (diff === 0) return 'hoy';
  if (diff === 1) return 'mañana';
  if (diff === 2) return 'pasado mañana';
  const opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
  if (d.getFullYear() !== today.getFullYear()) opts.year = 'numeric';
  return (withArticle ? 'el ' : '') + d.toLocaleDateString('es', opts).replace(',', '');
}

/** "Jueves, 29 de octubre" para el encabezado. */
export const longToday = (d: Date) =>
  d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, (c) => c.toUpperCase());

export const capFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** El lunes de la semana de `d`. */
export const startOfWeek = (d: Date) => addDays(startOfDay(d), -((d.getDay() + 6) % 7));
/** "Lun", "Mar"... */
export const shortDay = (d: Date) => capFirst(d.toLocaleDateString('es', { weekday: 'short' }).replace('.', ''));
/** "jueves 29 de octubre" */
export const longDay = (d: Date) => d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', '');
export const monthName = (d: Date) => d.toLocaleDateString('es', { month: 'long' });
