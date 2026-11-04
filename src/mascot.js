import * as THREE from 'three';

/**
 * 蓝色大肥鱼 —— DeepSeek 鲸鱼娘（Q版鲸鱼女仆）
 * 程序化建模：蓝发 + 呆毛 + 女仆装 + 鲸尾
 * 不依赖任何外部模型文件
 */
export function createMascot(scene) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  /* ---------------- 材质 ---------------- */
  const SKIN = 0xffe2cf;
  const HAIR = 0x2c4a9c;
  const HAIR_DARK = 0x1e3470;
  const DRESS = 0x161b33;
  const APRON = 0xe6edfa;
  const WHALE = 0x3f7ae0;

  const skinMat = new THREE.MeshToonMaterial({ color: SKIN });
  const hairMat = new THREE.MeshToonMaterial({ color: HAIR });
  const hairDarkMat = new THREE.MeshToonMaterial({ color: HAIR_DARK });
  const dressMat = new THREE.MeshToonMaterial({ color: DRESS });
  const apronMat = new THREE.MeshToonMaterial({ color: APRON });
  const whaleMat = new THREE.MeshToonMaterial({ color: WHALE });
  const whiteMat = new THREE.MeshToonMaterial({ color: 0xe6edfa });
  const eyeDark = new THREE.MeshBasicMaterial({ color: 0x16214a });
  const irisBlue = new THREE.MeshBasicMaterial({ color: 0x3d7eea });
  const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const blushMat = new THREE.MeshBasicMaterial({
    color: 0xffa8c0,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });

  /* ---------------- 头 ---------------- */
  const head = new THREE.Group();
  head.position.y = 1.26;
  body.add(head);

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.42, 48, 40), skinMat);
  skull.scale.set(1, 1.03, 0.96);
  head.add(skull);

  // 后发（大体积）
  const backHair = new THREE.Mesh(new THREE.SphereGeometry(0.455, 40, 34), hairMat);
  backHair.scale.set(1.04, 1.04, 1.0);
  backHair.position.set(0, 0.015, -0.085);
  head.add(backHair);

  // 长发垂落
  const longHair = new THREE.Mesh(new THREE.SphereGeometry(0.42, 36, 30), hairMat);
  longHair.scale.set(1.02, 1.75, 0.78);
  longHair.position.set(0, -0.62, -0.2);
  head.add(longHair);

  const longHairTip = new THREE.Mesh(new THREE.SphereGeometry(0.34, 30, 24), hairDarkMat);
  longHairTip.scale.set(0.95, 1.15, 0.7);
  longHairTip.position.set(0, -1.12, -0.26);
  head.add(longHairTip);

  // 刘海
  for (let i = 0; i < 5; i++) {
    const t = i / 4 - 0.5;
    const bang = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 18), hairMat);
    bang.scale.set(0.95, 1.25, 0.6);
    bang.position.set(t * 0.52, 0.24 - Math.abs(t) * 0.07, 0.30);
    bang.rotation.z = -t * 0.42;
    head.add(bang);
  }

  // 鬓发
  [-1, 1].forEach((side) => {
    const lock = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.62, 8, 16), hairMat);
    lock.position.set(side * 0.4, -0.16, 0.11);
    lock.rotation.z = side * 0.05;
    head.add(lock);
  });

  // 呆毛
  const ahogeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.4, 0.02),
    new THREE.Vector3(0.02, 0.55, 0.03),
    new THREE.Vector3(0.11, 0.64, -0.01),
    new THREE.Vector3(0.19, 0.6, -0.06),
  ]);
  const ahoge = new THREE.Mesh(
    new THREE.TubeGeometry(ahogeCurve, 24, 0.021, 8, false),
    hairMat
  );
  head.add(ahoge);

  // 女仆发箍
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(0.452, 0.03, 10, 64, Math.PI * 1.15),
    apronMat
  );
  band.rotation.x = Math.PI / 2;
  band.rotation.z = Math.PI * 0.425;
  band.position.set(0, 0.305, -0.03);
  head.add(band);

  // 发箍花边
  for (let i = 0; i < 7; i++) {
    const a = -0.95 + i * 0.317;
    const frill = new THREE.Mesh(new THREE.SphereGeometry(0.048, 16, 12), apronMat);
    frill.scale.set(1, 0.7, 1);
    frill.position.set(Math.sin(a) * 0.4, 0.34, Math.cos(a) * 0.4 - 0.03);
    head.add(frill);
  }

  // 耳朵（鲸鱼娘的小鳍耳）
  [-1, 1].forEach((side) => {
    const fin = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), whaleMat);
    fin.scale.set(0.55, 1.15, 0.35);
    fin.position.set(side * 0.42, 0.0, -0.02);
    fin.rotation.z = side * -0.35;
    head.add(fin);
  });

  /* ---------------- 眼睛（大号二次元眼）---------------- */
  const eyes = [];
  [-1, 1].forEach((side) => {
    const eye = new THREE.Group();
    eye.position.set(side * 0.165, 0.04, 0.375);

    const base = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 24), eyeDark);
    base.scale.set(0.105, 0.135, 0.05);
    eye.add(base);

    const iris = new THREE.Mesh(new THREE.SphereGeometry(1, 26, 22), irisBlue);
    iris.scale.set(0.082, 0.112, 0.045);
    iris.position.z = 0.022;
    eye.add(iris);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 16), eyeDark);
    pupil.scale.set(0.042, 0.062, 0.03);
    pupil.position.z = 0.04;
    eye.add(pupil);

    const hi1 = new THREE.Mesh(new THREE.SphereGeometry(0.026, 14, 12), shineMat);
    hi1.position.set(side * -0.028, 0.052, 0.052);
    eye.add(hi1);

    const hi2 = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 10), shineMat);
    hi2.position.set(side * 0.03, -0.045, 0.055);
    eye.add(hi2);

    head.add(eye);
    eyes.push(eye);
  });

  // 腮红
  [-1, 1].forEach((side) => {
    const blush = new THREE.Mesh(new THREE.CircleGeometry(0.062, 24), blushMat);
    blush.position.set(side * 0.26, -0.09, 0.365);
    blush.rotation.y = side * 0.42;
    head.add(blush);
  });

  // 嘴
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.028, 16, 12), new THREE.MeshBasicMaterial({ color: 0xd8556e }));
  mouth.scale.set(1.3, 0.8, 0.5);
  mouth.position.set(0, -0.13, 0.4);
  head.add(mouth);

  /* ---------------- 身体 ---------------- */
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.1, 16), skinMat);
  neck.position.y = 0.92;
  body.add(neck);

  // 上身（深色胸衣）
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.34, 24), dressMat);
  torso.position.y = 0.74;
  body.add(torso);

  // 白色围裙前片（弧形）
  const apron = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.245, 0.38, 24, 1, true, -0.55, 1.1),
    apronMat
  );
  apron.position.y = 0.72;
  body.add(apron);

  // 围裙上的鲸鱼徽章
  const badge = new THREE.Mesh(new THREE.SphereGeometry(0.045, 20, 16), whaleMat);
  badge.scale.set(1, 0.82, 0.4);
  badge.position.set(0, 0.74, 0.235);
  body.add(badge);

  // 领子
  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.185, 0.16, 0.07, 24, 1, true),
    whiteMat
  );
  collar.position.y = 0.9;
  body.add(collar);

  // 裙子
  const skirtMat = new THREE.MeshToonMaterial({ color: 0x1b2340, side: THREE.DoubleSide });
  const skirt = new THREE.Mesh(
    new THREE.ConeGeometry(0.44, 0.44, 32, 1, true),
    skirtMat
  );
  skirt.position.y = 0.48;
  body.add(skirt);

  const skirtFrill = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.03, 10, 48), apronMat);
  skirtFrill.rotation.x = Math.PI / 2;
  skirtFrill.position.y = 0.27;
  body.add(skirtFrill);

  const petticoat = new THREE.Mesh(
    new THREE.ConeGeometry(0.31, 0.17, 28, 1, true),
    apronMat
  );
  petticoat.position.y = 0.3;
  body.add(petticoat);

  /* ---------------- 手臂 ---------------- */
  const arms = [];
  [-1, 1].forEach((side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.275, 0.86, 0.0);

    const sleeve = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 16), dressMat);
    sleeve.scale.set(1, 0.85, 1);
    arm.add(sleeve);

    const limb = new THREE.Mesh(new THREE.CapsuleGeometry(0.048, 0.2, 6, 12), skinMat);
    limb.position.y = -0.16;
    arm.add(limb);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), skinMat);
    hand.position.y = -0.3;
    arm.add(hand);

    arm.rotation.z = side * -0.28;
    body.add(arm);
    arms.push({ group: arm, side });
  });

  /* ---------------- 腿 ---------------- */
  [-1, 1].forEach((side) => {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.2, 6, 12), whiteMat);
    leg.position.set(side * 0.1, 0.13, 0);
    body.add(leg);

    const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.075, 18, 14), dressMat);
    shoe.scale.set(1, 0.7, 1.25);
    shoe.position.set(side * 0.1, 0.02, 0.02);
    body.add(shoe);
  });

  /* ---------------- 鲸尾 ---------------- */
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0.64, -0.36);
  body.add(tailPivot);

  [-1, 1].forEach((side) => {
    const lobe = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), whaleMat);
    lobe.scale.set(0.1, 0.76, 0.62);
    lobe.position.set(0, side * 0.17, -0.52);
    lobe.rotation.z = side * 0.72;
    lobe.rotation.x = side * 0.16;
    tailPivot.add(lobe);
  });

  const tailRoot = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.075, 0.36, 16), whaleMat);
  tailRoot.rotation.x = Math.PI / 2.35;
  tailRoot.position.set(0, 0.02, -0.16);
  tailPivot.add(tailRoot);

  /* ---------------- 光晕 ---------------- */
  const haloCanvas = document.createElement('canvas');
  haloCanvas.width = haloCanvas.height = 256;
  const hctx = haloCanvas.getContext('2d');
  const hgrad = hctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  hgrad.addColorStop(0, 'rgba(120,170,255,0.5)');
  hgrad.addColorStop(0.45, 'rgba(80,130,240,0.15)');
  hgrad.addColorStop(1, 'rgba(60,110,220,0)');
  hctx.fillStyle = hgrad;
  hctx.fillRect(0, 0, 256, 256);
  const haloTex = new THREE.CanvasTexture(haloCanvas);
  haloTex.colorSpace = THREE.SRGBColorSpace;

  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6, 3.6),
    new THREE.MeshBasicMaterial({
      map: haloTex,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  halo.position.set(0, 0.95, -0.9);
  root.add(halo);

  /* ---------------- 爱心粒子 ---------------- */
  const hearts = [];
  const heartMat = new THREE.MeshBasicMaterial({ color: 0xff8fb8, transparent: true, opacity: 0.9 });

  for (let i = 0; i < 18; i++) {
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), heartMat.clone());
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
      h.position.x += (Math.random() - 0.5) * 0.45;
      h.position.y += (Math.random() - 0.5) * 0.2;
      h.position.z += 0.2;
      h.userData.life = 1;
      h.userData.vy = 0.5 + Math.random() * 0.5;
      h.userData.vx = (Math.random() - 0.5) * 0.4;
      h.material.opacity = 0.9;
      if (++n >= count) break;
    }
  }

  /* ---------------- 状态 ---------------- */
  const state = { baseY: 0, spin: 0, blink: 0, nextBlink: 3, pointerX: 0, pointerY: 0 };

  function update(t, dt, pointer) {
    state.pointerX += (pointer.x - state.pointerX) * Math.min(1, dt * 3);
    state.pointerY += (pointer.y - state.pointerY) * Math.min(1, dt * 3);

    // 呼吸浮动
    root.position.y = state.baseY + Math.sin(t * 1.25) * 0.06;

    // 头部微转，跟随鼠标
    body.rotation.y = Math.sin(t * 0.5) * 0.06 + state.pointerX * 0.45;
    head.rotation.x = Math.sin(t * 0.7) * 0.02 - state.pointerY * 0.12;
    head.rotation.z = Math.sin(t * 0.6) * 0.03;

    // 转身（点击后）
    if (state.spin > 0.001) {
      body.rotation.y += state.spin * 0.35;
      state.spin *= 0.9;
    }

    // 鲸尾摆动
    tailPivot.rotation.y = Math.sin(t * 3.2) * 0.4;
    tailPivot.rotation.x = Math.sin(t * 1.6) * 0.1;

    // 手臂轻摆
    for (const a of arms) {
      a.group.rotation.z = a.side * -0.28 + Math.sin(t * 1.8 + a.side) * 0.06;
    }

    // 眨眼
    state.nextBlink -= dt;
    if (state.nextBlink <= 0) {
      state.blink = 1;
      state.nextBlink = 2.6 + Math.random() * 3.2;
    }
    if (state.blink > 0) {
      state.blink -= dt * 6.5;
      const k = Math.max(0.06, 1 - Math.abs(Math.sin(state.blink * Math.PI)));
      eyes.forEach((e) => { e.scale.y = k; });
    } else {
      eyes.forEach((e) => { e.scale.y = 1; });
    }

    // 爱心上浮
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
    state.spin = 1;
    emitHearts(root.position.clone().setY(root.position.y + 1.5), 8);
  }

  return {
    root,
    body,
    update,
    react,
    state,
    setBaseY(y) { state.baseY = y; root.position.y = y; },
  };
}
