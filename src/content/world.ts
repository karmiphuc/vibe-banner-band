import { SCALE, WORLD_HALF } from './constants';
import type { Terrain } from './catalog';
export const WORLD_VERSION = 'frontier-terrain-2';
export const FORDS = [-100 * SCALE, 90 * SCALE] as const;
export const WOODS = [
  { x: -115 * SCALE, z: -100 * SCALE, r: 42 * SCALE },
  { x: 105 * SCALE, z: 115 * SCALE, r: 48 * SCALE },
  { x: -175 * SCALE, z: 145 * SCALE, r: 55 * SCALE },
  { x: 190 * SCALE, z: -145 * SCALE, r: 50 * SCALE },
];
export const riverX = (z: number) => Math.trunc(z / 6);
export function forestAt(x: number, z: number): boolean {
  return WOODS.some((w) => (x - w.x) ** 2 + (z - w.z) ** 2 < w.r * w.r);
}
export function fordAt(z: number): boolean {
  return FORDS.some((f) => Math.abs(z - f) < 14 * SCALE);
}
export function blockedWater(terrain: Terrain, x: number, z: number): boolean {
  return terrain === 'river-valley' && Math.abs(x - riverX(z)) < 9 * SCALE && !fordAt(z);
}
export function terrainHeight(terrain: Terrain, x: number, z: number): number {
  const hump = (cx: number, cz: number, rx: number, rz: number, height: number) => {
    const q = Math.max(
      0,
      1024 -
        Math.trunc(((x - cx) ** 2 * 1024) / (rx * rx)) -
        Math.trunc(((z - cz) ** 2 * 1024) / (rz * rz)),
    );
    return Math.trunc((height * q * q) / (1024 * 1024));
  };
  let h = 0;
  if (terrain === 'river-valley' || terrain === 'highlands') {
    h =
      hump(-100 * SCALE, 75 * SCALE, 110 * SCALE, 110 * SCALE, 18 * SCALE) +
      hump(130 * SCALE, -70 * SCALE, 120 * SCALE, 100 * SCALE, 23 * SCALE) +
      hump(-220 * SCALE, -180 * SCALE, 100 * SCALE, 85 * SCALE, 28 * SCALE);
    if (terrain === 'river-valley') {
      const shore = Math.min(24 * SCALE, Math.abs(x - riverX(z)));
      h = Math.trunc((h * shore) / (24 * SCALE));
      if (shore < 12 * SCALE) h = fordAt(z) ? 400 : -350;
    }
  }
  return Math.trunc(h / 8) * 8;
}
export function terrainSpeed(terrain: Terrain, x: number, z: number, mounted: boolean): number {
  if (terrain === 'meadow' || terrain === 'crossroads' || terrain === 'rocky-pass') return 100;
  if (terrain === 'river-valley' && Math.abs(x - riverX(z)) < 14 * SCALE) return mounted ? 48 : 65;
  return forestAt(x, z) ? (mounted ? 48 : 72) : 100;
}
/** Explicit ford routing. This does not claim arbitrary terrain pathfinding. */
export function travelWaypoint(
  terrain: Terrain,
  x: number,
  z: number,
  gx: number,
  gz: number,
): [number, number] {
  if (terrain !== 'river-valley' || (x - riverX(z)) * (gx - riverX(gz)) >= 0) return [gx, gz];
  const ford = FORDS.reduce((a, b) =>
    Math.abs(z - a) + Math.abs(gz - a) <= Math.abs(z - b) + Math.abs(gz - b) ? a : b,
  );
  if (Math.abs(z - ford) > 10 * SCALE)
    return [riverX(ford) + (x < riverX(z) ? -18 : 18) * SCALE, ford];
  return [riverX(ford) + (gx < riverX(gz) ? -20 : 20) * SCALE, ford];
}
export function terrainLineClear(
  terrain: Terrain,
  x: number,
  z: number,
  y: number,
  tx: number,
  tz: number,
  ty: number,
): boolean {
  for (let i = 1; i < 8; i++) {
    const px = x + Math.trunc(((tx - x) * i) / 8),
      pz = z + Math.trunc(((tz - z) * i) / 8),
      py = y + Math.trunc(((ty - y) * i) / 8);
    if (terrainHeight(terrain, px, pz) + 400 > py) return false;
  }
  return true;
}
export function worldObstacles(terrain: Terrain): { x: number; z: number; radius: number }[] {
  if (terrain === 'rocky-pass')
    return [
      { x: 0, z: -19 * SCALE, radius: 9 * SCALE },
      { x: 0, z: 19 * SCALE, radius: 9 * SCALE },
    ];
  if (terrain === 'river-valley' || terrain === 'highlands')
    return [
      { x: -80 * SCALE, z: 145 * SCALE, radius: 9 * SCALE },
      { x: 70 * SCALE, z: -145 * SCALE, radius: 11 * SCALE },
      { x: -180 * SCALE, z: -30 * SCALE, radius: 7 * SCALE },
      { x: 190 * SCALE, z: 35 * SCALE, radius: 12 * SCALE },
    ];
  return [];
}
export const inWorld = (x: number, z: number) =>
  Math.abs(x) <= WORLD_HALF && Math.abs(z) <= WORLD_HALF;
