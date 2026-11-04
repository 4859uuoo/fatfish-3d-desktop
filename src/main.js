import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import { createMascot } from './mascot.js';
import { Island } from './island.js';
import { APPS, initPanel, openPanel, closePanel } from './panels.js';
import { initInteraction } from './interaction.js';

/* ============================================================
   基础环境
   ============================================================ */
const container = document.getElementById('scene');

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
  alpha: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x04060b);
scene.fog = new THREE.FogExp2(0x04060b, 0.026);

const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 220);
camera.position.set(0, 2.55, 8.2);

// 环境贴图（让玻璃与金属有可反射的内容）
const pmrem = new THREE.PMREMGenerator(renderer);
pmrem.compileEquirectangularShader();
const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
scene.environment = envRT.texture;
scene.environmentIntensity = 0.38;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.target.set(0, 1.35, 0);
controls.minDistance = 3.4;
controls.maxDistance = 20;
controls.maxPolarAngle = Math.PI * 0.53;
controls.autoRotateSpeed = 0.55;
controls.enablePan = true;

/* ============================================================
   灯光
   ============================================================ */
scene.add(new THREE.AmbientLight(0x223044, 0.5));

const keyLight = new THREE.DirectionalLight(0x9fe8ff, 1.5);
keyLight.position.set(4, 8, 6);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 30;
scene.add(keyLight);

const rimCyan = new THREE.PointLight(0x22d3ee, 10, 20, 2);
rimCyan.position.set(-4.5, 3.2, 2.5);
scene.add(rimCyan);

const rimPink = new THREE.PointLight(0xf472b6, 8.5, 20, 2);
rimPink.position.set(4.6, 2.6, -1.5);
scene.add(rimPink);

// 角色正面补光：MToon 材质吃方向光，缺了会让脸发暗
const charFill = new THREE.DirectionalLight(0xcfe4ff, 1.3);
charFill.position.set(1.2, 4.2, 6.5);
charFill.target.position.set(0, 2.0, -1.15);
scene.add(charFill);
scene.add(charFill.target);

const charFill2 = new THREE.DirectionalLight(0x9db8ff, 0.7);
charFill2.position.set(-3.5, 2.2, 3.5);
charFill2.target.position.set(0, 2.0, -1.15);
scene.add(charFill2);
scene.add(charFill2.target);

const warmUnder = new THREE.PointLight(0xff9a4a, 6, 12, 2);
warmUnder.position.set(0, 0.6, 0);
scene.add(warmUnder);

/* ============================================================
   星空
   ============================================================ */
function buildStars(count = 2200) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const r = 34 + Math.random() * 62;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(THREE.MathUtils.randFloat(-0.25, 1));
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.cos(phi) * 0.75 + 6;
    pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

    c.setHSL(0.52 + Math.random() * 0.14, 0.7, 0.55 + Math.random() * 0.35);
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.32,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return new THREE.Points(geo, mat);
}
const stars = buildStars();
scene.add(stars);

/* ============================================================
   地面 / 圆盘 / 光晕环
   ============================================================ */
const floorGroup = new THREE.Group();
scene.add(floorGroup);

const disc = new THREE.Mesh(
  new THREE.CircleGeometry(15, 96),
  new THREE.MeshPhysicalMaterial({
    color: 0x060a11,
    roughness: 0.24,
    metalness: 0.92,
    envMapIntensity: 0.32,
  })
);
disc.rotation.x = -Math.PI / 2;
disc.position.y = 0;
disc.receiveShadow = true;
floorGroup.add(disc);

const grid = new THREE.GridHelper(30, 30, 0x1d4d5e, 0x0e2430);
grid.position.y = 0.004;
grid.material.transparent = true;
grid.material.opacity = 0.42;
floorGroup.add(grid);

const gridFine = new THREE.GridHelper(30, 120, 0x0d2a36, 0x0d2a36);
gridFine.position.y = 0.002;
gridFine.material.transparent = true;
gridFine.material.opacity = 0.2;
floorGroup.add(gridFine);

// 发光环
function makeRing(radius, tube, color, opacity) {
  const m = new THREE.Mesh(
    new THREE.TorusGeometry(radius, tube, 8, 128),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.012;
  return m;
}
const ringA = makeRing(3.55, 0.012, 0x22d3ee, 0.55);
const ringB = makeRing(5.1, 0.008, 0xf472b6, 0.34);
const ringC = makeRing(7.2, 0.006, 0x22d3ee, 0.2);
floorGroup.add(ringA, ringB, ringC);

// 中心光柱（低多边形锥体，做体积光的廉价替代）
// 光柱已移除：在低曝光下会形成突兀的深色锥体

/* ============================================================
   悬浮尘埃
   ============================================================ */
const dustCount = 420;
const dustPos = new Float32Array(dustCount * 3);
const dustSeed = new Float32Array(dustCount);
for (let i = 0; i < dustCount; i++) {
  dustPos[i * 3] = THREE.MathUtils.randFloatSpread(18);
  dustPos[i * 3 + 1] = Math.random() * 7;
  dustPos[i * 3 + 2] = THREE.MathUtils.randFloatSpread(18);
  dustSeed[i] = Math.random() * Math.PI * 2;
}
const dustGeo = new THREE.BufferGeometry();
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
const dust = new THREE.Points(
  dustGeo,
  new THREE.PointsMaterial({
    color: 0x9fe8ff,
    size: 0.045,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
);
scene.add(dust);

/* ============================================================
   应用图标
   ============================================================ */
function makeIconTexture(emoji) {
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d');
  ctx.font = '168px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, S / 2, S / 2 + 10);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function makeFrameTexture(colorHex) {
  const S = 512;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d');
  const col = '#' + new THREE.Color(colorHex).getHexString();
  ctx.clearRect(0, 0, S, S);
  const pad = 54;
  ctx.beginPath();
  ctx.roundRect(pad, pad, S - pad * 2, S - pad * 2, 104);
  ctx.strokeStyle = col;
  ctx.lineWidth = 9;
  ctx.shadowColor = col;
  ctx.shadowBlur = 30;
  ctx.stroke();
  ctx.stroke();
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function makeLabelTexture(text) {
  const W = 512, H = 128;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  ctx.font = '700 60px "Segoe UI","Microsoft YaHei",sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(230,237,245,0.92)';
  ctx.shadowColor = 'rgba(34,211,238,0.85)';
  ctx.shadowBlur = 18;
  ctx.fillText(text, W / 2, H / 2);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const tiles = [];
const pickables = [];

function buildTiles() {
  const total = APPS.length;
  const spread = 1.35;
  const radius = 4.0;

  APPS.forEach((app, i) => {
    const a = -spread / 2 + (spread / (total - 1)) * i;

    const g = new THREE.Group();
    const baseY = 0.82;
    g.position.set(Math.sin(a) * radius, baseY, Math.cos(a) * radius);
    g.rotation.y = a * 0.5;
    g.rotation.x = -0.06;

    // 玻璃底板
    const plateMat = new THREE.MeshPhysicalMaterial({
      color: 0x070c12,
      roughness: 0.22,
      metalness: 0.38,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      emissive: new THREE.Color(app.color),
      emissiveIntensity: 0.07,
      envMapIntensity: 0.55,
    });
    const plate = new THREE.Mesh(new RoundedBoxGeometry(0.94, 0.94, 0.13, 5, 0.13), plateMat);
    plate.castShadow = true;
    plate.receiveShadow = true;
    g.add(plate);

    // 图标
    const icon = new THREE.Mesh(
      new THREE.PlaneGeometry(0.58, 0.58),
      new THREE.MeshBasicMaterial({
        map: makeIconTexture(app.icon),
        transparent: true,
        depthWrite: false,
      })
    );
    icon.position.z = 0.072;
    g.add(icon);

    // 边缘光
    const edge = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 1.5),
      new THREE.MeshBasicMaterial({
        map: makeFrameTexture(app.color),
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    edge.position.z = -0.08;
    g.add(edge);

    // 名称
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(1.15, 0.29),
      new THREE.MeshBasicMaterial({
        map: makeLabelTexture(app.label),
        transparent: true,
        depthWrite: false,
        opacity: 0.75,
      })
    );
    label.position.set(0, -0.66, 0.02);
    g.add(label);

    g.userData = {
      app,
      baseY,
      phase: i * 0.7,
      hover: 0,
      plate,
      icon,
      edge,
      label,
    };

    tiles.push(g);
    scene.add(g);
    pickables.push({ mesh: plate, type: 'tile', ref: g });
  });
}
buildTiles();

/* ============================================================
   大肥鱼
   ============================================================ */
const fish = createMascot(scene, camera);
fish.setBaseY(0.02);
scene.add(fish.root);

fish.root.traverse((o) => {
  if (o.isMesh && o.material && o.material.color) {
    pickables.push({ mesh: o, type: 'fish' });
  }
});

// 鱼身后的光环
const fishRing = new THREE.Mesh(
  new THREE.TorusGeometry(1.95, 0.012, 8, 160),
  new THREE.MeshBasicMaterial({
    color: 0xf472b6,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
);
fishRing.position.set(0, 1.72, -2.3);
scene.add(fishRing);

const fishRing2 = new THREE.Mesh(
  new THREE.TorusGeometry(2.45, 0.008, 8, 160),
  new THREE.MeshBasicMaterial({
    color: 0x22d3ee,
    transparent: true,
    opacity: 0.32,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
);
fishRing2.position.set(0, 1.72, -2.55);
scene.add(fishRing2);

/* ============================================================
   后处理
   ============================================================ */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.36,
  0.5,
  1.05
);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* ============================================================
   灵动岛 & 面板
   ============================================================ */
const island = new Island();

initPanel(() => {
  island.notify('面板已关闭', '✕', 1500);
});

fish.start();

const interaction = initInteraction({ island, fish, camera, renderer });

/* ============================================================
   交互：射线拾取
   ============================================================ */
const raycaster = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2(-10, -10);
const pointer = { x: 0, y: 0 };
let hoveredTile = null;
let downPos = null;

const dom = renderer.domElement;

dom.addEventListener('pointermove', (e) => {
  pointerNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointerNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
  pointer.x = pointerNDC.x;
  pointer.y = pointerNDC.y;
  dom.style.cursor = hoveredTile ? 'pointer' : 'grab';
});

dom.addEventListener('pointerdown', (e) => {
  downPos = { x: e.clientX, y: e.clientY };
});

dom.addEventListener('pointerup', (e) => {
  if (!downPos) return;
  const dx = e.clientX - downPos.x;
  const dy = e.clientY - downPos.y;
  const moved = Math.hypot(dx, dy);
  downPos = null;
  if (moved > 6) return; // 拖拽视角，不算点击

  raycaster.setFromCamera(pointerNDC, camera);
  const targets = [...pickables.map((p) => p.mesh), fish.root];
  const hits = raycaster.intersectObjects(targets, true);
  if (!hits.length) return;

  const hitMesh = hits[0].object;
  const rec = pickables.find((p) => p.mesh === hitMesh);

  // 命中角色（VRM 网格是异步挂上去的，直接判归属）
  let underFish = false;
  for (let o = hitMesh; o; o = o.parent) {
    if (o === fish.root) { underFish = true; break; }
  }

  if (!rec && underFish) {
    interaction.onPoke();
    island.notify('大肥鱼被你戳到了', '🐳', 2000);
    return;
  }
  if (!rec) return;

  if (rec.type === 'tile') {
    const app = rec.ref.userData.app;
    openPanel(app);
    interaction.onAppOpen(app);
    island.notify(`已打开「${app.label}」`, app.icon, 2200);
    island.setSub(`正在运行 · ${app.label}`);
  } else if (rec.type === 'fish') {
    interaction.onPoke();
    island.notify('大肥鱼开心地转了个圈 💙', '🐳', 2400);
    island.setSub('大肥鱼正在撒娇');
  }
});

/* ============================================================
   键盘：WASD 漫游 / R 自转
   ============================================================ */
const keys = new Set();
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (['w', 'a', 's', 'd', 'q', 'e'].includes(k)) keys.add(k);
  if (k === 'r') {
    controls.autoRotate = !controls.autoRotate;
    island.notify(controls.autoRotate ? '自转已开启' : '自转已关闭', '↻', 1600);
  }
  if (k === 'escape') {
    closePanel();
    island.close();
  }
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

const moveVec = new THREE.Vector3();
const rightVec = new THREE.Vector3();
const upVec = new THREE.Vector3(0, 1, 0);

function applyMovement(dt) {
  if (keys.size === 0) return;

  moveVec.set(0, 0, 0);
  camera.getWorldDirection(rightVec);
  rightVec.y = 0;
  rightVec.normalize();

  const speed = 4.2 * dt;

  if (keys.has('w')) moveVec.add(rightVec.clone().multiplyScalar(speed));
  if (keys.has('s')) moveVec.add(rightVec.clone().multiplyScalar(-speed));
  if (keys.has('a')) moveVec.add(new THREE.Vector3().crossVectors(upVec, rightVec).multiplyScalar(speed));
  if (keys.has('d')) moveVec.add(new THREE.Vector3().crossVectors(rightVec, upVec).multiplyScalar(speed));
  if (keys.has('q')) moveVec.y += speed;
  if (keys.has('e')) moveVec.y -= speed;

  camera.position.add(moveVec);
  controls.target.add(moveVec);
}

/* ============================================================
   主循环
   ============================================================ */
const clock = new THREE.Clock();
let fpsAcc = 0;
let fpsFrames = 0;
let hudTimer = 0;
const hudFps = document.getElementById('hud-fps');
const coordEl = document.getElementById('coord');

function pickHover() {
  raycaster.setFromCamera(pointerNDC, camera);
  const hits = raycaster.intersectObjects(pickables.map((p) => p.mesh), false);

  let found = null;
  if (hits.length) {
    const rec = pickables.find((p) => p.mesh === hits[0].object);
    if (rec && rec.type === 'tile') found = rec.ref;
  }

  if (found !== hoveredTile) {
    hoveredTile = found;
    if (found) {
      dom.style.cursor = 'pointer';
      island.notify(found.userData.app.label, found.userData.app.icon, 1400);
    }
  }
}

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  applyMovement(dt);
  controls.update();

  // 鱼
  fish.update(t, dt, pointer);

  // 图标浮动 / 悬停
  for (const tile of tiles) {
    const u = tile.userData;
    const target = tile === hoveredTile ? 1 : 0;
    u.hover += (target - u.hover) * Math.min(1, dt * 9);

    const idle = Math.sin(t * 1.3 + u.phase) * 0.02;
    tile.position.y = u.baseY + idle + u.hover * 0.17;
    tile.rotation.x = -0.06 + u.hover * 0.05;
    const s = 1 + u.hover * 0.075;
    tile.scale.setScalar(s);

    u.plate.material.emissiveIntensity = 0.07 + u.hover * 0.55;
    u.edge.material.opacity = 0.5 + u.hover * 0.45;
    u.label.material.opacity = 0.88 + u.hover * 0.12;
    u.icon.position.z = 0.072 + u.hover * 0.03;
  }

  // 环与尘埃
  ringA.rotation.z = t * 0.06;
  ringB.rotation.z = -t * 0.04;
  ringC.rotation.z = t * 0.025;
  fishRing.rotation.z = t * 0.18;
  fishRing2.rotation.z = -t * 0.12;
  fishRing.lookAt(camera.position.x * 0.02, fishRing.position.y, camera.position.z * 0.02);
  fishRing.rotation.z = t * 0.18;

  stars.rotation.y = t * 0.008;
  dust.rotation.y = t * 0.012;

  const dp = dust.geometry.attributes.position;
  for (let i = 0; i < dustCount; i++) {
    const base = i * 3 + 1;
    dp.array[base] += Math.sin(t * 0.8 + dustSeed[i]) * 0.0022;
    if (dp.array[base] > 7) dp.array[base] = 0.05;
  }
  dp.needsUpdate = true;

  pickHover();
  composer.render();

  // HUD
  fpsAcc += 1 / Math.max(dt, 0.0001);
  fpsFrames++;
  hudTimer += dt;
  if (hudTimer > 0.5) {
    const fps = fpsAcc / fpsFrames;
    if (hudFps) hudFps.textContent = Math.round(fps);
    island.setStats({
      fps,
      objects: Math.round(fish.state.tokens),
      distance: camera.position.distanceTo(controls.target),
    });
    if (coordEl) {
      coordEl.textContent =
        `X ${camera.position.x.toFixed(2)} · Y ${camera.position.y.toFixed(2)} · Z ${camera.position.z.toFixed(2)}`;
    }
    fpsAcc = 0;
    fpsFrames = 0;
    hudTimer = 0;
  }

  island.tick();
  interaction.update(dt);
}

/* ============================================================
   自适应
   ============================================================ */
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
});

/* ============================================================
   启动
   ============================================================ */
animate();

setTimeout(() => {
  const boot = document.getElementById('boot');
  if (boot) {
    boot.classList.add('hide');
    setTimeout(() => { boot.style.display = 'none'; }, 800);
  }
  island.notify('蓝色大肥鱼已就位 🐳', '🐳', 3000);
}, 900);

// 演示模式：?demo=1 自动展开音乐面板与灵动岛，便于截图与验收
const demoMode = new URLSearchParams(location.search).get('demo');
if (demoMode) {
  setTimeout(() => {
    // 截图环境里 CSS 过渡不会随虚拟时间推进，先禁用过渡直达终态
    const skip = document.createElement('style');
    skip.textContent = '*{transition:none !important;animation:none !important}';
    document.head.appendChild(skip);

    if (demoMode === '4') {
      camera.position.set(0.35, 2.35, 1.05);
      controls.target.set(0, 2.1, -1.4);
      controls.update();
    } else if (demoMode === '3') {
      camera.position.set(3.7, 2.45, 5.9);
      controls.target.set(0, 1.6, -1.2);
      controls.update();
      fish.play('idle');
    } else if (demoMode === '1') {
      const app = APPS.find((a) => a.id === 'music') || APPS[0];
      openPanel(app);
      interaction.onAppOpen(app);
      island.setSub('正在运行 · ' + app.label);
      island.open();
    } else {
      fish.play('dance');
    }
    interaction.say('主人～人家已经准备好啦，今天想做什么呀？', 600000);
  }, 1200);
}

// 供调试使用
window.__AETHER__ = { scene, camera, renderer, fish, tiles, island };
