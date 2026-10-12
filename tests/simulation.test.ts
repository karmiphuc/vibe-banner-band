import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Battle, CONTENT_HASH, MAX_TICKS, State } from '../src/sim/battle';
import {
  DEFAULT_CONFIG,
  SIM_VERSION,
  SCALE,
  validateConfig,
  type BattleConfig,
} from '../src/content/catalog';
import { isqrt, Random } from '../src/sim/math';
import { validateReplay } from '../src/sim/replay';

const config = (count = 24): BattleConfig => ({
  ...DEFAULT_CONFIG,
  romans: { count, skirmishers: 25, doctrine: 'balanced' },
  gauls: { count, skirmishers: 25, doctrine: 'balanced' },
});
function advance(battle: Battle, count: number): void {
  for (let i = 0; i < count; i++) battle.step();
}

test('integer square root is exact at boundaries and large coordinate distances', () => {
  for (const n of [
    0,
    1,
    2,
    3,
    4,
    15,
    16,
    17,
    65535,
    2 ** 32 - 1,
    2 ** 32,
    2 ** 45,
    Number.MAX_SAFE_INTEGER,
  ]) {
    const r = isqrt(n);
    assert(r * r <= n);
    assert((r + 1) * (r + 1) > n);
  }
  assert.throws(() => isqrt(-1));
  assert.throws(() => isqrt(1.5));
});
test('xorshift32 follows fixed seed-one vectors and handles zero explicitly', () => {
  const rng = new Random(1);
  assert.deepEqual(
    Array.from({ length: 5 }, () => rng.next()),
    [270369, 67634689, 2647435461, 307599695, 2398689233],
  );
  assert.notEqual(new Random(0).next(), 0);
});
test('same battle has identical state across different stepping batch sizes', () => {
  const a = new Battle(config()),
    b = new Battle(config());
  advance(a, 600);
  for (let i = 0; i < 150; i++) advance(b, 4);
  assert.equal(a.hash(), b.hash());
  assert.deepEqual(a.checkpoint(), b.checkpoint());
  const different = new Battle({ ...config(), seed: DEFAULT_CONFIG.seed + 1 });
  advance(different, 600);
  assert.notEqual(a.hash(), different.hash());
});
test('mid-combat checkpoint restores RNG, projectiles, timers and identical continuation', () => {
  const a = new Battle(config(40));
  advance(a, 220);
  const b = Battle.restore(a.checkpoint());
  assert.equal(a.hash(), b.hash());
  advance(a, 600);
  advance(b, 600);
  assert.equal(a.hash(), b.hash());
});
test('battle result conserves every soldier including autonomous commanders', () => {
  const b = new Battle(config());
  advance(b, MAX_TICKS);
  assert.notEqual(b.winner, null);
  for (const army of b.stats())
    assert.equal(army.standing + army.fallen + army.routing + army.escaped, 24);
  assert.equal(b.type[b.leaders[0]], 2);
  assert.equal(b.type[b.leaders[1]], 5);
  for (const hp of b.hp) assert(hp >= 0);
  for (const ammo of b.ammo) assert(ammo >= 0 && ammo <= 7);
});
test('both sides can land lethal attacks in the same tick', () => {
  const b = new Battle(config(2));
  // Isolate two commanders; make their attacks active and mutually lethal.
  b.hp[0] = 0;
  b.state[0] = State.Dead;
  b.hp[2] = 0;
  b.state[2] = State.Dead;
  const a = 1,
    c = 3;
  b.x[a] = -600;
  b.z[a] = 0;
  b.x[c] = 600;
  b.z[c] = 0;
  b.hp[a] = 1;
  b.hp[c] = 1;
  b.state[a] = State.Windup;
  b.state[c] = State.Windup;
  b.timer[a] = 1;
  b.timer[c] = 1;
  b.target[a] = c;
  b.target[c] = a;
  b.step();
  assert.equal(b.hp[a], 0);
  assert.equal(b.hp[c], 0);
  assert.equal(b.winner, -1);
});
test('morale routes ordinary soldiers and a lost commander affects allies once', () => {
  const b = new Battle(config(12));
  b.morale[0] = 0;
  b.hp[b.leaders[0]] = 0;
  b.state[b.leaders[0]] = State.Dead;
  b.step();
  assert.equal(b.state[0], State.Routing);
  assert.equal(b.events.filter((e) => e.text.includes('legate has fallen')).length, 1);
  advance(b, 60);
  assert.equal(b.events.filter((e) => e.text.includes('legate has fallen')).length, 1);
});
test('AI commander skills activate autonomously', () => {
  const b = new Battle(config(40));
  advance(b, 361);
  assert(b.summary().rallies.some((value) => value > 0));
});
test('rocky passage keeps live units outside solid outcrops', () => {
  const b = new Battle({ ...config(80), terrain: 'rocky-pass' });
  for (let tick = 0; tick < 350; tick++) {
    b.step();
    for (let i = 0; i < b.count; i++)
      if (b.active(i))
        for (const o of b.obstacles)
          assert(
            (b.x[i] - o.x) ** 2 + (b.z[i] - o.z) ** 2 >= o.radius ** 2,
            `unit ${i} entered rock at ${tick}`,
          );
  }
});
test('swept javelin hits a unit crossed between endpoints and consumes projectile', () => {
  const b = new Battle(config(2));
  b.x[0] = 0;
  b.z[0] = 0;
  b.x[1] = -10 * SCALE;
  b.z[1] = 0;
  b.x[2] = 3000;
  b.z[2] = 0;
  b.x[3] = 10 * SCALE;
  b.z[3] = 0;
  b.state[2] = State.Windup;
  b.timer[2] = 20;
  b.projectiles = [
    { id: 0, x: 2000, z: 0, vx: 1800, vz: 0, age: 0, team: 0, source: 0, damage: 40 },
  ];
  const hp = b.hp[2];
  b.step();
  assert(b.hp[2] < hp);
  assert.equal(b.projectiles.length, 0);
});
test('configuration and replay imports reject unbounded or incompatible input', () => {
  for (const count of [0, 2501, 2.5, NaN])
    assert.throws(() => validateConfig({ ...config(), romans: { ...config().romans, count } }));
  assert.throws(() => validateConfig({ ...config(), seed: -1 }));
  assert.throws(() => validateConfig({ ...config(), terrain: 'unknown' }));
  const replay = {
    format: 'banner-band-replay',
    version: SIM_VERSION,
    content: CONTENT_HASH,
    config: config(),
    tick: 30,
    expectedHash: '1234abcd',
  };
  assert.equal(validateReplay(replay).tick, 30);
  for (const patch of [
    { version: 'other' },
    { content: 'wrong' },
    { tick: MAX_TICKS + 1 },
    { expectedHash: 'bad' },
  ])
    assert.throws(() => validateReplay({ ...replay, ...patch }));
});
test('upper-capacity fixture advances all 2,000 soldiers without invalid state', () => {
  const b = new Battle(config(1000));
  advance(b, 15);
  assert.equal(b.count, 2000);
  assert.equal(b.tick, 15);
  for (let i = 0; i < b.count; i++) {
    assert(Number.isInteger(b.x[i]));
    assert(Math.abs(b.x[i]) <= 62 * SCALE);
    assert(Number.isInteger(b.z[i]));
  }
});

test('shield support counts only nearby standing heavy allies and disappears when the line breaks', () => {
  const b = new Battle(config(4));
  for (let i = 0; i < b.count; i++) {
    b.x[i] = (i < 4 ? -40 : 40) * SCALE;
    b.z[i] = (i % 4) * 8 * SCALE;
  }
  b.x[0] = -20 * SCALE;
  b.z[0] = 0;
  b.x[1] = -20 * SCALE;
  b.z[1] = 1400;
  b.step();
  assert.equal(b.support[0], 1);
  b.state[1] = State.Routing;
  b.step();
  assert.equal(b.support[0], 0);
});
test('a sustained charge adds bounded impact damage once, then consumes momentum', () => {
  const make = (momentum: number) => {
    const b = new Battle(config(2));
    b.x[0] = -600;
    b.z[0] = 0;
    b.x[2] = 600;
    b.z[2] = 0;
    b.x[1] = -40 * SCALE;
    b.x[3] = 40 * SCALE;
    b.z[1] = b.z[3] = 0;
    b.stamina[2] = 0;
    b.state[2] = State.Windup;
    b.timer[2] = 20;
    b.state[0] = State.Windup;
    b.timer[0] = 1;
    b.target[0] = 2;
    b.momentum[0] = momentum;
    b.step();
    return b;
  };
  const ordinary = make(0),
    charge = make(60);
  assert.equal(ordinary.hp[2] - charge.hp[2], 10);
  assert.equal(charge.momentum[0], 0);
  assert.equal(charge.state[0], State.Recovery);
});
test('disciplined troops preserve deployment files during the unopposed advance', () => {
  const c = config(50);
  c.romans.doctrine = 'shieldwall';
  c.romans.skirmishers = 0;
  c.gauls.skirmishers = 0;
  const b = new Battle(c);
  const initial = Array.from(b.z);
  advance(b, 50);
  for (let i = 0; i < 49; i++) assert(Math.abs(b.z[i] - initial[i]) < 200, `file drift for ${i}`);
});

test('windup commits to its opponent even when another enemy moves closer', () => {
  const b = new Battle(config(3));
  b.x[0] = 0;
  b.z[0] = 0;
  b.x[3] = 1400;
  b.z[3] = 0;
  b.x[4] = 1000;
  b.z[4] = 0;
  b.state[0] = State.Windup;
  b.timer[0] = 7;
  b.target[0] = 3;
  b.step();
  assert.equal(b.target[0], 3);
  assert.equal(b.state[0], State.Windup);
});
