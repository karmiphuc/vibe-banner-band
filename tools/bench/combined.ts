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
    samples: number[] = [];
  for (let i = 0; i < 1500 && b.winner === null; i++) {
    const start = performance.now();
    b.step();
    if (i >= 30) samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  const p = (q: number) => +samples[Math.floor((samples.length - 1) * q)].toFixed(3);
  results.push({
    config,
    ticks: b.tick,
    p50ms: p(0.5),
    p95ms: p(0.95),
    p99ms: p(0.99),
    hash: b.hash(),
    standing: b.stats().map((s) => s.standing),
    engines: b.engines.length,
    boltsFired: b.engines.reduce((n, e) => n + e.serial, 0),
    arrowsRemaining: Array.from(b.ammo).reduce((n, v) => n + v, 0),
    snapshotBytes: b.snapshotBytes(),
  });
}
console.log(
  JSON.stringify(
    {
      version: SIM_VERSION,
      runtime: process.version,
      cpu: cpus()[0]?.model,
      platform: platform(),
      note: 'Headless single run, 1500 ticks max, 30 tick warmup. Shared cloud CPU; no browser FPS or device qualification.',
      results,
    },
    null,
    2,
  ),
);
