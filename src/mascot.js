import * as THREE from 'three';

/**
 * 蓝色大肥鱼（DeepSeek 鲸鱼娘）
 *
 * 采用社区桌宠项目 1190fasheqi/dafeiyu-pet 的成品三视图立绘（MIT 协议），
 * 通过「广告牌 + 三视图交叉淡入」实现伪 3D 转身：
 * 相机绕着她转动时，正面 / 侧面 / 背面三张立绘按方位角权重平滑混合，
 * 观感上就像角色在跟着你转头。
 */

const VIEWS = [
  { key: 'front', url: '/sprites/front.png', aspect: 255 / 340 },
  { key: 'side', url: '/sprites/side.png', aspect: 222 / 340 },
  { key: 'back', url: '/sprites/back.png', aspect: 253 / 340 },
];

const CHAR_HEIGHT = 3.35;
const FEET_Y = 0.05;

export function createMascot(scene, camera) {
  const root = new THREE.Group();
  root.position.set(0, 0, -1.4);
  scene.add(root);

  const loader = new THREE.TextureLoader();

  /* ---------- 三视图平面 ---------- */
  const layers = VIEWS.map((v) => {
    const tex = loader.load(v.url);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.minFilter = THREE.LinearMipmapLinearFilter;

    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    });

    const w = CHAR_HEIGHT * v.aspect;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, CHAR_HEIGHT), mat);
    mesh.position.y = FEET_Y + CHAR_HEIGHT / 2;
    mesh.renderOrder = 10;
    root.add(mesh);

    return { mesh, mat, key: v.key, aspect: v.aspect };
  });

  // 正面默认可见，避免首帧空白
  layers[0].mat.opacity = 1;

  /* ---------- 地面投影 ---------- */
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 256;
  const sctx = shadowCanvas.getContext('2d');
  const sgrad = sctx.createRadialGradient(128, 128, 4, 128, 128, 128);
  sgrad.addColorStop(0, 'rgba(0,0,0,0.55)');
  sgrad.addColorStop(0.55, 'rgba(0,0,0,0.22)');
  sgrad.addColorStop(1, 'rgba(0,0,0,0)');
  sctx.fillStyle = sgrad;
  sctx.fillRect(0, 0, 256, 256);
  const shadowTex = new THREE.CanvasTexture(shadowCanvas);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 1.5),
    new THREE.MeshBasicMaterial({
      map: shadowTex, transparent: true, opacity: 0.85,
      depthWrite: false, toneMapped: false,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, 0.02, 0);
  root.add(shadow);

  /* ---------- 柔光 ---------- */
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = glowCanvas.height = 256;
  const gctx = glowCanvas.getContext('2d');
  const ggrad = gctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  ggrad.addColorStop(0, 'rgba(110,160,255,0.45)');
  ggrad.addColorStop(0.5, 'rgba(70,120,230,0.13)');
  ggrad.addColorStop(1, 'rgba(50,100,220,0)');
  gctx.fillStyle = ggrad;
  gctx.fillRect(0, 0, 256, 256);
  const glowTex = new THREE.CanvasTexture(glowCanvas);
  glowTex.colorSpace = THREE.SRGBColorSpace;

  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(5.0, 5.6),
    new THREE.MeshBasicMaterial({
      map: glowTex, transparent: true, opacity: 0.6,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    })
  );
  glow.position.set(0, FEET_Y + CHAR_HEIGHT * 0.45, -0.35);
  root.add(glow);

  /* ---------- 爱心 ---------- */
  const hearts = [];
  for (let i = 0; i < 16; i++) {
    const h = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xff9dbf, transparent: true, opacity: 0.9 })
    );
    h.visible = false;
    h.userData = { life: 0, vy: 0, vx: 0 };
    scene.add(h);
    hearts.push(h);
  }

  function emitHearts(origin, count = 8) {
    let n = 0;
    for (const h of hearts) {
      if (h.visible) continue;
      h.visible = true;
      h.position.copy(origin);
      h.position.x += (Math.random() - 0.5) * 0.5;
      h.position.y += (Math.random() - 0.5) * 0.25;
      h.userData.life = 1;
      h.userData.vy = 0.55 + Math.random() * 0.5;
      h.userData.vx = (Math.random() - 0.5) * 0.45;
      h.material.opacity = 0.9;
      if (++n >= count) break;
    }
  }

  /* ---------- 状态 ---------- */
  const state = { baseY: 0, jump: 0, pointerX: 0, pointerY: 0 };

  const camDir = new THREE.Vector3();
  const tmp = new THREE.Vector3();

  function update(t, dt) {
    // 相机相对角色的方位角：0 = 正面，±90° = 侧面，180° = 背面
    camDir.subVectors(camera.position, root.position);
    const a = Math.atan2(camDir.x, camDir.z);
    const t01 = Math.min(1, Math.abs(a) / Math.PI);

    // 三角形权重：任意时刻最多两层非零，等价于两图交叉淡化
    let wFront = 0, wSide = 0, wBack = 0;
    if (t01 <= 0.5) {
      const k = t01 / 0.5;
      wFront = 1 - k;
      wSide = k;
    } else {
      const k = (t01 - 0.5) / 0.5;
      wSide = 1 - k;
      wBack = k;
    }

    const weights = [wFront, wSide, wBack];
    layers.forEach((l, i) => {
      l.mat.opacity = weights[i];
      // 侧视图根据观察方向做镜像，保证朝向一致
      if (l.key === 'side') {
        l.mesh.scale.x = a < 0 ? -1 : 1;
      }
    });

    // 呼吸浮动 + 轻微摇摆
    const bob = Math.sin(t * 1.2) * 0.05 + Math.sin(t * 0.55) * 0.02;
    const jump = state.jump > 0.001 ? state.jump : 0;
    root.position.y = state.baseY + bob + jump * 0.45;
    root.position.x = Math.sin(t * 0.4) * 0.06;

    // 跳跃回落
    if (state.jump > 0.001) state.jump *= 0.9;

    // 轻微呼吸缩放
    const breathe = 1 + Math.sin(t * 1.2) * 0.006;
    layers.forEach((l) => {
      l.mesh.scale.y = breathe;
    });

    // 柔光呼吸
    glow.material.opacity = 0.5 + Math.sin(t * 1.1) * 0.08;

    // 爱心
    for (const h of hearts) {
      if (!h.visible) continue;
      const u = h.userData;
      u.life -= dt * 0.5;
      h.position.y += u.vy * dt;
      h.position.x += Math.sin(t * 2 + h.position.y * 3) * u.vx * dt;
      h.material.opacity = Math.max(0, u.life) * 0.9;
      h.scale.setScalar(0.6 + (1 - u.life) * 1.4);
      if (u.life <= 0) h.visible = false;
    }
  }

  function react() {
    state.jump = 1;
    tmp.copy(root.position);
    tmp.y += FEET_Y + CHAR_HEIGHT * 0.75;
    tmp.z += 0.3;
    emitHearts(tmp, 8);
  }

  return {
    root,
    update,
    react,
    state,
    setBaseY(y) { state.baseY = y; root.position.y = y; },
  };
}
