import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Battle, State, CONTENT_HASH } from '../src/sim/battle';
import { DEFAULT_CONFIG, SCALE, SIM_VERSION } from '../src/content/catalog';
import { validateOrder, validateOrderLog } from '../src/sim/orders';
import { validateReplay } from '../src/sim/replay';
import { turnToward, inFront } from '../src/sim/combat-math';
const config = {
  ...DEFAULT_CONFIG,
  romans: { count: 24, skirmishers: 30, doctrine: 'shieldwall' as const },
  gauls: { count: 24, skirmishers: 30, doctrine: 'charge' as const },
};
const step = (b: Battle, n: number) => {
  for (let i = 0; i < n; i++) b.step();
};
test('recorded commands reproduce a boundary-exact state, including commands at the replay endpoint', () => {
  const a = new Battle(config);
  a.issueOrder({ team: 0, group: 'all', kind: 'hold' });
  a.issueOrder({ team: 1, group: 1, kind: 'fire', enabled: false });
  step(a, 40);
  a.issueOrder({ team: 0, group: 0, kind: 'formation', formation: 'loose' });
  step(a, 80);
  a.issueOrder({ team: 0, group: 0, kind: 'charge' });
  a.issueOrder({ team: 1, group: 1, kind: 'fire', enabled: true });
  const replay = validateReplay({
    format: 'banner-band-replay',
    version: SIM_VERSION,
    content: CONTENT_HASH,
    config,
    tick: a.tick,
    expectedHash: a.hash(),
    orders: a.orders,
  });
  const b = new Battle(replay.config);
  let index = 0;
  while (true) {
    while (index < replay.orders!.length && replay.orders![index].tick === b.tick)
      b.issueOrder(replay.orders![index++].order);
    if (b.tick === replay.tick) break;
    b.step();
  }
  assert.equal(b.hash(), a.hash());
  const restored = Battle.restore(a.checkpoint());
  step(a, 120);
  step(restored, 120);
  assert.equal(a.hash(), restored.hash());
});
test('hold anchors a formation while an unopposed advance crosses its starting line', () => {
  const a = new Battle(config),
    b = new Battle(config);
  for (const army of [a, b])
    army.issueOrder({ team: 1, group: 'all', kind: 'hold', x: 35 * SCALE, z: 0 });
  a.issueOrder({ team: 0, group: 'all', kind: 'hold', x: -30 * SCALE, z: 0 });
  const anchor = a.formations[0].x;
  step(a, 220);
  step(b, 220);
  const mean = (v: Battle) => Array.from(v.x.slice(0, 16)).reduce((a, b) => a + b, 0) / 16;
  assert(mean(b) - mean(a) > 10 * SCALE);
  assert(Math.abs(mean(a) - anchor) < 4 * SCALE);
});
test('hold fire cancels an unreleased missile and preserves ammunition', () => {
  const b = new Battle(config);
  const id = Array.from(b.type).findIndex((t) => t === 1);
  b.state[id] = State.Windup;
  b.timer[id] = 1;
  b.target[id] = 24;
  const ammo = b.ammo[id];
  b.issueOrder({ team: 0, group: 1, kind: 'fire', enabled: false });
  step(b, 30);
  assert.equal(b.ammo[id], ammo);
  assert.equal(b.projectiles.filter((p) => p.source === id).length, 0);
  assert.equal(b.formations[1].fireAtWill, false);
});
test('malformed command logs, future commands, positions and overflow fail before mutation', () => {
  const b = new Battle(config),
    hash = b.hash();
  for (const input of [
    { team: 8, group: 'all', kind: 'hold' },
    { team: 0, group: 'all', kind: 'hold', x: Infinity, z: 0 },
    { team: 0, group: 'all', kind: 'charge', x: 0, z: 0 },
  ])
    assert.throws(() => b.issueOrder(input));
  assert.equal(b.hash(), hash);
  assert.throws(() =>
    validateOrderLog(
      [{ tick: 11, sequence: 1, order: { team: 0, group: 'all', kind: 'hold' } }],
      10,
    ),
  );
  assert.throws(() =>
    validateOrderLog(
      [{ tick: 0, sequence: 2, order: { team: 0, group: 'all', kind: 'hold' } }],
      10,
    ),
  );
  assert.throws(() => validateOrder({ team: 0, group: 1, kind: 'fire', enabled: 'false' }));
  for (let i = 0; i < 256; i++) b.issueOrder({ team: 0, group: 'all', kind: 'hold' });
  const full = b.hash();
  assert.throws(() => b.issueOrder({ team: 0, group: 'all', kind: 'charge' }));
  assert.equal(b.hash(), full);
});
test('an exact reversal turns gradually, and the shield cone excludes flanks and rear', () => {
  let [x, z] = turnToward(SCALE, 0, -SCALE, 0);
  assert(x > 0 && z > 0);
  for (let i = 0; i < 20; i++) [x, z] = turnToward(x, z, -SCALE, 0);
  assert(x < -1000);
  assert(Math.abs(z) < 20);
  assert(inFront(SCALE, 0, 1000, 0));
  assert(!inFront(SCALE, 0, 0, 1000));
  assert(!inFront(SCALE, 0, -1000, 0));
});
test('a staggered unit cannot move or release its committed attack', () => {
  const b = new Battle(config);
  b.state[0] = State.Windup;
  b.timer[0] = 1;
  b.stagger[0] = 7;
  b.target[0] = 24;
  const x = b.x[0];
  b.step();
  assert.equal(b.actionSerial[0], 0);
  assert.equal(b.hits[0], 0);
  assert.equal(b.x[0], x);
  assert.equal(b.stagger[0], 6);
});
test('shield destruction is permanent and recorded once', () => {
  // A seed search exercises a genuine block without relying on a private hit API.
  let broken: Battle | undefined;
  for (let seed = 1; seed <= 40; seed++) {
    const b = new Battle({ ...config, seed });
    b.x[0] = 0;
    b.z[0] = 0;
    b.x[24] = 1300;
    b.z[24] = 0;
    b.facingX[0] = SCALE;
    b.facingZ[0] = 0;
    b.facingX[24] = -SCALE;
    b.facingZ[24] = 0;
    b.shieldHp[0] = 1;
    b.state[24] = State.Windup;
    b.timer[24] = 1;
    b.target[24] = 0;
    b.step();
    if (b.shieldHp[0] === 0) {
      broken = b;
      break;
    }
  }
  assert(broken);
  assert(broken.stagger[0] >= 10);
  const events = broken.events.filter((e) => e.text.includes('#1: shield broken')).length;
  assert.equal(events, 1);
  step(broken, 10);
  assert.equal(broken.shieldHp[0], 0);
  assert.equal(broken.events.filter((e) => e.text.includes('#1: shield broken')).length, 1);
});

test('large loose formations fit their complete footprint inside the battle bounds', () => {
  const b = new Battle({
    ...config,
    romans: { count: 1000, skirmishers: 20, doctrine: 'balanced' },
  });
  b.issueOrder({ team: 0, group: 'all', kind: 'formation', formation: 'loose' });
  b.issueOrder({ team: 0, group: 'all', kind: 'hold', x: 50 * SCALE, z: 50 * SCALE });
  for (let i = 0; i < 1000; i++) {
    const f = b.formationOf(i);
    assert(Math.abs(f.x + b.slotX[i]) <= 62 * SCALE - 430);
    assert(Math.abs(f.z + b.slotZ[i]) <= 62 * SCALE - 430);
  }
});
test('fire discipline does not erase an infantry charge', () => {
  const b = new Battle(config);
  b.momentum[0] = 55;
  b.issueOrder({ team: 0, group: 'all', kind: 'fire', enabled: false });
  assert.equal(b.momentum[0], 55);
});

test('five formations conserve troops, isolate same-role orders and retain membership after restore', () => {
  const layout = [
    { id: 0, role: 'infantry' as const, weight: 2 },
    { id: 1, role: 'ranged' as const, weight: 1 },
    { id: 2, role: 'infantry' as const, weight: 1 },
    { id: 3, role: 'ranged' as const, weight: 3 },
    { id: 4, role: 'infantry' as const, weight: 1 },
  ];
  const b = new Battle({ ...config, romans: { ...config.romans, count: 101, formations: layout } });
  const counts = layout.map(
    (f) =>
      Array.from(b.formationId).filter((_, id) => b.team(id) === 0 && b.formationOf(id).id === f.id)
        .length,
  );
  assert.deepEqual(counts, [36, 8, 18, 22, 17]);
  assert.equal(b.formationOf(b.leaders[0]).id, 0);
  const unchanged = b.formations.filter((f) => f.team !== 0 || f.id !== 4).map((f) => ({ ...f }));
  b.issueOrder({ team: 0, group: 4, kind: 'hold' });
  assert.deepEqual(
    b.formations.filter((f) => f.team !== 0 || f.id !== 4),
    unchanged,
  );
  b.issueOrder({ team: 0, group: 3, kind: 'fire', enabled: false });
  assert.equal(b.formations.find((f) => f.team === 0 && f.id === 1)!.fireAtWill, true);
  step(b, 40);
  const restored = Battle.restore(b.checkpoint());
  assert.deepEqual(restored.formationId, b.formationId);
  step(b, 60);
  step(restored, 60);
  assert.equal(b.hash(), restored.hash());
});

test('formation IDs are canonical, bounded and independent of roles; missing target fails atomically', () => {
  const base = {
    ...config.romans,
    formations: [
      { id: 4, role: 'infantry' as const, weight: 1 },
      { id: 2, role: 'ranged' as const, weight: 1 },
    ],
  };
  const a = new Battle({ ...config, romans: base });
  const b = new Battle({
    ...config,
    romans: { ...base, formations: [...base.formations].reverse() },
  });
  assert.equal(a.hash(), b.hash());
  const hash = a.hash();
  assert.throws(() => a.issueOrder({ team: 0, group: 0, kind: 'charge' }), /not deployed/);
  assert.equal(a.hash(), hash);
  for (const formations of [
    [],
    [...base.formations, base.formations[0]],
    [{ id: 5, role: 'infantry', weight: 1 }],
    [{ id: 0, role: 'cavalry', weight: 1 }],
    [{ id: 0, role: 'infantry', weight: 0 }],
  ]) {
    assert.throws(
      () =>
        new Battle({
          ...config,
          romans: { ...base, formations: formations as typeof base.formations },
        }),
    );
  }
});

test('whole-army placement translates separate formation anchors without collapsing them', () => {
  const b = new Battle(config);
  const before = b.formations.filter((f) => f.team === 0).map((f) => ({ ...f }));
  b.issueOrder({ team: 0, group: 'all', kind: 'hold', x: -20 * SCALE, z: 0 });
  const after = b.formations.filter((f) => f.team === 0);
  assert.equal(after[1].x - after[0].x, before[1].x - before[0].x);
  assert.equal(after[1].z - after[0].z, before[1].z - before[0].z);
});
