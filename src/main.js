import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildRoom } from './room.js';
import { createWhale } from './whale.js';
import { createAgent } from './agent.js';
import { connectBridge } from './bridge.js';

/* ================= 渲染器 ================= */
const container = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.1, 300);
camera.position.set(0, 2.35, 6.8);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.85, -0.4);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 3.5;
controls.maxDistance = 16;
controls.maxPolarAngle = Math.PI * 0.49;
controls.minPolarAngle = Math.PI * 0.12;

/* ================= 场景内容 ================= */
const room = buildRoom(scene);
const whale = createWhale(scene);

/* ================= UI ================= */
const el = {
  clock: document.getElementById('clock'),
  loc: document.getElementById('loc'),
  act: document.getElementById('act'),
  barMood: document.getElementById('bar-mood'),
  barFull: document.getElementById('bar-full'),
  barEnergy: document.getElementById('bar-energy'),
  valMood: document.getElementById('val-mood'),
  valFull: document.getElementById('val-full'),
  valEnergy: document.getElementById('val-energy'),
  alone: document.getElementById('val-alone'),
  bubble: document.getElementById('bubble'),
  diary: document.getElementById('diary'),
  diaryTime: document.getElementById('diary-time'),
  diaryMood: document.getElementById('diary-mood'),
  diaryState: document.getElementById('diary-state'),
  diaryText: document.getElementById('diary-text'),
  feed: document.getElementById('feed'),
  talk: document.getElementById('talk'),
  diaryBtn: document.getElementById('diary-btn'),
  diaryClose: document.getElementById('diary-close'),
};

let bubbleUntil = 0;
const headProjected = new THREE.Vector3();
let lastDiary = null;

function say(text, ms = 3600) {
  el.bubble.textContent = text;
  el.bubble.classList.add('show');
  bubbleUntil = performance.now() + ms;
}

function showDiary(entry) {
  lastDiary = entry;
  el.diaryTime.textContent = `小鱼日记｜${entry.time}`;
  el.diaryMood.textContent = entry.mood;
  el.diaryState.textContent = entry.state;
  el.diaryText.textContent = entry.text;
  el.diary.classList.add('show');
}

function updateBars(s) {
  el.barMood.style.width = `${s.mood}%`;
  el.barFull.style.width = `${s.full}%`;
  el.barEnergy.style.width = `${s.energy}%`;
  el.valMood.textContent = Math.round(s.mood);
  el.valFull.textContent = Math.round(s.full);
  el.valEnergy.textContent = Math.round(s.energy);
  el.alone.textContent = s.solitude;
}

/* ================= Agent ================= */
const agent = createAgent({
  whale,
  room,
  onSay: (text, proactive) => say(text, proactive ? 4600 : 3600),
  onDiary: (entry) => showDiary(entry),
  onState: (s) => {
    el.loc.textContent = agent.POSITIONS[s.spot].name;
    el.act.textContent = agent.ACTIONS[s.action].label;
    el.clock.textContent = agent.fmtTime();
    updateBars(s);
  },
});

agent.init();

/* 尝试连接状态桥：连上后由外部 Agent 接管，连不上则本地自主循环 */
connectBridge({
  onStatus: (s) => {
    const on = s === 'connected';
    agent.setExternalMode(on);
    document.body.dataset.bridge = s;
  },
  onState: (data) => agent.applyExternal(data),
});

/* ================= 事件 ================= */
el.feed.addEventListener('click', () => {
  agent.feed();
  el.feed.classList.add('fed');
  setTimeout(() => el.feed.classList.remove('fed'), 260);
});

el.talk.addEventListener('click', () => agent.call());

el.diaryBtn.addEventListener('click', () => {
  if (lastDiary) el.diary.classList.toggle('show');
  else say('人家还没写过日记呢。');
});

el.diaryClose.addEventListener('click', () => el.diary.classList.remove('show'));

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/* ================= 主循环 ================= */
const clock = new THREE.Clock();
let uiAcc = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  agent.tick(dt);
  whale.update(t, dt);
  room.update(t);

  // 气泡跟随头顶
  headProjected.copy(whale.getHeadWorld()).project(camera);
  const x = (headProjected.x * 0.5 + 0.5) * innerWidth;
  const y = (-headProjected.y * 0.5 + 0.5) * innerHeight;
  el.bubble.style.transform = `translate(-50%, -100%) translate(${x}px, ${y - 26}px)`;
  if (performance.now() > bubbleUntil) el.bubble.classList.remove('show');

  controls.update();
  renderer.render(scene, camera);

  // 每秒刷新一次顶栏（时钟与独处时长）
  uiAcc += dt;
  if (uiAcc > 1) {
    uiAcc = 0;
    el.clock.textContent = agent.fmtTime();
    updateBars(agent.state);
  }
}

animate();

setTimeout(() => {
  document.getElementById('boot').classList.add('hide');
  say('唔…你来了呀。');
}, 900);

window.__DFY__ = { scene, camera, renderer, whale, room, agent };
