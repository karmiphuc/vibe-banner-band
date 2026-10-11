import { MAX_ARMY } from './constants';
import { worldObstacles } from './world';
export { MAX_ARMY, MAX_UNITS, SCALE, WORLD_HALF, ORDER_LIMIT, MAX_ENGINES } from './constants';
export const SIM_VERSION = 'battle-lab-6';
export const TICK_RATE = 30;
export type Team = 0 | 1;
export type Doctrine = 'balanced' | 'shieldwall' | 'charge';
export type Terrain = 'meadow' | 'crossroads' | 'rocky-pass' | 'river-valley' | 'highlands';
export type FormationRole = 'infantry' | 'ranged' | 'cavalry' | 'horse-archer' | 'siege';
export interface FormationSpec {
  id: number;
  role: FormationRole;
  weight: number;
  reserve?: boolean;
}
export const DEFAULT_FORMATIONS: FormationSpec[] = [
  { id: 0, role: 'infantry', weight: 1 },
  { id: 1, role: 'ranged', weight: 1 },
];
export interface ArmyConfig {
  formations?: FormationSpec[];
  cavalry?: number;
  horseArchers?: number;
  siege?: number;
  count: number;
  skirmishers: number;
  doctrine: Doctrine;
}
export interface BattleConfig {
  seed: number;
  terrain: Terrain;
  romans: ArmyConfig;
  gauls: ArmyConfig;
}
export interface UnitDesign {
  id: string;
  name: string;
  team: Team;
  role: 'infantry' | 'skirmisher' | 'commander' | 'cavalry' | 'horse-archer' | 'engineer';
  hp: number;
  armor: number;
  damage: number;
  speed: number;
  reach: number;
  windup: number;
  recovery: number;
  morale: number;
  ammo: number;
  shield: number;
  equipment: string[];
  ability: string;
  description: string;
}

export const UNITS: readonly UnitDesign[] = [
  {
    id: 'roman.legionary.v1',
    name: 'Legionary',
    team: 0,
    role: 'infantry',
    hp: 100,
    armor: 7,
    damage: 22,
    speed: 76,
    reach: 1700,
    windup: 10,
    recovery: 23,
    morale: 88,
    ammo: 0,
    shield: 28,
    equipment: ['Gladius', 'Curved scutum', 'Mail shirt', 'Bronze helmet'],
    ability: 'Shield discipline',
    description:
      'Armored close-order infantry. Strong frontal protection; vulnerable when flanked.',
  },
  {
    id: 'roman.auxiliary.v1',
    name: 'Auxiliary javelineer',
    team: 0,
    role: 'skirmisher',
    hp: 65,
    armor: 2,
    damage: 22,
    speed: 94,
    reach: 19000,
    windup: 15,
    recovery: 38,
    morale: 70,
    ammo: 7,
    shield: 12,
    equipment: ['Javelins ×7', 'Round buckler', 'Short sword', 'Wool tunic'],
    ability: 'Javelin volley',
    description:
      'Opens at range, maintains distance, then switches to a short sword when ammunition runs out.',
  },
  {
    id: 'roman.legate.v1',
    name: 'Roman legate',
    team: 0,
    role: 'commander',
    hp: 240,
    armor: 10,
    damage: 30,
    speed: 78,
    reach: 1900,
    windup: 10,
    recovery: 20,
    morale: 100,
    ammo: 0,
    shield: 30,
    equipment: ['Officer’s gladius', 'Scutum', 'Mail shirt', 'Crested helmet', 'Crimson cloak'],
    ability: 'Rally the line',
    description:
      'AI-controlled leader. Every 12 seconds, rallies nearby allies and restores stamina. His loss damages army morale.',
  },
  {
    id: 'gaul.warrior.v1',
    name: 'Gallic warrior',
    team: 1,
    role: 'infantry',
    hp: 105,
    armor: 3,
    damage: 26,
    speed: 94,
    reach: 1900,
    windup: 12,
    recovery: 24,
    morale: 78,
    ammo: 0,
    shield: 20,
    equipment: ['Long iron sword', 'Oval shield', 'Woven tunic', 'Trousers'],
    ability: 'Warband charge',
    description:
      'Fast, hard-hitting infantry with longer reach. Less protected than a legionary in sustained close combat.',
  },
  {
    id: 'gaul.skirmisher.v1',
    name: 'Gallic javelineer',
    team: 1,
    role: 'skirmisher',
    hp: 70,
    armor: 1,
    damage: 24,
    speed: 100,
    reach: 20000,
    windup: 14,
    recovery: 36,
    morale: 67,
    ammo: 7,
    shield: 10,
    equipment: ['Javelins ×7', 'Small oval shield', 'Iron knife', 'Woven tunic'],
    ability: 'Javelin volley',
    description:
      'Mobile missile troops that screen the warband. Limited ammunition and little armor.',
  },
  {
    id: 'gaul.warlord.v1',
    name: 'Gallic warlord',
    team: 1,
    role: 'commander',
    hp: 260,
    armor: 7,
    damage: 35,
    speed: 90,
    reach: 2000,
    windup: 12,
    recovery: 21,
    morale: 100,
    ammo: 0,
    shield: 25,
    equipment: ['Long sword', 'Decorated oval shield', 'Mail shirt', 'Gold torc', 'Teal cloak'],
    ability: 'War cry',
    description:
      'AI-controlled leader. Every 12 seconds, restores nearby morale and briefly increases attack damage. His loss damages army morale.',
  },
  {
    id: 'roman.equites.v1',
    name: 'Equites lancer',
    team: 0,
    role: 'cavalry',
    hp: 125,
    armor: 7,
    damage: 31,
    speed: 245,
    reach: 3000,
    windup: 14,
    recovery: 30,
    morale: 87,
    ammo: 0,
    shield: 18,
    equipment: [
      'Thrusting lance',
      'Oval cavalry shield',
      'Mail hauberk',
      'Bronze helmet',
      'Four-horn saddle',
      'Warhorse',
    ],
    ability: 'Couched charge',
    description:
      'Builds speed before lance impact. Turns slowly at a gallop; losing the horse leaves a dismounted fighter.',
  },
  {
    id: 'gaul.noble-rider.v1',
    name: 'Gallic noble rider',
    team: 1,
    role: 'cavalry',
    hp: 130,
    armor: 6,
    damage: 34,
    speed: 260,
    reach: 3200,
    windup: 15,
    recovery: 32,
    morale: 86,
    ammo: 0,
    shield: 17,
    equipment: [
      'Long cavalry spear',
      'Oval shield',
      'Mail hauberk',
      'Iron helmet',
      'Saddle and harness',
      'Warhorse',
    ],
    ability: 'Warband cavalry',
    description:
      'Fast shock cavalry; larger footprint and momentum make approach angle and open ground important.',
  },
  {
    id: 'roman.mounted-archer.v1',
    name: 'Eastern mounted auxiliary',
    team: 0,
    role: 'horse-archer',
    hp: 80,
    armor: 3,
    damage: 20,
    speed: 220,
    reach: 50000,
    windup: 18,
    recovery: 42,
    morale: 76,
    ammo: 28,
    shield: 0,
    equipment: [
      'Composite bow',
      'Quiver \u00d728',
      'Knife',
      'Scale vest',
      'Riding horse',
      'Bridle and saddle',
    ],
    ability: 'Mounted skirmish',
    description:
      'A fictional allied mounted contingent. Circles at bow range, shoots while moving, and avoids close infantry.',
  },
  {
    id: 'gaul.mounted-archer.v1',
    name: 'Steppe mercenary rider',
    team: 1,
    role: 'horse-archer',
    hp: 85,
    armor: 2,
    damage: 21,
    speed: 235,
    reach: 52000,
    windup: 17,
    recovery: 44,
    morale: 75,
    ammo: 28,
    shield: 0,
    equipment: [
      'Composite bow',
      'Quiver \u00d728',
      'Long knife',
      'Leather vest',
      'Riding horse',
      'Bridle and saddle',
    ],
    ability: 'Mounted skirmish',
    description:
      'A fictional hired contingent for combined-arms testing; not a claim about a historical Gallic roster.',
  },
  {
    id: 'roman.ballista-crew.v1',
    name: 'Roman ballista crew',
    team: 0,
    role: 'engineer',
    hp: 75,
    armor: 3,
    damage: 16,
    speed: 55,
    reach: 1400,
    windup: 12,
    recovery: 32,
    morale: 78,
    ammo: 0,
    shield: 0,
    equipment: ['Crew tools', 'Sidearm', 'Ballista', 'Torsion skeins', 'Bolt rack'],
    ability: 'Crewed artillery',
    description:
      'Three crew share a ballista. At least two standing crew are required to fire; it must stop and deploy.',
  },
  {
    id: 'gaul.ballista-crew.v1',
    name: 'Gallic captured-engine crew',
    team: 1,
    role: 'engineer',
    hp: 80,
    armor: 2,
    damage: 17,
    speed: 58,
    reach: 1450,
    windup: 13,
    recovery: 34,
    morale: 74,
    ammo: 0,
    shield: 0,
    equipment: ['Crew tools', 'Sidearm', 'Captured ballista', 'Torsion skeins', 'Bolt rack'],
    ability: 'Crewed artillery',
    description:
      'A captured siege engine operated by a small crew. Crew losses slow or disable the engine.',
  },
] as const;

export const DEFAULT_CONFIG: BattleConfig = {
  seed: 7541,
  terrain: 'meadow',
  romans: { count: 80, skirmishers: 20, doctrine: 'shieldwall' },
  gauls: { count: 100, skirmishers: 15, doctrine: 'charge' },
};
export interface Obstacle {
  x: number;
  z: number;
  radius: number;
}
export function obstaclesFor(terrain: Terrain): Obstacle[] {
  return worldObstacles(terrain);
}

function integer(value: unknown, low: number, high: number, name: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < low || value > high)
    throw new Error(`${name} must be an integer between ${low} and ${high}.`);
  return value;
}
export function validateConfig(input: unknown): BattleConfig {
  if (!input || typeof input !== 'object') throw new Error('Missing battle configuration.');
  const value = input as Record<string, unknown>;
  if (
    !['meadow', 'crossroads', 'rocky-pass', 'river-valley', 'highlands'].includes(
      value.terrain as string,
    )
  )
    throw new Error('Unknown terrain.');
  const army = (data: unknown, name: string): ArmyConfig => {
    if (!data || typeof data !== 'object') throw new Error(`Missing ${name} army.`);
    const a = data as Record<string, unknown>;
    if (!['balanced', 'shieldwall', 'charge'].includes(a.doctrine as string))
      throw new Error('Unknown army doctrine.');
    const raw = a.formations ?? DEFAULT_FORMATIONS;
    if (!Array.isArray(raw) || raw.length < 1 || raw.length > 5)
      throw Error('Use one to five formations per army.');
    const formations = raw
      .map((f: unknown): FormationSpec => {
        if (!f || typeof f !== 'object') throw Error('Invalid formation.');
        const v = f as Record<string, unknown>;
        if (!['infantry', 'ranged', 'cavalry', 'horse-archer', 'siege'].includes(v.role as string))
          throw Error('Unsupported formation role.');
        if (v.reserve !== undefined && typeof v.reserve !== 'boolean')
          throw Error('Invalid reserve flag.');
        return {
          reserve: v.reserve === true,
          id: integer(v.id, 0, 4, 'Formation ID'),
          role: v.role as FormationRole,
          weight: integer(v.weight, 1, 100, 'Formation share'),
        };
      })
      .sort((a, b) => a.id - b.id);
    if (new Set(formations.map((f) => f.id)).size !== formations.length)
      throw Error('Duplicate formation ID.');
    if (!formations.some((f) => f.role === 'infantry'))
      throw Error('An infantry formation must carry the commander.');
    if (Number(a.skirmishers) > 0 && !formations.some((f) => f.role === 'ranged'))
      throw Error('Javelineers need a ranged formation.');
    const cavalry = integer(a.cavalry ?? 0, 0, 70, 'Cavalry share');
    const horseArchers = integer(a.horseArchers ?? 0, 0, 70, 'Horse archer share');
    const siege = integer(a.siege ?? 0, 0, 12, 'Siege crew share');
    if (cavalry + horseArchers + siege + Number(a.skirmishers) > 90)
      throw Error('Keep at least 10% infantry; combined specialist shares cannot exceed 90%.');
    for (const [role, share] of [
      ['cavalry', cavalry],
      ['horse-archer', horseArchers],
      ['siege', siege],
    ] as const)
      if (share > 0 && !formations.some((f) => f.role === role))
        throw Error(`${role} troops need a matching formation.`);
    return {
      cavalry,
      horseArchers,
      siege,
      formations,
      count: integer(a.count, 2, MAX_ARMY, `${name} size`),
      skirmishers: integer(a.skirmishers, 0, 80, `${name} skirmishers`),
      doctrine: a.doctrine as Doctrine,
    };
  };
  return {
    seed: integer(value.seed, 0, 0xffffffff, 'Seed'),
    terrain: value.terrain as Terrain,
    romans: army(value.romans, 'Roman'),
    gauls: army(value.gauls, 'Gallic'),
  };
}

// Includes authoritative values, equipment/ability identities and terrain generation.
export const CONTENT_VERSION = 'rome-gaul-combined-2';

export function shieldDurability(type: number): number {
  if (UNITS[type].shield === 0) return 0;
  return UNITS[type].role === 'commander'
    ? 200
    : UNITS[type].role === 'skirmisher'
      ? 60
      : UNITS[type].team === 0
        ? 160
        : 120;
}

/** Integer largest-remainder allocation; IDs break ties. Commander is reserved separately. */
export function formationRoster(army: ArmyConfig): (FormationSpec & { count: number })[] {
  const list = (army.formations ?? DEFAULT_FORMATIONS)
    .map((f) => ({ ...f, count: 0 }))
    .sort((a, b) => a.id - b.id);
  const ranged = Math.floor(((army.count - 1) * army.skirmishers) / 100);
  const cavalry = Math.floor(((army.count - 1) * (army.cavalry ?? 0)) / 100),
    horseArchers = Math.floor(((army.count - 1) * (army.horseArchers ?? 0)) / 100),
    siege = Math.floor(((army.count - 1) * (army.siege ?? 0)) / 300) * 3;
  const pools = {
    infantry: army.count - 1 - ranged - cavalry - horseArchers - siege,
    ranged,
    cavalry,
    'horse-archer': horseArchers,
    siege,
  };
  for (const role of ['infantry', 'ranged', 'cavalry', 'horse-archer', 'siege'] as const) {
    const entries = list.filter((f) => f.role === role),
      pool = pools[role] / (role === 'siege' ? 3 : 1);
    const total = entries.reduce((sum, f) => sum + f.weight, 0);
    for (const f of entries) f.count = Math.floor((pool * f.weight) / total);
    let left = pool - entries.reduce((sum, f) => sum + f.count, 0);
    entries.sort(
      (a, b) => ((pool * b.weight) % total) - ((pool * a.weight) % total) || a.id - b.id,
    );
    for (const f of entries) if (left-- > 0) f.count++;
    if (role === 'siege') for (const f of entries) f.count *= 3;
  }
  list.find((f) => f.role === 'infantry')!.count++;
  return list;
}

export const ROLE_LABELS: Record<FormationRole, string> = {
  infantry: 'Infantry',
  ranged: 'Javelineers',
  cavalry: 'Cavalry',
  'horse-archer': 'Horse archers',
  siege: 'Siege crews',
};
export const ROLE_TYPES: Record<FormationRole, readonly [number, number]> = {
  infantry: [0, 3],
  ranged: [1, 4],
  cavalry: [6, 7],
  'horse-archer': [8, 9],
  siege: [10, 11],
};
export const isMountedType = (type: number) =>
  UNITS[type].role === 'cavalry' || UNITS[type].role === 'horse-archer';
export const isMissileType = (type: number) =>
  UNITS[type].role === 'skirmisher' || UNITS[type].role === 'horse-archer';
export const formationRole = (type: number): FormationRole =>
  UNITS[type].role === 'commander'
    ? 'infantry'
    : UNITS[type].role === 'skirmisher'
      ? 'ranged'
      : UNITS[type].role === 'engineer'
        ? 'siege'
        : (UNITS[type].role as FormationRole);
