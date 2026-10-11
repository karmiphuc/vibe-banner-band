import * as THREE from 'three';
import type { BannerId } from '../content/banners';
import type { FormationState } from '../sim/orders';
import { State } from '../sim/battle';
import { createBannerModel } from './banner-model';

/** At most ten physical pieces of equipment. Their owner is an authoritative unit ID. */
export class BannerView {
  private entries = new Map<number, { item: BannerId; group: THREE.Group }>();
  private material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.72,
    metalness: 0.16,
    side: THREE.DoubleSide,
  });
  private local = new THREE.Matrix4();
  private position = new THREE.Vector3();
  private rotation = new THREE.Quaternion();
  private scale = new THREE.Vector3(1, 1, 1);
  constructor(private scene: THREE.Scene) {}
  setFormations(forms: FormationState[]): boolean {
    let changed = false;
    const wanted = new Map(
      forms
        .filter((f) => f.bannerItem && f.bannerItem !== 'none' && (f.bannerBearer ?? -1) >= 0)
        .map((f) => [f.bannerBearer!, f.bannerItem as BannerId]),
    );
    for (const [id, entry] of this.entries)
      if (wanted.get(id) !== entry.item) {
        changed = true;
        this.scene.remove(entry.group);
        entry.group.children.forEach((child) => (child as THREE.Mesh).geometry.dispose());
        this.entries.delete(id);
      }
    for (const [id, item] of wanted)
      if (!this.entries.has(id)) {
        changed = true;
        const group = new THREE.Group();
        group.matrixAutoUpdate = false;
        group.name = `banner-equipment:${id}:${item}`;
        for (const [part, geometry] of Object.entries(createBannerModel(item))) {
          const mesh = new THREE.Mesh(geometry, this.material);
          mesh.name = part;
          mesh.castShadow = true;
          group.add(mesh);
        }
        this.scene.add(group);
        this.entries.set(id, { item, group });
      }
    return changed;
  }
  carries(id: number): boolean {
    return this.entries.has(id);
  }
  beginFrame(): void {
    for (const entry of this.entries.values()) entry.group.visible = false;
  }
  update(id: number, root: THREE.Matrix4, stowed: boolean, state: number): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    entry.group.visible = state !== State.Escaped;
    // Grip matches JOINTS.rightArm + (0,-.55,.18); attacks use a back sling.
    this.position.set(stowed ? -0.27 : 0.31, stowed ? 0.82 : 0.77, stowed ? -0.23 : 0.18);
    this.rotation.setFromAxisAngle(new THREE.Vector3(0, 0, 1), stowed ? 0.12 : 0);
    this.local.compose(this.position, this.rotation, this.scale);
    entry.group.matrix.multiplyMatrices(root, this.local);
    entry.group.matrixWorldNeedsUpdate = true;
  }
  dispose(): void {
    for (const entry of this.entries.values()) {
      this.scene.remove(entry.group);
      entry.group.children.forEach((child) => (child as THREE.Mesh).geometry.dispose());
    }
    this.entries.clear();
    this.material.dispose();
  }
}
