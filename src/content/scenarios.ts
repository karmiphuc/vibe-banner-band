import type { BattleConfig } from './catalog';
export interface Scenario {
  id: string;
  name: string;
  description: string;
  config: BattleConfig;
}
export const SCENARIOS: readonly Scenario[] = [
  {
    id: 'hammer',
    name: 'The held reserve',
    description:
      '180 Romans · 220 Gauls. Hold the main line; send Roman formation 3 around the flank, then commit it. The reserve starts behind the javelineers.',
    config: {
      seed: 19241,
      terrain: 'meadow',
      romans: {
        count: 180,
        skirmishers: 20,
        doctrine: 'shieldwall',
        formations: [
          { id: 0, role: 'infantry', weight: 3 },
          { id: 1, role: 'ranged', weight: 1 },
          { id: 2, role: 'infantry', weight: 1, reserve: true },
        ],
      },
      gauls: {
        count: 220,
        skirmishers: 15,
        doctrine: 'charge',
        formations: [
          { id: 0, role: 'infantry', weight: 3 },
          { id: 1, role: 'ranged', weight: 1 },
          { id: 2, role: 'infantry', weight: 1 },
        ],
      },
    },
  },
  {
    id: 'frontier',
    name: 'The frontier',
    description: '80 Romans · 100 Gauls. A shield line meets a warband charge.',
    config: {
      seed: 7541,
      terrain: 'meadow',
      romans: { count: 80, skirmishers: 20, doctrine: 'shieldwall' },
      gauls: { count: 100, skirmishers: 15, doctrine: 'charge' },
    },
  },
  {
    id: 'pass',
    name: 'Hold the passage',
    description: '120 Romans · 180 Gauls. Outcrops funnel the assault.',
    config: {
      seed: 2918,
      terrain: 'rocky-pass',
      romans: { count: 120, skirmishers: 15, doctrine: 'shieldwall' },
      gauls: { count: 180, skirmishers: 10, doctrine: 'charge' },
    },
  },
  {
    id: 'volley',
    name: 'Javelin exchange',
    description: '60 per side. Watch range, shields and ammunition.',
    config: {
      seed: 8130,
      terrain: 'crossroads',
      romans: { count: 60, skirmishers: 65, doctrine: 'balanced' },
      gauls: { count: 60, skirmishers: 65, doctrine: 'balanced' },
    },
  },
  {
    id: 'legions',
    name: 'Clash of armies',
    description: '500 per side. A large-scale formation and morale experiment.',
    config: {
      seed: 4102,
      terrain: 'meadow',
      romans: { count: 500, skirmishers: 20, doctrine: 'shieldwall' },
      gauls: { count: 500, skirmishers: 25, doctrine: 'charge' },
    },
  },
];
