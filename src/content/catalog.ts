export const SIM_VERSION = 'battle-lab-2';
export const TICK_RATE = 30;
export const SCALE = 1024;
export const MAX_ARMY = 1000;
export type Team = 0 | 1;
export type Doctrine = 'balanced' | 'shieldwall' | 'charge';
export type Terrain = 'meadow' | 'crossroads' | 'rocky-pass';
export interface ArmyConfig {
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
  role: 'infantry' | 'skirmisher' | 'commander';
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
  return terrain === 'rocky-pass'
    ? [
        { x: 0, z: -19 * SCALE, radius: 9 * SCALE },
        { x: 0, z: 19 * SCALE, radius: 9 * SCALE },
      ]
    : [];
}

function integer(value: unknown, low: number, high: number, name: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < low || value > high)
    throw new Error(`${name} must be an integer between ${low} and ${high}.`);
  return value;
}
export function validateConfig(input: unknown): BattleConfig {
  if (!input || typeof input !== 'object') throw new Error('Missing battle configuration.');
  const value = input as Record<string, unknown>;
  if (!['meadow', 'crossroads', 'rocky-pass'].includes(value.terrain as string))
    throw new Error('Unknown terrain.');
  const army = (data: unknown, name: string): ArmyConfig => {
    if (!data || typeof data !== 'object') throw new Error(`Missing ${name} army.`);
    const a = data as Record<string, unknown>;
    if (!['balanced', 'shieldwall', 'charge'].includes(a.doctrine as string))
      throw new Error('Unknown army doctrine.');
    return {
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
export const CONTENT_VERSION = 'rome-gaul-1';
