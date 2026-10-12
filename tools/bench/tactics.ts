import { Battle } from '../../src/sim/battle';
import { SIM_VERSION } from '../../src/content/catalog';
import { SCENARIOS } from '../../src/content/scenarios';
const config = SCENARIOS.find((s) => s.id === 'hammer')!.config;
const results = [];
for (const tactic of ['reserve', 'charge', 'flank-left'] as const) {
  const b = new Battle(config);
  b.issueOrder({ team: 0, group: 0, kind: 'hold' });
  if (tactic !== 'reserve') b.issueOrder({ team: 0, group: 2, kind: tactic });
  const samples = [];
  let committedAt: number | null = null;
  for (let i = 0; i < 2400 && b.winner === null; i++) {
    b.step();
    const reserve = b.formations.find((f) => f.team === 0 && f.id === 2)!;
    if (reserve.movement === 'charge' && committedAt === null) committedAt = b.tick;
    if (b.tick % 300 === 0)
      samples.push({
        tick: b.tick,
        armies: b.stats(),
        reserveMovement: reserve.movement,
        remainingWaypoints: reserve.route.length,
      });
  }
  results.push({
    tactic,
    orders: b.orders,
    committedAt,
    tick: b.tick,
    winner: b.winner,
    armies: b.stats(),
    hash: b.hash(),
    samples,
  });
}
console.log(
  JSON.stringify(
    {
      version: SIM_VERSION,
      config,
      description:
        'One seeded behavioral comparison, not balance proof or a performance measurement. Identical initial armies; only reserve orders differ.',
      results,
    },
    null,
    2,
  ),
);
