import { terrainHeight } from '../content/world';
import * as THREE from 'three';
import { SCALE, MAX_UNITS, UNITS, ROLE_LABELS, type Terrain, type Team } from '../content/catalog';
import { UNIT_STRIDE, State, type BattleSummary } from '../sim/battle';
import { HEADINGS, rotatedSlot } from '../sim/formation-math';
import type { Group } from '../sim/orders';

/** Presentation consumes snapshots; selecting banners never edits authoritative state. */
export class FormationOverlay {
  terrain: Terrain = 'meadow';
  private height(x: number, z: number): number {
    return terrainHeight(this.terrain, Math.round(x), Math.round(z)) / SCALE;
  }
  private root = document.createElement('div');
  private banners = new Map<string, HTMLButtonElement>();
  private outlines = new Map<string, THREE.LineSegments>();
  private rings: THREE.InstancedMesh;
  private forms: BattleSummary['formations'] = [];
  private team: Team = 0;
  private group: Group = 'all';
  private temp = new THREE.Object3D();
  private point = new THREE.Vector3();
  constructor(
    private scene: THREE.Scene,
    container: HTMLElement,
    select: (team: Team, id: number) => void,
  ) {
    this.root.className = 'formation-overlays';
    container.appendChild(this.root);
    this.root.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-formation]');
      if (b) select(Number(b.dataset.team) as Team, Number(b.dataset.formation));
    });
    const geometry = new THREE.RingGeometry(0.55, 0.64, 12);
    geometry.rotateX(-Math.PI / 2);
    this.rings = new THREE.InstancedMesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color: '#eed799',
        transparent: true,
        opacity: 0.62,
        depthWrite: false,
      }),
      MAX_UNITS,
    );
    this.rings.count = 0;
    this.rings.frustumCulled = false;
    scene.add(this.rings);
  }
  selection(team: Team, group: Group): void {
    this.team = team;
    this.group = group;
  }
  setFormations(forms: BattleSummary['formations']): void {
    this.forms = forms;
    const keys = new Set(forms.map((f) => `${f.team}:${f.id}`));
    for (const [key, button] of this.banners)
      if (!keys.has(key)) {
        button.remove();
        this.banners.delete(key);
        const line = this.outlines.get(key)!;
        this.scene.remove(line);
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
        this.outlines.delete(key);
      }
    for (const f of forms) {
      const key = `${f.team}:${f.id}`;
      if (!this.banners.has(key)) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `formation-banner ${f.team === 0 ? 'roman' : 'gaul'}`;
        b.dataset.formation = String(f.id);
        b.dataset.team = String(f.team);
        this.root.appendChild(b);
        this.banners.set(key, b);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          'position',
          new THREE.Float32BufferAttribute(new Float32Array(60), 3),
        );
        const line = new THREE.LineSegments(
          geometry,
          new THREE.LineBasicMaterial({
            color: f.team === 0 ? '#e4a084' : '#90cfb6',
            transparent: true,
            opacity: 0.65,
            depthTest: false,
          }),
        );
        line.frustumCulled = false;
        this.scene.add(line);
        this.outlines.set(key, line);
      }
      const b = this.banners.get(key)!;
      b.textContent = `${f.id + 1} ${ROLE_LABELS[f.role]} · ${f.standing}`;
      b.title = `${f.team === 0 ? 'Roman' : 'Gallic'} formation ${f.id + 1}: ${f.movement}; ${f.files} files`;
      b.setAttribute(
        'aria-label',
        `Select ${f.team === 0 ? 'Roman' : 'Gallic'} formation ${f.id + 1}`,
      );
      const spacing =
        f.role === 'siege'
          ? 6000
          : f.role === 'cavalry' || f.role === 'horse-archer'
            ? 2800
            : f.formation === 'loose'
              ? 2300
              : f.formation === 'shieldwall'
                ? 1100
                : 1450;
      const halfWidth = (Math.max(1, Math.min(f.files, f.strength) - 1) * spacing) / 2;
      const halfDepth = (Math.max(1, Math.ceil(f.strength / f.files) - 1) * spacing) / 2;
      const corners = [
        [-halfDepth, -halfWidth],
        [-halfDepth, halfWidth],
        [halfDepth, halfWidth],
        [halfDepth, -halfWidth],
      ];
      const points = corners.map(([d, l]) => rotatedSlot(Math.trunc(d), Math.trunc(l), f.heading));
      const [hx, hz] = HEADINGS[f.heading];
      const vertices: number[] = [];
      const add = (p: number[]) =>
        vertices.push(
          (f.x + p[0]) / SCALE,
          this.height(f.x + p[0], f.z + p[1]) + 0.09,
          (f.z + p[1]) / SCALE,
        );
      for (let i = 0; i < 4; i++) {
        add(points[i]);
        add(points[(i + 1) % 4]);
      }
      const tip = [hx * 3, hz * 3];
      add([0, 0]);
      add(tip);
      add(tip);
      add([hx * 2 - hz / 2, hz * 2 + hx / 2]);
      add(tip);
      add([hx * 2 + hz / 2, hz * 2 - hx / 2]);
      const geometry = this.outlines.get(key)!.geometry;
      (geometry.attributes.position as THREE.BufferAttribute).set(vertices);
      geometry.attributes.position.needsUpdate = true;
      geometry.setDrawRange(0, 14);
    }
  }
  update(data: Int32Array, camera: THREE.Camera, width: number, height: number): void {
    if (!data.length) return;
    const centers = new Map<string, { x: number; z: number; n: number }>();
    let ringCount = 0;
    for (let id = 0; id < data[1]; id++) {
      const b = 3 + id * UNIT_STRIDE,
        state = data[b + 4];
      if (state >= State.Routing) continue;
      const team: Team = UNITS[data[b + 8]].team,
        group = data[b + 20],
        key = `${team}:${group}`;
      const c = centers.get(key) ?? { x: 0, z: 0, n: 0 };
      c.x += data[b] / SCALE;
      c.z += data[b + 1] / SCALE;
      c.n++;
      centers.set(key, c);
      if (team === this.team && (this.group === 'all' || this.group === group)) {
        this.temp.position.set(data[b] / SCALE, data[b + 27] / SCALE + 0.065, data[b + 1] / SCALE);
        this.temp.updateMatrix();
        this.rings.setMatrixAt(ringCount++, this.temp.matrix);
      }
    }
    this.rings.count = ringCount;
    this.rings.instanceMatrix.needsUpdate = true;
    for (const f of this.forms) {
      const key = `${f.team}:${f.id}`,
        c = centers.get(key),
        button = this.banners.get(key)!;
      const active = f.team === this.team && (this.group === 'all' || this.group === f.id);
      button.classList.toggle('selected', active);
      button.setAttribute('aria-pressed', String(active));
      const line = this.outlines.get(key)!;
      line.visible = !!c && active && f.movement !== 'charge';
      if (c && f.movement.startsWith('flank')) {
        const vertices = [c.x / c.n, 0.1, c.z / c.n, f.x / SCALE, 0.1, f.z / SCALE];
        if (f.route[0])
          vertices.push(
            f.x / SCALE,
            0.1,
            f.z / SCALE,
            f.route[0].x / SCALE,
            0.1,
            f.route[0].z / SCALE,
          );
        (line.geometry.attributes.position.array as Float32Array).set(vertices, 42);
        line.geometry.attributes.position.needsUpdate = true;
        line.geometry.setDrawRange(0, 14 + vertices.length / 3);
      }
      if (!c) {
        button.hidden = true;
        continue;
      }
      this.point
        .set(c.x / c.n, this.height((c.x / c.n) * SCALE, (c.z / c.n) * SCALE) + 3.2, c.z / c.n)
        .project(camera);
      button.hidden = Math.abs(this.point.x) > 1 || Math.abs(this.point.y) > 1 || this.point.z > 1;
      button.style.transform = `translate(${((this.point.x + 1) * width) / 2}px,${((1 - this.point.y) * height) / 2}px) translate(-50%,-100%)`;
    }
  }
  dispose(): void {
    this.root.remove();
    this.scene.remove(this.rings);
    this.rings.geometry.dispose();
    (this.rings.material as THREE.Material).dispose();
    this.rings.dispose();
    for (const line of this.outlines.values()) {
      this.scene.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }
  }
}
