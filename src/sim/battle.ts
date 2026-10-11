import {
  CONTENT_VERSION,
  SIM_VERSION,
  SCALE,
  TICK_RATE,
  UNITS,
  obstaclesFor,
  validateConfig,
  type BattleConfig,
  type Team,
} from '../content/catalog';
import { clamp, distance2, hashText, hashWords, isqrt, normalize, Random } from './math';
import { SpatialGrid } from './grid';

export const enum State {
  Ready,
  Windup,
  Recovery,
  Routing,
  Dead,
  Escaped,
}
export const STATE_NAMES = ['Ready', 'Attacking', 'Recovering', 'Routing', 'Fallen', 'Escaped'];
export const UNIT_STRIDE = 17;
export const PROJECTILE_STRIDE = 7;
export const MAX_PROJECTILES = 2048;
export const MAX_TICKS = TICK_RATE * 180;
const RADIUS = 430;
const LIMIT = 62 * SCALE;
const FIELDS = [
  'x',
  'z',
  'hp',
  'morale',
  'stamina',
  'state',
  'timer',
  'target',
  'facingX',
  'facingZ',
  'type',
  'ammo',
  'buff',
  'homeZ',
  'hits',
  'kills',
  'actionSerial',
  'momentum',
  'support',
  'blocks',
] as const;
type Field = (typeof FIELDS)[number];
export interface BattleEvent {
  tick: number;
  text: string;
  team: Team | -1;
}
export interface Projectile {
  id: number;
  x: number;
  z: number;
  vx: number;
  vz: number;
  age: number;
  team: Team;
  source: number;
  damage: number;
}
export interface ArmyStats {
  standing: number;
  fallen: number;
  routing: number;
  escaped: number;
  morale: number;
  commanderAlive: boolean;
  damage: number;
}
export interface BattleSummary {
  tick: number;
  hash: string;
  winner: Team | -1 | null;
  romans: ArmyStats;
  gauls: ArmyStats;
  projectiles: number;
  candidates: number;
  maxCell: number;
  rallies: [number, number];
  events: BattleEvent[];
}
export interface Checkpoint {
  version: string;
  content: string;
  config: BattleConfig;
  tick: number;
  rng: number;
  projectileId: number;
  arrays: Record<Field, number[]>;
  projectiles: Projectile[];
  damage: [number, number];
  rallies: [number, number];
  commanderLost: [boolean, boolean];
  winner: Team | -1 | null;
  events: BattleEvent[];
}
export const CONTENT_HASH = hashText(JSON.stringify({ version: CONTENT_VERSION, units: UNITS }));

export class Battle {
  readonly config: BattleConfig;
  readonly count: number;
  readonly x: Int32Array;
  readonly z: Int32Array;
  readonly hp: Int32Array;
  readonly morale: Int32Array;
  readonly stamina: Int32Array;
  readonly state: Int32Array;
  readonly timer: Int32Array;
  readonly target: Int32Array;
  readonly facingX: Int32Array;
  readonly facingZ: Int32Array;
  readonly type: Int32Array;
  readonly ammo: Int32Array;
  readonly buff: Int32Array;
  readonly homeZ: Int32Array;
  readonly hits: Int32Array;
  readonly kills: Int32Array;
  readonly actionSerial: Int32Array;
  readonly momentum: Int32Array;
  readonly support: Int32Array;
  readonly blocks: Int32Array;
  tick = 0;
  winner: Team | -1 | null = null;
  projectiles: Projectile[] = [];
  events: BattleEvent[] = [];
  readonly leaders: [number, number];
  readonly grid = new SpatialGrid();
  readonly obstacles;
  private rng: Random;
  private projectileId = 0;
  private pending: Int32Array;
  private credit: Int32Array;
  private startX: Int32Array;
  private startZ: Int32Array;
  private damage: [number, number] = [0, 0];
  private rallies: [number, number] = [0, 0];
  private commanderLost: [boolean, boolean] = [false, false];
  candidates = 0;

  constructor(config: BattleConfig) {
    this.config = validateConfig(config);
    this.count = config.romans.count + config.gauls.count;
    this.x = new Int32Array(this.count);
    this.z = new Int32Array(this.count);
    this.hp = new Int32Array(this.count);
    this.morale = new Int32Array(this.count);
    this.stamina = new Int32Array(this.count);
    this.state = new Int32Array(this.count);
    this.timer = new Int32Array(this.count);
    this.target = new Int32Array(this.count);
    this.facingX = new Int32Array(this.count);
    this.facingZ = new Int32Array(this.count);
    this.type = new Int32Array(this.count);
    this.ammo = new Int32Array(this.count);
    this.buff = new Int32Array(this.count);
    this.homeZ = new Int32Array(this.count);
    this.hits = new Int32Array(this.count);
    this.kills = new Int32Array(this.count);
    this.actionSerial = new Int32Array(this.count);
    this.momentum = new Int32Array(this.count);
    this.support = new Int32Array(this.count);
    this.blocks = new Int32Array(this.count);
    this.pending = new Int32Array(this.count);
    this.credit = new Int32Array(this.count);
    this.startX = new Int32Array(this.count);
    this.startZ = new Int32Array(this.count);
    this.rng = new Random(config.seed);
    this.obstacles = obstaclesFor(config.terrain);
    this.leaders = [config.romans.count - 1, this.count - 1];
    let offset = 0;
    for (const team of [0, 1] as const) {
      const army = team === 0 ? config.romans : config.gauls;
      const columns = Math.max(4, Math.ceil(isqrt(army.count * 2)));
      const ranged = Math.floor(((army.count - 1) * army.skirmishers) / 100);
      for (let k = 0; k < army.count; k++) {
        const id = offset + k;
        this.type[id] =
          team * 3 + (k === army.count - 1 ? 2 : k >= army.count - 1 - ranged ? 1 : 0);
        const design = UNITS[this.type[id]];
        this.hp[id] = design.hp;
        this.morale[id] = design.morale;
        this.stamina[id] = 100;
        this.ammo[id] = design.ammo;
        this.target[id] = -1;
        const row = Math.floor(k / columns),
          col = k % columns;
        const direction = team === 0 ? 1 : -1;
        this.x[id] = -direction * (13 * SCALE + row * 1420 + this.rng.below(90));
        this.z[id] = col * 1400 - Math.trunc(((columns - 1) * 1400) / 2) + this.rng.below(90);
        this.homeZ[id] = this.z[id];
        this.facingX[id] = direction * SCALE;
        this.timer[id] = this.rng.below(15);
        this.avoidTerrain(id);
      }
      // Commander is behind the center of the formation, not stranded at its last file.
      this.z[this.leaders[team]] = 0;
      this.homeZ[this.leaders[team]] = 0;
      this.x[this.leaders[team]] =
        (team === 0 ? -1 : 1) * (13 * SCALE + Math.ceil(army.count / columns) * 1420 + 1000);
      offset += army.count;
    }
    this.log('Armies deployed. Commanders will lead autonomously.', -1);
    this.rebuildGrid();
  }

  team(id: number): Team {
    return id < this.config.romans.count ? 0 : 1;
  }
  active(id: number): boolean {
    return this.hp[id] > 0 && this.state[id] !== State.Escaped;
  }
  private rebuildGrid(): void {
    this.grid.rebuild(this.x, this.z, (id) => this.active(id));
  }
  private log(text: string, team: Team | -1): void {
    this.events.push({ tick: this.tick, text, team });
    if (this.events.length > 40) this.events.shift();
  }

  private avoidTerrain(id: number): void {
    for (const obstacle of this.obstacles) {
      const dx = this.x[id] - obstacle.x,
        dz = this.z[id] - obstacle.z;
      const radius = obstacle.radius + RADIUS + 12;
      if (dx * dx + dz * dz < radius * radius) {
        const [ox, oz] = normalize(dx || (this.team(id) === 0 ? -1 : 1), dz, radius + 2);
        this.x[id] = obstacle.x + ox;
        this.z[id] = obstacle.z + oz;
      }
    }
    this.x[id] = clamp(this.x[id], -LIMIT, LIMIT);
    this.z[id] = clamp(this.z[id], -LIMIT, LIMIT);
  }

  private acquire(id: number): number {
    let found = -1,
      best = Number.MAX_SAFE_INTEGER;
    const team = this.team(id);
    const army = team === 0 ? this.config.romans : this.config.gauls;
    const radius = this.ammo[id] > 0 ? 22 * SCALE : 8 * SCALE;
    this.grid.query(this.startX[id], this.startZ[id], radius, (other) => {
      this.candidates++;
      if (this.team(other) === team || this.state[other] === State.Routing) return;
      const distance = distance2(
        this.startX[id],
        this.startZ[id],
        this.startX[other],
        this.startZ[other],
      );
      if (distance > radius * radius) return;
      // Prefer opponents in this file until close contact; avoid the entire line seeking one victim.
      const lateral = this.startZ[other] - this.homeZ[id];
      const d =
        distance +
        (distance > (3 * SCALE) ** 2 && army.doctrine !== 'charge' ? lateral * lateral * 2 : 0);
      if (d < best || (d === best && other < found)) {
        best = d;
        found = other;
      }
    });
    return found;
  }

  step(): void {
    if (this.winner !== null) return;
    this.candidates = 0;
    this.pending.fill(0);
    this.credit.fill(-1);
    this.rebuildGrid();
    this.startX.set(this.x);
    this.startZ.set(this.z);
    const totals = [0, 0],
      centerX = [0, 0],
      centerZ = [0, 0];
    for (let i = 0; i < this.count; i++)
      if (this.active(i) && this.state[i] !== State.Routing) {
        const t = this.team(i);
        totals[t]++;
        centerX[t] += this.x[i];
        centerZ[t] += this.z[i];
      }
    for (const t of [0, 1]) {
      centerX[t] = totals[t] ? Math.trunc(centerX[t] / totals[t]) : 0;
      centerZ[t] = totals[t] ? Math.trunc(centerZ[t] / totals[t]) : 0;
    }

    // Shield support is computed from the same tick-start state for both armies.
    this.support.fill(0);
    for (let i = 0; i < this.count; i++) {
      if (
        !this.active(i) ||
        this.state[i] === State.Routing ||
        UNITS[this.type[i]].role === 'skirmisher'
      )
        continue;
      this.grid.query(this.x[i], this.z[i], 1900, (j) => {
        if (
          i !== j &&
          this.team(i) === this.team(j) &&
          this.state[j] !== State.Routing &&
          UNITS[this.type[j]].role !== 'skirmisher' &&
          distance2(this.x[i], this.z[i], this.x[j], this.z[j]) <= 1900 ** 2
        )
          this.support[i] = Math.min(2, this.support[i] + 1);
      });
    }
    // Intent reads a tick-start position snapshot, independent of earlier movement writes.
    for (let i = 0; i < this.count; i++) {
      if (!this.active(i)) continue;
      if (this.buff[i] > 0) this.buff[i]--;
      const team = this.team(i),
        enemy = 1 - team,
        design = UNITS[this.type[i]];
      if (this.tick % 6 === i % 6) this.stamina[i] = Math.min(100, this.stamina[i] + 2);
      if (this.state[i] === State.Routing) {
        this.momentum[i] = 0;
        this.x[i] += team === 0 ? -115 : 115;
        this.facingX[i] = team === 0 ? -SCALE : SCALE;
        this.facingZ[i] = 0;
        this.avoidTerrain(i);
        if (Math.abs(this.x[i]) >= LIMIT - 120) this.state[i] = State.Escaped;
        continue;
      }
      let target = this.target[i];
      if (
        this.state[i] !== State.Windup &&
        (target < 0 ||
          !this.active(target) ||
          this.state[target] === State.Routing ||
          this.tick % 12 === i % 12)
      )
        target = this.target[i] = this.acquire(i);
      let dx = target >= 0 ? this.startX[target] - this.startX[i] : centerX[enemy] - this.startX[i];
      let dz =
        target >= 0
          ? this.startZ[target] - this.startZ[i]
          : Math.trunc((centerZ[enemy] - this.startZ[i]) / 3);
      const dist = isqrt(dx * dx + dz * dz);
      const ranged = design.role === 'skirmisher' && this.ammo[i] > 0;
      const reach = ranged ? design.reach : design.role === 'skirmisher' ? 1500 : design.reach;
      const [fx, fz] = normalize(dx, dz, SCALE);
      if (fx || fz) {
        this.facingX[i] = fx;
        this.facingZ[i] = fz;
      }
      if (this.state[i] === State.Windup) continue;
      const army = team === 0 ? this.config.romans : this.config.gauls;
      const speed = Math.trunc(
        (design.speed *
          (army.doctrine === 'charge' ? 115 : army.doctrine === 'shieldwall' ? 83 : 100)) /
          100,
      );
      if (ranged && target >= 0 && dist < 6 * SCALE && Math.abs(this.x[i]) < 50 * SCALE) {
        dx = -dx;
        dz = -dz;
      } else if (target >= 0 && dist <= reach - (ranged ? 1000 : 90)) continue;
      if (Math.abs(dx) > (army.doctrine === 'charge' ? 8 : 4) * SCALE)
        dz = Math.trunc((this.homeZ[i] - this.z[i]) * 2);
      // A charge needs a sustained advance; retreating skirmishers never earn impact damage.
      if (
        army.doctrine === 'charge' &&
        !ranged &&
        this.state[i] === State.Ready &&
        (team === 0 ? dx > 0 : dx < 0)
      )
        this.momentum[i] = Math.min(60, this.momentum[i] + 1);
      else this.momentum[i] = Math.max(0, this.momentum[i] - 2);
      // Deterministic local tangent around two static rock outcrops. No flow-field claim.
      for (const o of this.obstacles) {
        const ox = this.x[i] - o.x,
          oz = this.z[i] - o.z,
          r = o.radius + 2 * SCALE;
        if (ox * ox + oz * oz < r * r && dx * ox + dz * oz < 0) {
          const side = this.homeZ[i] >= o.z ? 1 : -1;
          dz += side * 8 * SCALE;
          dx = Math.trunc(dx / 3);
        }
      }
      const [mx, mz] = normalize(dx, dz, speed);
      this.x[i] += mx;
      this.z[i] += mz;
      this.avoidTerrain(i);
    }

    // Two stable pair-resolution passes; no neighbor cap that drops mandatory contacts.
    for (let pass = 0; pass < 2; pass++) {
      this.rebuildGrid();
      for (let i = 0; i < this.count; i++)
        if (this.active(i)) {
          this.grid.query(this.x[i], this.z[i], RADIUS * 2, (j) => {
            if (j <= i) return;
            const dx = this.x[j] - this.x[i],
              dz = this.z[j] - this.z[i],
              d2 = dx * dx + dz * dz;
            if (d2 >= (2 * RADIUS) ** 2) return;
            const d = isqrt(d2),
              amount = Math.trunc((2 * RADIUS - d + 1) / 2);
            const [px, pz] = d === 0 ? [amount, 0] : normalize(dx, dz, amount);
            this.x[i] -= px;
            this.z[i] -= pz;
            this.x[j] += px;
            this.z[j] += pz;
            this.avoidTerrain(i);
            this.avoidTerrain(j);
          });
        }
    }
    this.rebuildGrid();

    for (let i = 0; i < this.count; i++) {
      if (!this.active(i) || this.state[i] === State.Routing) continue;
      const design = UNITS[this.type[i]],
        target = this.target[i];
      if (this.timer[i] > 0) this.timer[i]--;
      if (this.state[i] === State.Windup && this.timer[i] === 0) {
        if (target >= 0 && this.active(target)) {
          const ranged = design.role === 'skirmisher' && this.ammo[i] > 0;
          if (ranged) {
            if (this.projectiles.length < MAX_PROJECTILES) {
              const [vx, vz] = normalize(
                this.x[target] - this.x[i],
                this.z[target] - this.z[i],
                800,
              );
              this.projectiles.push({
                id: this.projectileId++,
                x: this.x[i],
                z: this.z[i],
                vx,
                vz,
                age: 0,
                team: this.team(i),
                source: i,
                damage: design.damage,
              });
              this.ammo[i]--;
            } // At capacity the shot is deferred to the next action; ammo is retained.
          } else if (
            distance2(this.x[i], this.z[i], this.x[target], this.z[target]) <=
            (design.role === 'skirmisher' ? 1650 : design.reach + 200) ** 2
          )
            this.hit(i, target, design.damage + Math.trunc(this.momentum[i] / 6));
        }
        this.momentum[i] = 0;
        this.state[i] = State.Recovery;
        this.timer[i] = design.recovery;
      } else if (this.state[i] === State.Recovery && this.timer[i] === 0)
        this.state[i] = State.Ready;
      if (
        this.state[i] === State.Ready &&
        this.timer[i] === 0 &&
        target >= 0 &&
        this.active(target) &&
        this.stamina[i] >= 10
      ) {
        const reach =
          design.role === 'skirmisher' && this.ammo[i] > 0
            ? design.reach
            : design.role === 'skirmisher'
              ? 1500
              : design.reach;
        if (distance2(this.x[i], this.z[i], this.x[target], this.z[target]) <= reach ** 2) {
          this.state[i] = State.Windup;
          this.timer[i] = design.windup;
          this.stamina[i] -= 10;
          this.actionSerial[i]++;
        }
      }
    }
    this.advanceProjectiles();

    // Simultaneous damage allows lethal trades regardless of iteration order.
    for (let i = 0; i < this.count; i++)
      if (this.pending[i] && this.active(i)) {
        const applied = Math.min(this.hp[i], this.pending[i]);
        this.hp[i] -= applied;
        this.morale[i] = Math.max(0, this.morale[i] - Math.trunc(applied / 2));
        this.damage[1 - this.team(i)] += applied;
        if (this.hp[i] === 0) {
          this.state[i] = State.Dead;
          if (this.credit[i] >= 0) this.kills[this.credit[i]]++;
        }
      }
    this.updateMorale(totals);
    this.tick++;
    const stats = this.stats();
    if (!stats[0].standing || !stats[1].standing || this.tick >= MAX_TICKS) {
      this.winner =
        this.tick >= MAX_TICKS || (!stats[0].standing && !stats[1].standing)
          ? -1
          : stats[0].standing
            ? 0
            : 1;
      this.log(
        this.winner === -1
          ? 'Battle ended in a draw.'
          : this.winner === 0
            ? 'Roman victory. The opposing army has broken.'
            : 'Gallic victory. The opposing army has broken.',
        this.winner,
      );
    }
  }

  private hit(
    source: number,
    target: number,
    base: number,
    originX = this.x[source],
    originZ = this.z[source],
  ): void {
    const design = UNITS[this.type[target]],
      team = this.team(target);
    const doctrine = (team === 0 ? this.config.romans : this.config.gauls).doctrine;
    const dx = originX - this.x[target],
      dz = originZ - this.z[target];
    const front = dx * this.facingX[target] + dz * this.facingZ[target] > 0;
    let damage = Math.max(
      2,
      base + this.rng.below(7) - 3 + (this.buff[source] ? 5 : 0) - design.armor,
    );
    if (
      front &&
      this.stamina[target] >= 5 &&
      this.state[target] !== State.Routing &&
      this.rng.below(100) <
        design.shield + (doctrine === 'shieldwall' ? this.support[target] * 10 : 0)
    ) {
      damage = Math.max(1, Math.trunc(damage / 4));
      this.stamina[target] -= 5;
      this.blocks[target]++;
    }
    this.pending[target] += damage;
    if (this.credit[target] < 0) this.credit[target] = source;
    this.hits[source]++;
  }

  private advanceProjectiles(): void {
    const remaining: Projectile[] = [];
    for (const p of this.projectiles) {
      const x = p.x,
        z = p.z;
      p.x += p.vx;
      p.z += p.vz;
      p.age++;
      const length2 = p.vx ** 2 + p.vz ** 2;
      let target = -1,
        earliest = length2 + 1;
      if (!length2) continue;
      const intersects = (tx: number, tz: number, r: number): number => {
        const t = clamp((tx - x) * p.vx + (tz - z) * p.vz, 0, length2);
        const px = x + Math.trunc((p.vx * t) / length2),
          pz = z + Math.trunc((p.vz * t) / length2);
        return distance2(tx, tz, px, pz) <= r * r ? t : -1;
      };
      for (const o of this.obstacles) {
        const t = intersects(o.x, o.z, o.radius);
        if (t >= 0 && t < earliest) {
          earliest = t;
          target = -2;
        }
      }
      this.grid.query(p.x, p.z, 1500, (id) => {
        if (this.team(id) === p.team || !this.active(id)) return;
        const t = intersects(this.x[id], this.z[id], RADIUS + 120);
        if (t >= 0 && (t < earliest || (t === earliest && target >= 0 && id < target))) {
          earliest = t;
          target = id;
        }
      });
      if (target >= 0) this.hit(p.source, target, p.damage, x, z);
      if (target === -1 && p.age < 36) remaining.push(p);
    }
    this.projectiles = remaining;
  }

  private updateMorale(totals: number[]): void {
    for (const team of [0, 1] as const) {
      const leader = this.leaders[team];
      if (!this.active(leader) && !this.commanderLost[team]) {
        this.commanderLost[team] = true;
        this.log(
          team === 0
            ? 'The Roman legate has fallen. Roman morale suffers.'
            : 'The Gallic warlord has fallen. Gallic morale suffers.',
          team,
        );
        for (let i = 0; i < this.count; i++)
          if (this.team(i) === team && this.active(i))
            this.morale[i] = Math.max(0, this.morale[i] - 24);
      }
      if (
        this.tick > 0 &&
        this.tick % 360 === 0 &&
        this.active(leader) &&
        this.state[leader] !== State.Routing
      ) {
        this.rallies[team]++;
        this.log(
          team === 0
            ? 'Rally the line! Nearby Romans recover morale and stamina.'
            : 'War cry! Nearby Gauls gain morale and attack strength.',
          team,
        );
        for (let i = 0; i < this.count; i++)
          if (
            this.team(i) === team &&
            this.active(i) &&
            this.state[i] !== State.Routing &&
            distance2(this.x[i], this.z[i], this.x[leader], this.z[leader]) < (14 * SCALE) ** 2
          ) {
            this.morale[i] = Math.min(100, this.morale[i] + 14);
            this.stamina[i] = Math.min(100, this.stamina[i] + 20);
            if (team === 1) this.buff[i] = 120;
          }
      }
    }
    if (this.tick % 30 !== 0) return;
    for (let i = 0; i < this.count; i++) {
      if (!this.active(i) || this.state[i] === State.Routing) continue;
      const team = this.team(i),
        size = team === 0 ? this.config.romans.count : this.config.gauls.count;
      const leader = this.leaders[team],
        loss = Math.trunc(((size - totals[team]) * 8) / size);
      const supported =
        this.active(leader) &&
        distance2(this.x[i], this.z[i], this.x[leader], this.z[leader]) < (14 * SCALE) ** 2;
      this.morale[i] = clamp(this.morale[i] + (supported ? 2 : 0) - loss, 0, 100);
      if (this.morale[i] < 18 && UNITS[this.type[i]].role !== 'commander') {
        this.state[i] = State.Routing;
        this.target[i] = -1;
      }
    }
  }

  stats(): [ArmyStats, ArmyStats] {
    const make = (team: Team): ArmyStats => ({
      standing: 0,
      fallen: 0,
      routing: 0,
      escaped: 0,
      morale: 0,
      commanderAlive: this.hp[this.leaders[team]] > 0,
      damage: this.damage[team],
    });
    const values: [ArmyStats, ArmyStats] = [make(0), make(1)];
    for (let i = 0; i < this.count; i++) {
      const stat = values[this.team(i)];
      if (!this.hp[i]) stat.fallen++;
      else if (this.state[i] === State.Escaped) stat.escaped++;
      else if (this.state[i] === State.Routing) stat.routing++;
      else {
        stat.standing++;
        stat.morale += this.morale[i];
      }
    }
    for (const value of values)
      value.morale = value.standing ? Math.trunc(value.morale / value.standing) : 0;
    return values;
  }
  hash(): string {
    let h = hashWords(
      [
        this.tick,
        this.rng.state,
        this.projectileId,
        this.winner ?? -2,
        ...this.damage,
        ...this.rallies,
        ...this.commanderLost.map(Number),
      ],
      parseInt(hashText(JSON.stringify(this.config) + SIM_VERSION + CONTENT_HASH), 16),
    );
    for (const field of FIELDS) h = hashWords(this[field], h);
    for (const p of this.projectiles)
      h = hashWords([p.id, p.x, p.z, p.vx, p.vz, p.age, p.team, p.source, p.damage], h);
    return h.toString(16).padStart(8, '0');
  }
  summary(): BattleSummary {
    const [romans, gauls] = this.stats();
    return {
      tick: this.tick,
      hash: this.hash(),
      winner: this.winner,
      romans,
      gauls,
      projectiles: this.projectiles.length,
      candidates: this.candidates,
      maxCell: this.grid.maxOccupancy,
      rallies: [...this.rallies],
      events: this.events.map((e) => ({ ...e })),
    };
  }
  writeSnapshot(buffer: ArrayBuffer): number {
    const data = new Int32Array(buffer);
    data[0] = this.tick;
    data[1] = this.count;
    data[2] = this.projectiles.length;
    for (let i = 0; i < this.count; i++) {
      const base = 3 + i * UNIT_STRIDE;
      data.set(
        [
          this.x[i],
          this.z[i],
          this.hp[i],
          this.morale[i],
          this.state[i],
          this.timer[i],
          this.facingX[i],
          this.facingZ[i],
          this.type[i],
          this.ammo[i],
          this.stamina[i],
          this.kills[i],
          this.buff[i],
          this.momentum[i],
          this.support[i],
          this.blocks[i],
          this.actionSerial[i],
        ],
        base,
      );
    }
    let base = 3 + this.count * UNIT_STRIDE;
    for (const p of this.projectiles) {
      data.set([p.x, p.z, p.vx, p.vz, p.age, p.team, p.id], base);
      base += PROJECTILE_STRIDE;
    }
    return base;
  }
  checkpoint(): Checkpoint {
    return {
      version: SIM_VERSION,
      content: CONTENT_HASH,
      config: structuredClone(this.config),
      tick: this.tick,
      rng: this.rng.state,
      projectileId: this.projectileId,
      arrays: Object.fromEntries(FIELDS.map((f) => [f, Array.from(this[f])])) as Record<
        Field,
        number[]
      >,
      projectiles: this.projectiles.map((p) => ({ ...p })),
      damage: [...this.damage],
      rallies: [...this.rallies],
      commanderLost: [...this.commanderLost],
      winner: this.winner,
      events: this.events.map((e) => ({ ...e })),
    };
  }
  static restore(checkpoint: Checkpoint): Battle {
    if (checkpoint.version !== SIM_VERSION || checkpoint.content !== CONTENT_HASH)
      throw new Error('Checkpoint version mismatch.');
    const battle = new Battle(checkpoint.config);
    for (const field of FIELDS) {
      const data = checkpoint.arrays[field];
      if (data.length !== battle.count || data.some((n) => !Number.isSafeInteger(n)))
        throw new Error('Invalid checkpoint array.');
      battle[field].set(data);
    }
    battle.tick = checkpoint.tick;
    battle.rng.state = checkpoint.rng;
    battle.projectileId = checkpoint.projectileId;
    battle.projectiles = checkpoint.projectiles.map((p) => ({ ...p }));
    battle.damage = [...checkpoint.damage];
    battle.rallies = [...checkpoint.rallies];
    battle.commanderLost = [...checkpoint.commanderLost];
    battle.winner = checkpoint.winner;
    battle.events = checkpoint.events.map((e) => ({ ...e }));
    battle.rebuildGrid();
    return battle;
  }
}
