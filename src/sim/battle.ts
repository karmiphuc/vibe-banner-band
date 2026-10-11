import { supportsTactic, startTactic, updateTactic } from './tactics';
import {
  CONTENT_VERSION,
  SIM_VERSION,
  SCALE,
  TICK_RATE,
  UNITS,
  obstaclesFor,
  validateConfig,
  shieldDurability,
  formationRoster,
  ROLE_TYPES,
  formationRole,
  isMountedType,
  isMissileType,
  WORLD_HALF,
  ORDER_LIMIT,
  MAX_ENGINES,
  type BattleConfig,
  type Team,
} from '../content/catalog';
import { clamp, distance2, hashText, hashWords, isqrt, normalize, Random } from './math';
import { ENGINE_STRIDE, type SiegeEngine } from './siege';
import {
  terrainHeight,
  terrainSpeed,
  terrainLineClear,
  travelWaypoint,
  blockedWater,
  riverX,
  WORLD_VERSION,
  forestAt,
} from '../content/world';
import { HEADINGS, rotatedSlot, skeinSlot } from './formation-math';
import { turnToward, inFront } from './combat-math';
import {
  MAX_ORDERS,
  validateOrder,
  type Order,
  type RecordedOrder,
  type FormationState,
} from './orders';
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
export const UNIT_STRIDE = 29;
export const PROJECTILE_STRIDE = 10;
export const MAX_PROJECTILES = 4096;
export const MAX_TICKS = TICK_RATE * 600;
const RADIUS = 430;
const LIMIT = WORLD_HALF;
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
  'shieldHp',
  'stagger',
  'slotX',
  'slotZ',
  'formationId',
  'mountHp',
  'pace',
  'mountDeadX',
  'mountDeadZ',
  'mountDeathTick',
  'engineId',
  'chargeCooldown',
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
  y?: number;
  vy?: number;
  ttl?: number;
  kind?: 0 | 1 | 2;
  hits?: number[];
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
  formations: (FormationState & { standing: number; total: number; cohesion: number })[];
  orders: RecordedOrder[];
  engines: SiegeEngine[];
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
  formations: FormationState[];
  orders: RecordedOrder[];
  engines: SiegeEngine[];
}
export const CONTENT_HASH = hashText(
  JSON.stringify({ version: CONTENT_VERSION, world: WORLD_VERSION, units: UNITS }),
);

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
  readonly shieldHp: Int32Array;
  readonly stagger: Int32Array;
  readonly slotX: Int32Array;
  readonly slotZ: Int32Array;
  readonly formationId: Int32Array;
  readonly mountHp: Int32Array;
  readonly pace: Int32Array;
  readonly mountDeadX: Int32Array;
  readonly mountDeadZ: Int32Array;
  readonly mountDeathTick: Int32Array;
  readonly engineId: Int32Array;
  readonly chargeCooldown: Int32Array;
  engines: SiegeEngine[] = [];
  formations: FormationState[] = [];
  orders: RecordedOrder[] = [];
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
  private pendingShield: Int32Array;
  private pendingStagger: Int32Array;
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
    this.shieldHp = new Int32Array(this.count);
    this.stagger = new Int32Array(this.count);
    this.slotX = new Int32Array(this.count);
    this.slotZ = new Int32Array(this.count);
    this.formationId = new Int32Array(this.count);
    this.mountHp = new Int32Array(this.count);
    this.pace = new Int32Array(this.count);
    this.mountDeadX = new Int32Array(this.count);
    this.mountDeadZ = new Int32Array(this.count);
    this.mountDeathTick = new Int32Array(this.count);
    this.engineId = new Int32Array(this.count).fill(-1);
    this.chargeCooldown = new Int32Array(this.count);

    this.pendingShield = new Int32Array(this.count);
    this.pendingStagger = new Int32Array(this.count);
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
      const roster = formationRoster(army);
      const types: number[] = [];
      for (const role of ['infantry', 'ranged', 'cavalry', 'horse-archer', 'siege'] as const) {
        const n =
          roster.filter((f) => f.role === role).reduce((sum, f) => sum + f.count, 0) -
          (role === 'infantry' ? 1 : 0);
        for (let k = 0; k < n; k++) types.push(ROLE_TYPES[role][team]);
      }
      types.push(team * 3 + 2);
      for (let k = 0; k < army.count; k++) {
        const id = offset + k;
        this.type[id] = types[k];
        this.mountHp[id] = isMountedType(types[k]) ? 150 : 0;
        const design = UNITS[this.type[id]];
        this.hp[id] = design.hp;
        this.shieldHp[id] = shieldDurability(this.type[id]);
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
    for (const team of [0, 1] as const) {
      const army = team === 0 ? this.config.romans : this.config.gauls;
      const roster = formationRoster(army);
      for (const entry of roster)
        this.formations.push({
          team,
          id: entry.id,
          role: entry.role,
          movement: entry.reserve
            ? 'hold'
            : entry.role === 'horse-archer'
              ? 'skirmish'
              : (entry.role === 'infantry' || entry.role === 'cavalry') &&
                  army.doctrine === 'charge'
                ? 'charge'
                : 'advance',
          heading: team === 0 ? 0 : 4,
          files: 2,
          strength: 0,
          route: [],
          formation:
            entry.role === 'ranged'
              ? 'loose'
              : army.doctrine === 'shieldwall'
                ? 'shieldwall'
                : 'line',
          fireAtWill: true,
          x: 0,
          z: 0,
        });
      for (const role of ['infantry', 'ranged', 'cavalry', 'horse-archer', 'siege'] as const) {
        const ids = Array.from({ length: this.count }, (_, i) => i).filter(
          (i) =>
            this.team(i) === team &&
            formationRole(this.type[i]) === role &&
            UNITS[this.type[i]].role !== 'commander',
        );
        // Adjacent files become wings; stable ID breaks equal-position ties.
        ids.sort((a, b) => this.z[a] - this.z[b] || this.x[a] - this.x[b] || a - b);
        let cursor = 0;
        const entries = roster.filter((f) => f.role === role);
        for (const entry of entries) {
          const index = this.formations.findIndex((f) => f.team === team && f.id === entry.id);
          const carriesLeader = role === 'infantry' && entry === entries[0];
          for (let k = 0; k < entry.count - (carriesLeader ? 1 : 0); k++)
            this.formationId[ids[cursor++]] = index;
          if (carriesLeader) this.formationId[this.leaders[team]] = index;
        }
      }
    }
    this.deployFormations();
    this.initializeEngines();
    this.log('Armies deployed. Commanders will lead autonomously.', -1);
    this.rebuildGrid();
  }

  mounted(id: number): boolean {
    return isMountedType(this.type[id]) && this.mountHp[id] > 0;
  }
  private radius(id: number): number {
    const engine = this.engineId[id];
    if (
      engine >= 0 &&
      this.engines[engine]?.hp > 0 &&
      this.engines[engine].crew.find((i) => this.active(i)) === id
    )
      return 1500;
    return this.mounted(id) ? 900 : RADIUS;
  }
  private unitSpeed(id: number): number {
    return isMountedType(this.type[id]) && !this.mounted(id) ? 85 : UNITS[this.type[id]].speed;
  }
  private meleeReach(id: number): number {
    return isMissileType(this.type[id])
      ? 1500
      : isMountedType(this.type[id]) && !this.mounted(id)
        ? 1800
        : UNITS[this.type[id]].reach;
  }
  private spacing(f: FormationState): number {
    return f.role === 'siege'
      ? 6000
      : f.role === 'cavalry' || f.role === 'horse-archer'
        ? 2800
        : f.formation === 'loose'
          ? 2300
          : f.formation === 'shieldwall'
            ? 1100
            : 1450;
  }
  private lineClear(source: number, target: number): boolean {
    return terrainLineClear(
      this.config.terrain,
      this.x[source],
      this.z[source],
      terrainHeight(this.config.terrain, this.x[source], this.z[source]) +
        (this.mounted(source) ? 2700 : 1500),
      this.x[target],
      this.z[target],
      terrainHeight(this.config.terrain, this.x[target], this.z[target]) +
        (this.mounted(target) ? 2400 : 1200),
    );
  }
  private launch(
    source: number,
    target: number,
    damage: number,
    kind: 0 | 1 | 2,
    x = this.x[source],
    z = this.z[source],
  ): void {
    if (this.projectiles.length >= MAX_PROJECTILES) return;
    const speed = kind === 2 ? 2200 : kind === 1 ? 1400 : 800;
    const tx = this.x[target],
      tz = this.z[target];
    const ticks = Math.max(1, Math.ceil(isqrt(distance2(x, z, tx, tz)) / speed));
    const y =
      terrainHeight(this.config.terrain, x, z) +
      (kind === 2 ? 1800 : this.mounted(source) ? 2700 : 1500);
    const targetY =
      terrainHeight(this.config.terrain, tx, tz) + (this.mounted(target) ? 2200 : 1150);
    const gravity = kind === 2 ? 6 : 18;
    const [vx, vz] = normalize(tx - x, tz - z, speed);
    this.projectiles.push({
      id: this.projectileId++,
      x,
      z,
      y,
      vx,
      vz,
      vy: Math.trunc((targetY - y + (gravity * ticks * (ticks - 1)) / 2) / ticks),
      age: 0,
      ttl: Math.min(160, ticks + 12),
      kind,
      team: this.team(source),
      source,
      damage,
      hits: [],
    });
  }
  private damageMount(id: number, amount: number): void {
    if (!this.mounted(id)) return;
    this.mountHp[id] = Math.max(0, this.mountHp[id] - amount);
    if (this.mountHp[id] === 0) {
      this.mountDeadX[id] = this.x[id];
      this.mountDeadZ[id] = this.z[id];
      this.mountDeathTick[id] = this.tick;
      this.pace[id] = 0;
      this.momentum[id] = 0;
      this.pendingStagger[id] = 20;
      this.log(`${UNITS[this.type[id]].name} #${id + 1} is unhorsed.`, this.team(id));
    }
  }
  private cavalryImpacts(): void {
    for (let i = 0; i < this.count; i++) {
      if (this.chargeCooldown[i] > 0) this.chargeCooldown[i]--;
      if (
        !this.active(i) ||
        !this.mounted(i) ||
        this.state[i] === State.Routing ||
        UNITS[this.type[i]].role !== 'cavalry' ||
        this.pace[i] < 150 ||
        this.chargeCooldown[i]
      )
        continue;
      let target = -1,
        best = Infinity;
      this.grid.query(this.x[i], this.z[i], 2300, (j) => {
        if (
          this.team(j) === this.team(i) ||
          !this.active(j) ||
          !inFront(
            this.facingX[i],
            this.facingZ[i],
            this.x[j] - this.x[i],
            this.z[j] - this.z[i],
            724,
          )
        )
          return;
        const d = distance2(this.x[i], this.z[i], this.x[j], this.z[j]);
        if (d < (this.radius(i) + this.radius(j) + 350) ** 2 && d < best) {
          target = j;
          best = d;
        }
      });
      if (target < 0) continue;
      const f = this.formationOf(target),
        braced =
          f.role === 'infantry' &&
          (f.movement === 'brace' || f.formation === 'shieldwall') &&
          this.state[target] !== State.Routing &&
          inFront(
            this.facingX[target],
            this.facingZ[target],
            this.x[i] - this.x[target],
            this.z[i] - this.z[target],
          );
      if (braced) {
        this.damageMount(i, 35);
        this.pendingStagger[i] = 12;
        this.pace[i] = 0;
      } else {
        this.hit(i, target, 15 + Math.trunc(this.pace[i] / 8));
        this.pendingStagger[target] = 15;
        this.pace[i] = Math.trunc(this.pace[i] / 2);
      }
      this.chargeCooldown[i] = 60;
      this.momentum[i] = 0;
    }
  }
  private initializeEngines(): void {
    for (let f = 0; f < this.formations.length; f++) {
      if (this.formations[f].role !== 'siege') continue;
      const ids = Array.from(this.engineId, (_, i) => i).filter((i) => this.formationId[i] === f);
      for (let k = 0; k < ids.length; k += 3) {
        if (this.engines.length >= MAX_ENGINES) throw Error('Siege engine capacity exceeded.');
        const crew = ids.slice(k, k + 3),
          id = this.engines.length,
          leader = crew[0],
          heading = this.formations[f].heading;
        this.engines.push({
          id,
          team: this.team(leader),
          formation: f,
          x: this.x[leader],
          z: this.z[leader],
          heading,
          hp: 320,
          ammo: 24,
          cooldown: 0,
          setup: 0,
          serial: 0,
          target: -1,
          crew,
          aimX: HEADINGS[heading][0],
          aimZ: HEADINGS[heading][1],
        });
        for (const unit of crew) this.engineId[unit] = id;
      }
    }
  }
  private advanceEngines(): void {
    for (const e of this.engines) {
      const crew = e.crew.filter((i) => this.active(i) && this.state[i] !== State.Routing);
      if (!crew.length || e.hp <= 0) continue;
      const f = this.formations[e.formation],
        leader = e.crew[0];
      const goalX = f.x + this.slotX[leader],
        goalZ = f.z + this.slotZ[leader];
      const [gx, gz] = travelWaypoint(this.config.terrain, e.x, e.z, goalX, goalZ);
      const distance = isqrt(distance2(e.x, e.z, gx, gz));
      if (distance > 180) {
        const speed = Math.min(
          distance,
          Math.trunc(
            ((crew.length >= 2 ? 48 : 20) * terrainSpeed(this.config.terrain, e.x, e.z, false)) /
              100,
          ),
        );
        const [mx, mz] = normalize(gx - e.x, gz - e.z, speed);
        if (!blockedWater(this.config.terrain, e.x + mx, e.z + mz)) {
          e.x += mx;
          e.z += mz;
        }
        e.setup = 0;
        e.heading = f.heading;
        continue;
      }
      const operators = crew.filter(
        (i) => distance2(e.x, e.z, this.x[i], this.z[i]) <= (6 * SCALE) ** 2,
      );
      e.setup = Math.min(90, e.setup + 1);
      if (e.cooldown > 0) e.cooldown = Math.max(0, e.cooldown - (operators.length >= 3 ? 2 : 1));
      if (operators.length < 2 || !f.fireAtWill || !e.ammo || e.setup < 90) continue;
      if (
        e.target < 0 ||
        !this.active(e.target) ||
        distance2(e.x, e.z, this.x[e.target], this.z[e.target]) > (185 * SCALE) ** 2 ||
        this.tick % 60 === e.id % 60
      ) {
        e.target = -1;
        let best = (185 * SCALE) ** 2;
        for (let i = 0; i < this.count; i++)
          if (this.team(i) !== e.team && this.active(i) && this.state[i] !== State.Routing) {
            const d = distance2(e.x, e.z, this.x[i], this.z[i]);
            if (d < best && d > (14 * SCALE) ** 2) {
              best = d;
              e.target = i;
            }
          }
      }
      const target = e.target;
      if (target < 0) continue;
      const dx = this.x[target] - e.x,
        dz = this.z[target] - e.z;
      [e.aimX, e.aimZ] = turnToward(e.aimX, e.aimZ, dx, dz);
      if (
        e.cooldown ||
        !inFront(e.aimX, e.aimZ, dx, dz, 1008) ||
        this.projectiles.length >= MAX_PROJECTILES
      )
        continue;
      if (
        !terrainLineClear(
          this.config.terrain,
          e.x,
          e.z,
          terrainHeight(this.config.terrain, e.x, e.z) + 1800,
          this.x[target],
          this.z[target],
          terrainHeight(this.config.terrain, this.x[target], this.z[target]) + 1400,
        )
      )
        continue;
      this.launch(operators[0], target, 90, 2, e.x, e.z);
      e.ammo--;
      e.cooldown = 240;
      e.serial++;
    }
  }

  formationOf(id: number): FormationState {
    return this.formations[this.formationId[id]];
  }

  private arrange(index: number, x?: number, z?: number): void {
    const f = this.formations[index];
    const ids: number[] = [];
    let cx = 0,
      cz = 0;
    for (let i = 0; i < this.count; i++)
      if (this.active(i) && this.state[i] !== State.Routing && this.formationOf(i) === f) {
        ids.push(i);
        cx += this.x[i];
        cz += this.z[i];
      }
    f.x = x ?? (ids.length ? Math.trunc(cx / ids.length) : f.x);
    f.z = z ?? (ids.length ? Math.trunc(cz / ids.length) : f.z);
    const spacing = this.spacing(f);
    const regular =
      f.role === 'siege'
        ? Array.from(this.engineId, (_, i) => i).filter((i) => this.formationId[i] === index)
        : ids.filter((id) => UNITS[this.type[id]].role !== 'commander');
    const maxDimension = Math.floor((80 * SCALE) / spacing);
    f.files = clamp(
      f.files,
      Math.max(2, Math.ceil(regular.length / maxDimension)),
      Math.min(64, maxDimension),
    );
    f.strength = ids.length;
    const rows = Math.ceil(
      (f.role === 'siege' ? Math.ceil(regular.length / 3) : regular.length) / f.files,
    );
    const wedge =
      f.formation === 'skein' ? regular.map((_, k) => skeinSlot(k, f.files, spacing)) : [];
    const wedgeX = wedge.length
      ? Math.trunc(wedge.reduce((n, p) => n + p[0], 0) / wedge.length)
      : 0;
    const wedgeZ = wedge.length
      ? Math.trunc(wedge.reduce((n, p) => n + p[1], 0) / wedge.length)
      : 0;
    for (let k = 0; k < regular.length; k++) {
      const rank = f.role === 'siege' ? Math.floor(k / 3) : k;
      const depth =
        Math.floor(rank / f.files) * spacing -
        Math.trunc(((rows - 1) * spacing) / 2) +
        (f.role === 'siege' && k % 3 ? 2600 : 0);
      const lateral =
        (rank % f.files) * spacing +
        (f.role === 'siege' ? (k % 3 === 1 ? -1100 : k % 3 === 2 ? 1100 : 0) : 0) -
        Math.trunc(
          ((Math.min(f.files, f.role === 'siege' ? Math.ceil(regular.length / 3) : regular.length) -
            1) *
            spacing) /
            2,
        );
      [this.slotX[regular[k]], this.slotZ[regular[k]]] = rotatedSlot(
        ...(f.formation === 'skein'
          ? ([wedge[k][0] - wedgeX, wedge[k][1] - wedgeZ] as [number, number])
          : ([depth, lateral] as [number, number])),
        f.heading,
      );
    }
    for (const id of ids)
      if (UNITS[this.type[id]].role === 'commander')
        [this.slotX[id], this.slotZ[id]] = rotatedSlot(
          Math.trunc(((rows - 1) * spacing) / 2) + 2 * spacing,
          0,
          f.heading,
        );
  }
  private deployFormations(): void {
    for (const team of [0, 1] as const) {
      const army = team === 0 ? this.config.romans : this.config.gauls;
      const roster = formationRoster(army);
      const start =
        this.config.terrain === 'river-valley' || this.config.terrain === 'highlands'
          ? 75 * SCALE
          : 13 * SCALE;
      let front = start;
      for (const echelon of [0, 1, 2, 3, 4, 5]) {
        const entries = roster.filter(
          (f) =>
            (f.role === 'siege'
              ? 5
              : f.reserve
                ? 2
                : f.role === 'cavalry'
                  ? 3
                  : f.role === 'horse-archer'
                    ? 4
                    : f.role === 'ranged'
                      ? 1
                      : 0) === echelon,
        );
        const total = entries.reduce((s, f) => s + f.count, 0);
        const width = Math.min(100 * SCALE, Math.max(14 * SCALE, isqrt(army.count) * 3100));
        const layouts = entries.map((entry) => {
          const index = this.formations.findIndex((f) => f.team === team && f.id === entry.id),
            f = this.formations[index];
          const spacing = this.spacing(f);
          f.files = Math.max(
            2,
            Math.floor(
              ((width - (entries.length - 1) * 3 * SCALE) * entry.count) /
                Math.max(1, total) /
                spacing,
            ),
          );
          if (entry.reserve) f.files = Math.min(f.files, Math.max(2, isqrt(entry.count * 2)));
          this.arrange(index, 0, 0);
          let extentX = 0,
            extentZ = 0;
          for (let id = 0; id < this.count; id++)
            if (this.formationId[id] === index) {
              extentX = Math.max(extentX, Math.abs(this.slotX[id]));
              extentZ = Math.max(extentZ, Math.abs(this.slotZ[id]));
            }
          return { index, extentX, extentZ };
        });
        let cursor = -Math.trunc(layouts.reduce((s, l) => s + 2 * l.extentZ + 3 * SCALE, 0) / 2);
        let depth = 0;
        for (const l of layouts) {
          const f = this.formations[l.index];
          f.x =
            (team === 0 ? -1 : 1) * ((echelon === 3 || echelon === 4 ? start : front) + l.extentX);
          f.z =
            cursor +
            l.extentZ +
            (echelon === 3 ? 1 : echelon === 4 ? -1 : 0) * (width / 2 + 24 * SCALE);
          cursor += 2 * l.extentZ + 3 * SCALE;
          depth = Math.max(depth, 2 * l.extentX);
          this.fitFormation(l.index);
          for (let id = 0; id < this.count; id++)
            if (this.formationId[id] === l.index) {
              this.x[id] = f.x + this.slotX[id];
              this.z[id] = f.z + this.slotZ[id];
              this.homeZ[id] = this.z[id];
              this.avoidTerrain(id);
            }
        }
        if (entries.length && echelon !== 3 && echelon !== 4) front += depth + 4 * SCALE;
      }
    }
  }

  private fitFormation(index: number): void {
    const f = this.formations[index];
    let minX = 0,
      maxX = 0,
      minZ = 0,
      maxZ = 0;
    for (let i = 0; i < this.count; i++)
      if (this.active(i) && this.formationOf(i) === f) {
        minX = Math.min(minX, this.slotX[i]);
        maxX = Math.max(maxX, this.slotX[i]);
        minZ = Math.min(minZ, this.slotZ[i]);
        maxZ = Math.max(maxZ, this.slotZ[i]);
      }
    f.x = clamp(f.x, -LIMIT + RADIUS - minX, LIMIT - RADIUS - maxX);
    f.z = clamp(f.z, -LIMIT + RADIUS - minZ, LIMIT - RADIUS - maxZ);
  }
  /** Applied at a worker tick boundary; records the exact boundary for replay. */
  issueOrder(input: unknown): RecordedOrder {
    if (this.winner !== null) throw Error('The battle has concluded.');
    if (this.orders.length >= MAX_ORDERS)
      throw Error('This battle has reached its 256-order limit.');
    const order: Order = validateOrder(input);
    if (
      order.kind === 'hold' &&
      order.x !== undefined &&
      this.obstacles.some((o) => distance2(order.x!, order.z!, o.x, o.z) < (o.radius + SCALE) ** 2)
    )
      throw Error('Formation anchor cannot be inside a rock.');
    const selected = this.formations.filter(
      (f) => f.team === order.team && (order.group === 'all' || f.id === order.group),
    );
    if (!selected.length) throw Error('That formation is not deployed.');
    if (order.kind === 'tactic' && selected.some((f) => !supportsTactic(order.tactic, f.role)))
      throw Error('Select cavalry for charges or horse archers for mounted skirmish tactics.');
    if (
      order.kind === 'formation' &&
      order.formation === 'skein' &&
      selected.some((f) => f.role !== 'cavalry')
    )
      throw Error('Skein layout requires a cavalry formation.');
    const originX = Math.trunc(selected.reduce((sum, f) => sum + f.x, 0) / selected.length);
    const originZ = Math.trunc(selected.reduce((sum, f) => sum + f.z, 0) / selected.length);
    for (let index = 0; index < this.formations.length; index++) {
      const f = this.formations[index];
      if (f.team !== order.team || (order.group !== 'all' && order.group !== f.id)) continue;
      if (order.kind !== 'fire' && order.kind !== 'tactic') delete f.tactic;
      if (order.kind === 'tactic') {
        f.route = [];
        f.movement = 'hold';
        this.arrange(index);
        if (order.tactic === 'none') delete f.tactic;
        else {
          f.tactic = startTactic(order.tactic, this.tick, f.x, f.z, f.id);
          f.formation = f.role === 'cavalry' ? 'skein' : 'loose';
          this.arrange(index, f.x, f.z);
        }
      } else if (order.kind === 'fire') f.fireAtWill = order.enabled;
      else if (order.kind === 'formation') {
        f.formation = order.formation;
        this.arrange(index, f.x, f.z);
      } else if (order.kind === 'face' || order.kind === 'frontage') {
        if (order.kind === 'face') f.heading = order.heading;
        else f.files = order.files;
        this.arrange(index, f.x, f.z);
      } else {
        f.movement = order.kind;
        f.route = [];
        this.arrange(
          index,
          order.x === undefined ? undefined : order.x + f.x - originX,
          order.z === undefined ? undefined : order.z + f.z - originZ,
        );
        if (order.kind === 'flank-left' || order.kind === 'flank-right') {
          const opponents = this.formations
            .filter((other) => other.team !== f.team)
            .map((formation) => ({ formation, x: 0, z: 0, n: 0 }));
          for (let id = 0; id < this.count; id++)
            if (this.active(id) && this.state[id] !== State.Routing) {
              const other = opponents.find((o) => o.formation === this.formationOf(id));
              if (other) {
                other.x += this.x[id];
                other.z += this.z[id];
                other.n++;
              }
            }
          for (const other of opponents)
            if (other.n) {
              other.x = Math.trunc(other.x / other.n);
              other.z = Math.trunc(other.z / other.n);
            }
          const nearest = opponents
            .filter((o) => o.n)
            .sort(
              (a, b) =>
                distance2(a.x, a.z, f.x, f.z) - distance2(b.x, b.z, f.x, f.z) ||
                a.formation.id - b.formation.id,
            )[0];
          const target = nearest?.formation,
            n = nearest?.n ?? 0;
          let ex = (nearest?.x ?? 0) * n,
            ez = (nearest?.z ?? 0) * n;
          if (n) {
            ex = Math.trunc(ex / n);
            ez = Math.trunc(ez / n);
            const [hx, hz] = normalize(ex - f.x, ez - f.z, SCALE);
            const side = order.kind === 'flank-left' ? -1 : 1;
            let extent = 0,
              own = 0;
            for (let id = 0; id < this.count; id++)
              if (this.active(id) && this.state[id] !== State.Routing) {
                if (this.formationOf(id) === target)
                  extent = Math.max(
                    extent,
                    Math.abs(
                      Math.trunc((-(this.x[id] - ex) * hz + (this.z[id] - ez) * hx) / SCALE),
                    ),
                  );
                if (this.formationOf(id) === f)
                  own = Math.max(own, Math.abs(this.slotX[id]) + Math.abs(this.slotZ[id]));
              }
            const clearance = Math.min(35 * SCALE, extent + own + 5 * SCALE);
            const laneX = Math.trunc((-hz * side * clearance) / SCALE),
              laneZ = Math.trunc((hx * side * clearance) / SCALE);
            f.route = [
              {
                x: clamp(ex + laneX + hx * 2, -ORDER_LIMIT, ORDER_LIMIT),
                z: clamp(ez + laneZ + hz * 2, -ORDER_LIMIT, ORDER_LIMIT),
              },
            ];
            f.x += laneX;
            f.z += laneZ;
          }
        }
        if (order.kind === 'fallback') {
          const [hx, hz] = HEADINGS[f.heading];
          f.x -= 8 * hx;
          f.z -= 8 * hz;
        }
      }
      if (order.kind !== 'fire') this.fitFormation(index);
      for (let i = 0; i < this.count; i++)
        if (this.formationOf(i) === f) {
          if (order.kind !== 'fire') {
            this.momentum[i] = 0;
            this.homeZ[i] = f.z + this.slotZ[i];
          }
          // Changing fire discipline cancels the unreleased action; ammo is retained.
          if (order.kind === 'fire' && this.ammo[i] > 0 && this.state[i] === State.Windup) {
            this.state[i] = State.Recovery;
            this.timer[i] = 8;
          }
        }
    }
    const record = { tick: this.tick, sequence: this.orders.length + 1, order };
    this.orders.push(record);
    const label =
      order.kind === 'formation'
        ? order.formation
        : order.kind === 'fire'
          ? order.enabled
            ? 'fire at will'
            : 'hold fire'
          : order.kind;
    this.log(
      `${order.team === 0 ? 'Roman' : 'Gallic'} ${order.group === 'all' ? 'all formations' : `formation ${order.group + 1}`}: ${label}.`,
      order.team,
    );
    return structuredClone(record);
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
    if (blockedWater(this.config.terrain, this.x[id], this.z[id])) {
      const river = riverX(this.z[id]);
      this.x[id] = river + (this.startX[id] < river ? -1 : 1) * 10 * SCALE;
    }
    this.x[id] = clamp(this.x[id], -LIMIT, LIMIT);
    this.z[id] = clamp(this.z[id], -LIMIT, LIMIT);
  }

  private advanceFormations(): void {
    const activeTactics = this.formations.some((f) => f.tactic && f.tactic.phase !== 'spent');
    const stats = this.formations.map(() => ({
      n: 0,
      x: 0,
      z: 0,
      error: 0,
      contact: 0,
      nearest: Infinity,
      ammunition: 0,
      speed: 1000,
      mounted: 0,
      radius: 0,
    }));
    for (let i = 0; i < this.count; i++)
      if (this.active(i) && this.state[i] !== State.Routing) {
        const index = this.formationId[i],
          s = stats[index],
          f = this.formations[index];
        s.n++;
        if (this.mounted(i)) s.mounted++;
        if (activeTactics)
          s.radius = Math.max(s.radius, isqrt(this.slotX[i] ** 2 + this.slotZ[i] ** 2));
        s.ammunition += this.ammo[i];
        s.x += this.x[i];
        s.z += this.z[i];
        s.error += isqrt(distance2(this.x[i], this.z[i], f.x + this.slotX[i], f.z + this.slotZ[i]));
        s.speed = Math.min(s.speed, this.unitSpeed(i));
        const t = this.target[i];
        if (t >= 0 && this.active(t))
          s.nearest = Math.min(
            s.nearest,
            isqrt(distance2(this.x[i], this.z[i], this.x[t], this.z[t])),
          );
        if (
          t >= 0 &&
          this.active(t) &&
          distance2(this.x[i], this.z[i], this.x[t], this.z[t]) <
            Math.min(
              1800,
              (UNITS[this.type[i]].role === 'skirmisher' ? 1500 : UNITS[this.type[i]].reach) - 150,
            ) **
              2
        )
          s.contact++;
      }
    stats.forEach((s) => {
      if (s.n) {
        s.x = Math.trunc(s.x / s.n);
        s.z = Math.trunc(s.z / s.n);
      }
    });
    for (let index = 0; index < this.formations.length; index++) {
      const f = this.formations[index],
        s = stats[index];
      if (!s.n) continue;
      if (this.tick % 30 === 0 && s.n !== f.strength) this.arrange(index, f.x, f.z);
      if (f.tactic) {
        if (this.tick % 12 === 0) {
          const heading = f.heading;
          updateTactic(f, index, this.formations, stats, this.tick);
          if (heading !== f.heading) this.arrange(index, f.x, f.z);
          this.fitFormation(index);
        }
        continue;
      }
      if (f.movement === 'flank-left' || f.movement === 'flank-right') {
        if (s.error < s.n * 2 * SCALE || (!f.route.length && s.contact > 0)) {
          const next = f.route.shift();
          if (next) {
            f.x = next.x;
            f.z = next.z;
            this.fitFormation(index);
          } else {
            f.movement = 'charge';
            this.log(
              `${f.team === 0 ? 'Roman' : 'Gallic'} formation ${f.id + 1} completes its flank and charges.`,
              f.team,
            );
          }
        }
        continue;
      }
      if (f.movement !== 'advance' || s.contact || s.error > s.n * 3 * SCALE) continue;
      let enemy = -1,
        best = Infinity;
      for (let j = 0; j < stats.length; j++)
        if (this.formations[j].team !== f.team && stats[j].n) {
          const d = distance2(f.x, f.z, stats[j].x, stats[j].z);
          if (d < best) {
            best = d;
            enemy = j;
          }
        }
      if (enemy < 0) continue;
      const other = stats[enemy];
      const ranged =
        (f.role === 'ranged' || f.role === 'horse-archer' || f.role === 'siege') &&
        f.fireAtWill &&
        (s.ammunition > 0 || f.role === 'siege');
      const meleeStop = f.role === 'ranged' ? 1200 : 1500;
      let stop = ranged
        ? (f.role === 'siege' ? 155 : f.role === 'horse-archer' ? 42 : 17) * SCALE
        : meleeStop;
      const [dx, dz] = normalize(other.x - f.x, other.z - f.z, SCALE);
      let ownFront = 0,
        enemyFront = 0;
      for (let i = 0; i < this.count; i++)
        if (this.active(i) && this.state[i] !== State.Routing) {
          if (this.formationId[i] === index)
            ownFront = Math.max(
              ownFront,
              Math.trunc((this.slotX[i] * dx + this.slotZ[i] * dz) / SCALE),
            );
          if (this.formationId[i] === enemy)
            enemyFront = Math.max(
              enemyFront,
              Math.trunc(((other.x - this.x[i]) * dx + (other.z - this.z[i]) * dz) / SCALE),
            );
        }
      stop += ownFront + enemyFront;
      const remaining =
        !ranged && s.nearest < 8 * SCALE ? s.nearest - meleeStop : isqrt(best) - stop;
      if (remaining <= 0) continue;
      const speed = Math.min(
        remaining,
        Math.trunc((s.speed * (f.formation === 'shieldwall' ? 65 : 80)) / 100),
      );
      const [gx, gz] = travelWaypoint(this.config.terrain, f.x, f.z, other.x, other.z);
      const [mx, mz] = normalize(gx - f.x, gz - f.z, speed);
      f.x += mx;
      f.z += mz;
      this.fitFormation(index);
      for (let i = 0; i < this.count; i++)
        if (this.formationId[i] === index) this.homeZ[i] = f.z + this.slotZ[i];
    }
  }

  private acquire(id: number): number {
    let found = -1,
      best = Number.MAX_SAFE_INTEGER;
    const team = this.team(id);
    const formation = this.formationOf(id);
    const radius =
      this.ammo[id] > 0
        ? (UNITS[this.type[id]].role === 'horse-archer' ? 58 : 22) * SCALE
        : this.mounted(id)
          ? 18 * SCALE
          : 8 * SCALE;
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
      const [hx, hz] = HEADINGS[formation.heading];
      const lateral = Math.trunc(
        (-(this.startX[other] - formation.x - this.slotX[id]) * hz +
          (this.startZ[other] - formation.z - this.slotZ[id]) * hx) /
          SCALE,
      );
      const d =
        distance +
        (distance > (3 * SCALE) ** 2 && formation.movement !== 'charge'
          ? lateral * lateral * 2
          : 0);
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
    this.pendingShield.fill(0);
    this.pendingStagger.fill(0);
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

    this.advanceFormations();
    this.advanceEngines();

    // Shield support is computed from the same tick-start state for both armies.
    this.support.fill(0);
    for (let i = 0; i < this.count; i++) {
      if (
        !this.active(i) ||
        this.state[i] === State.Routing ||
        !['infantry', 'commander'].includes(UNITS[this.type[i]].role) ||
        this.shieldHp[i] === 0
      )
        continue;
      this.grid.query(this.x[i], this.z[i], 1900, (j) => {
        if (
          i !== j &&
          this.team(i) === this.team(j) &&
          this.state[j] !== State.Routing &&
          ['infantry', 'commander'].includes(UNITS[this.type[j]].role) &&
          this.shieldHp[j] > 0 &&
          distance2(this.x[i], this.z[i], this.x[j], this.z[j]) <= 1900 ** 2
        )
          this.support[i] = Math.min(2, this.support[i] + 1);
      });
    }
    // Intent reads a tick-start position snapshot, independent of earlier movement writes.
    for (let i = 0; i < this.count; i++) {
      if (!this.active(i)) continue;
      if (this.buff[i] > 0) this.buff[i]--;
      if (this.stagger[i] > 0) {
        this.stagger[i]--;
        this.pace[i] = 0;
        continue;
      }
      const team = this.team(i),
        enemy = 1 - team,
        design = UNITS[this.type[i]];
      if (this.tick % 6 === i % 6) this.stamina[i] = Math.min(100, this.stamina[i] + 2);
      if (this.state[i] === State.Routing) {
        this.momentum[i] = 0;
        this.pace[i] = 0;
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
        (this.tick % 12 === i % 12 ||
          (target >= 0 && (!this.active(target) || this.state[target] === State.Routing)))
      )
        target = this.target[i] = this.acquire(i);
      let dx = target >= 0 ? this.startX[target] - this.startX[i] : centerX[enemy] - this.startX[i];
      let dz =
        target >= 0
          ? this.startZ[target] - this.startZ[i]
          : Math.trunc((centerZ[enemy] - this.startZ[i]) / 3);
      const dist = isqrt(dx * dx + dz * dz);
      const ranged =
        isMissileType(this.type[i]) && this.ammo[i] > 0 && this.formationOf(i).fireAtWill;
      const reach = ranged ? design.reach : this.meleeReach(i);
      const currentFormation = this.formationOf(i);
      const [headingX, headingZ] = HEADINGS[currentFormation.heading];
      const [fx, fz] = turnToward(
        this.facingX[i],
        this.facingZ[i],
        (target >= 0 && dist < 5 * SCALE) || currentFormation.movement === 'charge' ? dx : headingX,
        (target >= 0 && dist < 5 * SCALE) || currentFormation.movement === 'charge' ? dz : headingZ,
      );
      if (!this.mounted(i) && (fx || fz) && this.state[i] !== State.Windup) {
        this.facingX[i] = fx;
        this.facingZ[i] = fz;
      }
      if (this.state[i] === State.Windup && !this.mounted(i)) continue;
      const formation = this.formationOf(i);
      let speed = Math.trunc(
        (this.unitSpeed(i) *
          (formation.movement.startsWith('flank')
            ? 135
            : formation.movement === 'charge'
              ? 115
              : formation.formation === 'shieldwall'
                ? 83
                : 100)) /
          100,
      );
      const holding =
        !!formation.tactic ||
        (formation.movement !== 'charge' && formation.movement !== 'skirmish');
      if (
        UNITS[this.type[i]].role === 'engineer' &&
        this.engineId[i] >= 0 &&
        this.engines[this.engineId[i]].hp > 0
      ) {
        const e = this.engines[this.engineId[i]],
          crew = e.crew.indexOf(i),
          [hx, hz] = HEADINGS[e.heading];
        const lateral = crew === 0 ? 0 : crew === 1 ? -1100 : 1100;
        dx = e.x + Math.trunc((-hz * lateral - (crew ? 2600 : 0) * hx) / SCALE) - this.x[i];
        dz = e.z + Math.trunc((hx * lateral - (crew ? 2600 : 0) * hz) / SCALE) - this.z[i];
        if (Math.abs(dx) + Math.abs(dz) < 100) {
          this.pace[i] = 0;
          continue;
        }
      } else if (
        !formation.tactic &&
        formation.movement === 'skirmish' &&
        this.mounted(i) &&
        isMissileType(this.type[i]) &&
        this.ammo[i] > 0 &&
        target >= 0
      ) {
        const side = this.formationOf(i).id % 2 ? -1 : 1;
        const radial = dist < 30 * SCALE ? -1 : dist > 45 * SCALE ? 1 : 0;
        const ox = dx,
          oz = dz;
        dx = ox * radial - Math.trunc((oz * side * 3) / 4);
        dz = oz * radial + Math.trunc((ox * side * 3) / 4);
      } else if (holding) {
        dx = formation.x + this.slotX[i] - this.x[i];
        dz = formation.z + this.slotZ[i] - this.z[i];
        const slotDistance = isqrt(dx * dx + dz * dz);
        if (slotDistance < 120 || (target >= 0 && dist <= reach - 90 && slotDistance < 2 * SCALE)) {
          this.pace[i] = 0;
          continue;
        }
        speed = Math.min(speed, slotDistance);
        if (formation.movement === 'fallback') speed = Math.trunc((speed * 3) / 4);
      } else if (ranged && target >= 0 && dist < 6 * SCALE && Math.abs(this.x[i]) < ORDER_LIMIT) {
        dx = -dx;
        dz = -dz;
      } else if (!this.mounted(i) && target >= 0 && dist <= reach - (ranged ? 1000 : 90)) continue;

      // A charge needs a sustained advance; retreating skirmishers never earn impact damage.
      if (
        formation.movement === 'charge' &&
        !ranged &&
        this.state[i] === State.Ready &&
        dx * this.facingX[i] + dz * this.facingZ[i] > 0
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
      const [goalX, goalZ] = travelWaypoint(
        this.config.terrain,
        this.x[i],
        this.z[i],
        this.x[i] + dx,
        this.z[i] + dz,
      );
      dx = goalX - this.x[i];
      dz = goalZ - this.z[i];
      speed = Math.trunc(
        (speed * terrainSpeed(this.config.terrain, this.x[i], this.z[i], this.mounted(i))) / 100,
      );
      const rise =
        terrainHeight(
          this.config.terrain,
          this.x[i] + Math.trunc(dx / 8),
          this.z[i] + Math.trunc(dz / 8),
        ) - terrainHeight(this.config.terrain, this.x[i], this.z[i]);
      if (rise > 2 * SCALE) speed = Math.trunc((speed * 3) / 4);
      if (this.mounted(i)) {
        const [tx, tz] = turnToward(this.facingX[i], this.facingZ[i], dx, dz, 1020, 89);
        this.facingX[i] = tx;
        this.facingZ[i] = tz;
        const aligned = dx * tx + dz * tz > 0;
        const limit = aligned ? speed : Math.trunc(speed / 3);
        this.pace[i] =
          this.pace[i] < limit
            ? Math.min(limit, this.pace[i] + 4)
            : Math.max(limit, this.pace[i] - 8);
        dx = tx;
        dz = tz;
        speed = this.pace[i];
      } else this.pace[i] = speed;
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
          this.grid.query(this.x[i], this.z[i], 3600, (j) => {
            if (j <= i) return;
            const dx = this.x[j] - this.x[i],
              dz = this.z[j] - this.z[i],
              d2 = dx * dx + dz * dz;
            const contact = this.radius(i) + this.radius(j);
            if (d2 >= contact ** 2) return;
            const d = isqrt(d2),
              amount = Math.trunc((contact - d + 1) / 2);
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
    this.cavalryImpacts();

    for (let i = 0; i < this.count; i++) {
      if (!this.active(i) || this.state[i] === State.Routing || this.stagger[i] > 0) continue;
      const design = UNITS[this.type[i]],
        target = this.target[i];
      if (this.timer[i] > 0) this.timer[i]--;
      if (this.state[i] === State.Windup && this.timer[i] === 0) {
        if (target >= 0 && this.active(target)) {
          const ranged =
            isMissileType(this.type[i]) && this.ammo[i] > 0 && this.formationOf(i).fireAtWill;
          if (ranged && this.formationOf(i).fireAtWill) {
            if (this.projectiles.length < MAX_PROJECTILES) {
              if (this.lineClear(i, target)) {
                this.launch(
                  i,
                  target,
                  design.damage,
                  UNITS[this.type[i]].role === 'horse-archer' ? 1 : 0,
                );
                this.ammo[i]--;
              }
            } // At capacity the shot is deferred to the next action; ammo is retained.
          } else if (
            !ranged &&
            this.clearMelee(i, target) &&
            inFront(
              this.facingX[i],
              this.facingZ[i],
              this.x[target] - this.x[i],
              this.z[target] - this.z[i],
              UNITS[this.type[i]].role === 'horse-archer'
                ? -256
                : this.mounted(i)
                  ? 512
                  : this.type[i] === 3 || this.type[i] === 5
                    ? 512
                    : 887,
            ) &&
            distance2(this.x[i], this.z[i], this.x[target], this.z[target]) <=
              (this.meleeReach(i) + 200) ** 2
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
        this.stamina[i] >= 10 &&
        inFront(
          this.facingX[i],
          this.facingZ[i],
          this.x[target] - this.x[i],
          this.z[target] - this.z[i],
          UNITS[this.type[i]].role === 'horse-archer'
            ? -256
            : this.mounted(i)
              ? 512
              : this.type[i] === 3 || this.type[i] === 5
                ? 512
                : 887,
        )
      ) {
        const reach =
          isMissileType(this.type[i]) && this.ammo[i] > 0 && this.formationOf(i).fireAtWill
            ? design.reach
            : this.meleeReach(i);
        if (distance2(this.x[i], this.z[i], this.x[target], this.z[target]) <= reach ** 2) {
          this.state[i] = State.Windup;
          this.timer[i] = design.windup;
          this.stamina[i] -= 10;
          this.actionSerial[i]++;
        }
      }
    }
    this.advanceProjectiles();

    for (let i = 0; i < this.count; i++)
      if (this.active(i)) {
        const previous = this.shieldHp[i];
        this.shieldHp[i] = Math.max(0, previous - this.pendingShield[i]);
        if (previous > 0 && this.shieldHp[i] === 0) {
          this.pendingStagger[i] = Math.max(this.pendingStagger[i], 15);
          this.log(`${UNITS[this.type[i]].name} #${i + 1}: shield broken.`, this.team(i));
        }
        if (this.pendingStagger[i] > 0 && this.state[i] !== State.Routing) {
          this.stagger[i] = Math.max(this.stagger[i], this.pendingStagger[i]);
          this.state[i] = State.Recovery;
          this.timer[i] = Math.max(8, this.timer[i]);
          this.momentum[i] = 0;
        }
      }
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

  /** A short weapon cannot pass through another standing soldier. */
  private clearMelee(source: number, target: number): boolean {
    const dx = this.x[target] - this.x[source],
      dz = this.z[target] - this.z[source];
    const length2 = dx * dx + dz * dz;
    let clear = true;
    this.grid.query(this.x[source], this.z[source], 2300, (id) => {
      if (!clear || id === source || id === target || !this.active(id)) return;
      const ox = this.x[id] - this.x[source],
        oz = this.z[id] - this.z[source];
      const projection = ox * dx + oz * dz;
      if (projection <= 0 || projection >= length2) return;
      const cross = ox * dz - oz * dx;
      if (cross * cross < 300 ** 2 * length2) clear = false;
    });
    return clear;
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
    void team;
    const formation = this.formationOf(target);
    const dx = originX - this.x[target],
      dz = originZ - this.z[target];
    const front = inFront(this.facingX[target], this.facingZ[target], dx, dz);
    const engine = this.engineId[target];
    if (engine >= 0 && this.engines[engine].hp > 0) {
      const e = this.engines[engine];
      e.hp = Math.max(0, e.hp - Math.max(4, Math.trunc(base / 2)));
      if (e.hp === 0)
        this.log(`${e.team === 0 ? 'Roman' : 'Gallic'} ballista ${e.id + 1} destroyed.`, e.team);
    }
    if (this.mounted(target) && this.rng.below(100) < 40)
      this.damageMount(target, Math.max(8, Math.trunc((base * 3) / 4)));
    let damage = Math.max(
      2,
      base + this.rng.below(7) - 3 + (this.buff[source] ? 5 : 0) - design.armor,
    );
    if (
      front &&
      this.stamina[target] >= 8 &&
      this.shieldHp[target] > 0 &&
      this.stagger[target] === 0 &&
      this.state[target] !== State.Routing &&
      this.rng.below(100) <
        Math.min(
          90,
          design.shield +
            (this.state[target] === State.Windup ? 0 : 30) +
            (formation.formation === 'shieldwall' ? this.support[target] * 10 : 0),
        )
    ) {
      this.pendingShield[target] += Math.max(4, Math.trunc(base / 3));
      damage = Math.max(1, Math.trunc(damage / 8));
      this.stamina[target] -= 8;
      this.blocks[target]++;
      if (this.stamina[target] < 8)
        this.pendingStagger[target] = Math.max(this.pendingStagger[target], 10);
    } else if (damage >= 20) this.pendingStagger[target] = Math.max(this.pendingStagger[target], 8);
    this.pending[target] += damage;
    if (this.credit[target] < 0) this.credit[target] = source;
    this.hits[source]++;
  }

  private advanceProjectiles(): void {
    const remaining: Projectile[] = [];
    for (const p of this.projectiles) {
      const x = p.x,
        z = p.z,
        oldY = p.y;
      p.x += p.vx;
      p.z += p.vz;
      p.age++;
      if (p.y !== undefined) {
        p.y += p.vy ?? 0;
        p.vy = (p.vy ?? 0) - (p.kind === 2 ? 6 : 18);
      }
      const length2 = p.vx * p.vx + p.vz * p.vz;
      if (!length2) continue;
      const intersects = (tx: number, tz: number, r: number) => {
        const t = clamp((tx - x) * p.vx + (tz - z) * p.vz, 0, length2);
        const px = x + Math.trunc((p.vx * t) / length2),
          pz = z + Math.trunc((p.vz * t) / length2);
        return distance2(tx, tz, px, pz) <= r * r ? t : -1;
      };
      let stopped = false;
      for (const o of this.obstacles)
        if (
          intersects(o.x, o.z, o.radius) >= 0 &&
          (p.y === undefined || p.y < terrainHeight(this.config.terrain, o.x, o.z) + 6 * SCALE)
        ) {
          stopped = true;
          break;
        }
      if (p.y !== undefined && p.y <= terrainHeight(this.config.terrain, p.x, p.z)) stopped = true;
      if (stopped) continue;
      const hits: { id: number; t: number }[] = [];
      this.grid.query(
        Math.trunc((x + p.x) / 2),
        Math.trunc((z + p.z) / 2),
        Math.ceil(isqrt(length2) / 2) + 1800,
        (id) => {
          if (this.team(id) === p.team || !this.active(id) || p.hits?.includes(id)) return;
          const t = intersects(this.x[id], this.z[id], this.radius(id) + 120);
          if (t < 0) return;
          if (p.y !== undefined && oldY !== undefined) {
            const y = oldY + Math.trunc(((p.y - oldY) * t) / length2),
              ground = terrainHeight(this.config.terrain, this.x[id], this.z[id]);
            if (y < ground + 150 || y > ground + (this.mounted(id) ? 3000 : 2000)) return;
          }
          hits.push({ id, t });
        },
      );
      hits.sort((a, b) => a.t - b.t || a.id - b.id);
      for (const h of hits) {
        if (
          !forestAt(this.x[h.id], this.z[h.id]) ||
          !['river-valley', 'highlands'].includes(this.config.terrain) ||
          this.rng.below(100) > 20
        )
          this.hit(p.source, h.id, p.damage, x, z);
        if (p.kind !== 2) {
          stopped = true;
          break;
        }
        (p.hits ??= []).push(h.id);
        p.damage = Math.max(25, Math.trunc((p.damage * 3) / 4));
        if (p.hits.length >= 3) {
          stopped = true;
          break;
        }
      }
      if (!stopped && p.age < (p.ttl ?? 36) && Math.abs(p.x) < LIMIT && Math.abs(p.z) < LIMIT)
        remaining.push(p);
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
    h = hashWords(
      [
        parseInt(hashText(JSON.stringify(this.formations)), 16),
        parseInt(hashText(JSON.stringify(this.orders)), 16),
        parseInt(hashText(JSON.stringify(this.engines)), 16),
      ],
      h,
    );
    for (const field of FIELDS) h = hashWords(this[field], h);
    for (const p of this.projectiles)
      h = hashWords(
        [
          p.id,
          p.x,
          p.z,
          p.vx,
          p.vz,
          p.age,
          p.team,
          p.source,
          p.damage,
          p.y ?? 0,
          p.vy ?? 0,
          p.ttl ?? 36,
          p.kind ?? 0,
          parseInt(hashText(JSON.stringify(p.hits ?? [])), 16),
        ],
        h,
      );
    return h.toString(16).padStart(8, '0');
  }
  summary(): BattleSummary {
    const [romans, gauls] = this.stats();
    const formations = this.formations.map((f) => ({
      ...f,
      tactic: f.tactic ? { ...f.tactic } : undefined,
      route: f.route.map((p) => ({ ...p })),
      standing: 0,
      total: 0,
      cohesion: 0,
    }));
    for (let i = 0; i < this.count; i++) {
      const f = formations[this.formationId[i]];
      f.total++;
      if (this.active(i) && this.state[i] !== State.Routing) {
        f.standing++;
        f.cohesion += Math.min(
          4 * SCALE,
          isqrt(distance2(this.x[i], this.z[i], f.x + this.slotX[i], f.z + this.slotZ[i])),
        );
      }
    }
    for (const f of formations)
      f.cohesion = f.standing ? 100 - Math.trunc((f.cohesion * 100) / (f.standing * 4 * SCALE)) : 0;
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
      formations,
      orders: structuredClone(this.orders),
      engines: structuredClone(this.engines),
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
          this.shieldHp[i],
          this.stagger[i],
          Number(this.ammo[i] > 0 && this.formationOf(i).fireAtWill),
          this.formationOf(i).id,
          this.mountHp[i],
          this.pace[i],
          this.mountDeadX[i],
          this.mountDeadZ[i],
          this.mountDeathTick[i],
          this.engineId[i],
          terrainHeight(this.config.terrain, this.x[i], this.z[i]),
          this.target[i],
        ],
        base,
      );
    }
    let base = 3 + this.count * UNIT_STRIDE;
    for (const p of this.projectiles) {
      data.set(
        [p.x, p.z, p.vx, p.vz, p.age, p.team, p.id, p.y ?? 1500, p.kind ?? 0, p.vy ?? 0],
        base,
      );
      base += PROJECTILE_STRIDE;
    }
    data[base++] = this.engines.length;
    for (const e of this.engines) {
      data.set(
        [
          e.id,
          e.x,
          e.z,
          e.heading,
          e.hp,
          e.ammo,
          e.cooldown,
          e.serial,
          e.crew.filter((i) => this.active(i) && this.state[i] !== State.Routing).length,
          e.team,
          e.setup,
          terrainHeight(this.config.terrain, e.x, e.z),
          e.aimX,
          e.aimZ,
        ],
        base,
      );
      base += ENGINE_STRIDE;
    }
    return base;
  }
  snapshotBytes(): number {
    return (
      (4 +
        this.count * UNIT_STRIDE +
        MAX_PROJECTILES * PROJECTILE_STRIDE +
        MAX_ENGINES * ENGINE_STRIDE) *
      4
    );
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
      projectiles: this.projectiles.map((p) => ({ ...p, hits: p.hits ? [...p.hits] : undefined })),
      damage: [...this.damage],
      rallies: [...this.rallies],
      commanderLost: [...this.commanderLost],
      winner: this.winner,
      events: this.events.map((e) => ({ ...e })),
      formations: this.formations.map((f) => ({
        ...f,
        tactic: f.tactic ? { ...f.tactic } : undefined,
        route: f.route.map((p) => ({ ...p })),
      })),
      orders: structuredClone(this.orders),
      engines: structuredClone(this.engines),
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
    battle.projectiles = checkpoint.projectiles.map((p) => ({
      ...p,
      hits: p.hits ? [...p.hits] : undefined,
    }));
    battle.damage = [...checkpoint.damage];
    battle.rallies = [...checkpoint.rallies];
    battle.commanderLost = [...checkpoint.commanderLost];
    battle.winner = checkpoint.winner;
    battle.events = checkpoint.events.map((e) => ({ ...e }));
    battle.formations = checkpoint.formations.map((f) => ({
      ...f,
      tactic: f.tactic ? { ...f.tactic } : undefined,
      route: f.route.map((p) => ({ ...p })),
    }));
    battle.orders = structuredClone(checkpoint.orders);
    battle.engines = structuredClone(checkpoint.engines);
    battle.rebuildGrid();
    return battle;
  }
}
