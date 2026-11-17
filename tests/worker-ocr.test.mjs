import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseWorkerRows, parseVillagerReading, villagerTotal, nextWorkerTarget, VillagerTotalGate } from '../src/lib/ocr.ts';
import { defaultData, normalize } from '../src/lib/defaults.ts';

test('reads all four worker counts including explicit gray zeroes, not population or resources', () => {
  const workers = parseWorkerRows(['10', '9', '0', '0']);
  assert.deepEqual(workers, { food: 10, wood: 9, gold: 0, stone: 0 });
  assert.equal(villagerTotal(workers), 19);
  for (const rows of [['13/20'], ['10','9','','0'], ['10','9','0'], ['210','150','100','0'], ['10 a','9','0','0']]) {
    assert.equal(parseWorkerRows(rows), null);
  }
});

test('adds inactive villagers from their separate counter and rejects missing readings', () => {
  assert.deepEqual(parseVillagerReading(['2','8','3','0','13']), {
    workers: { food: 2, wood: 8, gold: 3, stone: 0 }, idle: 13, total: 26
  });
  assert.equal(parseVillagerReading(['2','8','3','0','0']).total, 13);
  for (const rows of [['2','8','3','0'], ['2','8','3','0',''], ['2','8','3','0','30/30'], ['100','50','40','0','11']]) {
    assert.equal(parseVillagerReading(rows), null);
  }
});

test('automatic target uses the next step worker sum, independent of distribution and military population', () => {
  const b = defaultData().builds[0];
  b.steps[0].villagers = { food: 6, wood: 0, gold: 0, stone: 0 };
  b.steps[1].villagers = { food: 6, wood: 0, gold: 3, stone: 0 };
  b.steps[1].pop = 30;
  assert.equal(nextWorkerTarget(b, 0), 9);
  assert.equal(parseVillagerReading(['2','2','0','0','5']).total, nextWorkerTarget(b, 0));
  assert.equal(villagerTotal(parseWorkerRows(['4','5','0','0'])), nextWorkerTarget(b, 0));
  b.steps[1].villagers = { food: 2, wood: 4, gold: 0, stone: 0 };
  assert.equal(nextWorkerTarget(b, 0), null, 'equal totals need manual advancement');
  b.steps[1].villagers.food = 0;
  assert.equal(nextWorkerTarget(b, 0), null, 'lower totals must not cascade through steps');
});

test('three stable worker totals required and invalid/missing readings reset confirmation', () => {
  const g = new VillagerTotalGate();
  assert.equal(g.read(19), null); assert.equal(g.read(19), null);
  const pending = g.generation;
  g.reset(); assert.equal(g.isCurrent(pending), false);
  assert.equal(g.read(19), null); assert.equal(g.read(19), null); assert.equal(g.read(19), 19);
  g.read(null); assert.equal(g.read(19), null);
});

test('population calibration is never reused as worker calibration', () => {
  const old = defaultData(); old.settings.ocr = { enabled: true, x:49, y:1138, width:98, height:42 };
  const migrated = normalize(old);
  assert.equal(migrated.settings.ocr.enabled, false);
  assert.equal(migrated.settings.ocr.source, null);
  const calibrated = defaultData(); calibrated.settings.ocr.source = 'workers'; calibrated.settings.ocr.enabled = true;
  assert.equal(normalize(calibrated).settings.ocr.enabled, false, 'idle region is required');
  calibrated.settings.ocr.idleRegion = { x:190, y:1130, width:50, height:50 };
  assert.deepEqual(normalize(calibrated).settings.ocr, calibrated.settings.ocr);
});
