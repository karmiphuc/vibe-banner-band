import type { Team } from '../content/catalog';
export const ENGINE_STRIDE = 14;
export interface SiegeEngine {
  aimX: number;
  aimZ: number;
  id: number;
  team: Team;
  formation: number;
  x: number;
  z: number;
  heading: number;
  hp: number;
  ammo: number;
  cooldown: number;
  setup: number;
  serial: number;
  target: number;
  crew: number[];
}
