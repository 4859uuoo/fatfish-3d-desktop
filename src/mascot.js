import * as THREE from 'three';

/**
 * 蓝色大肥鱼（DeepSeek 鲸鱼娘）—— 3D 充气立绘
 *
 * 立绘本身是 2D 的，社区也没有对应的 3D 模型。
 * 这里的做法是把立绘沿 alpha 轮廓"充气"成真正有厚度的三维实体：
 *   1. 取立绘 alpha 通道，做多次箱式模糊得到高度场
 *   2. 用高度场位移一张高细分平面，得到起伏的正面
 *   3. 镜像出背面，形成有体积的实体
 *
 * 结果是原版角色 + 真实几何厚度，可以绕着看侧面、有真实光照与高光。
 */

const CHAR_HEIGHT = 3.95;
const FEET_Y = 0.05;
const DEPTH = 0.52;
const TEX_W = 256;
const TEX_H = Math.round((TEX_W * 340) / 255);

const ACTION_POSE = {
  idle: { tilt: 0, lift: 0, sway: 1 },
  wave: { tilt: 0.16, lift: 0.18, sway: 1.6 },
  happy: { tilt: -0.1, lift: 0.34, sway: 2.0 },
  shy: { tilt: 0.1, lift: 0.06, sway: 0.7 },
  angry: { tilt: -0.18, lift: 0.02, sway: 1.2 },
  eat: { tilt: 0.08, lift: 0.1, sway: 0.9 },
  dance: { tilt: 0.2, lift: 0.22, sway: 2.4 },
  code: { tilt: -0.06, lift: 0.04, sway: 0.8 },
};

export function createMascot(scene, camera) {
  const root = new THREE.Group();
  root.position.set(0, 0, -1.4);
  scene.add(root);

  const state = {
    baseY: 0,
    jump: 0,
    spin: 0,
    tokens: 62,
    affection: 40,
    action: 'idle',
    actionUntil: 0,
  };

  const api = {
    root,
    state,
    ready: false,
    update() {},
    react() {},
    play() {},
    start() {},
    getHeadWorld() {
      const v = new THREE.Vector3();
      root.getWorldPosition(v);
      v.y += FEET_Y + CHAR_HEIGHT * 0.86;
      return v;
    },
    setBaseY(y) {
      state.baseY = y;
      root.position.y = y;
    },
    get clip() {
      return state.action;
    },
  };

  /* ---------- 高度场 ---------- */
  function buildHeightField(alpha, w, h) {
    let cur = alpha;
    const radius = 3;
    for (let pass = 0; pass < 4; pass++) {
      const next = new Float32Array(w * h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let sum = 0;
          let count = 0;
          for (let dy = -radius; dy <= radius; dy++) {
            const yy = y + dy;
            if (yy < 0 || yy >= h) continue;
            for (let dx = -radius; dx <= radius; dx++) {
              const xx = x + dx;
              if (xx < 0 || xx >= w) continue;
              sum += cur[yy * w + xx];
              count++;
            }
          }
          next[y * w + x] = count ? sum / count : 0;
        }
      }
      cur = next;
    }

    let max = 0;
    for (let i = 0; i < cur.length; i++) if (cur[i] > max) max = cur[i];
    if (max > 0) for (let i = 0; i < cur.length; i++) cur[i] /= max;

    // 对比度增强，让中心更鼓、边缘更快收口
    for (let i = 0; i < cur.length; i++) {
      cur[i] = Math.pow(cur[i], 0.78);
    }
    return cur;
  }

  /* ---------- 加载立绘并构建 ---------- */
  const img = new Image();
  img.onload = () => {
    const aspect = img.width / img.height;
    const W = CHAR_HEIGHT * aspect;

    // 采样 alpha
    const cv = document.createElement('canvas');
    cv.width = TEX_W;
    cv.height = TEX_H;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, TEX_W, TEX_H);
    const data = ctx.getImageData(0, 0, TEX_W, TEX_H).data;

    const alpha = new Float32Array(TEX_W * TEX_H);
    for (let i = 0; i < TEX_W * TEX_H; i++) alpha[i] = data[i * 4 + 3] / 255;

    const field = buildHeightField(alpha, TEX_W, TEX_H);

    // 贴图
    const tex = new THREE.Texture(img);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    tex.anisotropy = 8;
    tex.minFilter = THREE.LinearMipmapLinearFilter;

    // 几何：高细分平面 + 位移
    const SEG_X = 132;
    const SEG_Y = 176;
    const geo = new THREE.PlaneGeometry(W, CHAR_HEIGHT, SEG_X, SEG_Y);
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;

    for (let i = 0; i < pos.count; i++) {
      const u = uv.getX(i);
      const v = uv.getY(i);
      const px = Math.min(TEX_W - 1, Math.max(0, Math.floor(u * TEX_W)));
      const py = Math.min(TEX_H - 1, Math.max(0, Math.floor((1 - v) * TEX_H)));
      const hgt = field[py * TEX_W + px];
      // 二次曲线让边缘收得更干净
      pos.setZ(i, hgt * hgt * DEPTH);
    }
    geo.computeVertexNormals();

    const frontMat = new THREE.MeshStandardMaterial({
      map: tex,
      alphaTest: 0.5,
      roughness: 0.52,
      metalness: 0.06,
      envMapIntensity: 0.75,
    });

    const front = new THREE.Mesh(geo, frontMat);
    front.position.y = FEET_Y + CHAR_HEIGHT / 2;
    root.add(front);

    // 背面：同一几何，z 反向，颜色压暗
    const backMat = new THREE.MeshStandardMaterial({
      map: tex,
      alphaTest: 0.5,
      roughness: 0.62,
      metalness: 0.04,
      color: 0x8fa3c4,
      side: THREE.DoubleSide,
      envMapIntensity: 0.5,
    });
    const back = new THREE.Mesh(geo, backMat);
    back.position.y = front.position.y;
    back.scale.z = -1;
    root.add(back);

    // 描边：必须共用同一张 alpha 遮罩，否则会渲染出整块矩形
    const outlineMat = new THREE.MeshBasicMaterial({
      map: tex,
      alphaTest: 0.52,
      color: 0x0b1330,
      side: THREE.BackSide,
    });
    const outline = new THREE.Mesh(geo, outlineMat);
    outline.position.y = front.position.y;
    outline.scale.set(1.014, 1.014, 1.0);
    root.add(outline);

    api.ready = true;
    window.__FISH_READY__ = true;
  };
  img.src = '/character/front.png';

  /* ---------- 地面投影 ---------- */
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 256;
  const sctx = shadowCanvas.getContext('2d');
  const sgrad = sctx.createRadialGradient(128, 128, 4, 128, 128, 128);
  sgrad.addColorStop(0, 'rgba(0,0,0,0.5)');
  sgrad.addColorStop(0.55, 'rgba(0,0,0,0.2)');
  sgrad.addColorStop(1, 'rgba(0,0,0,0)');
  sctx.fillStyle = sgrad;
  sctx.fillRect(0, 0, 256, 256);
  const shadowTex = new THREE.CanvasTexture(shadowCanvas);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 1.4),
    new THREE.MeshBasicMaterial({
      map: shadowTex, transparent: true, opacity: 0.8,
      depthWrite: false, toneMapped: false,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, 0.015, 0);
  root.add(shadow);

  /* ---------- 柔光 ---------- */
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = glowCanvas.height = 256;
  const gctx = glowCanvas.getContext('2d');
  const ggrad = gctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  ggrad.addColorStop(0, 'rgba(110,160,255,0.38)');
  ggrad.addColorStop(0.5, 'rgba(70,120,230,0.11)');
  ggrad.addColorStop(1, 'rgba(50,100,220,0)');
  gctx.fillStyle = ggrad;
  gctx.fillRect(0, 0, 256, 256);
  const glowTex = new THREE.CanvasTexture(glowCanvas);
  glowTex.colorSpace = THREE.SRGBColorSpace;

  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(5.2, 5.8),
    new THREE.MeshBasicMaterial({
      map: glowTex, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    })
  );
  glow.position.set(0, FEET_Y + CHAR_HEIGHT * 0.45, -0.45);
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

  /* ---------- 动画 ---------- */
  const pose = { tilt: 0, lift: 0, sway: 1 };

  function play(name) {
    if (!ACTION_POSE[name]) return;
    state.action = name;
    const target = ACTION_POSE[name];
    pose.tilt = target.tilt;
    pose.lift = target.lift;
    pose.sway = target.sway;
    state.actionUntil = performance.now() + (name === 'idle' ? 1e9 : 2600);
    if (name === 'happy' || name === 'wave') state.jump = 0.6;
  }

  function react(kind = 'happy') {
    play(kind);
    const origin = api.getHeadWorld();
    origin.z += 0.3;
    emitHearts(origin, 8);
  }

  function update(t, dt) {
    // 动作回归待机
    if (state.action !== 'idle' && performance.now() > state.actionUntil) {
      play('idle');
    }

    const breathe = Math.sin(t * 1.15) * 0.045;
    if (state.jump > 0.001) state.jump *= 0.9;

    root.position.y = state.baseY + breathe * 0.6 + state.jump * 0.45;
    root.position.x = Math.sin(t * 0.42) * 0.05;

    // 姿态：轻微前倾 + 左右摇摆 + 呼吸起伏
    const sway = Math.sin(t * 0.9) * 0.03 * pose.sway;
    root.rotation.z = sway;
    root.rotation.x = Math.sin(t * 0.7) * 0.012 + pose.tilt * 0.35;
    root.rotation.y = Math.sin(t * 0.55) * 0.06 * pose.sway;

    // 点击后的旋转余量
    if (state.spin > 0.001) {
      root.rotation.y += state.spin * 0.4;
      state.spin *= 0.92;
    }

    glow.material.opacity = 0.42 + Math.sin(t * 1.1) * 0.06;

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

  api.update = update;
  api.react = react;
  api.play = play;
  api.start = () => play('idle');

  return api;
}
