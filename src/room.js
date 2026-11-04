import * as THREE from 'three';

/**
 * 海景小屋
 * 独居海边的小屋：落地窗对着海，门外是沙滩，屋里有沙发、小桌、懒人窝、平板、台灯、床
 */

/* ---------- 程序化贴图 ---------- */
function woodTexture() {
  const S = 512;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const c = cv.getContext('2d');
  c.fillStyle = '#d9b98c';
  c.fillRect(0, 0, S, S);
  for (let i = 0; i < 12; i++) {
    const y = i * (S / 12);
    c.fillStyle = i % 2 ? '#d3b183' : '#ddbf95';
    c.fillRect(0, y, S, S / 12 - 1);
    c.strokeStyle = 'rgba(150,120,85,0.35)';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(S, y);
    c.stroke();
    // 木纹
    c.strokeStyle = 'rgba(160,130,95,0.16)';
    c.lineWidth = 1;
    for (let k = 0; k < 5; k++) {
      c.beginPath();
      const yy = y + 6 + k * 7;
      c.moveTo(0, yy);
      c.bezierCurveTo(S * 0.3, yy + 3, S * 0.7, yy - 3, S, yy);
      c.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function rugTexture() {
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const c = cv.getContext('2d');
  c.fillStyle = '#f2e6d8';
  c.fillRect(0, 0, S, S);
  c.strokeStyle = '#dfcdb8';
  c.lineWidth = 10;
  c.strokeRect(14, 14, S - 28, S - 28);
  c.strokeStyle = '#ecdcc9';
  c.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    c.beginPath();
    c.arc(S / 2, S / 2, 20 + i * 12, 0, Math.PI * 2);
    c.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ---------- 天空与海 ---------- */
function buildSky(scene) {
  const geo = new THREE.SphereGeometry(90, 32, 24);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vPos;
      void main() {
        float h = normalize(vPos).y;
        vec3 top = vec3(0.55, 0.78, 0.94);
        vec3 mid = vec3(0.80, 0.90, 0.97);
        vec3 low = vec3(1.0, 0.88, 0.74);
        vec3 col = mix(low, mid, smoothstep(-0.1, 0.18, h));
        col = mix(col, top, smoothstep(0.16, 0.72, h));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(geo, mat);
  scene.add(sky);
  return sky;
}

function buildSea(scene) {
  const geo = new THREE.PlaneGeometry(260, 70, 120, 40);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      uniform float uTime;
      varying float vWave;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 p = position;
        float w1 = sin(p.x * 0.09 + uTime * 0.8) * 0.16;
        float w2 = sin(p.x * 0.21 - uTime * 1.3) * 0.07;
        float w3 = sin(p.y * 0.15 + uTime * 0.6) * 0.1;
        p.z += w1 + w2 + w3;
        vWave = w1 + w2;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying float vWave;
      varying vec2 vUv;
      void main() {
        vec3 deep = vec3(0.13, 0.36, 0.55);
        vec3 shallow = vec3(0.36, 0.66, 0.82);
        vec3 col = mix(deep, shallow, smoothstep(-0.4, 0.5, vWave));
        // 远处更亮
        col = mix(col, vec3(0.72, 0.86, 0.95), smoothstep(0.35, 1.0, vUv.y) * 0.55);
        // 波光
        float sparkle = pow(max(0.0, sin(vUv.x * 220.0 + uTime * 2.0) * sin(vUv.y * 180.0 - uTime * 1.4)), 24.0);
        col += sparkle * 0.55;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const sea = new THREE.Mesh(geo, mat);
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, -0.9, -46);
  scene.add(sea);
  return sea;
}

/* ---------- 家具 ---------- */
function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.0, ...opts });
}

function buildSofa() {
  const g = new THREE.Group();
  const fabric = mat(0xa9c6d8, { roughness: 0.95 });
  const cushion = mat(0xc3dae7, { roughness: 0.98 });

  const base = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.34, 0.86), fabric);
  base.position.y = 0.17;
  g.add(base);

  const back = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, 0.2), fabric);
  back.position.set(0, 0.52, -0.33);
  g.add(back);

  [-1, 1].forEach((s) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.36, 0.86), fabric);
    arm.position.set(s * 0.9, 0.4, 0);
    g.add(arm);
  });

  [-0.45, 0.45].forEach((x) => {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.14, 0.74), cushion);
    c.position.set(x, 0.4, 0.02);
    g.add(c);
  });

  const pillow = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 16), mat(0xf0d9c0, { roughness: 1 }));
  pillow.scale.set(1, 0.85, 0.55);
  pillow.position.set(-0.6, 0.56, -0.16);
  g.add(pillow);

  return g;
}

function buildTable() {
  const g = new THREE.Group();
  const wood = mat(0xc9a97e, { roughness: 0.8 });
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.06, 28), wood);
  top.position.y = 0.42;
  g.add(top);
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.42, 16), wood);
  leg.position.y = 0.21;
  g.add(leg);
  return g;
}

function buildBeanbag() {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.52, 28, 20), mat(0xe8b7a0, { roughness: 1 }));
  b.scale.set(1, 0.62, 1);
  b.position.y = 0.28;
  g.add(b);
  return g;
}

function buildBed() {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.24, 2.1), mat(0xcbb08b, { roughness: 0.85 }));
  frame.position.y = 0.16;
  g.add(frame);
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.18, 2.0), mat(0xfdf7ef, { roughness: 1 }));
  mattress.position.y = 0.36;
  g.add(mattress);
  const quilt = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.12, 1.3), mat(0xbcd6e6, { roughness: 1 }));
  quilt.position.set(0, 0.48, 0.3);
  g.add(quilt);
  const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.14, 0.4), mat(0xffffff, { roughness: 1 }));
  pillow.position.set(0, 0.5, -0.72);
  g.add(pillow);
  return g;
}

function buildLamp() {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 1.3, 12), mat(0x5c6b7a, { metalness: 0.4, roughness: 0.5 }));
  pole.position.y = 0.65;
  g.add(pole);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.3, 20, 1, true), mat(0xfff0d0, { roughness: 0.9, side: THREE.DoubleSide }));
  shade.position.y = 1.36;
  g.add(shade);
  const bulb = new THREE.PointLight(0xffd9a0, 12, 6, 2);
  bulb.position.y = 1.28;
  g.add(bulb);
  return g;
}

function buildPlant() {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.26, 16), mat(0xd6a98c, { roughness: 0.9 }));
  pot.position.y = 0.13;
  g.add(pot);
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 10), mat(0x7ba36b, { roughness: 0.9 }));
    leaf.scale.set(0.5, 1.3, 0.32);
    const a = (i / 6) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 0.12, 0.42 + Math.random() * 0.12, Math.sin(a) * 0.12);
    leaf.rotation.z = Math.cos(a) * 0.4;
    leaf.rotation.x = Math.sin(a) * 0.4;
    g.add(leaf);
  }
  return g;
}

function buildTablet() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.02, 0.3), mat(0x2b3444, { metalness: 0.5, roughness: 0.4 }));
  body.position.y = 0.46;
  body.rotation.x = -0.25;
  g.add(body);

  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 170;
  const c = cv.getContext('2d');
  c.fillStyle = '#101826'; c.fillRect(0, 0, 256, 170);
  c.fillStyle = '#4a90d9'; c.fillRect(10, 10, 236, 90);
  c.fillStyle = '#e8eefc'; c.font = '16px sans-serif';
  c.fillText('短视频', 22, 128);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.4, 0.26),
    new THREE.MeshBasicMaterial({ map: tex })
  );
  screen.position.set(0, 0.472, 0);
  screen.rotation.x = -Math.PI / 2 - 0.25;
  g.add(screen);
  return g;
}

/* ---------- 主构建 ---------- */
export function buildRoom(scene) {
  const sky = buildSky(scene);
  const sea = buildSea(scene);

  // 沙滩
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 26),
    mat(0xf0dcb8, { roughness: 1 })
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, -0.08, -17);
  scene.add(sand);

  // 地板
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(11, 10),
    new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: 0.9 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 0.5);
  floor.receiveShadow = true;
  scene.add(floor);

  // 地毯
  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(5.2, 3.6),
    new THREE.MeshStandardMaterial({ map: rugTexture(), roughness: 1 })
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(-0.2, 0.008, 1.1);
  scene.add(rug);

  const wallMat = mat(0xf4efe6, { roughness: 1 });

  // 后墙（带落地窗开口）
  const WALL_Z = -4.2;
  const WIN = { x0: -2.6, x1: 2.6, y0: 0.15, y1: 3.15 };

  function wallPiece(w, h, x, y) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.16), wallMat);
    m.position.set(x, y, WALL_Z);
    m.receiveShadow = true;
    scene.add(m);
    return m;
  }
  wallPiece(11, WIN.y0, 0, WIN.y0 / 2);                       // 窗下
  wallPiece(11, 3.6 - WIN.y1, 0, (WIN.y1 + 3.6) / 2);         // 窗上
  wallPiece(5.5 - 2.6, WIN.y1 - WIN.y0, -3.95, (WIN.y0 + WIN.y1) / 2); // 左
  wallPiece(5.5 - 2.6, WIN.y1 - WIN.y0, 3.95, (WIN.y0 + WIN.y1) / 2);  // 右

  // 左墙
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.6, 10), wallMat);
  leftWall.position.set(-5.5, 1.8, 0.5);
  scene.add(leftWall);

  // 窗框
  const frameMat = mat(0xfbf7f0, { roughness: 0.7 });
  const frameThick = 0.09;
  const winW = WIN.x1 - WIN.x0;
  const winH = WIN.y1 - WIN.y0;
  [
    [winW + frameThick * 2, frameThick, 0, WIN.y0],
    [winW + frameThick * 2, frameThick, 0, WIN.y1],
    [frameThick, winH, WIN.x0, (WIN.y0 + WIN.y1) / 2],
    [frameThick, winH, WIN.x1, (WIN.y0 + WIN.y1) / 2],
    [frameThick * 0.7, winH, 0, (WIN.y0 + WIN.y1) / 2],
  ].forEach(([w, h, x, y]) => {
    const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), frameMat);
    f.position.set(x, y, WALL_Z + 0.08);
    scene.add(f);
  });

  // 玻璃
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(winW, winH),
    new THREE.MeshPhysicalMaterial({
      color: 0xdff0ff, transparent: true, opacity: 0.12,
      roughness: 0.05, metalness: 0, transmission: 0.9, thickness: 0.02,
    })
  );
  glass.position.set(0, (WIN.y0 + WIN.y1) / 2, WALL_Z + 0.02);
  scene.add(glass);

  // 家具
  const sofa = buildSofa();
  sofa.position.set(-2.5, 0, 1.55);
  sofa.rotation.y = 0.62;
  scene.add(sofa);

  const table = buildTable();
  table.position.set(0.5, 0, 1.2);
  scene.add(table);

  const tablet = buildTablet();
  tablet.position.set(0.5, 0, 1.2);
  scene.add(tablet);

  const beanbag = buildBeanbag();
  beanbag.position.set(2.55, 0, 1.15);
  scene.add(beanbag);

  const bed = buildBed();
  bed.position.set(-4.5, 0, -2.6);
  bed.rotation.y = Math.PI / 2;
  scene.add(bed);

  const lamp = buildLamp();
  lamp.position.set(-4.4, 0, 2.9);
  lamp.scale.setScalar(0.72);
  scene.add(lamp);

  const plant = buildPlant();
  plant.position.set(4.6, 0, -3.3);
  scene.add(plant);

  const plant2 = buildPlant();
  plant2.position.set(-4.9, 0, 3.2);
  scene.add(plant2);

  // 光照
  const hemi = new THREE.HemisphereLight(0xcfe8ff, 0xe8d8c0, 1.0);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff0d8, 2.4);
  sun.position.set(-4, 7, -12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -9;
  sun.shadow.camera.right = 9;
  sun.shadow.camera.top = 9;
  sun.shadow.camera.bottom = -9;
  sun.shadow.camera.far = 40;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0xdcecff, 0.6);
  fill.position.set(6, 5, 8);
  scene.add(fill);

  const warm = new THREE.PointLight(0xffe0b0, 6, 12, 2);
  warm.position.set(0, 2.6, 1.0);
  scene.add(warm);

  return {
    spots: {
      sofa: new THREE.Vector3(-2.3, 0, 2.55),
      window: new THREE.Vector3(0.7, 0, -3.15),
      beach: new THREE.Vector3(0.4, -0.05, -8.6),
      bed: new THREE.Vector3(-3.3, 0, -2.4),
      table: new THREE.Vector3(0.45, 0, 3.0),
    },
    facing: {
      sofa: 0,                // 面向镜头
      window: Math.PI,        // 面向海
      beach: Math.PI,
      bed: Math.PI * 0.5,
      table: 0,               // 面向镜头
    },
    update(t) {
      sea.material.uniforms.uTime.value = t;
      sky.material.uniforms.uTime.value = t;
    },
  };
}
