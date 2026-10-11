import { CombinedView } from './combined-view';
import { terrainHeight } from '../content/world';
import { MAX_UNITS, type Terrain } from '../content/catalog';
import { FormationOverlay } from './formation-overlay';
import type { BattleSummary } from '../sim/battle';
import type { Group } from '../sim/orders';
import type { Team } from '../content/catalog';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SCALE, UNITS, obstaclesFor, type BattleConfig } from '../content/catalog';
import { MAX_PROJECTILES, PROJECTILE_STRIDE, State, UNIT_STRIDE } from '../sim/battle';
import { decorateLandscape, groundTexture } from './landscape';
import { createCrowdModel, createUnitModel, JOINTS, type PartName } from './unit-models';

interface Kit {
  meshes: Record<PartName, THREE.InstancedMesh>;
  ids: number[];
}
export class Battlefield {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.OrthographicCamera;
  readonly controls: OrbitControls;
  private kits: Kit[] = [];
  private kitKeys = new Map<string, Kit>();
  private combined?: CombinedView;
  private terrainType: Terrain = 'meadow';
  private formationOverlay: FormationOverlay;
  onFormation: (team: Team, id: number) => void = () => {};
  private terrain = new THREE.Group();
  private material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.8,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });
  private placing = false;
  private destination: THREE.Mesh;
  onPlace: (x: number, z: number) => void = () => {};
  private groundMap = groundTexture();
  private lastHits = new Float32Array(0);
  private deaths = new Float32Array(0);
  private lastBlocks = new Float32Array(0);
  private detailMode = false;
  private follow = false;
  private tactical = false;
  private marker: THREE.InstancedMesh;
  private sparks: THREE.InstancedMesh;
  private rally: THREE.InstancedMesh;
  private sun: THREE.DirectionalLight;
  private projectiles: THREE.InstancedMesh;
  private selection: THREE.Mesh;
  private aura: THREE.Mesh;
  private ground: THREE.Mesh;
  private previous = new Int32Array(0);
  current = new Int32Array(0);
  private receivedAt = 0;
  private interval = 66;
  private running = false;
  private dirty = true;
  private selected = -1;
  private count = 0;
  private zoom = 42;
  private root = new THREE.Matrix4();
  private local = new THREE.Matrix4();
  private matrix = new THREE.Matrix4();
  private position = new THREE.Vector3();
  private quaternion = new THREE.Quaternion();
  private rotation = new THREE.Euler();
  private scale = new THREE.Vector3(1, 1, 1);
  private temp = new THREE.Object3D();
  private tintColor = new THREE.Color();
  private frustum = new THREE.Frustum();
  private viewMatrix = new THREE.Matrix4();
  private bounds = new THREE.Sphere(new THREE.Vector3(), 2.5);
  private observer: ResizeObserver;
  private frame = 0;
  private lastFrame = 0;
  private frames = 0;
  private fpsAt = 0;
  private pointerStart = new THREE.Vector2();
  fps = 0;
  onSelect: (id: number) => void = () => {};
  onContext: (lost: boolean) => void = () => {};

  constructor(private container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.setClearColor('#9aa28b');
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.88;
    this.renderer.domElement.setAttribute(
      'aria-label',
      'Isometric battlefield. Drag to pan, scroll to zoom, click a soldier to inspect.',
    );
    this.container.appendChild(this.renderer.domElement);
    this.formationOverlay = new FormationOverlay(this.scene, container, (team, id) =>
      this.onFormation(team, id),
    );
    this.camera = new THREE.OrthographicCamera(-40, 40, 30, -30, 0.1, 2000);
    this.camera.position.set(-150, 200, 205);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableRotate = false;
    this.controls.addEventListener('change', () => {
      this.dirty = true;
    });
    this.controls.addEventListener('start', () => {
      this.follow = false;
    });
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.minZoom = 0.12;
    this.controls.maxZoom = 7;
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
    this.controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN };
    this.scene.add(new THREE.HemisphereLight('#e4edf1', '#4c5840', 1.5));
    const sun = (this.sun = new THREE.DirectionalLight('#fff1d6', 2.8));
    sun.position.set(-35, 70, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
      left: -50,
      right: 50,
      top: 50,
      bottom: -50,
      near: 1,
      far: 180,
    });
    sun.shadow.normalBias = 0.035;
    sun.shadow.bias = -0.0002;
    this.scene.add(sun);
    this.ground = new THREE.Mesh(
      new THREE.PlaneGeometry(680, 680, 200, 200),
      new THREE.MeshStandardMaterial({ map: this.groundMap, color: '#c8cfb8', roughness: 1 }),
    );
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = -0.045;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);
    this.scene.add(this.terrain);
    this.projectiles = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.025, 0.025, 1.4, 4),
      new THREE.MeshStandardMaterial({ color: '#5f4e31' }),
      MAX_PROJECTILES,
    );
    this.projectiles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.projectiles.count = 0;
    this.projectiles.frustumCulled = false;
    this.scene.add(this.projectiles);
    this.marker = new THREE.InstancedMesh(
      new THREE.RingGeometry(0.47, 0.54, 12),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
      MAX_UNITS,
    );
    this.marker.count = 0;
    this.marker.frustumCulled = false;
    this.scene.add(this.marker);
    this.sparks = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(0.065, 0),
      new THREE.MeshBasicMaterial({ color: '#ffe4a5' }),
      600,
    );
    this.rally = new THREE.InstancedMesh(
      new THREE.RingGeometry(0.97, 1, 64),
      new THREE.MeshBasicMaterial({
        color: '#f3d492',
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      2,
    );
    this.rally.count = 0;
    this.rally.frustumCulled = false;
    this.scene.add(this.rally);
    this.sparks.count = 0;
    this.sparks.frustumCulled = false;
    this.scene.add(this.sparks);
    this.selection = new THREE.Mesh(
      new THREE.RingGeometry(0.65, 0.72, 40),
      new THREE.MeshBasicMaterial({ color: '#fff4cb', side: THREE.DoubleSide, depthWrite: false }),
    );
    this.selection.rotation.x = -Math.PI / 2;
    this.selection.position.y = 0.06;
    this.selection.visible = false;
    this.scene.add(this.selection);
    this.destination = new THREE.Mesh(
      new THREE.RingGeometry(1.5, 1.65, 48),
      new THREE.MeshBasicMaterial({
        color: '#ffe3a1',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      }),
    );
    this.destination.rotation.x = -Math.PI / 2;
    this.destination.position.y = 0.07;
    this.destination.visible = false;
    this.scene.add(this.destination);
    this.renderer.domElement.addEventListener('pointermove', (e) => {
      if (!this.placing) return;
      const p = this.groundPoint(e);
      if (p) {
        this.destination.visible = true;
        this.destination.position.set(p.x, p.y + 0.07, p.z);
        this.dirty = true;
      }
    });
    this.aura = new THREE.Mesh(
      new THREE.RingGeometry(13.9, 14, 64),
      new THREE.MeshBasicMaterial({
        color: '#e2c773',
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    this.aura.rotation.x = -Math.PI / 2;
    this.aura.position.y = 0.025;
    this.aura.visible = false;
    this.scene.add(this.aura);
    this.renderer.domElement.addEventListener('pointerdown', (e) =>
      this.pointerStart.set(e.clientX, e.clientY),
    );
    this.renderer.domElement.addEventListener('pointerup', (e) => {
      if (this.pointerStart.distanceTo(new THREE.Vector2(e.clientX, e.clientY)) < 5) this.pick(e);
    });
    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.onContext(true);
    });
    this.renderer.domElement.addEventListener('webglcontextrestored', () => this.onContext(false));
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(container);
    this.resize();
    this.animate(0);
  }
  private resize(): void {
    this.dirty = true;
    const w = this.container.clientWidth,
      h = this.container.clientHeight;
    this.renderer.setSize(w, h);
    const aspect = w / Math.max(1, h);
    this.camera.left = -this.zoom * aspect;
    this.camera.right = this.zoom * aspect;
    this.camera.top = this.zoom;
    this.camera.bottom = -this.zoom;
    this.camera.updateProjectionMatrix();
  }
  private clearTerrain(): void {
    for (const child of [...this.terrain.children]) {
      this.terrain.remove(child);
      child.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) {
          o.geometry.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of mats) m.dispose();
          if (o instanceof THREE.InstancedMesh) o.dispose();
        }
      });
    }
  }
  configure(config: BattleConfig): void {
    this.terrainType = config.terrain;
    this.formationOverlay.terrain = config.terrain;
    this.count = config.romans.count + config.gauls.count;
    this.current = new Int32Array(0);
    this.lastHits = new Float32Array(this.count).fill(-100);
    this.deaths = new Float32Array(this.count).fill(-100);
    this.lastBlocks = new Float32Array(this.count).fill(-100);
    this.follow = false;
    this.sun.castShadow = this.count <= 600;
    this.previous = new Int32Array(0);
    this.select(-1);
    for (const kit of this.kits)
      for (const mesh of Object.values(kit.meshes)) {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        mesh.dispose();
      }
    this.kits = [];
    this.kitKeys.clear();
    this.combined?.dispose();
    this.combined = new CombinedView(this.scene, this.material, this.count);
    const positions = this.ground.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++)
      positions.setZ(
        i,
        terrainHeight(
          config.terrain,
          Math.round(positions.getX(i) * SCALE),
          Math.round(-positions.getY(i) * SCALE),
        ) / SCALE,
      );
    positions.needsUpdate = true;
    this.ground.geometry.computeVertexNormals();
    this.ground.geometry.computeBoundingSphere();
    this.clearTerrain();
    (this.ground.material as THREE.MeshStandardMaterial).color.set(
      config.terrain === 'rocky-pass' ? '#d0c9b4' : '#c8cfb8',
    );
    decorateLandscape(this.terrain, config);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: '#303c2b',
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    });
    const shadows = new THREE.InstancedMesh(
      new THREE.CircleGeometry(0.54, 9),
      shadowMat,
      this.count,
    );
    shadows.name = 'shadows';
    shadows.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    shadows.frustumCulled = false;
    this.terrain.add(shadows);
    // Sparse ground markers establish distances without a distracting full grid.
    const marks: number[] = [];
    for (let x = -60; x <= 60; x += 10)
      for (let z = -60; z <= 60; z += 10) {
        marks.push(x - 0.22, 0.0, z, x + 0.22, 0.0, z, x, 0.0, z - 0.22, x, 0.0, z + 0.22);
      }
    const grid = new THREE.LineSegments(
      new THREE.BufferGeometry().setAttribute(
        'position',
        new THREE.Float32BufferAttribute(marks, 3),
      ),
      new THREE.LineBasicMaterial({ color: '#d5cfac', transparent: true, opacity: 0.25 }),
    );
    grid.name = 'tactical-grid';
    grid.visible = this.tactical;
    this.terrain.add(grid);
    if (config.terrain === 'crossroads')
      for (const rotation of [0, Math.PI / 2]) {
        const road = new THREE.Mesh(
          new THREE.PlaneGeometry(125, 5),
          new THREE.MeshStandardMaterial({ color: '#b2a482', roughness: 1 }),
        );
        road.rotation.set(-Math.PI / 2, 0, rotation);
        road.position.y = -0.022;
        road.receiveShadow = true;
        this.terrain.add(road);
      }
    for (const o of obstaclesFor(config.terrain)) {
      const rock = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1, 1),
        new THREE.MeshStandardMaterial({ color: '#797d72', roughness: 1, flatShading: true }),
      );
      rock.position.set(
        o.x / SCALE,
        terrainHeight(config.terrain, o.x, o.z) / SCALE + 2,
        o.z / SCALE,
      );
      rock.scale.set(o.radius / SCALE, 5, o.radius / SCALE);
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.terrain.add(rock);
      for (let i = 0; i < 8; i++) {
        const b = new THREE.Mesh(
          new THREE.DodecahedronGeometry(1, 0),
          new THREE.MeshStandardMaterial({ color: '#919488', roughness: 1 }),
        );
        const a = (i * Math.PI) / 4;
        b.position.set(
          o.x / SCALE + ((Math.cos(a) * o.radius) / SCALE) * 0.7,
          1,
          o.z / SCALE + ((Math.sin(a) * o.radius) / SCALE) * 0.7,
        );
        b.scale.set(2, 2, 2);
        this.terrain.add(b);
      }
    }
    this.overview();
  }
  snapshot(data: Int32Array, running: boolean): void {
    const firstSnapshot = !this.current.length;
    const now = performance.now();
    this.interval = Math.max(16, Math.min(150, now - this.receivedAt));
    this.receivedAt = now;
    this.previous = this.current.length === data.length ? this.current : new Int32Array(data);
    this.current = new Int32Array(data);
    for (let i = 0; i < this.count; i++) {
      const b = 3 + i * UNIT_STRIDE;
      if (this.current[b + 2] === 0 && this.previous[b + 2] > 0) this.deaths[i] = data[0];
      if (this.current[b + 2] < this.previous[b + 2]) this.lastHits[i] = data[0];
      if (this.current[b + 15] > this.previous[b + 15]) this.lastBlocks[i] = data[0];
    }
    this.running = running;
    this.dirty = true;
    if (firstSnapshot) this.overview();
    this.assignKits();
  }
  private assignKits(): void {
    for (const kit of this.kits) kit.ids.length = 0;
    for (let i = 0; i < this.count; i++) {
      const b = 3 + i * UNIT_STRIDE,
        type = this.current[b + 8];
      const melee = this.current[b + 19] === 0,
        broken = this.current[b + 17] === 0,
        detail = this.detailMode || i === this.selected;
      const key = `${type}:${melee}:${broken}:${detail}`;
      let kit = this.kitKeys.get(key);
      if (!kit) {
        const capacity = Array.from(
          { length: this.count },
          (_, id) => this.current[3 + id * UNIT_STRIDE + 8],
        ).filter((t) => t === type).length;
        const model = detail
          ? createUnitModel(type, melee, broken)
          : createCrowdModel(type, melee, broken);
        const meshes = {} as Kit['meshes'];
        for (const name of Object.keys(model.parts) as PartName[]) {
          const mesh = new THREE.InstancedMesh(model.parts[name], this.material, capacity);
          mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          mesh.frustumCulled = false;
          mesh.count = 0;
          mesh.castShadow = true;
          this.scene.add(mesh);
          meshes[name] = mesh;
        }
        kit = { meshes, ids: [] };
        this.kits.push(kit);
        this.kitKeys.set(key, kit);
      }
      kit.ids.push(i);
    }
  }
  setTactical(value: boolean): void {
    this.tactical = value;
    this.dirty = true;
    const grid = this.terrain.getObjectByName('tactical-grid');
    if (grid) grid.visible = value;
  }
  followSelected(): void {
    this.focus(this.selected);
    this.follow = true;
    this.dirty = true;
  }
  get isFollowing(): boolean {
    return this.follow;
  }
  rotateView(): void {
    const offset = this.camera.position.clone().sub(this.controls.target);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
  }
  setFormations(forms: BattleSummary['formations']): void {
    this.formationOverlay.setFormations(forms);
    this.dirty = true;
  }
  setCommandSelection(team: Team, group: Group): void {
    this.formationOverlay.selection(team, group);
    this.dirty = true;
  }
  setRunning(running: boolean): void {
    this.running = running;
    this.dirty = true;
  }
  select(id: number): void {
    this.selected = id;
    this.selection.visible = id >= 0;
    this.dirty = true;
    if (this.current.length) this.assignKits();
  }
  overview(): void {
    this.follow = false;
    this.controls.target.set(0, 0, 0);
    this.camera.position.set(-150, 200, 205);
    this.camera.zoom = this.count > 900 ? 0.78 : this.count > 400 ? 1.0 : 1.65;
    this.camera.updateProjectionMatrix();
    this.controls.update();
    if (this.current.length) {
      let minX = Infinity,
        maxX = -Infinity,
        minZ = Infinity,
        maxZ = -Infinity;
      for (let i = 0; i < this.count; i++) {
        const b = 3 + i * UNIT_STRIDE;
        if (this.current[b + 4] >= State.Dead) continue;
        minX = Math.min(minX, this.current[b] / SCALE);
        maxX = Math.max(maxX, this.current[b] / SCALE);
        minZ = Math.min(minZ, this.current[b + 1] / SCALE);
        maxZ = Math.max(maxZ, this.current[b + 1] / SCALE);
      }
      if (Number.isFinite(minX)) {
        const x = (minX + maxX) / 2,
          z = (minZ + maxZ) / 2;
        this.controls.target.set(x, 0, z);
        this.camera.position.set(x - 150, 200, z + 205);
        this.camera.zoom = 1;
        this.camera.updateProjectionMatrix();
        this.controls.update();
        this.camera.updateMatrixWorld();
        let extentX = 0.1,
          extentY = 0.1;
        const point = new THREE.Vector3();
        for (let i = 0; i < this.count; i++) {
          const b = 3 + i * UNIT_STRIDE;
          if (this.current[b + 4] >= State.Dead) continue;
          point.set(this.current[b] / SCALE, 2, this.current[b + 1] / SCALE).project(this.camera);
          extentX = Math.max(extentX, Math.abs(point.x));
          extentY = Math.max(extentY, Math.abs(point.y));
        }
        this.camera.zoom = THREE.MathUtils.clamp(
          Math.min(0.84 / extentX, 0.66 / extentY),
          0.12,
          2.2,
        );
        this.camera.updateProjectionMatrix();
      }
    }
    this.dirty = true;
  }
  focus(id: number): void {
    if (id < 0 || !this.current.length) return;
    const base = 3 + id * UNIT_STRIDE;
    const x = this.current[base] / SCALE,
      z = this.current[base + 1] / SCALE;
    const y = terrainHeight(this.terrainType, Math.round(x * SCALE), Math.round(z * SCALE)) / SCALE;
    this.controls.target.set(x, y + 0.8, z);
    this.camera.position.set(x - 10, y + 14, z + 15);
    this.camera.zoom = 6;
    this.camera.updateProjectionMatrix();
    this.select(id);
  }
  zoomBy(factor: number): void {
    this.camera.zoom = THREE.MathUtils.clamp(this.camera.zoom * factor, 0.12, 7);
    this.camera.updateProjectionMatrix();
  }
  setPlacement(active: boolean): void {
    this.placing = active;
    this.dirty = true;
    this.destination.visible = false;
    this.renderer.domElement.style.cursor = active ? 'crosshair' : '';
  }
  private groundPoint(event: PointerEvent, height = 0): THREE.Vector3 | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ray = new THREE.Raycaster();
    ray.setFromCamera(
      new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1,
      ),
      this.camera,
    );
    const hit = new THREE.Vector3();
    if (!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -height), hit))
      return null;
    for (let n = 0; n < 8; n++) {
      const y =
        terrainHeight(this.terrainType, Math.round(hit.x * SCALE), Math.round(hit.z * SCALE)) /
          SCALE +
        height;
      ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -y), hit);
    }
    hit.x = THREE.MathUtils.clamp(hit.x, -300, 300);
    hit.z = THREE.MathUtils.clamp(hit.z, -300, 300);
    return hit;
  }
  private pick(event: PointerEvent): void {
    if (!this.current.length) return;
    const hit = this.groundPoint(event, this.placing ? 0 : 0.8);
    if (!hit) return;
    if (this.placing) {
      this.onPlace(Math.round(hit.x * SCALE), Math.round(hit.z * SCALE));
      return;
    }
    let best = -1,
      distance = 3 / this.camera.zoom;
    for (let i = 0; i < this.count; i++) {
      const b = 3 + i * UNIT_STRIDE;
      if (this.current[b + 4] >= State.Dead) continue;
      const d = Math.hypot(hit.x - this.current[b] / SCALE, hit.z - this.current[b + 1] / SCALE);
      if (d < distance) {
        best = i;
        distance = d;
      }
    }
    if (best >= 0) {
      this.select(best);
      this.onSelect(best);
    }
  }
  private animate = (time: number): void => {
    this.frame = requestAnimationFrame(this.animate);
    if (time - this.fpsAt >= 1000) {
      this.fps = Math.round((this.frames * 1000) / (time - this.fpsAt));
      this.frames = 0;
      this.fpsAt = time;
    }
    this.controls.update();
    if (!this.running && !this.dirty) return;
    this.frames++;
    const delta = Math.min(100, time - this.lastFrame);
    this.lastFrame = time;
    void delta;
    const detailed = this.camera.zoom > (this.detailMode ? 2.5 : 2.8);
    if (detailed !== this.detailMode && this.current.length) {
      this.detailMode = detailed;
      this.assignKits();
      this.dirty = true;
    }
    if (this.current.length && (this.running || this.dirty)) {
      this.dirty = false;
      this.camera.updateMatrixWorld();
      this.viewMatrix.multiplyMatrices(
        this.camera.projectionMatrix,
        this.camera.matrixWorldInverse,
      );
      this.frustum.setFromProjectionMatrix(this.viewMatrix);
      const alpha = this.running
        ? THREE.MathUtils.clamp((performance.now() - this.receivedAt) / this.interval, 0, 1)
        : 1;
      const phaseTick = THREE.MathUtils.lerp(this.previous[0], this.current[0], alpha);
      const shadow = this.terrain.getObjectByName('shadows') as THREE.InstancedMesh;
      let shadowCount = 0,
        sparkCount = 0,
        markerCount = 0,
        rallyCount = 0;
      for (const kit of this.kits) {
        let index = 0;
        for (const id of kit.ids) {
          const b = 3 + id * UNIT_STRIDE,
            state = this.current[b + 4];
          if (state === State.Escaped) continue;
          const x = THREE.MathUtils.lerp(this.previous[b], this.current[b], alpha) / SCALE,
            z = THREE.MathUtils.lerp(this.previous[b + 1], this.current[b + 1], alpha) / SCALE;
          const groundY =
            terrainHeight(this.terrainType, Math.round(x * SCALE), Math.round(z * SCALE)) / SCALE;
          const mounted = this.current[b + 21] > 0;
          this.bounds.center.set(x, groundY + 1.5, z);
          if (!this.frustum.intersectsSphere(this.bounds)) continue;
          const moving =
            Math.abs(this.current[b] - this.previous[b]) +
              Math.abs(this.current[b + 1] - this.previous[b + 1]) >
            8;
          const angle = Math.atan2(this.current[b + 6], this.current[b + 7]);
          const dead = state === State.Dead;
          const hitAge = phaseTick - this.lastHits[id],
            blockAge = phaseTick - this.lastBlocks[id];
          const hitReact =
            !dead && this.current[b + 18] > 0
              ? 0.18
              : hitAge >= 0 && hitAge < 8
                ? Math.sin((hitAge / 8) * Math.PI) * 0.2
                : 0;
          const variation = 0.96 + ((id * 17) % 11) * 0.008;
          this.scale.set(variation, variation, variation);
          const fall = dead ? THREE.MathUtils.smoothstep(phaseTick - this.deaths[id], 0, 14) : 0;
          this.position.set(x, groundY + (dead ? 0.16 * fall : mounted ? 0.68 : 0), z);
          this.rotation.set(
            dead ? (Math.PI / 2) * fall : this.current[b + 13] > 30 ? 0.12 - hitReact : -hitReact,
            angle,
            0,
          );
          this.quaternion.setFromEuler(this.rotation);
          this.root.compose(this.position, this.quaternion, this.scale);
          this.scale.set(1, 1, 1);
          const gait = moving && !dead ? Math.sin(phaseTick * 0.48 + id * 1.7) * 0.5 : 0;
          const windup =
            state === State.Windup
              ? 1 - this.current[b + 5] / UNITS[this.current[b + 8]].windup
              : 0;
          for (const name of Object.keys(kit.meshes) as PartName[]) {
            const joint = JOINTS[name];
            this.position.set(...joint);
            this.rotation.set(0, 0, 0);
            if (name === 'leftLeg') this.rotation.x = gait;
            if (name === 'rightLeg') this.rotation.x = -gait;
            if (mounted && (name === 'leftLeg' || name === 'rightLeg')) {
              this.position.x *= 2.5;
              this.rotation.x = -0.35;
              this.rotation.z = name === 'leftLeg' ? -0.16 : 0.16;
            }

            const recovery =
              state === State.Recovery
                ? Math.max(0, 1 - this.current[b + 5] / UNITS[this.current[b + 8]].recovery)
                : 0;
            const throwing =
              UNITS[this.current[b + 8]].role === 'skirmisher' && this.current[b + 19] > 0;
            if (name === 'rightArm') {
              if (state === State.Windup) {
                this.rotation.x = throwing ? -1.4 * windup : -0.55 * windup;
                this.rotation.y = throwing ? -0.25 : -1.1 * windup;
              } else if (state === State.Recovery) {
                this.rotation.x = throwing ? -0.9 * (1 - recovery) : -0.3;
                this.rotation.y = throwing ? 0 : 0.9 * (1 - recovery);
              } else {
                this.rotation.x = gait * 0.4;
                this.rotation.z = -0.08;
              }
            }
            if (name === 'rightArm' && ![3, 5].includes(this.current[b + 8]) && !throwing) {
              this.rotation.y = 0;
              if (state === State.Windup) {
                this.rotation.x = -0.3;
                this.position.z = -windup * 0.13;
              } else if (state === State.Recovery) {
                this.rotation.x = -0.5;
                this.position.z = (1 - recovery) * 0.3;
              }
            }
            if (name === 'leftArm') {
              this.rotation.x =
                blockAge >= 0 && blockAge < 10
                  ? -0.45
                  : state === State.Windup
                    ? -0.25
                    : -gait * 0.2;
              this.rotation.y = 0.12;
            }
            if (name === 'body' && !dead) {
              this.position.y = moving
                ? Math.abs(gait) * 0.035
                : Math.sin(phaseTick * 0.07 + id) * 0.006;
              this.rotation.y = state === State.Windup ? -0.12 * windup : 0;
            }
            this.quaternion.setFromEuler(this.rotation);
            this.local.compose(this.position, this.quaternion, this.scale);
            this.matrix.multiplyMatrices(this.root, this.local);
            kit.meshes[name].setMatrixAt(index, this.matrix);
            const tint = 0.87 + ((id * 13) % 9) * 0.018;
            kit.meshes[name].setColorAt(
              index,
              this.tintColor.setRGB(
                tint + hitReact * 0.8,
                tint - hitReact * 0.5,
                tint - hitReact * 0.5,
              ),
            );
          }
          this.temp.position.set(x, groundY + 0.015, z);
          this.temp.rotation.set(-Math.PI / 2, 0, 0);
          this.temp.scale.set(1, dead ? 1.6 : 0.65, 1);
          this.temp.updateMatrix();
          shadow.setMatrixAt(shadowCount++, this.temp.matrix);
          if (!dead && this.tactical) {
            this.marker.setMatrixAt(markerCount, this.temp.matrix);
            this.marker.setColorAt(
              markerCount++,
              new THREE.Color(
                this.current[b + 4] === State.Routing
                  ? '#eee0b5'
                  : UNITS[this.current[b + 8]].team === 0
                    ? '#d9775e'
                    : '#68c9b3',
              ),
            );
          }
          if (!dead && blockAge >= 0 && blockAge < 8)
            for (let n = 0; n < 3 && sparkCount < 600; n++) {
              this.temp.position.set(
                x + Math.sin(angle) * 0.5 + (n - 1) * blockAge * 0.025,
                groundY + 0.9 + blockAge * 0.03,
                z + Math.cos(angle) * 0.5,
              );
              this.temp.rotation.set(blockAge, n, 0);
              this.temp.scale.setScalar(1 - blockAge / 9);
              this.temp.updateMatrix();
              this.sparks.setMatrixAt(sparkCount++, this.temp.matrix);
            }
          const rallyPhase = ((this.current[0] - 1) % 360) / 40;
          if (
            !dead &&
            UNITS[this.current[b + 8]].role === 'commander' &&
            this.current[0] > 360 &&
            rallyPhase >= 0 &&
            rallyPhase < 1
          ) {
            this.temp.position.set(x, groundY + 0.04, z);
            this.temp.rotation.set(-Math.PI / 2, 0, 0);
            this.temp.scale.setScalar(2 + rallyPhase * 12);
            this.temp.updateMatrix();
            this.rally.setMatrixAt(rallyCount++, this.temp.matrix);
            (this.rally.material as THREE.MeshBasicMaterial).opacity = (1 - rallyPhase) * 0.6;
          }
          if (id === this.selected) {
            this.selection.position.set(x, groundY + 0.06, z);
            this.aura.visible = UNITS[this.current[b + 8]].role === 'commander' && !dead;
            this.aura.position.set(x, groundY + 0.025, z);
            if (this.follow && !dead) {
              const offset = this.camera.position.clone().sub(this.controls.target);
              this.controls.target.lerp(new THREE.Vector3(x, groundY + 0.8, z), 0.1);
              this.camera.position.copy(this.controls.target).add(offset);
            }
          }
          index++;
        }
        for (const mesh of Object.values(kit.meshes)) {
          mesh.count = index;
          mesh.instanceMatrix.needsUpdate = true;
          if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        }
      }
      this.rally.count = rallyCount;
      this.rally.instanceMatrix.needsUpdate = true;
      this.marker.count = markerCount;
      this.marker.instanceMatrix.needsUpdate = true;
      if (this.marker.instanceColor) this.marker.instanceColor.needsUpdate = true;
      this.sparks.count = sparkCount;
      this.sparks.instanceMatrix.needsUpdate = true;
      shadow.count = shadowCount;
      shadow.instanceMatrix.needsUpdate = true;
      if (
        this.selected < 0 ||
        this.current[3 + this.selected * UNIT_STRIDE + 4] === State.Escaped
      ) {
        this.aura.visible = false;
        this.selection.visible = false;
      } else this.selection.visible = true;
      const pbase = 3 + this.count * UNIT_STRIDE;
      this.projectiles.count = this.current[2];
      for (let i = 0; i < this.current[2]; i++) {
        const b = pbase + i * PROJECTILE_STRIDE;
        this.temp.position.set(
          this.current[b] / SCALE,
          this.current[b + 7] / SCALE,
          this.current[b + 1] / SCALE,
        );
        this.temp.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          new THREE.Vector3(
            this.current[b + 2],
            this.current[b + 9],
            this.current[b + 3],
          ).normalize(),
        );
        this.temp.scale.set(1, 1, 1);
        this.temp.updateMatrix();
        this.projectiles.setMatrixAt(i, this.temp.matrix);
      }
      this.projectiles.instanceMatrix.needsUpdate = true;
      this.combined?.update(this.current, this.previous, alpha, phaseTick, this.terrainType);
    }
    if (this.follow) this.controls.update();
    this.formationOverlay.update(
      this.current,
      this.camera,
      this.container.clientWidth,
      this.container.clientHeight,
    );
    this.renderer.render(this.scene, this.camera);
  };
  dispose(): void {
    this.combined?.dispose();
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.controls.dispose();
    this.formationOverlay.dispose();
    this.clearTerrain();
    for (const kit of this.kits)
      for (const mesh of Object.values(kit.meshes)) {
        mesh.geometry.dispose();
        mesh.dispose();
      }
    this.material.dispose();
    this.groundMap.dispose();
    for (const mesh of [this.marker, this.sparks, this.rally]) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      mesh.dispose();
    }
    this.projectiles.geometry.dispose();
    (this.projectiles.material as THREE.Material).dispose();
    this.projectiles.dispose();
    for (const mesh of [this.selection, this.aura, this.ground, this.destination]) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
