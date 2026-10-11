import { SCALE } from '../content/catalog';
/** Clockwise headings on the ground plane. Quantized diagonals keep authority integer-only. */
export const HEADINGS: readonly (readonly [number, number])[] = [
  [1024, 0],
  [724, 724],
  [0, 1024],
  [-724, 724],
  [-1024, 0],
  [-724, -724],
  [0, -1024],
  [724, -724],
];
export function rotatedSlot(depth: number, lateral: number, heading: number): [number, number] {
  const [x, z] = HEADINGS[heading];
  return [
    Math.trunc((-depth * x - lateral * z) / SCALE),
    Math.trunc((-depth * z + lateral * x) / SCALE),
  ];
}
