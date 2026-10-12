import * as THREE from 'three';
import { box, sphere, cylinder, colored, merge } from './unit-models';

/** Original experimental recipes. Metres, +Z forward, horse seat at y=1.45. */
export function createHorseModel(crowd = false): Record<string, THREE.BufferGeometry> {
  const coat = '#75513b',
    mane = '#302a26',
    tack = '#40352b';
  const shape = (
    color: string,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
  ) =>
    crowd
      ? colored(new THREE.IcosahedronGeometry(1, 0), color, x, y, z, sx, sy, sz)
      : sphere(color, x, y, z, sx, sy, sz);
  const body = [
    shape(coat, 0, 1.14, 0, 0.36, 0.45, 0.86),
    shape(coat, 0, 1.52, 0.6, 0.25, 0.52, 0.35),
    shape(coat, 0, 1.95, 0.79, 0.18, 0.32, 0.24),
    shape('#514035', 0, 1.83, 1.02, 0.17, 0.14, 0.23),
    box(mane, 0, 1.69, 0.39, 0.09, 0.66, 0.17, -0.3),
    box(mane, 0, 0.86, -0.85, 0.12, 0.73, 0.14, 0.3),
    shape('#963e30', 0, 1.43, -0.03, 0.4, 0.11, 0.38),
    box(tack, 0, 1.51, -0.02, 0.54, 0.12, 0.5),
    box(tack, 0, 1.12, 0.19, 0.75, 0.08, 0.08),
  ];
  for (const side of [-1, 1]) {
    body.push(
      colored(new THREE.ConeGeometry(0.075, 0.25, 4), coat, side * 0.12, 2.23, 0.74, 1, 1, 1, -0.2),
    );
    body.push(shape('#181b18', side * 0.165, 2.01, 0.9, 0.026, 0.027, 0.024));
    body.push(box(tack, side * 0.18, 1.94, 0.87, 0.025, 0.29, 0.035, -0.5));
    body.push(box(tack, side * 0.25, 1.6, 0.56, 0.022, 0.025, 0.83, -0.5));
    for (const front of [-1, 1])
      body.push(cylinder(tack, side * 0.24, 1.62, front * 0.2, 0.037, 0.2));
    if (!crowd)
      body.push(
        colored(
          new THREE.TorusGeometry(0.055, 0.012, 4, 10),
          '#b5a476',
          side * 0.185,
          1.86,
          1.01,
          1,
          1,
          1,
          0,
          Math.PI / 2,
        ),
      );
  }
  const result: Record<string, THREE.BufferGeometry> = { body: merge(body) };
  for (const key of ['frontLeft', 'frontRight', 'rearLeft', 'rearRight']) {
    result[key] = merge([
      cylinder(coat, 0, -0.19, 0, 0.1, 0.38),
      cylinder(coat, 0, -0.59, 0.025, 0.055, 0.46, -0.08),
      box('#302c29', 0, -0.87, 0.04, 0.15, 0.14, 0.21),
    ]);
  }
  return result;
}
export const HORSE_JOINTS: Record<string, [number, number, number]> = {
  body: [0, 0, 0],
  frontLeft: [-0.24, 0.94, 0.53],
  frontRight: [0.24, 0.94, 0.53],
  rearLeft: [-0.25, 0.94, -0.56],
  rearRight: [0.25, 0.94, -0.56],
};

/** Transportable torsion ballista: frame, skeins, crank, bolt trough and four wheels. */
export function createBallistaModel(): THREE.BufferGeometry {
  const wood = '#88623d',
    iron = '#555b58',
    rope = '#c5b490';
  const p = [
    box(wood, 0, 0.6, 0, 1.8, 0.22, 2.8),
    box(wood, 0, 1.2, 0.1, 0.25, 0.28, 3.2),
    box(iron, 0, 1.35, 0.1, 0.065, 0.035, 2.7),
    box(wood, 0, 1.06, 1.03, 3.5, 0.3, 0.25),
  ];
  for (const side of [-1, 1]) {
    p.push(
      box(wood, side * 0.73, 0.87, 0.4, 0.22, 1.1, 0.22),
      cylinder(rope, side * 1.3, 1.38, 1.03, 0.2, 0.8),
    );
    p.push(
      box(wood, side * 1.3, 1.85, 1.03, 0.65, 0.12, 0.6),
      box(wood, side * 1.3, 0.93, 1.03, 0.65, 0.12, 0.6),
    );
    p.push(
      box(wood, side * 1.62, 1.42, 0.66, 1.3, 0.12, 0.15, 0, -side * 0.6),
      box(rope, side * 0.87, 1.42, 0.05, 1.9, 0.025, 0.025, 0, -side * 0.2),
    );
    for (let n = 0; n < 9; n++)
      p.push(cylinder(n % 2 ? '#aa9875' : rope, side * 1.3, 1.04 + n * 0.079, 1.03, 0.205, 0.025));
    for (const z of [-0.95, 0.95]) {
      p.push(
        colored(
          new THREE.CylinderGeometry(0.45, 0.45, 0.15, 12),
          wood,
          side * 1.02,
          0.46,
          z,
          1,
          1,
          1,
          0,
          0,
          Math.PI / 2,
        ),
      );
      p.push(
        colored(
          new THREE.TorusGeometry(0.42, 0.035, 4, 16),
          iron,
          side * 1.11,
          0.46,
          z,
          1,
          1,
          1,
          0,
          Math.PI / 2,
        ),
      );
    }
    p.push(box(iron, side * 0.4, 1.07, -1.05, 0.08, 0.45, 0.08));
  }
  p.push(
    colored(
      new THREE.CylinderGeometry(0.08, 0.08, 1.1, 8),
      wood,
      0,
      1.03,
      -1.05,
      1,
      1,
      1,
      0,
      0,
      Math.PI / 2,
    ),
  );
  for (let n = 0; n < 5; n++) p.push(box('#b3a078', 0.35 + n * 0.1, 0.77, -0.2, 0.035, 0.035, 1.7));
  return merge(p);
}
