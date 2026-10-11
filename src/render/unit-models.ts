import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Original, deterministic articulated prototype recipes; not skinned production assets. */
export const ASSET_RECIPE_VERSION = 'rome-gaul-articulated-1';
export type PartName = 'body' | 'leftLeg' | 'rightLeg' | 'leftArm' | 'rightArm';
export interface UnitModel {
  parts: Record<PartName, THREE.BufferGeometry>;
  height: number;
}
const skin = '#c69e78',
  iron = '#8a9290',
  bronze = '#b99a58',
  dark = '#332c24',
  leather = '#66503b';
function colored(
  geometry: THREE.BufferGeometry,
  color: string,
  x = 0,
  y = 0,
  z = 0,
  sx = 1,
  sy = 1,
  sz = 1,
  rx = 0,
  ry = 0,
  rz = 0,
): THREE.BufferGeometry {
  geometry.applyMatrix4(
    new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
      new THREE.Vector3(sx, sy, sz),
    ),
  );
  const c = new THREE.Color(color),
    count = geometry.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  // Standardize attribute sets so a merged part can use a single material.
  geometry.deleteAttribute('uv');
  return geometry.index ? geometry.toNonIndexed() : geometry;
}
const box = (
  color: string,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  rx = 0,
  ry = 0,
  rz = 0,
) => colored(new THREE.BoxGeometry(1, 1, 1), color, x, y, z, sx, sy, sz, rx, ry, rz);
const sphere = (
  color: string,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
) => colored(new THREE.SphereGeometry(1, 10, 7), color, x, y, z, sx, sy, sz);
const cylinder = (
  color: string,
  x: number,
  y: number,
  z: number,
  radius: number,
  height: number,
  rx = 0,
) =>
  colored(
    new THREE.CylinderGeometry(radius, radius * 0.92, height, 8),
    color,
    x,
    y,
    z,
    1,
    1,
    1,
    rx,
  );
const merge = (parts: THREE.BufferGeometry[]) => {
  const geometry = mergeGeometries(parts, false)!;
  for (const p of parts) p.dispose();
  geometry.computeBoundingSphere();
  return geometry;
};

export function createUnitModel(type: number, meleeSidearm = false): UnitModel {
  const roman = type < 3,
    leader = type % 3 === 2,
    ranged = type % 3 === 1;
  const cloth = roman
    ? leader
      ? '#ac4435'
      : ranged
        ? '#b6a17c'
        : '#914233'
    : leader
      ? '#42685c'
      : ranged
        ? '#b19668'
        : '#588071';
  const pants = roman ? skin : '#6c6950';
  const torso: THREE.BufferGeometry[] = [
    colored(
      new THREE.CylinderGeometry(0.22, 0.26, 0.49, 8),
      !ranged && (roman || leader) ? iron : cloth,
      0,
      1.18,
      0,
      1,
      1,
      0.65,
    ),
    colored(new THREE.CylinderGeometry(0.21, 0.3, 0.3, 8), cloth, 0, 0.83, 0, 1, 1, 0.65),
    cylinder(leather, 0, 0.99, 0, 0.238, 0.045),
    box(bronze, 0, 0.99, 0.16, 0.075, 0.065, 0.025),
    cylinder(skin, 0, 1.46, 0, 0.075, 0.14),
    sphere(skin, 0, 1.61, 0.012, 0.135, 0.175, 0.13),
    box(skin, 0, 1.6, 0.144, 0.038, 0.068, 0.035),
    box(dark, -0.047, 1.65, 0.126, 0.032, 0.016, 0.012),
    box(dark, 0.047, 1.65, 0.126, 0.032, 0.016, 0.012),
  ];
  // Mail hems and separate leather shoulder straps, legible even without textures.
  if (!ranged && (roman || leader))
    for (let r = 0; r < 5; r++)
      torso.push(box('#626e6d', 0, 1.04 + r * 0.06, 0.153, 0.37, 0.012, 0.012));
  torso.push(box(leather, 0.14, 1.22, 0.153, 0.035, 0.4, 0.025, 0, 0, -0.1));
  if (roman || leader) {
    torso.push(
      colored(
        new THREE.SphereGeometry(0.15, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
        roman ? bronze : iron,
        0,
        1.65,
        0,
      ),
    );
    torso.push(
      box(roman ? bronze : iron, -0.142, 1.58, 0.035, 0.035, 0.16, 0.105),
      box(roman ? bronze : iron, 0.142, 1.58, 0.035, 0.035, 0.16, 0.105),
      box(iron, 0, 1.58, -0.12, 0.26, 0.09, 0.075),
    );
  } else {
    torso.push(
      colored(
        new THREE.SphereGeometry(0.142, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
        '#735435',
        0,
        1.64,
        0,
      ),
    );
    torso.push(box('#735435', 0, 1.565, 0.137, 0.1, 0.022, 0.025));
  }
  if (!roman) {
    torso.push(
      colored(
        new THREE.TorusGeometry(0.081, 0.014, 5, 14, Math.PI * 1.7),
        bronze,
        0,
        1.47,
        0.008,
        1,
        1,
        1,
        Math.PI / 2,
      ),
    );
    if (!ranged)
      for (let k = -1; k <= 1; k++)
        torso.push(box('#a9b9a0', k * 0.085, 0.83, 0.173, 0.018, 0.25, 0.014));
  }
  if (leader) {
    const cloak = new THREE.BufferGeometry();
    cloak.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        [
          -0.24, 1.4, -0.16, 0.24, 1.4, -0.16, -0.36, 0.48, -0.32, 0.24, 1.4, -0.16, 0.36, 0.48,
          -0.32, -0.36, 0.48, -0.32,
        ],
        3,
      ),
    );
    cloak.computeVertexNormals();
    torso.push(colored(cloak, cloth));
    torso.push(
      box(bronze, -0.2, 1.36, 0.15, 0.07, 0.065, 0.03),
      box(bronze, 0.2, 1.36, 0.15, 0.07, 0.065, 0.03),
    );
    if (roman) torso.push(box('#af3d2e', 0, 1.86, 0, 0.3, 0.14, 0.055));
    else torso.push(sphere('#6a5540', 0, 1.4, -0.04, 0.3, 0.1, 0.2));
    // Small back standard; faction silhouettes distinguish commanders at army scale.
    torso.push(cylinder(bronze, -0.33, 1.73, -0.14, 0.016, 1.2));
    torso.push(box(cloth, -0.16, 2.12, -0.14, 0.33, 0.28, 0.028));
    torso.push(
      box(bronze, -0.16, 2.12, -0.115, 0.16, 0.034, 0.018),
      box(bronze, -0.16, 2.12, -0.115, 0.03, 0.18, 0.018),
    );
  }
  const leg = (right: boolean) =>
    merge([
      cylinder(pants, 0, -0.2, 0, 0.084, 0.39),
      cylinder(roman ? skin : pants, 0, -0.53, 0.008, 0.064, 0.31),
      box(leather, 0, -0.73, 0.04, 0.14, 0.105, 0.22),
      ...(!roman
        ? [box('#4a4837', right ? 0.07 : -0.07, -0.38, 0, 0.012, 0.38, 0.08)]
        : [
            box(leather, 0, -0.59, 0.07, 0.1, 0.035, 0.012),
            box(leather, 0, -0.65, 0.07, 0.1, 0.035, 0.012),
          ]),
    ]);
  const arm = () => [
    cylinder(cloth, 0, -0.11, 0, 0.088, 0.22),
    cylinder(skin, 0, -0.29, 0.03, 0.064, 0.22),
    cylinder(skin, 0, -0.46, 0.095, 0.055, 0.21, -0.45),
    sphere(skin, 0, -0.55, 0.15, 0.055, 0.065, 0.055),
  ];
  const left = arm(),
    right = arm();
  const shieldColor = roman ? '#9e3a2f' : leader ? '#22544c' : '#3c6b62';
  if (roman && !ranged) {
    // Curved scutum, expressed as deterministic strips rather than a flat billboard.
    for (let c = 0; c < 8; c++) {
      const x = (c - 3.5) * 0.067,
        curve = 0.08 * (1 - (x / 0.27) ** 2);
      left.push(box(shieldColor, x, -0.33, 0.29 + curve, 0.071, 0.79, 0.045));
    }
    left.push(
      box(bronze, 0, 0.073, 0.3, 0.54, 0.025, 0.04),
      box(bronze, 0, -0.733, 0.3, 0.54, 0.025, 0.04),
    );
    for (const x of [-0.266, 0.266]) left.push(box(bronze, x, -0.33, 0.28, 0.024, 0.8, 0.04));
    for (const sign of [-1, 1]) {
      left.push(box('#d4b969', sign * 0.14, -0.2, 0.38, 0.19, 0.025, 0.01, 0, 0, sign * 0.65));
      left.push(box('#d4b969', sign * 0.14, -0.47, 0.38, 0.19, 0.025, 0.01, 0, 0, -sign * 0.65));
    }
  } else {
    const shield = new THREE.Shape();
    shield.absellipse(0, 0, ranged ? 0.225 : 0.28, ranged ? 0.29 : 0.43, 0, Math.PI * 2, false, 0);
    left.push(
      colored(
        new THREE.ExtrudeGeometry(shield, { depth: 0.045, bevelEnabled: false, curveSegments: 16 }),
        shieldColor,
        0,
        -0.32,
        0.29,
      ),
    );
    left.push(
      colored(
        new THREE.TorusGeometry(1, 0.035, 4, 24),
        bronze,
        0,
        -0.32,
        0.316,
        ranged ? 0.23 : 0.285,
        ranged ? 0.295 : 0.435,
        0.5,
      ),
    );
    left.push(
      box('#d1bc83', 0, -0.32, 0.345, 0.035, ranged ? 0.46 : 0.73, 0.012),
      box('#d1bc83', 0, -0.32, 0.345, ranged ? 0.33 : 0.4, 0.03, 0.012),
    );
  }
  left.push(sphere(iron, 0, -0.33, 0.385, 0.075, 0.075, 0.035));
  const bladeLength = ranged ? 0.38 : roman ? 0.48 : 0.73;
  right.push(cylinder(leather, 0, -0.55, 0.18, 0.025, 0.16, Math.PI / 2));
  right.push(box(bronze, 0, -0.55, 0.27, 0.14, 0.024, 0.027));
  if (ranged && !meleeSidearm) {
    right.push(cylinder('#86734d', 0, -0.55, 0.51, 0.018, 1.25, Math.PI / 2));
    right.push(
      colored(new THREE.ConeGeometry(0.03, 0.2, 4), iron, 0, -0.55, 1.22, 1, 1, 1, Math.PI / 2),
    );
  } else {
    right.push(box(iron, 0, -0.55, 0.27 + bladeLength / 2, 0.045, 0.015, bladeLength));
    right.push(
      colored(
        new THREE.ConeGeometry(0.028, 0.13, 4),
        iron,
        0,
        -0.55,
        0.27 + bladeLength + 0.06,
        1,
        1,
        1,
        Math.PI / 2,
      ),
    );
  }
  return {
    parts: {
      body: merge(torso),
      leftLeg: leg(false),
      rightLeg: leg(true),
      leftArm: merge(left),
      rightArm: merge(right),
    },
    height: leader ? 2.35 : 1.82,
  };
}

export const JOINTS: Record<PartName, [number, number, number]> = {
  body: [0, 0, 0],
  leftLeg: [-0.115, 0.82, 0],
  rightLeg: [0.115, 0.82, 0],
  leftArm: [-0.31, 1.32, 0],
  rightArm: [0.31, 1.32, 0],
};
