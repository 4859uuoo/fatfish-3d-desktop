import * as THREE from 'three';

/**
 * 大肥鱼 · 深海鲸鱼娘
 * 圆滚滚蓝灰色小鲸鱼：软胖身体、短短鱼鳍、大尾巴、肉肉脸，
 * 穿宽松浅蓝居家小衣服。表情会耷拉鱼鳍、晃尾巴、眨眼、鼓腮。
 */

export function createWhale(scene) {
  const root = new THREE.Group();
  root.scale.setScalar(1.45);
  root.position.set(0.6, 0, -3.0);
  scene.add(root);

  const body = new THREE.Group();
  body.position.y = 0.58;
  root.add(body);

  /* ---------------- 材质 ---------------- */
  const skin = new THREE.MeshStandardMaterial({
    color: 0x8fa8c6, roughness: 0.78, metalness: 0.02,
  });
  const bellyMat = new THREE.MeshStandardMaterial({
    color: 0xeaf1fa, roughness: 0.85,
  });
  const finMat = new THREE.MeshStandardMaterial({
    color: 0x7d97b8, roughness: 0.8,
  });
  const clothMat = new THREE.MeshStandardMaterial({
    color: 0xd2e6f8, roughness: 0.95,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0xf7fbff, roughness: 1,
  });
  const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 });
  const eyeDark = new THREE.MeshStandardMaterial({ color: 0x1d2b46, roughness: 0.3 });
  const blushMat = new THREE.MeshBasicMaterial({ color: 0xffb3c6, transparent: true, opacity: 0.75 });

  /* ---------------- 身体 ---------------- */
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.52, 48, 36), skin);
  torso.scale.set(1.0, 0.96, 1.06);
  torso.castShadow = true;
  body.add(torso);

  // 肚子浅色
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.52, 40, 30), bellyMat);
  belly.scale.set(0.82, 0.72, 0.86);
  belly.position.set(0, -0.14, 0.12);
  body.add(belly);

  // 头顶微微隆起（鲸鱼脑袋）
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.3, 32, 24), skin);
  crown.scale.set(1, 0.72, 1);
  crown.position.set(0, 0.4, -0.06);
  body.add(crown);

  /* ---------------- 脸 ---------------- */
  const face = new THREE.Group();
  face.position.set(0, 0.06, 0.2);
  body.add(face);

  const eyes = [];
  [-1, 1].forEach((side) => {
    const eye = new THREE.Group();
    eye.position.set(side * 0.2, 0.06, 0.4);

    const white = new THREE.Mesh(new THREE.SphereGeometry(0.115, 28, 22), eyeWhite);
    white.scale.set(1, 1.18, 0.62);
    eye.add(white);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.072, 22, 18), eyeDark);
    pupil.scale.set(1, 1.1, 0.5);
    pupil.position.set(side * 0.012, -0.005, 0.06);
    eye.add(pupil);

    const shine = new THREE.Mesh(
      new THREE.SphereGeometry(0.028, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    shine.position.set(side * -0.03, 0.04, 0.085);
    eye.add(shine);

    face.add(eye);
    eyes.push({ group: eye, side });
  });

  // 腮红
  const cheeks = [];
  [-1, 1].forEach((side) => {
    const c = new THREE.Mesh(new THREE.CircleGeometry(0.075, 20), blushMat);
    c.position.set(side * 0.31, -0.1, 0.38);
    c.rotation.y = side * 0.5;
    face.add(c);
    cheeks.push({ mesh: c, side });
  });

  // 嘴
  const mouth = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0x8a4a5c })
  );
  mouth.scale.set(1.6, 0.9, 0.5);
  mouth.position.set(0, -0.11, 0.46);
  face.add(mouth);

  /* ---------------- 鱼鳍（短） ---------------- */
  const fins = [];
  [-1, 1].forEach((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.5, -0.02, 0.02);

    const fin = new THREE.Mesh(new THREE.SphereGeometry(1, 22, 16), finMat);
    fin.scale.set(0.2, 0.09, 0.16);
    fin.position.x = side * 0.1;
    fin.castShadow = true;
    pivot.add(fin);

    pivot.rotation.z = side * -0.35;
    body.add(pivot);
    fins.push({ pivot, side });
  });

  /* ---------------- 大尾巴 ---------------- */
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, -0.05, -0.5);
  body.add(tailPivot);

  [-1, 1].forEach((side) => {
    const lobe = new THREE.Mesh(new THREE.SphereGeometry(1, 26, 20), finMat);
    lobe.scale.set(0.09, 0.3, 0.42);
    lobe.position.set(0, side * 0.1, -0.22);
    lobe.rotation.z = side * 0.55;
    lobe.castShadow = true;
    tailPivot.add(lobe);
  });

  const tailStem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.24, 16), finMat);
  tailStem.rotation.x = Math.PI / 2.1;
  tailPivot.add(tailStem);

  /* ---------------- 居家小衣服 ---------------- */
  const outfit = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.56, 0.42, 32, 1, true),
    clothMat
  );
  outfit.position.set(0, -0.22, 0);
  outfit.material.side = THREE.DoubleSide;
  body.add(outfit);

  // 领口/下摆白边
  const hem = new THREE.Mesh(new THREE.TorusGeometry(0.545, 0.028, 10, 40), trimMat);
  hem.rotation.x = Math.PI / 2;
  hem.position.set(0, -0.42, 0);
  body.add(hem);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.022, 10, 36), trimMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, -0.02, 0);
  body.add(collar);

  // 小口袋
  const pocket = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), trimMat);
  pocket.scale.set(1.1, 0.8, 0.3);
  pocket.position.set(0.18, -0.24, 0.46);
  body.add(pocket);

  /* ---------------- 状态与动画 ---------------- */
  const state = {
    mood: 60,
    energy: 70,
    full: 68,
    pose: 'stand',     // stand | sit | lie | sleep
    blink: 0,
    nextBlink: 2.5,
    wag: 1,
    squash: 0,
    yOffset: 0,
  };

  let curPose = 'stand';
  let poseTarget = { x: 0, z: 0, y: 0 };

  function setPose(p) {
    state.pose = p;
    if (p === 'stand') poseTarget = { x: 0, z: 0, y: 0 };
    else if (p === 'sit') poseTarget = { x: -0.12, z: 0, y: -0.02 };
    else if (p === 'lie') poseTarget = { x: 0, z: 1.32, y: 0.34 };
    else if (p === 'sleep') poseTarget = { x: 0, z: 1.45, y: 0.36 };
  }

  function react(kind) {
    state.squash = 1;
    if (kind === 'happy') state.mood = Math.min(100, state.mood + 4);
  }

  const headWorld = new THREE.Vector3();

  function update(t, dt) {
    const energyK = THREE.MathUtils.clamp(state.energy / 100, 0.15, 1);

    // 呼吸 + 上下浮动
    const breathe = Math.sin(t * (1.1 + energyK * 0.5)) * 0.035;
    root.position.y = state.baseY;
    body.position.y = 0.58 + breathe;

    // 挤压回弹
    if (state.squash > 0.001) {
      state.squash *= 0.9;
      const s = 1 + Math.sin(state.squash * Math.PI) * 0.09;
      body.scale.set(s, 1 / s, s);
    } else {
      body.scale.lerp(new THREE.Vector3(1, 1, 1), Math.min(1, dt * 6));
    }

    // 姿势过渡
    body.rotation.x += (poseTarget.x - body.rotation.x) * Math.min(1, dt * 3);
    body.rotation.z += (poseTarget.z - body.rotation.z) * Math.min(1, dt * 3);

    // 尾巴摆动：心情越好摆得越快
    const wagSpeed = 1.6 + (state.mood / 100) * 2.4;
    const wagAmp = 0.25 + (state.mood / 100) * 0.35;
    tailPivot.rotation.y = Math.sin(t * wagSpeed) * wagAmp;
    tailPivot.rotation.z = Math.sin(t * wagSpeed * 0.6) * 0.12;

    // 鱼鳍：心情低会耷拉
    const droop = THREE.MathUtils.mapLinear(state.mood, 0, 100, 0.85, -0.1);
    fins.forEach((f) => {
      f.pivot.rotation.z = f.side * -droop + Math.sin(t * 1.7 + f.side) * 0.06;
      f.pivot.rotation.x = Math.sin(t * 1.3 + f.side * 2) * 0.08;
    });

    // 眨眼
    state.nextBlink -= dt;
    if (state.nextBlink <= 0) {
      state.nextBlink = 2.2 + Math.random() * 3.4;
      state.blink = 1;
    }
    const asleep = state.pose === 'sleep';
    if (state.blink > 0) {
      state.blink -= dt * 6;
      const k = Math.max(0.08, Math.abs(Math.sin(Math.max(0, state.blink) * Math.PI)));
      eyes.forEach((e) => { e.group.scale.y = k; });
    } else {
      eyes.forEach((e) => { e.group.scale.y = asleep ? 0.12 : 1; });
    }

    // 鼓腮：饱腹高时脸颊更鼓
    const puff = THREE.MathUtils.mapLinear(state.full, 0, 100, 0.9, 1.25);
    cheeks.forEach((c) => c.mesh.scale.setScalar(puff));

    // 睡眠时整体下沉
    if (asleep) {
      body.position.y = 0.44 + Math.sin(t * 0.8) * 0.012;
    }
  }

  function getHeadWorld() {
    headWorld.set(0, 0.55, 0);
    root.localToWorld(headWorld);
    return headWorld;
  }

  return {
    root,
    state,
    body,
    update,
    setPose,
    react,
    getHeadWorld,
    setBaseY(y) { state.baseY = y; },
    get pose() { return state.pose; },
  };
}
