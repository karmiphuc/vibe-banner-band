import { BANNERS, type BannerId } from '../content/banners';
import { createBannerModel } from './banner-model';
import { createHorseModel, HORSE_JOINTS, createBallistaModel } from './combined-models';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { UNITS } from '../content/catalog';
import { createUnitModel, createCrowdModel, JOINTS, type PartName } from './unit-models';

/** Disposable isolated asset viewer. Poses are cosmetic studies, never simulation input. */
export function openWorkshop(initialType: number): void {
  if (document.querySelector('.workshop')) return;
  const dialog = document.createElement('dialog');
  dialog.className = 'workshop';
  dialog.setAttribute('aria-label', 'Unit model workshop');
  dialog.innerHTML = `<header><div><span class="eyebrow">THE ARMORY / EQUIPMENT STUDIES</span><h2>Model workshop</h2></div><button class="secondary" id="close-workshop" aria-label="Close model workshop">Close ×</button></header><div class="workshop-layout"><div class="workshop-stage"><div class="studio-label">DRAG TO ROTATE · SCROLL TO ZOOM</div></div><aside><label for="workshop-unit">Unit design</label><select id="workshop-unit">${UNITS.map((u, i) => `<option value="${i}">${u.name}</option>`).join('')}</select><h3 id="workshop-name"></h3><p id="workshop-description"></p><label for="workshop-pose">Pose study</label><select id="workshop-pose"><option value="idle">At ease</option><option value="march">March</option><option value="attack">Attack</option><option value="guard">Shield guard</option></select><label class="workshop-check"><input type="checkbox" id="workshop-sidearm"> Ammunition exhausted</label><label class="workshop-check"><input type="checkbox" id="workshop-broken"> Shield broken</label><label class="workshop-check"><input type="checkbox" id="workshop-lod"> Crowd geometry</label><label class="workshop-check"><input type="checkbox" id="workshop-turntable" checked> Turntable</label><label for="workshop-banner">Banner equipment</label><select id="workshop-banner"><option value="none">None</option>${Object.entries(
    BANNERS,
  )
    .map(([id, b]) => `<option value="${id}">${b.name}</option>`)
    .join(
      '',
    )}</select><h4>Equipped kit</h4><ul id="workshop-equipment"></ul><p class="workshop-metrics" id="workshop-metrics"></p><p class="workshop-footnote">Original articulated proof-of-concept models. Equipment and pose studies; no direct hero control.</p></aside></div>`;
  document.body.appendChild(dialog);
  dialog.showModal();
  const find = <T extends HTMLElement>(id: string) => dialog.querySelector<T>(`#${id}`)!;
  find<HTMLSelectElement>('workshop-unit').value = String(initialType);
  const stage = dialog.querySelector<HTMLElement>('.workshop-stage')!;
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor('#202a25');
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  stage.appendChild(renderer.domElement);
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(32, 1, 0.1, 30);
  camera.position.set(2.9, 2.15, 4.6);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.12, 0);
  controls.enablePan = false;
  controls.minDistance = 2.5;
  controls.maxDistance = 14;
  controls.maxPolarAngle = Math.PI * 0.52;
  controls.enableDamping = true;
  scene.add(new THREE.HemisphereLight('#e9f2ec', '#303c32', 2));
  const sun = new THREE.DirectionalLight('#fff0d3', 3.1);
  sun.position.set(-3, 6, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  const rim = new THREE.DirectionalLight('#9ac4bc', 2);
  rim.position.set(3, 3, -4);
  scene.add(rim);
  const plinth = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 1.12, 0.14, 64),
    new THREE.MeshStandardMaterial({ color: '#4e5848', roughness: 0.95 }),
  );
  plinth.position.y = -0.09;
  plinth.receiveShadow = true;
  scene.add(plinth);
  const trim = new THREE.Mesh(
    new THREE.TorusGeometry(1.065, 0.008, 5, 64),
    new THREE.MeshStandardMaterial({ color: '#b5a779', metalness: 0.6, roughness: 0.4 }),
  );
  trim.rotation.x = Math.PI / 2;
  trim.position.y = -0.025;
  scene.add(trim);
  const root = new THREE.Group();
  scene.add(root);
  const bannerPreview = new THREE.Group();
  root.add(bannerPreview);
  let bannerItem: BannerId | 'none' = 'none';
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.7,
    metalness: 0.15,
    side: THREE.DoubleSide,
  });
  let extras: THREE.Mesh[] = [];
  let mounted = false,
    engineer = false;
  let parts = {} as Record<PartName, THREE.Mesh>;
  const rebuild = () => {
    for (const mesh of extras) {
      root.remove(mesh);
      mesh.geometry.dispose();
    }
    extras = [];
    for (const mesh of Object.values(parts)) {
      root.remove(mesh);
      mesh.geometry.dispose();
    }
    const type = Number(find<HTMLSelectElement>('workshop-unit').value),
      u = UNITS[type];
    const bannerSelect = find<HTMLSelectElement>('workshop-banner');
    for (const option of bannerSelect.options)
      if (option.value !== 'none')
        option.hidden = BANNERS[option.value as BannerId].team !== u.team;
    if (bannerSelect.value !== 'none' && BANNERS[bannerSelect.value as BannerId].team !== u.team)
      bannerSelect.value = 'none';
    bannerItem = bannerSelect.value as BannerId | 'none';
    for (const child of bannerPreview.children) (child as THREE.Mesh).geometry.dispose();
    bannerPreview.clear();
    if (bannerItem !== 'none')
      for (const geometry of Object.values(createBannerModel(bannerItem))) {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        bannerPreview.add(mesh);
      }
    const sidearm = find<HTMLInputElement>('workshop-sidearm');
    sidearm.disabled = u.role !== 'skirmisher' && u.role !== 'horse-archer';
    mounted = u.role === 'cavalry' || u.role === 'horse-archer';
    engineer = u.role === 'engineer';
    const model = (
      find<HTMLInputElement>('workshop-lod').checked ? createCrowdModel : createUnitModel
    )(
      type,
      sidearm.checked,
      find<HTMLInputElement>('workshop-broken').checked,
      bannerItem !== 'none' &&
        find<HTMLSelectElement>('workshop-pose').value !== 'attack' &&
        !engineer,
    );
    for (const name of Object.keys(model.parts) as PartName[]) {
      const mesh = new THREE.Mesh(model.parts[name], material);
      mesh.position.set(...JOINTS[name]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      root.add(mesh);
      parts[name] = mesh;
    }
    if (mounted) {
      for (const [name, geometry] of Object.entries(
        createHorseModel(find<HTMLInputElement>('workshop-lod').checked),
      )) {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = name;
        mesh.position.set(...HORSE_JOINTS[name]);
        mesh.castShadow = true;
        root.add(mesh);
        extras.push(mesh);
      }
    } else if (u.role === 'engineer') {
      const mesh = new THREE.Mesh(createBallistaModel(), material);
      mesh.position.x = 0;
      root.add(mesh);
      extras.push(mesh);
    }
    const large = bannerItem !== 'none' || mounted || u.role === 'engineer';
    plinth.scale.set(large ? 2.6 : 1, 1, large ? 2.6 : 1);
    trim.scale.setScalar(large ? 2.6 : 1);
    camera.position.set(
      engineer ? 6 : bannerItem !== 'none' ? 5.8 : large ? 4.8 : 2.9,
      engineer ? 4.4 : bannerItem !== 'none' ? 3.8 : large ? 3.2 : 2.15,
      engineer ? 10 : bannerItem !== 'none' ? 8.5 : large ? 7 : 4.6,
    );
    controls.target.set(0, bannerItem !== 'none' ? (mounted ? 2.4 : 2.0) : mounted ? 1.4 : 1.12, 0);
    find('workshop-name').textContent = u.name;
    find('workshop-description').textContent = u.description;
    find('workshop-equipment').replaceChildren(
      ...[...u.equipment, ...(bannerItem === 'none' ? [] : [BANNERS[bannerItem].name])].map(
        (item) => {
          const li = document.createElement('li');
          li.textContent = item;
          return li;
        },
      ),
    );
    const triangles = [
      ...Object.values(model.parts),
      ...bannerPreview.children.map((m) => (m as THREE.Mesh).geometry),
    ].reduce((n, g) => n + g.getAttribute('position').count / 3, 0);
    find('workshop-metrics').textContent =
      `${(triangles + extras.reduce((n, m) => n + (m.geometry.index?.count ?? m.geometry.attributes.position.count) / 3, 0)).toLocaleString()} triangles · ${5 + extras.length + bannerPreview.children.length} parts`;
  };
  for (const id of [
    'workshop-unit',
    'workshop-sidearm',
    'workshop-lod',
    'workshop-broken',
    'workshop-banner',
    'workshop-pose',
  ])
    find(id).addEventListener('change', rebuild);
  rebuild();
  const resize = () => {
    const w = stage.clientWidth,
      h = stage.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(stage);
  resize();
  let frame = 0,
    last = 0,
    phase = 0;
  const animate = (time: number) => {
    frame = requestAnimationFrame(animate);
    const dt = Math.min(0.05, (time - last) / 1000);
    last = time;
    phase += dt;
    controls.autoRotate = find<HTMLInputElement>('workshop-turntable').checked;
    controls.autoRotateSpeed = 0.65;
    controls.update(dt);
    const pose = find<HTMLSelectElement>('workshop-pose').value;
    for (const [name, mesh] of Object.entries(parts)) {
      mesh.rotation.set(0, 0, 0);
      mesh.position.set(...JOINTS[name as PartName]);
    }
    if (pose === 'march') {
      const gait = Math.sin(phase * 7) * 0.5;
      parts.leftLeg.rotation.x = gait;
      parts.rightLeg.rotation.x = -gait;
      parts.rightArm.rotation.x = gait * 0.4;
      parts.leftArm.rotation.x = -gait * 0.2;
      root.position.y = Math.abs(gait) * 0.04;
    } else {
      root.position.y = 0;
      parts.body.position.y = Math.sin(phase * 2) * 0.008;
    }
    if (pose === 'attack') {
      const swing = (Math.sin(phase * 3) + 1) / 2;
      parts.rightArm.rotation.set(-0.55 * swing, -1.1 + 2 * swing, 0);
      parts.body.rotation.y = (swing - 0.5) * 0.2;
      parts.leftArm.rotation.x = -0.3;
    }
    if (pose === 'attack' && Number(find<HTMLSelectElement>('workshop-unit').value) < 3) {
      parts.rightArm.rotation.set(-0.45, 0, 0);
      parts.rightArm.position.z = (Math.sin(phase * 3) + 1) * 0.15 - 0.1;
    }
    if (pose === 'guard') {
      parts.leftArm.rotation.set(-0.5, 0.15, 0);
      parts.rightArm.rotation.x = -0.4;
      parts.rightArm.rotation.y = -0.3;
    }
    if (mounted) {
      for (const [name, mesh] of Object.entries(parts)) {
        mesh.position.y += 0.68;
        if (name === 'leftLeg' || name === 'rightLeg') {
          mesh.position.x *= 2.5;
          mesh.rotation.set(-0.35, 0, name === 'leftLeg' ? -0.16 : 0.16);
        }
      }
      for (const mesh of extras)
        if (mesh.name !== 'body')
          mesh.rotation.x =
            pose === 'march'
              ? Math.sin(
                  phase * 10 +
                    (mesh.name.includes('Right') ? Math.PI : 0) +
                    (mesh.name.startsWith('rear') ? 1.8 : 0),
                ) * 0.6
              : 0;
    }
    if (engineer)
      for (const mesh of Object.values(parts)) {
        mesh.position.x -= 1.5;
        mesh.position.z -= 1.5;
      }
    if (bannerItem !== 'none') {
      const stowed = pose === 'attack' || engineer;
      bannerPreview.position.set(
        (stowed ? -0.27 : 0.31) - (engineer ? 1.5 : 0),
        (stowed ? 0.82 : 0.77) + (mounted ? 0.68 : 0),
        (stowed ? -0.23 : 0.18) - (engineer ? 1.5 : 0),
      );
      bannerPreview.rotation.z = stowed ? 0.12 : 0;
      if (!stowed) parts.rightArm.rotation.set(0, 0, 0);
    }
    renderer.render(scene, camera);
  };
  frame = requestAnimationFrame(animate);
  find('close-workshop').addEventListener('click', () => dialog.close());
  dialog.addEventListener(
    'close',
    () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          if (o.material !== material) (o.material as THREE.Material).dispose();
        }
      });
      material.dispose();
      renderer.dispose();
      dialog.remove();
    },
    { once: true },
  );
}
