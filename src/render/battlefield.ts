import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SCALE, UNITS, obstaclesFor, type BattleConfig } from '../content/catalog';
import { MAX_PROJECTILES, PROJECTILE_STRIDE, State, UNIT_STRIDE } from '../sim/battle';
import { createUnitModel, JOINTS, type PartName } from './unit-models';

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
  private terrain = new THREE.Group();
  private material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.8,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });
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
    this.renderer.setClearColor('#b9b399');
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.domElement.setAttribute(
      'aria-label',
      'Isometric battlefield. Drag to pan, scroll to zoom, click a soldier to inspect.',
    );
    this.container.appendChild(this.renderer.domElement);
    this.camera = new THREE.OrthographicCamera(-40, 40, 30, -30, 0.1, 400);
    this.camera.position.set(-45, 60, 62);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableRotate = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.minZoom = 0.55;
    this.controls.maxZoom = 7;
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
    this.controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN };
    this.scene.add(new THREE.HemisphereLight('#fff4d5', '#707a69', 1.6));
    const sun = new THREE.DirectionalLight('#fff3d5', 2.4);
    sun.position.set(-35, 70, 30);
    this.scene.add(sun);
    this.ground = new THREE.Mesh(
      new THREE.PlaneGeometry(180, 180),
      new THREE.MeshStandardMaterial({ color: '#8c946f', roughness: 1 }),
    );
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = -0.045;
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
    this.selection = new THREE.Mesh(
      new THREE.RingGeometry(0.65, 0.72, 40),
      new THREE.MeshBasicMaterial({ color: '#fff4cb', side: THREE.DoubleSide, depthWrite: false }),
    );
    this.selection.rotation.x = -Math.PI / 2;
    this.selection.position.y = 0.06;
    this.selection.visible = false;
    this.scene.add(this.selection);
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
    this.count = config.romans.count + config.gauls.count;
    this.current = new Int32Array(0);
    this.previous = new Int32Array(0);
    this.select(-1);
    for (const kit of this.kits)
      for (const mesh of Object.values(kit.meshes)) {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        mesh.dispose();
      }
    this.kits = [0, 1, 2, 3, 4, 5, 1, 4].map((type, index) => {
      const model = createUnitModel(type, index >= 6);
      const meshes = {} as Kit['meshes'];
      for (const name of Object.keys(model.parts) as PartName[]) {
        const mesh = new THREE.InstancedMesh(model.parts[name], this.material, this.count);
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        mesh.frustumCulled = false;
        mesh.count = 0;
        this.scene.add(mesh);
        meshes[name] = mesh;
      }
      return { meshes, ids: [] };
    });
    this.clearTerrain();
    (this.ground.material as THREE.MeshStandardMaterial).color.set(
      config.terrain === 'rocky-pass' ? '#989b81' : '#8c946f',
    );
    let state = config.seed || 1;
    const random = () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    };
    const patchMat = new THREE.MeshStandardMaterial({ color: '#959d79', roughness: 1 });
    const patches = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 7), patchMat, 200);
    for (let i = 0; i < 200; i++) {
      this.temp.position.set((random() - 0.5) * 160, -0.035, (random() - 0.5) * 160);
      this.temp.rotation.set(-Math.PI / 2, 0, random() * 6);
      this.temp.scale.set(1 + random() * 5, 1 + random() * 3, 1);
      this.temp.updateMatrix();
      patches.setMatrixAt(i, this.temp.matrix);
    }
    this.terrain.add(patches);
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
    this.terrain.add(grid);
    if (config.terrain === 'crossroads')
      for (const rotation of [0, Math.PI / 2]) {
        const road = new THREE.Mesh(
          new THREE.PlaneGeometry(125, 5),
          new THREE.MeshStandardMaterial({ color: '#b2a482', roughness: 1 }),
        );
        road.rotation.set(-Math.PI / 2, 0, rotation);
        road.position.y = -0.022;
        this.terrain.add(road);
      }
    for (const o of obstaclesFor(config.terrain)) {
      const rock = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1, 1),
        new THREE.MeshStandardMaterial({ color: '#797d72', roughness: 1, flatShading: true }),
      );
      rock.position.set(o.x / SCALE, 2, o.z / SCALE);
      rock.scale.set(o.radius / SCALE, 5, o.radius / SCALE);
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
    // Edge scenery is cosmetic and never modifies walkability.
    for (let i = 0; i < 45; i++) {
      const x = (i % 2 ? 1 : -1) * (66 + random() * 15),
        z = (random() - 0.5) * 150;
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.25, 2, 5),
        new THREE.MeshStandardMaterial({ color: '#655541' }),
      );
      trunk.position.set(x, 0.9, z);
      this.terrain.add(trunk);
      const leaves = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1, 1),
        new THREE.MeshStandardMaterial({ color: i % 3 ? '#586d4c' : '#777b4d', flatShading: true }),
      );
      leaves.position.set(x, 2.4, z);
      leaves.scale.set(1.5 + random(), 2 + random(), 1.5 + random());
      this.terrain.add(leaves);
    }
    this.overview();
  }
  snapshot(data: Int32Array, running: boolean): void {
    const now = performance.now();
    this.interval = Math.max(16, Math.min(150, now - this.receivedAt));
    this.receivedAt = now;
    this.previous = this.current.length === data.length ? this.current : new Int32Array(data);
    this.current = new Int32Array(data);
    this.running = running;
    this.dirty = true;
    for (const kit of this.kits) kit.ids.length = 0;
    for (let i = 0; i < this.count; i++) {
      const b = 3 + i * UNIT_STRIDE,
        type = this.current[b + 8];
      const kit =
        type === 1 && this.current[b + 9] === 0
          ? 6
          : type === 4 && this.current[b + 9] === 0
            ? 7
            : type;
      this.kits[kit].ids.push(i);
    }
  }
  setRunning(running: boolean): void {
    this.running = running;
    this.dirty = true;
  }
  select(id: number): void {
    this.selected = id;
    this.selection.visible = id >= 0;
    this.dirty = true;
  }
  overview(): void {
    this.controls.target.set(0, 0, 0);
    this.camera.position.set(-45, 60, 62);
    this.camera.zoom = this.count > 900 ? 0.78 : this.count > 400 ? 1.0 : 1.4;
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }
  focus(id: number): void {
    if (id < 0 || !this.current.length) return;
    const base = 3 + id * UNIT_STRIDE;
    const x = this.current[base] / SCALE,
      z = this.current[base + 1] / SCALE;
    this.controls.target.set(x, 0.8, z);
    this.camera.position.set(x - 10, 14, z + 15);
    this.camera.zoom = 5;
    this.camera.updateProjectionMatrix();
    this.select(id);
  }
  zoomBy(factor: number): void {
    this.camera.zoom = THREE.MathUtils.clamp(this.camera.zoom * factor, 0.55, 7);
    this.camera.updateProjectionMatrix();
  }
  private pick(event: PointerEvent): void {
    if (!this.current.length) return;
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
    if (!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.8), hit)) return;
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
    this.frames++;
    if (time - this.fpsAt >= 1000) {
      this.fps = Math.round((this.frames * 1000) / (time - this.fpsAt));
      this.frames = 0;
      this.fpsAt = time;
    }
    const delta = Math.min(100, time - this.lastFrame);
    this.lastFrame = time;
    void delta;
    if (this.current.length && (this.running || this.dirty)) {
      this.dirty = false;
      const alpha = this.running
        ? THREE.MathUtils.clamp((performance.now() - this.receivedAt) / this.interval, 0, 1)
        : 1;
      const phaseTick = this.current[0] + (this.running ? alpha * 2 : 0);
      const shadow = this.terrain.getObjectByName('shadows') as THREE.InstancedMesh;
      let shadowCount = 0;
      for (const kit of this.kits) {
        let index = 0;
        for (const id of kit.ids) {
          const b = 3 + id * UNIT_STRIDE,
            state = this.current[b + 4];
          if (state === State.Escaped) continue;
          const x = THREE.MathUtils.lerp(this.previous[b], this.current[b], alpha) / SCALE,
            z = THREE.MathUtils.lerp(this.previous[b + 1], this.current[b + 1], alpha) / SCALE;
          const moving =
            Math.abs(this.current[b] - this.previous[b]) +
              Math.abs(this.current[b + 1] - this.previous[b + 1]) >
            8;
          const angle = Math.atan2(this.current[b + 6], this.current[b + 7]);
          const dead = state === State.Dead;
          this.position.set(x, dead ? 0.16 : 0, z);
          this.rotation.set(dead ? Math.PI / 2 : 0, angle, 0);
          this.quaternion.setFromEuler(this.rotation);
          this.root.compose(this.position, this.quaternion, this.scale);
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
            if (name === 'rightArm')
              this.rotation.x = windup
                ? -1.1 * Math.sin(windup * Math.PI)
                : state === State.Recovery
                  ? -0.5
                  : gait * 0.35;
            if (name === 'leftArm') this.rotation.x = state === State.Windup ? -0.25 : -gait * 0.2;
            this.quaternion.setFromEuler(this.rotation);
            this.local.compose(this.position, this.quaternion, this.scale);
            this.matrix.multiplyMatrices(this.root, this.local);
            kit.meshes[name].setMatrixAt(index, this.matrix);
          }
          this.temp.position.set(x, 0.015, z);
          this.temp.rotation.set(-Math.PI / 2, 0, 0);
          this.temp.scale.set(1, dead ? 1.6 : 0.65, 1);
          this.temp.updateMatrix();
          shadow.setMatrixAt(shadowCount++, this.temp.matrix);
          if (id === this.selected) {
            this.selection.position.set(x, 0.06, z);
            this.aura.visible = UNITS[this.current[b + 8]].role === 'commander' && !dead;
            this.aura.position.set(x, 0.025, z);
          }
          index++;
        }
        for (const mesh of Object.values(kit.meshes)) {
          mesh.count = index;
          mesh.instanceMatrix.needsUpdate = true;
        }
      }
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
          1.25 + Math.sin((this.current[b + 4] / 36) * Math.PI) * 1.8,
          this.current[b + 1] / SCALE,
        );
        this.temp.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          new THREE.Vector3(this.current[b + 2], 0, this.current[b + 3]).normalize(),
        );
        this.temp.scale.set(1, 1, 1);
        this.temp.updateMatrix();
        this.projectiles.setMatrixAt(i, this.temp.matrix);
      }
      this.projectiles.instanceMatrix.needsUpdate = true;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };
  dispose(): void {
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.controls.dispose();
    this.clearTerrain();
    for (const kit of this.kits)
      for (const mesh of Object.values(kit.meshes)) {
        mesh.geometry.dispose();
        mesh.dispose();
      }
    this.material.dispose();
    this.projectiles.geometry.dispose();
    (this.projectiles.material as THREE.Material).dispose();
    this.projectiles.dispose();
    for (const mesh of [this.selection, this.aura, this.ground]) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
