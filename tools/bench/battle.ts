import { performance } from 'node:perf_hooks';
import { cpus, platform, arch } from 'node:os';
import { Battle } from '../../src/sim/battle';
import { DEFAULT_CONFIG } from '../../src/content/catalog';

const results = [];
for (const count of [100, 500, 1000]) {
  const b = new Battle({
    ...DEFAULT_CONFIG,
    romans: { ...DEFAULT_CONFIG.romans, count },
    gauls: { ...DEFAULT_CONFIG.gauls, count },
  });
  const samples: number[] = [];
  for (let i = 0; i < 600 && b.winner === null; i++) {
    const start = performance.now();
    b.step();
    const elapsed = performance.now() - start;
    if (i >= 30) samples.push(elapsed);
  }
  samples.sort((a, b) => a - b);
  const p = (q: number) =>
    Number(samples[Math.min(samples.length - 1, Math.floor(samples.length * q))].toFixed(3));
  results.push({
    perSide: count,
    ticks: b.tick,
    p50ms: p(0.5),
    p95ms: p(0.95),
    p99ms: p(0.99),
    hash: b.hash(),
    standing: b.stats().map((x) => x.standing),
    note: 'Headless simulation only, one run, 30-tick warm-up. Not a browser/rendering or real-device qualification.',
  });
}
console.log(
  JSON.stringify(
    {
      runtime: process.version,
      platform: platform(),
      arch: arch(),
      cpu: cpus()[0]?.model,
      seed: DEFAULT_CONFIG.seed,
      terrain: DEFAULT_CONFIG.terrain,
      results,
    },
    null,
    2,
  ),
);
