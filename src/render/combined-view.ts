import * as THREE from 'three';
import { UNIT_STRIDE, PROJECTILE_STRIDE, State } from '../sim/battle';
import { SCALE, MAX_ENGINES, type Terrain } from '../content/catalog';
import { ENGINE_STRIDE } from '../sim/siege';
import { terrainHeight } from '../content/world';
import { createHorseModel, HORSE_JOINTS, createBallistaModel } from './combined-models';

export class CombinedView {
  private horses: Record<string, THREE.InstancedMesh> = {};
  private engines: THREE.InstancedMesh;
  private dust: THREE.InstancedMesh;
  private object = new THREE.Object3D();
  constructor(
    private scene: THREE.Scene,
    material: THREE.Material,
    capacity: number,
  ) {
    for (const [name, geometry] of Object.entries(createHorseModel(true))) {
      const mesh = new THREE.InstancedMesh(geometry, material, capacity);
      mesh.count = 0;
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.horses[name] = mesh;
      scene.add(mesh);
    }
    this.dust = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(1, 0),
      new THREE.MeshBasicMaterial({
        color: '#b7a780',
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
      }),
      300,
    );
    this.dust.count = 0;
    this.dust.frustumCulled = false;
    scene.add(this.dust);
    this.engines = new THREE.InstancedMesh(createBallistaModel(), material, MAX_ENGINES);
    this.engines.count = 0;
    this.engines.frustumCulled = false;
    scene.add(this.engines);
  }
  update(
    data: Int32Array,
    previous: Int32Array,
    alpha: number,
    tick: number,
    terrain: Terrain,
  ): void {
    let n = 0,
      dustCount = 0;
    const root = new THREE.Matrix4(),
      local = new THREE.Matrix4(),
      matrix = new THREE.Matrix4(),
      tint = new THREE.Color();
    for (let i = 0; i < data[1]; i++) {
      const b = 3 + i * UNIT_STRIDE,
        type = data[b + 8];
      if (type < 6 || type > 9 || data[b + 4] === State.Escaped) continue;
      const fallen = data[b + 21] <= 0 || data[b + 4] === State.Dead;
      const x =
        (data[b + 21] <= 0 ? data[b + 23] : THREE.MathUtils.lerp(previous[b], data[b], alpha)) /
        SCALE;
      const z =
        (data[b + 21] <= 0
          ? data[b + 24]
          : THREE.MathUtils.lerp(previous[b + 1], data[b + 1], alpha)) / SCALE;
      const y = terrainHeight(terrain, Math.round(x * SCALE), Math.round(z * SCALE)) / SCALE;
      this.object.position.set(x, y + (fallen ? 0.3 : 0), z);
      this.object.rotation.set(0, Math.atan2(data[b + 6], data[b + 7]), fallen ? Math.PI / 2 : 0);
      this.object.scale.setScalar(1);
      this.object.updateMatrix();
      root.copy(this.object.matrix);
      for (const [name, mesh] of Object.entries(this.horses)) {
        this.object.position.set(...HORSE_JOINTS[name]);
        this.object.rotation.set(
          name === 'body' || fallen
            ? 0
            : Math.sin(
                tick * 0.52 +
                  i +
                  (name.includes('Right') ? Math.PI : 0) +
                  (name.startsWith('rear') ? 1.8 : 0),
              ) * Math.min(0.7, data[b + 22] / 320),
          0,
          0,
        );
        this.object.updateMatrix();
        local.copy(this.object.matrix);
        matrix.multiplyMatrices(root, local);
        mesh.setMatrixAt(n, matrix);
        mesh.setColorAt(
          n,
          tint.setRGB(0.76 + (i % 5) * 0.055, 0.78 + (i % 4) * 0.05, 0.8 + (i % 3) * 0.05),
        );
      }
      if (!fallen && data[b + 22] > 120 && dustCount < 300) {
        const age = (tick + i * 3) % 24,
          angle = Math.atan2(data[b + 6], data[b + 7]);
        this.object.position.set(
          x - Math.sin(angle) * age * 0.06,
          y + 0.12 + age * 0.01,
          z - Math.cos(angle) * age * 0.06,
        );
        this.object.rotation.set(0, angle, 0);
        this.object.scale.setScalar(0.15 + age * 0.017);
        this.object.updateMatrix();
        this.dust.setMatrixAt(dustCount++, this.object.matrix);
      }
      n++;
    }
    for (const m of Object.values(this.horses)) {
      m.count = n;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
    this.dust.count = dustCount;
    this.dust.instanceMatrix.needsUpdate = true;
    const offset = 3 + data[1] * UNIT_STRIDE + data[2] * PROJECTILE_STRIDE;
    this.engines.count = data[offset] || 0;
    for (let i = 0; i < this.engines.count; i++) {
      const b = offset + 1 + i * ENGINE_STRIDE;
      // Snapshot record: id, x, z, heading, hp, ammo, cooldown, serial, crew, team, setup, height, aimX, aimZ.
      const x = data[b + 1] / SCALE,
        z = data[b + 2] / SCALE,
        dead = data[b + 4] <= 0;
      this.object.position.set(x, data[b + 11] / SCALE, z);
      this.object.rotation.set(
        dead ? 0.28 : 0,
        Math.atan2(data[b + 12], data[b + 13]),
        dead ? 0.3 : 0,
      );
      this.object.scale.setScalar(1);
      this.object.updateMatrix();
      this.engines.setMatrixAt(i, this.object.matrix);
    }
    this.engines.instanceMatrix.needsUpdate = true;
  }
  dispose(): void {
    (this.dust.material as THREE.Material).dispose();
    for (const m of [...Object.values(this.horses), this.engines, this.dust]) {
      this.scene.remove(m);
      m.geometry.dispose();
      m.dispose();
    }
  }
}
