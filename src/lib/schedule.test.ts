import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blockAt, nextFreeSlot } from './schedule.ts';

// El horario muestra el día completo (0:00 a 24:00); el horario habitual va de 9:00 a 23:00.

test('primer espacio libre desde ahora, dentro del horario habitual', () => {
  const blocks = [{ start: 600, end: 660 }, { start: 660, end: 690 }];
  assert.equal(nextFreeSlot(blocks, 595), 690); // 9:55 → 10:00 ocupado hasta 11:30
  assert.equal(nextFreeSlot([], 23 * 60 + 30), 9 * 60); // de noche: desde el inicio del horario habitual
  assert.equal(nextFreeSlot([], 6 * 60), 9 * 60); // de madrugada: no propone las 6:00
});

test('bloque desde una hora escrita', () => {
  assert.deepEqual(blockAt(10 * 60 + 8), { start: 10 * 60 + 15, end: 10 * 60 + 45 });
  assert.deepEqual(blockAt(23 * 60), { start: 23 * 60, end: 23 * 60 + 30 });
  assert.deepEqual(blockAt(7 * 60), { start: 7 * 60, end: 7 * 60 + 30 });
  assert.deepEqual(blockAt(23 * 60 + 50), { start: 23 * 60 + 30, end: 24 * 60 }); // el día termina a las 24:00
});

test('bloque desde un rango escrito', () => {
  assert.deepEqual(blockAt(13 * 60, 14 * 60), { start: 13 * 60, end: 14 * 60 });
  assert.deepEqual(blockAt(22 * 60, 24 * 60), { start: 22 * 60, end: 24 * 60 });
  assert.deepEqual(blockAt(6 * 60, 8 * 60), { start: 6 * 60, end: 8 * 60 });
});
