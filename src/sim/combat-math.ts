import { SCALE } from '../content/catalog';
import { isqrt, normalize } from './math';
/** Integer 10-degree maximum turn. An exact reversal takes the stable positive turn. */
export function turnToward(fx: number, fz: number, dx: number, dz: number): [number, number] {
  const [tx, tz] = normalize(dx, dz, SCALE);
  if (!tx && !tz) return [fx, fz];
  if (!fx && !fz) return [tx, tz];
  if (fx * tx + fz * tz >= 1008 * SCALE) return [tx, tz];
  const sign = fx * tz - fz * tx >= 0 ? 1 : -1;
  return normalize(fx * 1008 - fz * 178 * sign, fz * 1008 + fx * 178 * sign, SCALE);
}
/** Front 120-degree cone: dot >= length / 2. Equality belongs to the front. */
export function inFront(fx: number, fz: number, dx: number, dz: number, cosine = 512): boolean {
  const length = isqrt(dx * dx + dz * dz);
  return length === 0 || fx * dx + fz * dz >= length * cosine;
}
