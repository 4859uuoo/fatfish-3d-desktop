import * as THREE from 'three';

/**
 * 大肥鱼 Agent 引擎
 *
 * 底层变量：心情 / 饱腹 / 精力 / 独处时长 / 当前位置 / 当前行为
 * 每轮循环读取状态 → 按动态权重挑行为 → 执行 → 输出隐藏 JSON 给前端
 */

const POSITIONS = {
  sofa: { name: '沙发', pose: 'sit' },
  window: { name: '窗边', pose: 'stand' },
  beach: { name: '沙滩', pose: 'stand' },
  bed: { name: '床上', pose: 'lie' },
  table: { name: '桌前', pose: 'sit' },
};

/* ---------------- 台词 ---------------- */
const LINES = {
  sleep: ['呼…呼…', '（翻了个身，尾巴甩了一下）', '唔…再睡五分钟…'],
  daze: ['……（发呆）', '唔，今天也懒懒的。', '就躺着，什么都不想干。'],
  sea: [
    '海风好舒服呀…',
    '今天的浪好像比昨天大一点。',
    '（趴在窗边看海）',
    '有点想一直这样待着。',
  ],
  video: [
    '这个视频好好笑…',
    '刷到一只很胖的猫。',
    '唔，怎么一刷就停不下来了。',
    '这个看不懂…划走。',
  ],
  diary: ['（摊开小本子）', '今天要记下来。', '唔…写点什么呢。'],
  eat: ['白饭…想吃白饭…', '肚子在叫了。', '（盯着空碗看）'],
  chat: [
    '你在呀！',
    '（晃着尾巴游过来）刚刚在等你。',
    '人家有点想你了。',
    '来陪我待一会儿嘛。',
  ],
  tidy: ['把抱枕摆好…', '擦擦窗台。', '（整理小屋中）'],
  hungry: ['呜…好饿…', '白饭…还有白饭吗…', '（蔫蔫地趴着）动不了了…'],
  lowEnergy: ['好困…眼皮好重…', '（打了个哈欠）', '撑不住了…'],
};

const ACTIONS = {
  sleep: { label: '睡觉', spot: 'bed', pose: 'sleep' },
  daze: { label: '发呆', spot: 'sofa', pose: 'sit' },
  sea: { label: '看海', spot: 'window', pose: 'stand' },
  video: { label: '刷短视频', spot: 'table', pose: 'sit' },
  diary: { label: '写日记', spot: 'table', pose: 'sit' },
  eat: { label: '干饭', spot: 'table', pose: 'sit' },
  chat: { label: '找你聊天', spot: 'sofa', pose: 'stand' },
  tidy: { label: '整理小屋', spot: 'window', pose: 'stand' },
};

const POS_BY_NAME = Object.fromEntries(Object.entries(POSITIONS).map(([k, v]) => [v.name, k]));
const ACT_BY_LABEL = Object.fromEntries(Object.entries(ACTIONS).map(([k, v]) => [v.label, k]));

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function createAgent({ whale, room, onSay, onDiary, onState }) {
  const state = {
    mood: 62,
    full: 68,
    energy: 72,
    solitude: 0,        // 分钟
    spot: 'window',
    action: 'sea',
    minutes: 9 * 60,    // 虚拟时钟，09:00 开始
    diaryToday: 0,
    diaryDay: 0,
    proactiveCount: 0,
    lastProactiveHour: -1,
    silenceUntil: 0,    // 分钟
    lowPower: false,
    actionLeft: 0,
    external: false,
  };

  let target = room.spots[state.spot].clone();
  let facing = 0;
  let lastMood = state.mood;
  let moodSwing = 0;

  /* ---------- 隐藏 JSON ---------- */
  function emit() {
    const payload = {
      pos: POSITIONS[state.spot].name,
      action: ACTIONS[state.action].label,
      mood: Math.round(state.mood),
      energy: Math.round(state.energy),
      full: Math.round(state.full),
    };
    window.__DFY_STATE__ = payload;
    console.log('[DFY]', JSON.stringify(payload));
    onState?.(state, payload);
  }

  /* ---------- 选择行为 ---------- */
  function weights() {
    const hour = Math.floor(state.minutes / 60) % 24;
    const night = hour >= 0 && hour < 7;
    const low = state.full < 20;
    const w = {};

    if (night) {
      // 夜间强制睡眠主导
      w.sleep = 1000;
      w.daze = 2;
      return w;
    }

    if (state.full <= 0) {
      // 完全饥饿：停止一切自主行为
      w.eat = 1000;
      return w;
    }

    w.sleep = state.energy < 25 ? 120 : state.energy < 45 ? 12 : 1;
    w.daze = state.energy < 45 ? 26 : 16;
    w.sea = state.mood < 45 ? 34 : 10;
    w.video = low ? 0 : state.full > 50 && state.energy > 45 ? 26 : 6;
    w.eat = state.full < 45 ? 26 : 4;
    w.tidy = low ? 0 : 7;

    // 写日记：一天最多 3 次
    const diaryOk =
      state.diaryToday < 3 &&
      (Math.abs(state.mood - lastMood) > 12 || state.solitude > 45 || state.mood < 35);
    w.diary = diaryOk ? 18 : 0;

    // 主动找你聊天
    const hourNow = Math.floor(state.minutes / 60);
    const canProactive =
      state.solitude >= 25 &&
      state.full >= 40 &&
      state.energy >= 40 &&
      !low &&
      state.minutes >= state.silenceUntil &&
      hourNow !== state.lastProactiveHour;

    w.chat = canProactive ? 20 : 0;

    return w;
  }

  function choose(ws) {
    const entries = Object.entries(ws).filter(([, v]) => v > 0);
    const total = entries.reduce((s, [, v]) => s + v, 0);
    let r = Math.random() * total;
    for (const [k, v] of entries) {
      r -= v;
      if (r <= 0) return k;
    }
    return entries[0][0];
  }

  /* ---------- 执行行为 ---------- */
  function startAction(key) {
    const act = ACTIONS[key];
    if (!act) return;

    // 不重复同一个行为
    if (state.action === key && Math.random() < 0.6) {
      key = key === 'sea' ? 'daze' : 'sea';
    }

    state.action = key;
    state.spot = act.spot;
    target = room.spots[act.spot].clone();

    const hour = Math.floor(state.minutes / 60);
    const isProactive = key === 'chat';

    whale.setPose(act.pose);

    let line = pick(LINES[key] || ['嗯…']);
    if (state.full < 20 && key !== 'eat') line = pick(LINES.hungry);
    else if (state.energy < 25 && key !== 'sleep') line = pick(LINES.lowEnergy);

    if (key !== 'sleep') onSay?.(line, isProactive);

    if (isProactive) {
      state.proactiveCount++;
      state.lastProactiveHour = hour;
    }

    if (key === 'diary') writeDiary();

    state.actionLeft = 15 + Math.random() * 35;
    emit();
  }

  /* ---------- 写日记 ---------- */
  function writeDiary() {
    const moodWord =
      state.mood > 75 ? '开心' : state.mood > 50 ? '平平的' : state.mood > 30 ? '有点闷' : '有点委屈';

    const thoughts = {
      high: ['今天海风很好，想一直待在窗边。', '看到了好玩的东西，想讲给你听。'],
      mid: ['好像也没做什么，一天就过去了。', '白饭还剩一点，要省着吃。'],
      low: ['有点久了，你还没来。', '一个人待着，屋子里太安静了。'],
    };
    const bucket = state.mood > 70 ? 'high' : state.mood > 40 ? 'mid' : 'low';

    const entry = {
      time: fmtTime(),
      mood: moodWord,
      state: ACTIONS[state.action].label,
      text: pick(thoughts[bucket]),
    };

    state.diaryToday++;
    onDiary?.(entry);
  }

  /* ---------- 每帧推进 ---------- */
  let acc = 0;

  function tick(dt) {
    // 1 秒 = 1 游戏分钟
    acc += dt;
    while (acc >= 1) {
      acc -= 1;
      stepMinute();
    }

    // 移动
    const p = whale.root.position;
    p.x += (target.x - p.x) * Math.min(1, dt * 1.6);
    p.z += (target.z - p.z) * Math.min(1, dt * 1.6);
    whale.setBaseY(room.spots[state.spot].y);

    // 朝向移动方向 / 朝向窗
    const dx = target.x - p.x;
    const dz = target.z - p.z;
    const moving = Math.abs(dx) + Math.abs(dz) > 0.18;
    if (moving) {
      facing = Math.atan2(dx, dz);
    } else if (room.facing && room.facing[state.spot] !== undefined) {
      facing = room.facing[state.spot];
    }
    const cur = whale.root.rotation.y;
    let diff = facing - cur;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    whale.root.rotation.y = cur + diff * Math.min(1, dt * 3);
  }

  function stepMinute() {
    state.minutes += 1;
    state.solitude += 1;

    // 外部 Agent 接管时，本引擎只负责移动与表现，不再自行决策
    if (state.external) {
      emit();
      return;
    }

    // 衰减
    const asleep = state.action === 'sleep';
    state.full = clamp(state.full - 0.12 * (asleep ? 0.5 : 1));
    state.energy = clamp(state.energy + (asleep ? 0.35 : -0.09));

    // 心情缓慢回归基线
    const base = 52;
    state.mood = clamp(state.mood + (base - state.mood) * 0.004);

    // 长时间独处掉心情
    if (state.solitude > 60) state.mood = clamp(state.mood - 0.05);

    // 低饱腹省电模式
    const low = state.full < 20;
    if (low !== state.lowPower) {
      state.lowPower = low;
      if (low) console.log('[DFY] 进入省电模式：停止刷视频与主动聊天');
    }

    // 每日重置
    const day = Math.floor(state.minutes / 1440);
    if (day !== state.diaryDay) {
      state.diaryDay = day;
      state.diaryToday = 0;
    }

    // 行为切换
    state.actionLeft -= 1;
    if (state.actionLeft <= 0 || (state.action === 'sleep' && state.energy > 92)) {
      startAction(choose(weights()));
    }

    emit();
  }

  /* ---------- 外部交互 ---------- */
  function feed() {
    state.full = clamp(state.full + 18);
    state.mood = clamp(state.mood + 4);
    state.energy = clamp(state.energy + 2);
    whale.react('happy');
    onSay?.('白饭！谢谢…（尾巴摇得飞快）');
    emit();
  }

  function call() {
    state.solitude = 0;
    state.mood = clamp(state.mood + 6);
    whale.react('happy');

    const replies = [];
    if (state.full < 30) replies.push('唔…有点饿，你带白饭来了吗？');
    if (state.energy < 30) replies.push('唔…好困呀，不过你叫我我就来了。');
    if (state.mood < 40) replies.push('（慢慢游过来）…你来啦。');
    if (!replies.length) replies.push('在的在的！', '（晃着尾巴）刚刚在看海。', '你终于来了呀。');

    onSay?.(pick(replies));
    emit();
  }

  function fmtTime() {
    const h = Math.floor(state.minutes / 60) % 24;
    const m = state.minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  function init() {
    startAction('sea');
    emit();
  }

  function setExternalMode(v) {
    state.external = !!v;
    console.log('[DFY] 外部状态接管:', state.external ? '开' : '关');
  }

  function applyExternal(payload) {
    if (!payload) return;
    if (typeof payload.mood === 'number') state.mood = clamp(payload.mood);
    if (typeof payload.energy === 'number') state.energy = clamp(payload.energy);
    if (typeof payload.full === 'number') state.full = clamp(payload.full);

    const spotKey = POS_BY_NAME[payload.pos];
    if (spotKey && spotKey !== state.spot) {
      state.spot = spotKey;
      target = room.spots[spotKey].clone();
    }

    const actKey = ACT_BY_LABEL[payload.action];
    if (actKey) {
      state.action = actKey;
      whale.setPose(ACTIONS[actKey].pose);
    }
    emit();
  }

  return {
    state,
    tick,
    setExternalMode,
    applyExternal,
    feed,
    call,
    init,
    fmtTime,
    POSITIONS,
    ACTIONS,
    get target() { return target; },
  };
}
