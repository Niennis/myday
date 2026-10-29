import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from './parse.ts';
import { isoDate } from './dates.ts';

// Jueves 29 de octubre de 2026, 16:00.
const NOW = new Date(2026, 9, 29, 16, 0);
const p = (text: string) => {
  const r = parse(text, NOW);
  return { ...r, date: r.date && isoDate(r.date) };
};

test('fecha y hora con día de la semana', () => {
  assert.deepEqual(p('llamar al dentista el viernes 10:00'),
    { title: 'Llamar al dentista', date: '2026-10-30', time: 600, alert: false, tone: null });
});

test('palabras de fecha', () => {
  assert.equal(p('comprar pan mañana').date, '2026-10-30');
  assert.equal(p('pasado mañana revisar').date, '2026-10-31');
  assert.equal(p('pagar en 3 días').date, '2026-11-01');
  assert.equal(p('algo la próxima semana').date, '2026-11-02');
  assert.equal(p('reunión el lunes que viene').date, '2026-11-02');
  assert.equal(p('reunión el lunes que viene').title, 'Reunión');
  assert.equal(p('el jueves').date, '2026-11-05'); // hoy es jueves: el próximo
  assert.equal(p('pagar el 20').date, '2026-11-20');
});

test('fechas que ya pasaron este año se entienden el próximo', () => {
  assert.equal(p('cumpleaños 15/10').date, '2027-10-15');
  assert.equal(p('fiesta 15 de octubre').date, '2027-10-15');
  assert.equal(p('fiesta 30 de octubre').date, '2026-10-30');
});

test('horas con palabras', () => {
  assert.equal(p('café a las 5 de la tarde').time, 17 * 60);
  assert.equal(p('café a las 5 de la tarde').date, '2026-10-29');
  assert.equal(p('tarea a las 9').time, 9 * 60);
  assert.equal(p('correr por la mañana').title, 'Correr por la mañana');
  assert.equal(p('correr por la mañana').date, null);
});

test('aviso y marcas', () => {
  assert.equal(p('pagar la luz avisar').alert, true);
  assert.deepEqual([p('pagar la luz sin falta').tone, p('pagar la luz sin falta').title], ['urgente', 'Pagar la luz']);
  assert.equal(p('mandar correo rrrápido').tone, 'rapido');
  assert.equal(p('comprar cargador rápido').tone, null);
  assert.equal(p('comprar cargador rápido').title, 'Comprar cargador rápido');
  assert.equal(p('leer con tiempo').tone, 'tiempo');
  assert.equal(p('ordenar papeles con calma').tone, 'calma');
  assert.equal(p('enviar factura hoy sin falta').date, '2026-10-29');
});
