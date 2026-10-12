import * as THREE from 'three';
import { BANNERS, type BannerId } from '../content/banners';
import { box, cylinder, colored, merge } from './unit-models';

export const BANNER_RECIPE = 'carried-standards-1';
/** Metres, +Y pole, +Z cloth front; origin is the right-hand grip. */
export function createBannerModel(
  item: BannerId,
): Record<'shaft' | 'metal' | 'cloth', THREE.BufferGeometry> {
  const banner = BANNERS[item],
    gold = '#d8b568',
    bronze = '#b2945c';
  const metal: THREE.BufferGeometry[] = [];
  const shaft = merge([
    cylinder('#775335', 0, 1.0, 0, 0.028, 3.3),
    cylinder('#d3ad67', 0, -0.52, 0, 0.038, 0.22),
    cylinder('#ad8545', 0, 2.55, 0, 0.046, 0.2),
    box('#cdac68', 0, 2.35, 0, 1.12, 0.047, 0.055),
    cylinder('#4b3527', 0, 0, 0, 0.034, 0.19),
  ]);
  const silhouette = (points: number[][], y: number, scale = 1) => {
    const shape = new THREE.Shape();
    points.forEach(([x, z], i) =>
      i ? shape.lineTo(x * scale, z * scale) : shape.moveTo(x * scale, z * scale),
    );
    shape.closePath();
    return colored(
      new THREE.ExtrudeGeometry(shape, {
        depth: 0.045,
        bevelEnabled: true,
        bevelSize: 0.012,
        bevelThickness: 0.008,
        bevelSegments: 1,
        steps: 1,
      }),
      gold,
      0,
      y,
      -0.025,
    );
  };
  if (banner.style === 'eagle') {
    metal.push(
      silhouette(
        [
          [-0.1, 0],
          [-0.15, 0.13],
          [-0.38, 0.15],
          [-0.58, 0.33],
          [-0.62, 0.63],
          [-0.45, 0.45],
          [-0.29, 0.34],
          [-0.14, 0.26],
          [-0.07, 0.32],
          [-0.07, 0.5],
          [0.01, 0.56],
          [0.14, 0.53],
          [0.17, 0.47],
          [0.06, 0.43],
          [0.06, 0.3],
          [0.17, 0.27],
          [0.3, 0.35],
          [0.47, 0.47],
          [0.62, 0.63],
          [0.58, 0.34],
          [0.38, 0.16],
          [0.15, 0.13],
          [0.1, 0],
        ],
        2.56,
      ),
    );
    for (const side of [-1, 1])
      for (let n = 0; n < 4; n++)
        metal.push(
          box(
            '#f1d899',
            side * (0.23 + n * 0.075),
            2.79 + n * 0.065,
            0.023,
            0.027,
            0.15,
            0.018,
            0,
            0,
            side * -0.48,
          ),
        );
    metal.push(box(bronze, 0, 2.56, 0, 0.34, 0.065, 0.15));
  } else if (banner.style === 'boar') {
    metal.push(
      silhouette(
        [
          [-0.47, 0.12],
          [-0.52, 0.27],
          [-0.4, 0.34],
          [-0.34, 0.4],
          [-0.26, 0.36],
          [-0.17, 0.42],
          [-0.08, 0.38],
          [0.02, 0.42],
          [0.1, 0.35],
          [0.26, 0.34],
          [0.33, 0.44],
          [0.4, 0.29],
          [0.58, 0.23],
          [0.59, 0.1],
          [0.4, 0.08],
          [0.31, 0.13],
          [0.22, 0.06],
          [0.19, -0.05],
          [0.09, -0.05],
          [0.11, 0.1],
          [-0.22, 0.09],
          [-0.26, -0.07],
          [-0.36, -0.07],
          [-0.34, 0.1],
        ],
        2.65,
      ),
    );
    metal.push(
      colored(
        new THREE.ConeGeometry(0.045, 0.16, 4),
        '#ece4c8',
        0.45,
        2.7,
        0.035,
        1,
        1,
        1,
        0,
        0,
        0.5,
      ),
    );
  } else if (banner.style === 'horse') {
    metal.push(
      silhouette(
        [
          [-0.2, -0.03],
          [-0.19, 0.18],
          [-0.35, 0.31],
          [-0.17, 0.34],
          [-0.08, 0.57],
          [0.06, 0.42],
          [0.25, 0.34],
          [0.38, 0.1],
          [0.25, 0.04],
          [0.1, 0.19],
          [0.02, 0.14],
          [0.01, 0.01],
          [0.22, -0.03],
        ],
        2.65,
      ),
    );
  } else {
    metal.push(colored(new THREE.ConeGeometry(0.09, 0.36, 6), gold, 0, 2.76, 0));
  }
  // Sculpted bodies give the metal finials depth beyond their wing/profile silhouette.
  if (banner.style === 'eagle') {
    metal.push(colored(new THREE.SphereGeometry(1, 10, 6), gold, 0, 2.84, 0, 0.105, 0.19, 0.09));
    metal.push(
      colored(new THREE.SphereGeometry(1, 8, 6), '#efd399', 0.015, 3.05, 0.012, 0.07, 0.065, 0.055),
    );
  } else if (banner.style === 'boar') {
    metal.push(
      colored(new THREE.SphereGeometry(1, 10, 6), bronze, -0.02, 2.88, 0, 0.4, 0.13, 0.11),
    );
    metal.push(colored(new THREE.SphereGeometry(1, 8, 6), gold, 0.4, 2.86, 0, 0.16, 0.095, 0.08));
  }
  // Embossed wreath/wheel, visible from both faces; no screen-space icon.
  for (const side of [-1, 1]) {
    metal.push(
      colored(new THREE.TorusGeometry(0.23, 0.014, 4, 20), gold, 0, 1.88, side * 0.042 + 0.06),
    );
    for (let n = 0; n < 10; n++) {
      const a = (n * Math.PI * 2) / 10;
      metal.push(
        colored(
          new THREE.SphereGeometry(1, 6, 4),
          '#e0c481',
          Math.sin(a) * 0.26,
          1.88 + Math.cos(a) * 0.26,
          side * 0.05 + 0.06,
          0.027,
          0.067,
          0.008,
          0,
          0,
          -a + 0.45,
        ),
      );
    }
    if (banner.team === 0)
      metal.push(
        box(gold, -0.035, 1.98, side * 0.055 + 0.06, 0.045, 0.19, 0.012, 0, 0, -0.45),
        box(gold, 0, 1.88, side * 0.055 + 0.06, 0.14, 0.045, 0.012),
        box(gold, 0.035, 1.78, side * 0.055 + 0.06, 0.045, 0.19, 0.012, 0, 0, -0.45),
      );
    else
      metal.push(
        box(gold, 0, 1.88, side * 0.055 + 0.06, 0.027, 0.4, 0.012),
        box(gold, 0, 1.88, side * 0.055 + 0.06, 0.4, 0.027, 0.012),
      );
  }
  for (const y of [0.65, 0.86])
    metal.push(
      colored(
        new THREE.CylinderGeometry(0.09, 0.09, 0.035, 12),
        gold,
        0,
        y,
        0.015,
        1,
        1,
        1,
        Math.PI / 2,
      ),
    );
  const clothGeometry = new THREE.PlaneGeometry(1.0, 0.98, 10, 8);
  const pos = clothGeometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      y = pos.getY(i);
    const bottom = y < -0.45;
    pos.setXYZ(i, x, y + 1.84, 0.017 * Math.cos(x * 15));
    if (bottom && banner.team === 1) pos.setY(i, 1.35 + 0.18 * (1 - Math.abs(x) * 2));
  }
  clothGeometry.computeVertexNormals();
  const cloth = colored(clothGeometry, banner.cloth, 0, 0, 0.06);
  // Edge strips and hanging ties are part of the equipment, not a UI border.
  metal.push(
    box(gold, -0.49, 1.85, 0, 0.018, 0.99, 0.02),
    box(gold, 0.49, 1.85, 0, 0.018, 0.99, 0.02),
  );
  return { shaft, metal: merge(metal), cloth };
}
