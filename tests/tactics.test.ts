import test from 'node:test';
import assert from 'node:assert/strict';
import { Battle } from '../src/sim/battle';
import { SCENARIOS } from '../src/content/scenarios';
import { SCALE } from '../src/content/catalog';
import { skeinSlot } from '../src/sim/formation-math';
import { startTactic, updateTactic, type TacticalStats, type TacticKind } from '../src/sim/tactics';
import type { FormationState } from '../src/sim/orders';
const config = () => {
  const c = structuredClone(SCENARIOS[0].config);
  c.terrain = 'meadow';
  c.romans.count = c.gauls.count = 60;
  return c;
};
const step = (b: Battle, n: number) => {
  for (let i = 0; i < n; i++) b.step();
};
const census = (x: number, z: number): TacticalStats => ({
  x: x * SCALE,
  z: z * SCALE,
  n: 20,
  error: 0,
  ammunition: 100,
  mounted: 20,
  radius: 5 * SCALE,
  nearest: 100 * SCALE,
});
function fixture(kind: TacticKind) {
  const f: FormationState = {
    team: 0,
    id: 0,
    role: kind.startsWith('circle') || kind === 'feint' ? 'horse-archer' : 'cavalry',
    movement: 'hold',
    formation: 'line',
    fireAtWill: true,
    heading: 0,
    files: 5,
    strength: 20,
    route: [],
    x: -100 * SCALE,
    z: 0,
    tactic: startTactic(kind, 0, -100 * SCALE, 0, 0),
  };
  const enemy: FormationState = { ...f, team: 1, x: 0, tactic: undefined };
  const stats = [census(-100, 0), census(0, 0)];
  const advance = (tick: number) => updateTactic(f, 0, [f, enemy], stats, tick);
  return { f, stats, advance };
}
test('skein slots have a single point, widen, cap frontage and never overlap', () => {
  const slots = Array.from({ length: 1000 }, (_, i) => skeinSlot(i, 31, 2800));
  assert.equal(new Set(slots.map((p) => p.join(','))).size, 1000);
  assert.deepEqual(slots.slice(0, 4), [
    [0, 0],
    [2800, -2800],
    [2800, 0],
    [2800, 2800],
  ]);
  assert(slots.every((p) => Math.abs(p[1]) <= 15 * 2800));
});
test('flank commits through the enemy, withdraws, regroups and repeats', () => {
  const { f, stats, advance } = fixture('flank-left');
  advance(12);
  assert.equal(f.tactic!.phase, 'flanking');
  assert(f.z < 0);
  stats[0].x = f.x;
  stats[0].z = f.z;
  advance(24);
  assert.equal(f.tactic!.phase, 'charging');
  assert.equal(f.movement, 'charge');
  const committed = [f.x, f.z];
  stats[1].z = 10 * SCALE;
  advance(36);
  assert.deepEqual([f.x, f.z], committed);
  stats[0].x = f.x;
  stats[0].z = f.z;
  advance(48);
  assert.equal(f.tactic!.phase, 'withdrawing');
  stats[0].x = f.x;
  stats[0].z = f.z;
  advance(60);
  assert.equal(f.tactic!.phase, 'regrouping');
  advance(72);
  assert.equal(f.tactic!.phase, 'flanking');
  assert.equal(f.tactic!.cycle, 1);
});
test('horse archers circle in opposite directions and feint away from pressure', () => {
  const left = fixture('circle-left'),
    right = fixture('circle-right');
  left.advance(12);
  right.advance(12);
  assert.equal(left.f.x, right.f.x);
  assert.equal(left.f.z, -right.f.z);
  const { f, stats, advance } = fixture('feint');
  advance(12);
  assert.equal(f.tactic!.phase, 'approaching');
  stats[0].nearest = 10 * SCALE;
  advance(24);
  assert.equal(f.tactic!.phase, 'evading');
  assert(f.x < stats[0].x);
  stats[0].nearest = 100 * SCALE;
  stats[0].x = f.x;
  stats[0].z = f.z;
  advance(336);
  assert.equal(f.tactic!.phase, 'approaching');
  assert.equal(f.tactic!.cycle, 1);
  stats[0].ammunition = 0;
  advance(348);
  assert.equal(f.tactic!.phase, 'spent');
  assert.equal(f.movement, 'hold');
});
test('tactics reject incompatible mixed orders atomically and manual placement cancels', () => {
  const b = new Battle(config()),
    hash = b.hash();
  assert.throws(() =>
    b.issueOrder({ team: 0, group: 'all', kind: 'tactic', tactic: 'skein-charge' }),
  );
  assert.equal(b.hash(), hash);
  const cavalry = b.formations.find((f) => f.team === 0 && f.role === 'cavalry')!;
  b.issueOrder({ team: 0, group: cavalry.id, kind: 'tactic', tactic: 'skein-charge' });
  assert.equal(cavalry.formation, 'skein');
  b.issueOrder({ team: 0, group: cavalry.id, kind: 'hold', x: -90 * SCALE, z: 0 });
  assert.equal(cavalry.tactic, undefined);
});
test('active formation tactics survive independent checkpoint continuation and order replay', () => {
  const c = config(),
    b = new Battle(c);
  for (const f of b.formations)
    if (f.role === 'cavalry' || f.role === 'horse-archer')
      b.issueOrder({
        team: f.team,
        group: f.id,
        kind: 'tactic',
        tactic: f.role === 'cavalry' ? 'flank-left' : 'circle-right',
      });
  step(b, 360);
  const checkpoint = b.checkpoint(),
    restored = Battle.restore(checkpoint);
  assert.equal(b.hash(), restored.hash());
  const saved = JSON.stringify(checkpoint.formations);
  step(b, 360);
  assert.equal(JSON.stringify(checkpoint.formations), saved);
  step(restored, 360);
  assert.equal(b.hash(), restored.hash());
  const replay = new Battle(c);
  for (const o of b.orders) replay.issueOrder(o.order);
  step(replay, 720);
  assert.equal(b.hash(), replay.hash());
  assert(b.formations.some((f) => f.tactic && f.tactic.phase !== 'forming'));
});

test('loss of mounts and disappearance of all enemies stop the controller safely', () => {
  const dismounted = fixture('skein-charge');
  dismounted.advance(12);
  dismounted.stats[0].mounted = 9;
  dismounted.advance(24);
  assert.equal(dismounted.f.tactic!.phase, 'spent');
  assert.equal(dismounted.f.x, dismounted.stats[0].x);
  const empty = fixture('circle-right');
  empty.advance(12);
  empty.stats[1].n = 0;
  empty.advance(24);
  assert.equal(empty.f.tactic!.phase, 'spent');
  assert.equal(empty.f.tactic!.target, -1);
});
