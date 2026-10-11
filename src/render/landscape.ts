import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { BattleConfig } from '../content/catalog';

/** Cosmetic stream only. No terrain decoration changes authoritative walkability. */
export function cosmeticRandom(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
export function groundTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const c = canvas.getContext('2d')!;
  const random = cosmeticRandom(88102);
  c.fillStyle = '#889578';
  c.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 18000; i++) {
    c.fillStyle = ['#98a181', '#6d805f', '#b0aa87', '#7e8b6a'][i % 4];
    c.globalAlpha = 0.12 + random() * 0.2;
    const x = random() * 512,
      y = random() * 512;
    c.fillRect(x, y, 1 + random() * 3, 1 + random() * 6);
  }
  // Large, soft color variation avoids a flat field without masking unit silhouettes.
  for (let i = 0; i < 40; i++) {
    const x = random() * 512,
      y = random() * 512,
      r = 20 + random() * 60;
    const gradient = c.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, i % 2 ? '#b4a27b' : '#526b4c');
    gradient.addColorStop(1, 'transparent');
    c.globalAlpha = 0.22;
    c.fillStyle = gradient;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 12);
  texture.anisotropy = 4;
  return texture;
}
function batch(
  group: THREE.Group,
  geometry: THREE.BufferGeometry,
  color: string,
  count: number,
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(
    geometry,
    new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true }),
    count,
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}
export function decorateLandscape(group: THREE.Group, config: BattleConfig): void {
  const random = cosmeticRandom(config.seed ^ 0x45d9f3b),
    object = new THREE.Object3D();
  const trunks = batch(group, new THREE.CylinderGeometry(0.16, 0.35, 3.6, 5), '#55412f', 120);
  const crownParts = [0, 1, 2].map((i) =>
    new THREE.IcosahedronGeometry(1.4, 0).translate((i - 1) * 0.8, i % 2, 0),
  );
  const crowns = batch(group, mergeGeometries(crownParts)!, '#405c3f', 120);
  crownParts.forEach((g) => g.dispose());
  for (let i = 0; i < 120; i++) {
    // Tree belt and its shadows stay outside the battle bounds.
    const edge = i % 4,
      along = (random() - 0.5) * 162,
      outer = 66 + random() * 15;
    const x = edge < 2 ? (edge ? -outer : outer) : along;
    const z = edge >= 2 ? (edge === 2 ? -outer : outer) : along;
    const size = 0.8 + random() * 0.8;
    object.position.set(x, 1.8, z);
    object.rotation.set(0, random() * 6.28, 0);
    object.scale.set(size, size, size);
    object.updateMatrix();
    trunks.setMatrixAt(i, object.matrix);
    object.position.y = 4.4 * size;
    object.scale.set(size, 1.3 * size, size);
    object.updateMatrix();
    crowns.setMatrixAt(i, object.matrix);
    crowns.setColorAt(
      i,
      new THREE.Color().setHSL(0.24 + random() * 0.06, 0.22, 0.24 + random() * 0.1),
    );
  }
  // Very low tufts are decorative; no invisible trunks in playable space.
  const tuft = new THREE.BufferGeometry();
  tuft.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [-0.12, 0, 0, 0, 0.32, 0, 0.12, 0, 0, 0, 0, -0.12, 0, 0.24, 0, 0, 0, 0.12],
      3,
    ),
  );
  tuft.computeVertexNormals();
  const grass = batch(group, tuft, '#69764a', 1800);
  grass.castShadow = false;
  for (let i = 0; i < 1800; i++) {
    object.position.set((random() - 0.5) * 135, 0, (random() - 0.5) * 135);
    if (
      config.terrain === 'crossroads' &&
      (Math.abs(object.position.x) < 3 || Math.abs(object.position.z) < 3)
    )
      object.position.y = -1;
    object.rotation.set(0, random() * 6.28, 0);
    const size = 0.5 + random();
    object.scale.set(size, size, size);
    object.updateMatrix();
    grass.setMatrixAt(i, object.matrix);
  }
  // Supply camps give the opposing deployments recognizable homes.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const tent = new THREE.Mesh(
        new THREE.ConeGeometry(2.8, 3.2, 4),
        new THREE.MeshStandardMaterial({ color: side < 0 ? '#c5b794' : '#928d6a', roughness: 1 }),
      );
      tent.position.set(side * 65, 1.5, (i - 1.5) * 9);
      tent.rotation.y = Math.PI / 4;
      tent.scale.z = 1.5;
      tent.castShadow = true;
      group.add(tent);
      const entry = new THREE.Mesh(
        new THREE.PlaneGeometry(1.1, 1.8),
        new THREE.MeshStandardMaterial({ color: '#3c382c', side: THREE.DoubleSide }),
      );
      entry.position.set(side * 63.58, 0.8, (i - 1.5) * 9);
      entry.rotation.y = Math.PI / 2;
      group.add(entry);
    }
  }
}
