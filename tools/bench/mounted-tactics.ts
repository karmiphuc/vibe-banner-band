import { performance } from 'node:perf_hooks';
import { cpus, platform } from 'node:os';
import { Battle } from '../../src/sim/battle';
import { SCENARIOS } from '../../src/content/scenarios';
import { SIM_VERSION } from '../../src/content/catalog';
const results = [];
for (const count of [300, 1000, 2500]) {
  const config = structuredClone(SCENARIOS[0].config);
  config.romans.count = config.gauls.count = count;
  const b = new Battle(config),
    samples: number[] = [],
    transitions: unknown[] = [];
  for (const f of b.formations)
    if (f.role === 'cavalry' || f.role === 'horse-archer')
      b.issueOrder({
        team: f.team,
        group: f.id,
        kind: 'tactic',
        tactic:
          f.role === 'cavalry'
            ? f.team
              ? 'skein-charge'
              : 'flank-left'
            : f.team
              ? 'feint'
              : 'circle-right',
      });
  const last = new Map<number, string>();
  for (let i = 0; i < 1800 && b.winner === null; i++) {
    const start = performance.now();
    b.step();
    if (i >= 30) samples.push(performance.now() - start);
    b.formations.forEach((f, index) => {
      if (f.tactic && last.get(index) !== f.tactic.phase) {
        last.set(index, f.tactic.phase);
        transitions.push({
          tick: b.tick,
          team: f.team,
          id: f.id,
          phase: f.tactic.phase,
          cycle: f.tactic.cycle,
          x: f.x,
          z: f.z,
        });
      }
    });
  }
  samples.sort((a, b) => a - b);
  const p = (q: number) => +samples[Math.floor((samples.length - 1) * q)].toFixed(3);
  results.push({
    config,
    orders: b.orders,
    ticks: b.tick,
    p50ms: p(0.5),
    p95ms: p(0.95),
    p99ms: p(0.99),
    hash: b.hash(),
    standing: b.stats().map((s) => s.standing),
    transitions,
  });
}
console.log(
  JSON.stringify(
    {
      version: SIM_VERSION,
      runtime: process.version,
      cpu: cpus()[0]?.model,
      platform: platform(),
      note: 'Headless tsx source, single run, 1800 ticks max, 30 tick warmup. Shared cloud CPU. Not renderer FPS or device qualification.',
      results,
    },
    null,
    2,
  ),
);
