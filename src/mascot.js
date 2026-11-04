import * as THREE from 'three';

/**
 * 蓝色大肥鱼（DeepSeek 鲸鱼娘）—— 动画角色
 *
 * 素材来自社区项目 MerZlin/dsh-pet-indesktop（MIT），其动画源为 PC2005-cloud/dsh-pet。
 * 采用带 Alpha 通道的 WebM（VP9）作为 VideoTexture，贴在始终面向相机的平面上，
 * 通过双槽交叉淡化实现动作切换，避免切镜头时的黑闪。
 */

const CLIPS = {
  idle: '/clips/idle.webm',
  wave: '/clips/wave.webm',
  happy: '/clips/happy.webm',
  shy: '/clips/shy.webm',
  angry: '/clips/angry.webm',
  eat: '/clips/eat.webm',
  dance: '/clips/dance.webm',
  code: '/clips/code.webm',
};

const ONE_SHOT = new Set(['wave', 'happy', 'shy', 'angry', 'eat', 'dance', 'code']);

const CHAR_HEIGHT = 3.95;
const FEET_Y = 0.05;

export function createMascot(scene, camera) {
  const root = new THREE.Group();
  root.position.set(0, 0, -1.4);
  scene.add(root);

  /* ---------- 两个播放槽 ---------- */
  function makeSlot() {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.loop = false;
    video.style.cssText =
      'position:fixed;left:-9999px;top:0;width:2px;height:2px;opacity:0;pointer-events:none';
    document.body.appendChild(video);

    const tex = new THREE.VideoTexture(video);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;

    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    mesh.position.y = FEET_Y + CHAR_HEIGHT / 2;
    mesh.renderOrder = 20;
    mesh.scale.set(CHAR_HEIGHT * 0.75, CHAR_HEIGHT, 1);
    root.add(mesh);

    return { video, tex, mat, mesh, opacity: 0, target: 0, name: null, ready: false };
  }

  const slots = [makeSlot(), makeSlot()];
  let active = 0;
  let currentName = null;

  function sizeSlot(slot) {
    const v = slot.video;
    if (!v.videoWidth || !v.videoHeight) return;
    const aspect = v.videoWidth / v.videoHeight;
    slot.mesh.scale.set(CHAR_HEIGHT * aspect, CHAR_HEIGHT, 1);
    slot.mesh.position.y = FEET_Y + CHAR_HEIGHT / 2;
  }

  slots.forEach((slot) => {
    slot.video.addEventListener('loadedmetadata', () => {
      sizeSlot(slot);
      slot.ready = true;
    });
    slot.video.addEventListener('ended', () => {
      if (ONE_SHOT.has(slot.name) && slot === slots[active]) {
        play('idle', true);
      }
    });
  });

  /* 预加载全部片段，避免切换时卡顿 */
  Object.entries(CLIPS).forEach(([name, url]) => {
    const v = document.createElement('video');
    v.src = url;
    v.preload = 'auto';
    v.muted = true;
    v.style.display = 'none';
    document.body.appendChild(v);
  });

  function play(name, force = false) {
    if (!CLIPS[name]) return;
    if (!force && currentName === name) return;

    const from = slots[active];
    const nextIndex = active === 0 ? 1 : 0;
    const to = slots[nextIndex];

    to.name = name;
    to.video.loop = name === 'idle';
    if (to.video.src.indexOf(CLIPS[name]) === -1) {
      to.video.src = CLIPS[name];
    }
    to.video.currentTime = 0;
    const p = to.video.play();
    if (p && p.catch) p.catch(() => {});

    to.target = 1;
    from.target = 0;

    active = nextIndex;
    currentName = name;
  }

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
  ggrad.addColorStop(0, 'rgba(110,160,255,0.4)');
  ggrad.addColorStop(0.5, 'rgba(70,120,230,0.12)');
  ggrad.addColorStop(1, 'rgba(50,100,220,0)');
  gctx.fillStyle = ggrad;
  gctx.fillRect(0, 0, 256, 256);
  const glowTex = new THREE.CanvasTexture(glowCanvas);
  glowTex.colorSpace = THREE.SRGBColorSpace;

  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(5.2, 5.8),
    new THREE.MeshBasicMaterial({
      map: glowTex, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    })
  );
  glow.position.set(0, FEET_Y + CHAR_HEIGHT * 0.45, -0.4);
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
  const state = { baseY: 0, jump: 0, tokens: 62, affection: 40 };

  const headWorld = new THREE.Vector3();

  function update(t, dt) {
    // 交叉淡化
    for (const s of slots) {
      const speed = 6.5 * dt;
      s.opacity += (s.target - s.opacity) * Math.min(1, speed);
      s.mat.opacity = s.opacity;
      if (s.opacity < 0.02 && s.target === 0 && !s.video.paused) {
        s.video.pause();
      }
    }

    // 呼吸浮动 + 跳跃
    const bob = Math.sin(t * 1.15) * 0.045;
    if (state.jump > 0.001) state.jump *= 0.9;
    root.position.y = state.baseY + bob + state.jump * 0.4;
    root.position.x = Math.sin(t * 0.42) * 0.05;

    glow.material.opacity = 0.45 + Math.sin(t * 1.1) * 0.07;

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

  function react(kind = 'happy') {
    state.jump = 1;
    play(kind);
    headWorld.copy(root.position);
    headWorld.y += FEET_Y + CHAR_HEIGHT * 0.8;
    headWorld.z += 0.4;
    emitHearts(headWorld, 8);
  }

  function getHeadWorld() {
    headWorld.copy(root.position);
    headWorld.y += FEET_Y + CHAR_HEIGHT * 0.86;
    return headWorld;
  }

  return {
    root,
    play,
    react,
    update,
    state,
    getHeadWorld,
    get clip() { return currentName; },
    setBaseY(y) { state.baseY = y; root.position.y = y; },
    start() { play('idle'); },
  };
}
