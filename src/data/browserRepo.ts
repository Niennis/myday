// Datos en el navegador (localStorage), solo para desarrollar y probar la interfaz con `pnpm dev`
// sin compilar la app. Con `?ejemplo` en la dirección empieza con datos de ejemplo.
import { addDaysIso, type Day } from '../lib/dates.ts';
import { newItem, type Item, type Repo } from './types.ts';

const KEY = 'mi-dia-dev';

interface Store { items: Item[]; settings: Record<string, string> }

function load(): Store {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s) return s;
  } catch { /* sin almacenamiento: se empieza vacío */ }
  return { items: [], settings: {} };
}

function sample(today: Day): Item[] {
  const step = (title: string, done = false) => ({ id: crypto.randomUUID(), title, done });
  const h = (hh: number, mm = 0) => hh * 60 + mm;
  return [
    newItem({ title: 'Correo y planificar', date: today, start: h(8, 30), end: h(9), tone: 'rapido' }),
    newItem({ title: 'Diseño', date: today, start: h(9), end: h(11), tone: 'tiempo',
      steps: [step('Revisar comentarios', true), step('Ajustar la pantalla Hoy'), step('Exportar imágenes')] }),
    newItem({ title: 'Revisar presupuesto', date: today, start: h(11, 30), end: h(12, 30), tone: 'urgente' }),
    newItem({ title: 'Almuerzo', date: today, start: h(13), end: h(14) }),
    newItem({ title: 'Llamada de equipo', date: today, start: h(15), end: h(15, 30) }),
    newItem({ title: 'Caminar', date: today, start: h(18), end: h(19), tone: 'calma' }),
    newItem({ title: 'Enviar la factura de octubre', date: today, alert: true, tone: 'urgente', sort: 1 }),
    newItem({ title: 'Preparar la presentación', date: today, sort: 2,
      steps: [step('Esquema', true), step('Diapositivas'), step('Ensayar una vez')] }),
    newItem({ title: 'Comprar regalo de cumpleaños', date: today, sort: 3 }),
    newItem({ title: 'Llamar al banco', date: addDaysIso(today, -1) }),
    newItem({ title: 'Ordenar el escritorio', date: addDaysIso(today, -1) }),
    newItem({ title: 'Feria del barrio', date: addDaysIso(today, 1), start: h(11), end: h(11, 30) }),
    newItem({ title: 'Dentista', date: addDaysIso(today, 3), start: h(10), end: h(10, 30), alert: true, tone: 'urgente' }),
    newItem({ title: 'Pagar la tarjeta', date: addDaysIso(today, 3) }),
    newItem({ title: 'Cena con amigos', date: addDaysIso(today, 6), start: h(20), end: h(20, 30) }),
    newItem({ title: 'Entregar el informe', date: addDaysIso(today, 12) }),
  ];
}

export function openBrowserRepo(today: Day): Repo {
  let store = load();
  if (location.search.includes('ejemplo') && store.items.length === 0) store.items = sample(today);
  const persist = () => {
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* sin almacenamiento */ }
  };
  const live = () => store.items.filter((i) => !i.deletedAt);
  return {
    async listDay(day) {
      return live().filter((i) => i.date === day).sort((a, b) => a.sort - b.sort);
    },
    async listRange(from, to) {
      return live().filter((i) => i.date !== null && i.date >= from && i.date <= to).sort((a, b) => a.sort - b.sort);
    },
    async listOverdue(day) {
      return live().filter((i) => i.date !== null && i.date < day && i.start === null && !i.done);
    },
    async save(item) {
      store = { ...store, items: [...store.items.filter((i) => i.id !== item.id), item] };
      persist();
    },
    async getSetting(key) {
      return store.settings[key] ?? null;
    },
    async setSetting(key, value) {
      store = { ...store, settings: { ...store.settings, [key]: value } };
      persist();
    },
  };
}
