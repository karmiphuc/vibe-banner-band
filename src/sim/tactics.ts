import { SCALE, ORDER_LIMIT, type FormationRole } from '../content/catalog';
import type { FormationState } from './orders';
import { HEADINGS } from './formation-math';
import { clamp, distance2, normalize } from './math';

export const TACTICS = [
  'none',
  'flank-left',
  'flank-right',
  'skein-charge',
  'circle-left',
  'circle-right',
  'feint',
] as const;
export type TacticKind = (typeof TACTICS)[number];
export type TacticPhase =
  | 'forming'
  | 'flanking'
  | 'charging'
  | 'withdrawing'
  | 'regrouping'
  | 'circling'
  | 'approaching'
  | 'evading'
  | 'spent';
/** Every field is authoritative, checkpointed and hashed. No wall-clock decisions. */
export interface TacticState {
  kind: TacticKind;
  phase: TacticPhase;
  since: number;
  target: number;
  side: number;
  cycle: number;
  orbit: number;
  goalX: number;
  goalZ: number;
  runX: number;
  runZ: number;
}
export interface TacticalStats {
  n: number;
  x: number;
  z: number;
  error: number;
  ammunition: number;
  mounted: number;
  radius: number;
  nearest: number;
}
export function supportsTactic(kind: TacticKind, role: FormationRole): boolean {
  return (
    kind === 'none' ||
    (kind.startsWith('circle') || kind === 'feint' ? role === 'horse-archer' : role === 'cavalry')
  );
}
export function startTactic(
  kind: TacticKind,
  tick: number,
  x: number,
  z: number,
  id: number,
): TacticState {
  return {
    kind,
    phase: 'forming',
    since: tick,
    target: -1,
    side: kind.endsWith('left') ? -1 : kind.endsWith('right') ? 1 : id % 2 ? -1 : 1,
    cycle: 0,
    orbit: 0,
    goalX: x,
    goalZ: z,
    runX: 0,
    runZ: 0,
  };
}
function heading(dx: number, dz: number): number {
  let best = -Infinity,
    result = 0;
  HEADINGS.forEach(([x, z], i) => {
    const dot = x * dx + z * dz;
    if (dot > best) {
      best = dot;
      result = i;
    }
  });
  return result;
}
/** Called on a fixed 12-tick cadence. O(formations), using the existing actor census. */
export function updateTactic(
  f: FormationState,
  index: number,
  formations: FormationState[],
  stats: TacticalStats[],
  tick: number,
): void {
  const t = f.tactic!,
    own = stats[index];
  if (!own.n || t.phase === 'spent') return;
  const setGoal = (x: number, z: number) => {
    t.goalX = clamp(Math.trunc(x), -ORDER_LIMIT, ORDER_LIMIT);
    t.goalZ = clamp(Math.trunc(z), -ORDER_LIMIT, ORDER_LIMIT);
    f.x = t.goalX;
    f.z = t.goalZ;
  };
  const phase = (value: TacticPhase) => {
    t.phase = value;
    t.since = tick;
  };
  const spent = () => {
    phase('spent');
    f.movement = 'hold';
    setGoal(own.x, own.z);
  };
  if (own.mounted * 2 < own.n || (f.role === 'horse-archer' && !own.ammunition)) {
    spent();
    return;
  }
  if (t.target < 0 || !stats[t.target]?.n || formations[t.target].team === f.team) {
    let best = Infinity;
    t.target = -1;
    stats.forEach((other, j) => {
      if (!other.n || formations[j].team === f.team) return;
      const d = distance2(own.x, own.z, other.x, other.z);
      if (d < best) {
        best = d;
        t.target = j;
      }
    });
    if (t.target < 0) {
      spent();
      return;
    }
    phase('forming');
    f.movement = 'hold';
    setGoal(own.x, own.z);
  }
  const enemy = stats[t.target];
  const elapsed = tick - t.since;
  const arrived = distance2(own.x, own.z, f.x, f.z) < (6 * SCALE) ** 2;
  const ready = own.error < own.n * 3 * SCALE;
  const [dx, dz] = normalize(enemy.x - own.x, enemy.z - own.z, SCALE);
  const clearance = Math.min(130 * SCALE, 25 * SCALE + own.radius + enemy.radius);
  const cavalry = f.role === 'cavalry';
  if (t.phase === 'forming' || t.phase === 'regrouping') {
    if (!ready && elapsed < 240) return;
    if (cavalry) {
      if (t.kind === 'skein-charge') {
        phase('charging');
        t.runX = dx;
        t.runZ = dz;
        f.heading = heading(dx, dz);
        f.movement = 'charge';
        setGoal(enemy.x + dx * 32, enemy.z + dz * 32);
      } else {
        phase('flanking');
        f.movement = 'hold';
        setGoal(
          enemy.x - Math.trunc((dz * t.side * clearance) / SCALE) - dx * 20,
          enemy.z + Math.trunc((dx * t.side * clearance) / SCALE) - dz * 20,
        );
        f.heading = heading(f.x - own.x, f.z - own.z);
      }
    } else {
      t.orbit = heading(own.x - enemy.x, own.z - enemy.z);
      phase(t.kind === 'feint' ? 'approaching' : 'circling');
      f.movement = 'skirmish';
    }
  } else if (t.phase === 'flanking') {
    if (arrived || elapsed >= 600) {
      // Re-aim once at commitment; the charge destination is then fixed through the target.
      phase('charging');
      t.runX = dx;
      t.runZ = dz;
      f.heading = heading(dx, dz);
      f.movement = 'charge';
      setGoal(enemy.x + dx * 32, enemy.z + dz * 32);
    }
  } else if (t.phase === 'charging') {
    if (arrived || elapsed >= 480) {
      phase('withdrawing');
      f.movement = 'hold';
      setGoal(own.x + t.runX * 38, own.z + t.runZ * 38);
    }
  } else if (t.phase === 'withdrawing') {
    if (arrived || elapsed >= 300) {
      t.cycle++;
      phase('regrouping');
      f.movement = 'hold';
      setGoal(own.x, own.z);
    }
  } else if (t.phase === 'evading') {
    if ((arrived && elapsed >= 60) || elapsed >= 300) {
      t.cycle++;
      phase(t.kind === 'feint' ? 'approaching' : 'circling');
      t.orbit = heading(own.x - enemy.x, own.z - enemy.z);
    }
  }
  if (t.phase === 'circling' || t.phase === 'approaching') {
    // Near-threat checks use individual target distances, not only enemy centroids.
    if (
      own.nearest < 18 * SCALE ||
      (t.phase === 'approaching' &&
        (distance2(own.x, own.z, enemy.x, enemy.z) < (30 * SCALE + enemy.radius) ** 2 ||
          tick - t.since >= 240))
    ) {
      phase('evading');
      setGoal(own.x - dx * 55 - dz * t.side * 16, own.z - dz * 55 + dx * t.side * 16);
    } else if (t.phase === 'circling') {
      if (arrived || elapsed >= 180) {
        t.orbit = (t.orbit + t.side + 8) % 8;
        t.since = tick;
        t.cycle++;
      }
      const [ox, oz] = HEADINGS[t.orbit];
      const radius = Math.min(160 * SCALE, 42 * SCALE + enemy.radius + Math.trunc(own.radius / 2));
      setGoal(
        enemy.x + Math.trunc((ox * radius) / SCALE),
        enemy.z + Math.trunc((oz * radius) / SCALE),
      );
    } else {
      setGoal(enemy.x - dx * 27, enemy.z - dz * 27);
    }
    // Keep the group's ranks tangent to its course; horse turning remains rate limited.
    f.heading = heading(f.x - own.x, f.z - own.z);
  }
  // A halted fire order suppresses shooting but does not discard the maneuver.
}
