import test from 'node:test';
import assert from 'node:assert/strict';
import { Battle, State, UNIT_STRIDE, PROJECTILE_STRIDE } from '../src/sim/battle';
import { SCENARIOS } from '../src/content/scenarios';
import { SCALE, formationRoster, validateConfig, UNITS } from '../src/content/catalog';
import { WORLD_HALF } from '../src/content/constants';
import {
  terrainHeight,
  terrainSpeed,
  terrainLineClear,
  travelWaypoint,
  blockedWater,
  fordAt,
} from '../src/content/world';
import { createHorseModel, createBallistaModel } from '../src/render/combined-models';
const config = () => structuredClone(SCENARIOS[0].config);
const ticks = (b: Battle, n: number) => {
  for (let i = 0; i < n; i++) b.step();
};

test('five roles conserve 5000 soldiers; engines use complete non-overlapping crew triplets', () => {
  const c = config();
  c.romans.count = c.gauls.count = 2500;
  const b = new Battle(c);
  assert.equal(b.count, 5000);
  assert.equal(b.formations.length, 10);
  const used = new Set<number>();
  for (const e of b.engines) {
    assert.equal(e.crew.length, 3);
    for (const id of e.crew) {
      assert(!used.has(id));
      used.add(id);
      assert.equal(UNITS[b.type[id]].role, 'engineer');
      assert.equal(b.engineId[id], e.id);
    }
  }
  for (const a of [c.romans, c.gauls]) {
    const roster = formationRoster(a);
    assert.equal(
      roster.reduce((n, f) => n + f.count, 0),
      2500,
    );
    assert.equal(roster.find((f) => f.role === 'siege')!.count % 3, 0);
  }
  ticks(b, 10);
  for (let i = 0; i < b.count; i++) {
    assert(Math.abs(b.x[i]) <= WORLD_HALF);
    assert(Math.abs(b.z[i]) <= WORLD_HALF);
  }
  assert.throws(() => validateConfig({ ...c, romans: { ...c.romans, count: 2501 } }));
  assert.throws(() =>
    validateConfig({ ...c, romans: { ...c.romans, cavalry: 70, horseArchers: 70 } }),
  );
});

test('mixed arms checkpoint and replay preserve mounts, crew, projectiles and commands', () => {
  const b = new Battle(config());
  b.issueOrder({ team: 0, group: 2, kind: 'charge' });
  ticks(b, 200);
  const restored = Battle.restore(b.checkpoint());
  assert.equal(restored.hash(), b.hash());
  ticks(b, 80);
  ticks(restored, 80);
  assert.equal(restored.hash(), b.hash());
  const data = new Int32Array(b.snapshotBytes() / 4);
  const used = b.writeSnapshot(data.buffer);
  const engineOffset = 3 + b.count * UNIT_STRIDE + data[2] * PROJECTILE_STRIDE;
  assert.equal(data[engineOffset], b.engines.length);
  assert(used <= data.length);
});

test('mounted archers fire while moving; horses accelerate and unhorsed riders survive', () => {
  const c = config();
  c.terrain = 'meadow';
  const b = new Battle(c);
  const id = Array.from(b.type).findIndex((t) => t === 8),
    enemy = c.romans.count;
  b.x[id] = -20 * SCALE;
  b.z[id] = 0;
  b.x[enemy] = 20 * SCALE;
  b.z[enemy] = 0;
  b.target[id] = enemy;
  const x = b.x[id],
    ammo = b.ammo[id];
  ticks(b, 150);
  assert.notEqual(b.x[id], x);
  assert(b.ammo[id] < ammo, 'mounted archer must release arrows');
  const rider = Array.from(b.type).findIndex((t, i) => t === 6 && b.active(i));
  assert(rider >= 0);
  b.x[rider] = -200 * SCALE;
  b.z[rider] = 200 * SCALE;
  const hp = b.hp[rider];
  (b as unknown as { damageMount(i: number, n: number): void }).damageMount(rider, 999);
  assert.equal(b.mountHp[rider], 0);
  assert.equal(b.hp[rider], hp);
  assert.equal(b.mountDeathTick[rider], b.tick);
  assert.equal(b.pace[rider], 0);
  ticks(b, 1);
  assert(b.active(rider));
});

test('ballista must deploy and have two surviving crew before firing', () => {
  const c = config();
  c.terrain = 'meadow';
  const b = new Battle(c),
    e = b.engines[0];
  b.issueOrder({ team: 0, group: 4, kind: 'hold' });
  b.issueOrder({ team: 1, group: 'all', kind: 'hold' });
  ticks(b, 89);
  assert.equal(e.serial, 0);
  ticks(b, 160);
  assert(e.serial > 0, 'deployed engine fires');
  const serial = e.serial;
  for (const id of e.crew.slice(1)) {
    b.hp[id] = 0;
    b.state[id] = State.Dead;
  }
  ticks(b, 300);
  assert.equal(e.serial, serial, 'one crew cannot fire');
});

test('river routes to a ford; ridges occlude low fire and woods penalize mounted movement', () => {
  assert.equal((WORLD_HALF / SCALE) * 2, 640);
  assert(blockedWater('river-valley', 0, 0));
  const [x, z] = travelWaypoint('river-valley', -40 * SCALE, 0, 40 * SCALE, 0);
  assert(fordAt(z));
  assert(!blockedWater('river-valley', x, z));
  assert(terrainHeight('highlands', -100 * SCALE, 75 * SCALE) > 17 * SCALE);
  assert(
    !terrainLineClear('highlands', -220 * SCALE, 75 * SCALE, 1500, 20 * SCALE, 75 * SCALE, 1500),
  );
  assert(
    terrainSpeed('highlands', -115 * SCALE, -100 * SCALE, true) <
      terrainSpeed('highlands', -115 * SCALE, -100 * SCALE, false),
  );
});

test('mount and engine recipes reproduce finite geometry with appropriate physical bounds', () => {
  for (const build of [() => Object.values(createHorseModel()), () => [createBallistaModel()]]) {
    const a = build(),
      b = build();
    for (let i = 0; i < a.length; i++) {
      const p = a[i].attributes.position;
      assert.deepEqual(p.array, b[i].attributes.position.array);
      assert(Array.from(p.array).every(Number.isFinite));
      a[i].computeBoundingBox();
      assert(a[i].boundingBox!.max.length() < 8);
      a[i].dispose();
      b[i].dispose();
    }
  }
});

test('frontal brace arrests cavalry impact and damages its mount; unbraced troops take the impact', () => {
  const run = (brace: boolean) => {
    const c = config();
    c.terrain = 'meadow';
    const b = new Battle(c),
      rider = Array.from(b.type).findIndex((t) => t === 6),
      target = c.romans.count;
    for (let i = 0; i < b.count; i++) {
      b.x[i] = -200 * SCALE;
      b.z[i] = 200 * SCALE;
      b.state[i] = State.Escaped;
    }
    b.state[rider] = b.state[target] = State.Ready;
    b.x[rider] = 0;
    b.z[rider] = 0;
    b.x[target] = 1600;
    b.z[target] = 0;
    b.facingX[rider] = SCALE;
    b.facingZ[rider] = 0;
    b.facingX[target] = -SCALE;
    b.facingZ[target] = 0;
    b.pace[rider] = 245;
    b.formationOf(target).movement = brace ? 'brace' : 'hold';
    b.formationOf(target).formation = 'line';
    const internal = b as unknown as {
      rebuildGrid(): void;
      cavalryImpacts(): void;
      pending: Int32Array;
    };
    internal.rebuildGrid();
    internal.cavalryImpacts();
    return { mount: b.mountHp[rider], pace: b.pace[rider], damage: internal.pending[target] };
  };
  const braced = run(true),
    open = run(false);
  assert(braced.mount < open.mount);
  assert.equal(braced.pace, 0);
  assert(open.damage > braced.damage);
});

test('remote crew cannot fire an engine; casualty reformation preserves engine crew slots', () => {
  const c = config();
  c.terrain = 'meadow';
  const b = new Battle(c),
    e = b.engines[0];
  b.issueOrder({ team: 0, group: 4, kind: 'hold' });
  b.issueOrder({ team: 1, group: 'all', kind: 'hold' });
  ticks(b, 120);
  e.cooldown = 0;
  e.setup = 90;
  const serial = e.serial;
  for (const id of e.crew) {
    b.x[id] = -250 * SCALE;
    b.z[id] = 250 * SCALE;
  }
  (b as unknown as { advanceEngines(): void }).advanceEngines();
  assert.equal(e.serial, serial);
  const other = b.engines[1],
    slots = other.crew.map((id) => [b.slotX[id], b.slotZ[id]]);
  b.hp[e.crew[1]] = 0;
  b.state[e.crew[1]] = State.Dead;
  (b as unknown as { arrange(i: number, x: number, z: number): void }).arrange(
    e.formation,
    b.formations[e.formation].x,
    b.formations[e.formation].z,
  );
  assert.deepEqual(
    other.crew.map((id) => [b.slotX[id], b.slotZ[id]]),
    slots,
  );
});
