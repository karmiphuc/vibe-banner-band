import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Battle, State } from '../src/sim/battle';
import { DEFAULT_CONFIG, SCALE } from '../src/content/catalog';
import { SCENARIOS } from '../src/content/scenarios';
const step = (b: Battle, n: number) => {
  for (let i = 0; i < n; i++) b.step();
};
const fixture = () =>
  new Battle({
    ...DEFAULT_CONFIG,
    romans: { count: 40, skirmishers: 0, doctrine: 'shieldwall' },
    gauls: { count: 40, skirmishers: 0, doctrine: 'shieldwall' },
  });

test('advance translates ranks coherently and opposed disciplined lines actually engage', () => {
  const b = fixture(),
    f = b.formations[0],
    start = f.x;
  step(b, 120);
  assert(f.x > start + 3 * SCALE);
  for (let i = 0; i < 40; i++) assert(Math.abs(b.x[i] - f.x - b.slotX[i]) < SCALE);
  step(b, 1000);
  assert(
    b.stats().some((s) => s.damage > 0),
    'opposing advance orders must not stop outside weapon range',
  );
});
test('lost cohesion stops the formation anchor while scattered members recover', () => {
  const b = fixture(),
    f = b.formations[0];
  for (let i = 0; i < 30; i++) b.x[i] -= 15 * SCALE;
  const start = f.x;
  step(b, 30);
  assert.equal(f.x, start);
  assert(b.summary().formations[0].cohesion < 70);
});
test('front-rank vacancies are refilled at the deterministic reformation boundary', () => {
  const b = fixture(),
    x = b.slotX[0],
    z = b.slotZ[0];
  b.hp[0] = 0;
  b.state[0] = State.Dead;
  b.issueOrder({ team: 0, group: 0, kind: 'hold' });
  assert.equal(b.slotZ[1], z);
  assert.equal(b.slotX[1], x);
  assert.equal(b.formations[0].strength, 39);
});
test('facing rotates ranks and fallback withdraws relative to that facing', () => {
  const b = fixture();
  b.issueOrder({ team: 0, group: 0, kind: 'frontage', files: 8 });
  const x = b.slotX[1],
    z = b.slotZ[1];
  b.issueOrder({ team: 0, group: 0, kind: 'face', heading: 2 });
  assert.equal(b.slotX[1], -z);
  assert.equal(b.slotZ[1], x);
  b.issueOrder({ team: 0, group: 0, kind: 'hold' });
  const f = b.formations[0],
    oldX = f.x,
    oldZ = f.z;
  b.issueOrder({ team: 0, group: 0, kind: 'fallback' });
  assert.equal(f.x, oldX);
  assert.equal(f.z, oldZ - 8 * SCALE);
});
test('reserve flanks in two legs, commits its charge, and reproduces checkpoint continuation', () => {
  const b = new Battle(SCENARIOS.find((s) => s.id === 'hammer')!.config),
    f = b.formations.find((f) => f.team === 0 && f.id === 2)!;
  assert.equal(f.movement, 'hold');
  assert(f.x < b.formations[0].x);
  b.issueOrder({ team: 0, group: 0, kind: 'hold' });
  b.issueOrder({ team: 0, group: 2, kind: 'flank-left' });
  assert.equal(f.route.length, 1);
  assert(f.z < -5 * SCALE);
  const hash = b.hash();
  const summary = b.summary();
  summary.formations[2].route[0].x = 0;
  assert.equal(b.hash(), hash, 'snapshot route must not alias authority');
  step(b, 150);
  const restored = Battle.restore(b.checkpoint());
  step(b, 600);
  step(restored, 600);
  assert.equal(f.movement, 'charge');
  assert.equal(f.route.length, 0);
  assert.equal(b.hash(), restored.hash());
  assert(b.events.some((e) => e.text.includes('completes its flank')));
});
test('frontage limits keep 2,000-unit formations within the arena at diagonal headings', () => {
  const b = new Battle({
    ...DEFAULT_CONFIG,
    romans: { ...DEFAULT_CONFIG.romans, count: 1000 },
    gauls: { ...DEFAULT_CONFIG.gauls, count: 1000 },
  });
  for (const group of [0, 1]) {
    b.issueOrder({ team: 0, group, kind: 'frontage', files: 2 });
    b.issueOrder({ team: 0, group, kind: 'face', heading: 1 });
  }
  for (let i = 0; i < 1000; i++) {
    const f = b.formationOf(i);
    assert(Math.abs(f.x + b.slotX[i]) <= 320 * SCALE);
    assert(Math.abs(f.z + b.slotZ[i]) <= 320 * SCALE);
  }
});

test('a committed melee strike cannot pass through a standing soldier', () => {
  const setup = (blocked: boolean) => {
    const b = new Battle({
      ...DEFAULT_CONFIG,
      romans: { count: 2, skirmishers: 0, doctrine: 'balanced' },
      gauls: { count: 2, skirmishers: 0, doctrine: 'balanced' },
    });
    b.x.set([0, 900, 1800, 12000]);
    b.z.set([0, blocked ? 0 : 4000, 0, 12000]);
    b.state.fill(State.Windup);
    b.timer.fill(30);
    b.timer[0] = 1;
    b.target.fill(-1);
    b.target[0] = 2;
    b.facingX[0] = SCALE;
    b.facingZ[0] = 0;
    b.shieldHp[2] = 0;
    b.buff.fill(0);
    const hp = b.hp[2];
    b.step();
    return hp - b.hp[2];
  };
  assert.equal(setup(true), 0);
  assert(setup(false) > 0);
});

test('an advancing ranged formation closes for melee once its ammunition is exhausted', () => {
  const b = new Battle({
    ...DEFAULT_CONFIG,
    romans: { count: 6, skirmishers: 80, doctrine: 'balanced' },
    gauls: { count: 6, skirmishers: 80, doctrine: 'balanced' },
  });
  b.ammo.fill(0);
  step(b, 1100);
  assert(
    Array.from(b.type).some((type, id) => (type === 1 || type === 4) && b.actionSerial[id] > 0),
    'empty quivers must not leave the formation parked at throwing range',
  );
});
