import type { BattleConfig } from './catalog';
export interface Scenario {
  id: string;
  name: string;
  description: string;
  config: BattleConfig;
}
const combinedArmy = (count: number) => ({
  count,
  skirmishers: 18,
  cavalry: 24,
  horseArchers: 14,
  siege: 6,
  doctrine: 'balanced' as const,
  formations: [
    { id: 0, role: 'infantry' as const, weight: 1 },
    { id: 1, role: 'ranged' as const, weight: 1 },
    { id: 2, role: 'cavalry' as const, weight: 1 },
    { id: 3, role: 'horse-archer' as const, weight: 1 },
    { id: 4, role: 'siege' as const, weight: 1 },
  ],
});
export const SCENARIOS: readonly Scenario[] = [
  {
    id: 'combined',
    name: 'Eagles on the highlands',
    description:
      '300 per side. Five formations: infantry, javelins, cavalry, mounted archers and ballista crews. Use open flanks and ridge cover on a 640 m battlefield.',
    config: {
      seed: 7541,
      terrain: 'highlands',
      romans: combinedArmy(300),
      gauls: combinedArmy(300),
    },
  },
  {
    id: 'fords',
    name: 'The two river crossings',
    description:
      '500 per side. A river divides the valley. Cross at the northern or southern ford; forests slow horses and ridges obstruct shots.',
    config: {
      seed: 9124,
      terrain: 'river-valley',
      romans: combinedArmy(500),
      gauls: combinedArmy(500),
    },
  },
  {
    id: 'maximum',
    name: 'Five thousand — capacity experiment',
    description:
      '2,500 soldiers per side, including ballista crews. Performance is device-dependent; inspect simulation time in Diagnostics.',
    config: {
      seed: 4812,
      terrain: 'highlands',
      romans: combinedArmy(2500),
      gauls: combinedArmy(2500),
    },
  },
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
