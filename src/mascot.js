import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

/**
 * 蓝色大肥鱼（DeepSeek 鲸鱼娘）—— 真 3D 骨骼角色
 *
 * 躯干使用 VRoid 官方 AvatarSample_A（VRM 0.x，蓝调化处理），
 * 通过 VRM humanoid 骨骼做待机呼吸、看向鼠标、眨眼与点击反馈，
 * 并挂载程序化生成的鲸尾与女仆发饰，向「大肥鱼」形象靠拢。
 */

const CHAR_HEIGHT = 4.25;
const FEET_Y = 0.02;

export function createMascot(scene, camera) {
  const root = new THREE.Group();
  root.position.set(0, FEET_Y, -1.15);
  scene.add(root);

  const state = {
    holding: 0,
    holdingTarget: 0,
    baseY: FEET_Y,
    jump: 0,
    spin: 0,
    tokens: 62,
    affection: 40,
    action: 'idle',
    actionUntil: 0,
    pointerX: 0,
    pointerY: 0,
  };

  let vrm = null;
  let bones = {};
  let hint = null;
  let blinkTimer = 2.5;
  let blinkPhase = 0;
  let nodPhase = 0;

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
      v.y += FEET_Y + CHAR_HEIGHT * 0.9;
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

  /* ---------------- 加载 VRM ---------------- */
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));

  loader.load(
    '/models/avatar.vrm',
    (gltf) => {
      vrm = gltf.userData.vrm;
      if (!vrm) return;

      VRMUtils.rotateVRM0(vrm);
      vrm.scene.traverse((o) => {
        o.frustumCulled = false;
        o.castShadow = false;
        o.receiveShadow = false;
        if (o.isMesh && o.material) {
          const arr = Array.isArray(o.material) ? o.material : [o.material];
          arr.forEach((m) => {
            m.transparent = false;
            m.depthWrite = true;
          });
        }
      });

      // 统一缩放到场景比例
      const box = new THREE.Box3().setFromObject(vrm.scene);
      const size = new THREE.Vector3();
      box.getSize(size);
      const scale = CHAR_HEIGHT / (size.y || 1.6);
      vrm.scene.scale.setScalar(scale);

      // 脚底对齐
      const box2 = new THREE.Box3().setFromObject(vrm.scene);
      vrm.scene.position.y -= box2.min.y;

      root.add(vrm.scene);

      // 骨骼引用（归一化骨骼，方便直接设姿势）
      const hb = vrm.humanoid.humanBones;
      const get = (n) => (hb[n] ? vrm.humanoid.getNormalizedBoneNode(n) : null);
      bones = {
        hips: get('hips'),
        spine: get('spine'),
        chest: get('chest'),
        upperChest: get('upperChest'),
        neck: get('neck'),
        head: get('head'),
        leftUpperArm: get('leftUpperArm'),
        rightUpperArm: get('rightUpperArm'),
        leftLowerArm: get('leftLowerArm'),
        rightLowerArm: get('rightLowerArm'),
      };

      // 基础姿势：手臂自然下垂
      if (bones.leftUpperArm) {
        bones.leftUpperArm.rotation.z = 1.16;
        bones.leftUpperArm.rotation.x = 0.06;
      }
      if (bones.rightUpperArm) {
        bones.rightUpperArm.rotation.z = -1.16;
        bones.rightUpperArm.rotation.x = 0.06;
      }
      if (bones.leftLowerArm) bones.leftLowerArm.rotation.y = -0.18;
      if (bones.rightLowerArm) bones.rightLowerArm.rotation.y = 0.18;

      // MToon 是自定义 ShaderMaterial，在本场景里会出现面部发黑的问题，
      // 统一替换成标准 PBR 材质：保留贴图与描边，光照行为可预测。
      const matCache = new Map();
      vrm.scene.traverse((o) => {
        if (!o.isMesh || !o.material) return;
        const list = Array.isArray(o.material) ? o.material : [o.material];
        const converted = list.map((m) => {
          const isOutline = /\(Outline\)/.test(m.name || '');
          const key = m.uuid + (isOutline ? ':outline' : '');
          if (matCache.has(key)) return matCache.get(key);

          const isCloth = /CLOTH|Bottoms/i.test(m.name || '');
          const isHair = /HAIR/i.test(m.name || '');
          const isIris = /EyeIris/i.test(m.name || '');

          let color = m.color ? m.color.clone() : new THREE.Color(0xffffff);
          if (isHair) color = new THREE.Color(0x6b8ff2);
          if (isCloth) color = new THREE.Color(0xcdd6e8);
          if (isIris) color = new THREE.Color(0x2f6fe0);

          const mat = new THREE.MeshStandardMaterial({
            map: m.map || null,
            color: isOutline ? new THREE.Color(0x0b1226) : color,
            transparent: isOutline,
            opacity: isOutline ? 0.55 : 1,
            side: isOutline ? THREE.BackSide : THREE.FrontSide,
            roughness: 0.62,
            metalness: 0.0,
            envMapIntensity: 0.6,
            alphaTest: isOutline ? 0 : 0.02,
          });
          mat.name = (m.name || '') + ' (PBR)';
          matCache.set(key, mat);
          return mat;
        });

        o.material = Array.isArray(o.material) ? converted : converted[0];
      });

      // 鲸尾与头饰暂时移除：骨骼坐标空间与预期不符，尺寸会失控

      api.ready = true;
      window.__FISH_READY__ = true;
    },
    undefined,
    (err) => {
      console.error('VRM load failed', err);
      window.__FISH_ERROR__ = String(err && err.message ? err.message : err);
    }
  );

  /* ---------------- 程序化配饰 ---------------- */
  function buildWhaleTail() {
    const g = new THREE.Group();
    const blue = new THREE.MeshStandardMaterial({
      color: 0x3f7ae0, roughness: 0.45, metalness: 0.05,
    });
    const pale = new THREE.MeshStandardMaterial({
      color: 0x9ec8ff, roughness: 0.5,
    });

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.032, 0.16, 12), blue);
    stem.rotation.x = Math.PI / 2.3;
    stem.position.set(0, -0.02, -0.06);
    g.add(stem);

    [-1, 1].forEach((s) => {
      const lobe = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), blue);
      lobe.scale.set(0.11, 0.02, 0.07);
      lobe.position.set(s * 0.075, -0.05, -0.14);
      lobe.rotation.y = s * 0.32;
      g.add(lobe);
    });

    const mark = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), pale);
    mark.scale.set(0.5, 0.12, 0.5);
    mark.position.set(0, -0.045, -0.12);
    g.add(mark);

    // 挂在 hips 骨骼下
    g.position.set(0, 0.02, -0.12);
    g.scale.setScalar(1.0);
    return g;
  }

  function buildHeadpiece() {
    const g = new THREE.Group();
    const white = new THREE.MeshStandardMaterial({
      color: 0xe8eefb, roughness: 0.6,
    });
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.008, 8, 40, Math.PI * 1.1), white);
    band.rotation.x = Math.PI / 2;
    band.rotation.z = Math.PI * 0.45;
    band.position.set(0, 0.135, -0.01);
    g.add(band);

    for (let i = 0; i < 7; i++) {
      const a = -0.8 + i * 0.267;
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.013, 10, 8), white);
      f.scale.set(1, 0.7, 1);
      f.position.set(Math.sin(a) * 0.108, 0.142, Math.cos(a) * 0.108 - 0.01);
      g.add(f);
    }
    return g;
  }

  /* ---------------- 动作 ---------------- */
  function play(name) {
    state.action = name;
    state.actionUntil = performance.now() + (name === 'idle' ? 1e9 : 1800);
    if (name === 'happy' || name === 'wave' || name === 'dance') state.jump = 0.5;
    if (name === 'eat') nodPhase = 1;
    if (name === 'shy') nodPhase = 0.6;
  }

  function react(kind = 'happy') {
    play(kind);
    state.jump = 0.7;
  }

  function update(t, dt) {
    if (!vrm) return;

    // 回归待机
    if (state.action !== 'idle' && performance.now() > state.actionUntil) play('idle');

    // 整体浮动与跳跃
    if (state.jump > 0.001) state.jump *= 0.9;
    const bob = Math.sin(t * 1.1) * 0.02;
    root.position.y = state.baseY + bob + state.jump * 0.28;
    root.rotation.y = Math.sin(t * 0.35) * 0.04;

    if (state.spin > 0.001) {
      root.rotation.y += state.spin * 0.3;
      state.spin *= 0.92;
    }

    const b = bones;

    // 呼吸：胸腔起伏
    if (b.chest) b.chest.rotation.x = Math.sin(t * 1.1) * 0.022;
    if (b.spine) b.spine.rotation.z = Math.sin(t * 0.7) * 0.012;
    if (b.upperChest) b.upperChest.rotation.y = Math.sin(t * 0.6) * 0.02;

    // 看向鼠标
    state.pointerX += (state.pointerXTarget - state.pointerX) * Math.min(1, dt * 4);
    if (b.neck) {
      b.neck.rotation.y = state.pointerX * 0.35;
      b.neck.rotation.x = -state.pointerY * 0.18;
    }
    if (b.head) {
      b.head.rotation.y = state.pointerX * 0.25;
      b.head.rotation.x = -state.pointerY * 0.12;
    }

    // 手臂：待机微摆，拿手机时抬起右前臂
    state.holding += (state.holdingTarget - state.holding) * Math.min(1, dt * 3);
    const hold = state.holding;

    if (b.leftUpperArm) b.leftUpperArm.rotation.z = 1.16 + Math.sin(t * 1.3) * 0.03;
    if (b.rightUpperArm) {
      b.rightUpperArm.rotation.z = -1.16 + hold * 0.22 - Math.sin(t * 1.3) * 0.03;
    }
    if (b.rightLowerArm) {
      b.rightLowerArm.rotation.x = -hold * 1.25;
      b.rightLowerArm.rotation.y = 0.18 + hold * 0.5;
    }
    if (b.head && hold > 0.01) {
      b.head.rotation.x += hold * 0.13;
    }

    // 点头动作衰减
    if (nodPhase > 0.001) {
      nodPhase *= 0.94;
      if (b.head) b.head.rotation.x += Math.sin(nodPhase * Math.PI * 4) * 0.12;
    }

    // 眨眼
    blinkTimer -= dt;
    if (blinkTimer <= 0) {
      blinkTimer = 2.4 + Math.random() * 3.2;
      blinkPhase = 1;
    }
    if (blinkPhase > 0) {
      blinkPhase -= dt * 7;
      const v = Math.max(0, Math.sin(Math.max(0, blinkPhase) * Math.PI));
      if (vrm.expressionManager) vrm.expressionManager.setValue('blink', v);
    } else if (vrm.expressionManager) {
      vrm.expressionManager.setValue('blink', 0);
    }

    vrm.update(dt);
  }

  /* ---------------- 指针目标 ---------------- */
  state.pointerXTarget = 0;
  state.pointerY = 0;
  const origUpdate = update;

  api.update = (t, dt, pointer) => {
    if (pointer) {
      state.pointerXTarget = pointer.x;
      state.pointerY = pointer.y;
    }
    origUpdate(t, dt);
  };

  api.setHolding = (v) => { state.holdingTarget = v; };
  api.react = react;
  api.play = play;
  api.start = () => play('idle');
  return api;
}
