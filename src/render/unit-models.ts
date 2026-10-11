import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Original, deterministic articulated prototype recipes; not skinned production assets. */
export const ASSET_RECIPE_VERSION = 'rome-gaul-combined-5';
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
export function colored(
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
export const box = (
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
export const sphere = (
  color: string,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
) => colored(new THREE.SphereGeometry(1, 10, 7), color, x, y, z, sx, sy, sz);
export const cylinder = (
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
export const merge = (parts: THREE.BufferGeometry[]) => {
  const geometry = mergeGeometries(parts, false)!;
  for (const p of parts) p.dispose();
  geometry.computeBoundingSphere();
  return geometry;
};

export function createUnitModel(
  type: number,
  meleeSidearm = false,
  brokenShield = false,
): UnitModel {
  const originalType = type;
  if (type >= 6) type = [0, 3, 1, 4, 1, 4][type - 6];
  const mounted = originalType >= 6 && originalType <= 9,
    bow = originalType === 8 || originalType === 9,
    crew = originalType >= 10;
  brokenShield = brokenShield || bow || crew;
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
      !ranged && (roman || leader || mounted) ? iron : cloth,
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
  if (!ranged && (roman || leader || mounted))
    for (let r = 0; r < 5; r++)
      torso.push(box('#626e6d', 0, 1.04 + r * 0.06, 0.174, 0.37, 0.012, 0.012));
  torso.push(box(leather, 0.14, 1.22, 0.184, 0.035, 0.4, 0.025, 0, 0, -0.1));
  if (roman || leader || mounted) {
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
    if (roman) {
      torso.push(box(bronze, 0, 1.8, 0, 0.25, 0.04, 0.07));
      for (let i = -5; i <= 5; i++) {
        const a = i * 0.12;
        torso.push(
          box(
            i % 2 ? '#b63c2a' : '#862c26',
            Math.sin(a) * 0.23,
            1.685 + Math.cos(a) * 0.19,
            0,
            0.032,
            0.13,
            0.065,
            0,
            0,
            -a,
          ),
        );
      }
    } else torso.push(sphere('#6a5540', 0, 1.4, -0.04, 0.3, 0.1, 0.2));
    // Small back standard; faction silhouettes distinguish commanders at army scale.
    torso.push(cylinder(bronze, -0.33, 1.73, -0.14, 0.016, 1.2));
    torso.push(box(cloth, -0.16, 2.12, -0.14, 0.33, 0.28, 0.028));
    torso.push(colored(new THREE.TorusGeometry(0.075, 0.012, 5, 18), bronze, -0.16, 2.12, -0.114));
    torso.push(box(bronze, -0.16, 2.12, -0.1, 0.04, 0.045, 0.016));
    if (roman) {
      torso.push(
        box(bronze, -0.33, 2.37, -0.14, 0.18, 0.035, 0.04),
        sphere(bronze, -0.33, 2.4, -0.13, 0.027, 0.045, 0.025),
      );
    }
  }
  // Fitted layers, suspension straps and scabbard remain merged into the body batch.
  torso.push(box(leather, 0.25, 0.86, -0.04, 0.065, roman ? 0.53 : 0.7, 0.06, 0, 0, -0.18));
  torso.push(box(bronze, 0.2, 1.09, -0.04, 0.085, 0.025, 0.075, 0, 0, -0.18));
  for (const side of [-1, 1]) {
    torso.push(sphere(cloth, side * 0.215, 1.35, 0, 0.13, 0.095, 0.15));
    if (!ranged && (roman || leader || mounted)) {
      torso.push(box(iron, side * 0.17, 1.39, -0.035, 0.17, 0.055, 0.29));
      for (let row = 0; row < 7; row++)
        for (let col = 0; col < 7; col++)
          torso.push(
            box(
              row % 2 ? '#687675' : '#acb5ae',
              (col - 3) * 0.049,
              1.04 + row * 0.044,
              side * 0.173,
              0.023,
              0.012,
              0.01,
              0,
              0,
              side * 0.3,
            ),
          );
    }
  }
  if (roman && !ranged) {
    for (let i = -3; i <= 3; i++) {
      torso.push(box(leather, i * 0.056, 0.82, 0.18, 0.043, 0.26, 0.025, 0, 0, -i * 0.035));
      torso.push(box(bronze, i * 0.056, 0.705, 0.2, 0.036, 0.038, 0.012));
    }
    torso.push(box(bronze, 0, 1.77, 0, 0.03, 0.026, 0.27));
    for (const side of [-1, 1])
      torso.push(sphere(bronze, side * 0.14, 1.65, 0.075, 0.023, 0.023, 0.018));
  }
  if (!roman) {
    for (let i = 0; i < 5; i++)
      torso.push(sphere('#6b442c', 0, 1.62 - i * 0.044, -0.124, 0.055 - i * 0.004, 0.045, 0.055));
    torso.push(
      box('#633d28', -0.052, 1.59, 0.137, 0.07, 0.025, 0.025),
      box('#633d28', 0.052, 1.59, 0.137, 0.07, 0.025, 0.025),
    );
    for (let i = -2; i <= 2; i++)
      torso.push(box('#b6ac88', 0, 0.75 + i * 0.045, 0.18, 0.37, 0.01, 0.009));
  }
  if (ranged && !crew) {
    for (let i = 0; i < 3; i++)
      torso.push(cylinder('#695339', -0.12 + i * 0.07, 1.16, -0.2, 0.014, bow ? 0.65 : 1.25));
    torso.push(box(leather, 0, 1.08, -0.23, 0.32, 0.13, 0.035));
  }
  if (bow) {
    torso.push(cylinder(leather, 0.15, 1.22, -0.23, 0.09, 0.47));
    for (let i = 0; i < 5; i++)
      torso.push(cylinder('#c5ae77', 0.1 + i * 0.025, 1.52, -0.23, 0.009, 0.38));
    for (let row = 0; row < 6; row++)
      for (let col = 0; col < 5; col++)
        torso.push(
          box(
            roman ? '#9d9468' : '#72533c',
            (col - 2) * 0.068,
            1.04 + row * 0.057,
            0.177,
            0.06,
            0.045,
            0.018,
          ),
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
  if (!brokenShield) {
    if (roman && !ranged && !mounted) {
      // Continuous convex hide face; separate rim and boss preserve silhouette.
      const arc = Math.asin(0.27 / 0.48);
      left.push(
        colored(
          new THREE.CylinderGeometry(0.48, 0.48, 0.79, 18, 1, true, -arc, arc * 2),
          shieldColor,
          0,
          -0.33,
          -0.11,
        ),
      );
      left.push(
        colored(
          new THREE.CylinderGeometry(0.486, 0.486, 0.025, 18, 1, true, -arc, arc * 2),
          bronze,
          0,
          0.073,
          -0.11,
        ),
        colored(
          new THREE.CylinderGeometry(0.486, 0.486, 0.025, 18, 1, true, -arc, arc * 2),
          bronze,
          0,
          -0.733,
          -0.11,
        ),
      );
      for (const x of [-0.266, 0.266]) left.push(box(bronze, x, -0.33, 0.28, 0.024, 0.8, 0.04));
      for (const sign of [-1, 1]) {
        left.push(box('#d4b969', sign * 0.14, -0.2, 0.38, 0.19, 0.025, 0.01, 0, 0, sign * 0.65));
        left.push(box('#d4b969', sign * 0.14, -0.47, 0.38, 0.19, 0.025, 0.01, 0, 0, -sign * 0.65));
      }
    } else {
      const shield = new THREE.Shape();
      shield.absellipse(
        0,
        0,
        ranged ? 0.225 : 0.28,
        ranged ? 0.29 : 0.43,
        0,
        Math.PI * 2,
        false,
        0,
      );
      left.push(
        colored(
          new THREE.ExtrudeGeometry(shield, {
            depth: 0.045,
            bevelEnabled: false,
            curveSegments: 16,
          }),
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
    for (const side of [-1, 1])
      for (let i = 0; i < 5; i++)
        left.push(
          sphere(
            bronze,
            side * (ranged ? 0.17 : 0.24),
            -0.6 + i * 0.13,
            0.347,
            0.011,
            0.011,
            0.012,
          ),
        );
    left.push(box(iron, 0, -0.33, 0.365, 0.1, ranged ? 0.22 : 0.35, 0.02));
    left.push(sphere(iron, 0, -0.33, 0.385, 0.075, 0.075, 0.035));
  }
  const bladeLength = ranged ? 0.38 : roman ? 0.48 : 0.73;
  right.push(cylinder(leather, 0, -0.55, 0.18, 0.025, 0.16, Math.PI / 2));
  right.push(box(bronze, 0, -0.55, 0.27, 0.14, 0.024, 0.027));
  if (crew) {
    right.push(
      cylinder(leather, 0, -0.55, 0.2, 0.026, 0.45),
      box(iron, 0, -0.32, 0.2, 0.17, 0.08, 0.06),
    );
  } else if (bow && !meleeSidearm) {
    for (const sign of [-1, 1]) {
      left.push(box('#b18c51', 0, -0.33 + sign * 0.22, 0.27, 0.035, 0.46, 0.035, sign * 0.3));
      left.push(box('#694727', 0, -0.33 + sign * 0.46, 0.34, 0.038, 0.1, 0.035, -sign * 0.55));
    }
    left.push(box('#ddd0a9', 0, -0.33, 0.4, 0.009, 1.02, 0.009));
    right.push(cylinder('#9e8254', 0, -0.55, 0.5, 0.009, 0.7, Math.PI / 2));
  } else if (mounted && !bow) {
    right.push(
      cylinder('#8b633a', 0, -0.55, 0.85, 0.025, 2.7, Math.PI / 2),
      colored(new THREE.ConeGeometry(0.045, 0.27, 4), iron, 0, -0.55, 2.33, 1, 1, 1, Math.PI / 2),
    );
  } else if (ranged && !meleeSidearm) {
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

/** Silhouette LOD: same joints/equipment classes, no fine mail, hardware or facial details. */
export function createCrowdModel(
  type: number,
  meleeSidearm = false,
  brokenShield = false,
): UnitModel {
  const originalType = type;
  if (type >= 6) type = [0, 3, 1, 4, 1, 4][type - 6];
  const mounted = originalType >= 6 && originalType <= 9,
    bow = originalType === 8 || originalType === 9,
    crew = originalType >= 10;
  brokenShield = brokenShield || bow || crew;
  const roman = type < 3,
    leader = type % 3 === 2,
    ranged = type % 3 === 1;
  const cloth = roman ? '#953d32' : '#416d61';
  const body = [
    box(!ranged && (roman || leader || mounted) ? iron : cloth, 0, 1.18, 0, 0.43, 0.48, 0.3),
    colored(new THREE.CylinderGeometry(0.2, 0.29, 0.32, 5), cloth, 0, 0.84, 0, 1, 1, 0.65),
    colored(
      new THREE.IcosahedronGeometry(0.17, 0),
      roman ? bronze : leader || mounted ? iron : '#9c7251',
      0,
      1.63,
      0,
      0.82,
      1.15,
      0.84,
    ),
    box(leather, 0, 0.99, 0.01, 0.44, 0.06, 0.33),
  ];
  if (leader) {
    body.push(
      box(cloth, 0, 0.98, -0.2, 0.52, 0.88, 0.035),
      cylinder(bronze, -0.33, 1.73, -0.14, 0.016, 1.2),
      box(cloth, -0.16, 2.12, -0.14, 0.33, 0.28, 0.03),
    );
    if (roman) body.push(box('#be4939', 0, 1.85, 0, 0.3, 0.12, 0.05));
  }
  const leg = () =>
    merge([
      box(roman ? skin : '#696347', 0, -0.33, 0, 0.14, 0.63, 0.14),
      box(leather, 0, -0.73, 0.04, 0.14, 0.1, 0.22),
    ]);
  const left = [box(cloth, 0, -0.22, 0.03, 0.13, 0.45, 0.14)];
  if (!brokenShield) {
    left.push(
      roman && !ranged && !mounted
        ? box('#9e3a2f', 0, -0.33, 0.33, 0.54, 0.8, 0.055)
        : colored(
            new THREE.CylinderGeometry(1, 1, 0.045, 8),
            '#3c6b62',
            0,
            -0.33,
            0.33,
            ranged ? 0.23 : 0.28,
            0.9,
            ranged ? 0.29 : 0.43,
            Math.PI / 2,
          ),
    );
    left.push(
      box(bronze, 0, -0.33, 0.37, 0.045, ranged ? 0.4 : 0.68, 0.02),
      sphere(iron, 0, -0.33, 0.39, 0.06, 0.06, 0.03),
    );
  }
  const right = [box(skin, 0, -0.29, 0.08, 0.12, 0.54, 0.13)];
  if (bow && !meleeSidearm)
    left.push(
      box('#b18c51', 0, -0.33, 0.3, 0.035, 1.05, 0.08),
      box('#ddd0a9', 0, -0.33, 0.4, 0.01, 1.0, 0.01),
    );
  right.push(
    box(
      ranged && !meleeSidearm ? '#8e7953' : iron,
      0,
      -0.55,
      0.55,
      0.035,
      0.025,
      mounted && !bow
        ? 2.7
        : bow
          ? 0.65
          : crew
            ? 0.3
            : ranged && !meleeSidearm
              ? 1.3
              : roman
                ? 0.5
                : 0.75,
    ),
  );
  return {
    parts: {
      body: merge(body),
      leftLeg: leg(),
      rightLeg: leg(),
      leftArm: merge(left),
      rightArm: merge(right),
    },
    height: leader ? 2.35 : 1.82,
  };
}
