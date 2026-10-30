import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blockAt, nextFreeSlot } from './schedule.ts';

test('primer espacio libre desde ahora', () => {
  const blocks = [{ start: 600, end: 660 }, { start: 660, end: 690 }];
  assert.equal(nextFreeSlot(blocks, 595), 690); // 9:55 → 10:00 ocupado hasta 11:30
  assert.equal(nextFreeSlot([], 22 * 60), 7 * 60); // de noche: desde el inicio del día
});

test('bloque desde una hora escrita', () => {
  assert.deepEqual(blockAt(10 * 60 + 8), { start: 10 * 60 + 15, end: 10 * 60 + 45 });
  assert.deepEqual(blockAt(23 * 60), { start: 20 * 60 + 30, end: 21 * 60 });
});

test('bloque desde un rango escrito', () => {
  assert.deepEqual(blockAt(13 * 60, 14 * 60), { start: 13 * 60, end: 14 * 60 });
  assert.deepEqual(blockAt(20 * 60, 23 * 60), { start: 20 * 60, end: 21 * 60 }); // el horario termina a las 21:00
  assert.deepEqual(blockAt(6 * 60, 8 * 60), { start: 7 * 60, end: 8 * 60 });
});
