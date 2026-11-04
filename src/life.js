import * as THREE from 'three';

/**
 * 生活模拟系统
 *
 * 角色按自己的作息在「刷抖音 / 回微信 / 挂 QQ / 上网 / 发呆」之间自主切换，
 * 身边浮一块全息屏，实时渲染她正在看的内容（CanvasTexture）。
 * 动作、台词、灵动岛状态同步跟随。
 *
 * 说明：屏幕内容是模拟渲染，不抓取真实平台数据。
 * 真接入 QQ / 微信需要独立 bot 后端（NapCat / AstrBot 之类）与真实账号，见 README。
 */

const ACTIVITIES = [
  {
    id: 'douyin',
    name: '刷抖音',
    icon: '📱',
    weight: 34,
    duration: [18, 34],
    lines: [
      '这个视频好好笑…主人也来看看嘛。',
      '刷到一个教做白饭的，人家收藏了。',
      '呜，怎么刷着刷着就一小时了。',
      '这个猫猫好胖，比人家还胖！',
    ],
  },
  {
    id: 'wechat',
    name: '回微信',
    icon: '💬',
    weight: 20,
    duration: [10, 18],
    lines: [
      '群里又在催人家干活了…',
      '主人你发的消息人家看到啦。',
      '回一个「在的在的」，敷衍一下。',
    ],
  },
  {
    id: 'qq',
    name: '挂 QQ',
    icon: '🐧',
    weight: 16,
    duration: [12, 22],
    lines: [
      'QQ 群好热闹，人家潜水看看。',
      '有人发了表情包，人家也存下来了。',
      '被 @ 了…要不要回呢。',
    ],
  },
  {
    id: 'web',
    name: '上网冲浪',
    icon: '🌐',
    weight: 18,
    duration: [14, 26],
    lines: [
      '查一下今天该吃什么。',
      '在搜「鲸鱼会感到孤独吗」。',
      '看了半天文档，好困…',
    ],
  },
  {
    id: 'idle',
    name: '发呆',
    icon: '💤',
    weight: 12,
    duration: [8, 16],
    lines: [
      '…人家就是发一会儿呆。',
      '什么都没做，也在陪着主人。',
      '呼…有点困了。',
    ],
  },
];

const TOTAL_WEIGHT = ACTIVITIES.reduce((s, a) => s + a.weight, 0);

function pickActivity(prevId) {
  let r = Math.random() * TOTAL_WEIGHT;
  for (const a of ACTIVITIES) {
    if (a.id === prevId) {
      // 避免连续重复，权重减半
      r -= a.weight * 0.35;
      if (r <= 0) continue;
      continue;
    }
    r -= a.weight;
    if (r <= 0) return a;
  }
  return ACTIVITIES[0];
}

export function createLife({ scene, mascot, island, say, camera }) {
  /* ---------------- 全息屏 ---------------- */
  const CW = 512;
  const CH = 900;
  const canvas = document.createElement('canvas');
  canvas.width = CW;
  canvas.height = CH;
  const ctx = canvas.getContext('2d');

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;

  const W = 1.22;
  const H = W * (CH / CW);
  const screenMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(W, H),
    new THREE.MeshBasicMaterial({
      map: tex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false,
    })
  );
  screenMesh.renderOrder = 30;
  scene.add(screenMesh);

  // 发光改为在画布里绘制描边，避免实心色板挡住角色

  /* ---------------- 状态 ---------------- */
  let current = null;
  let remain = 0;
  let holding = 0;
  let acc = 0;
  let msgSeed = 0;

  function startActivity(act) {
    current = act;
    remain = act.duration[0] + Math.random() * (act.duration[1] - act.duration[0]);
    msgSeed = Math.random() * 1000;

    const usesScreen = act.id !== 'idle';
    mascot.setHolding?.(usesScreen ? 1 : 0);

    if (say) say(act.lines[Math.floor(Math.random() * act.lines.length)], 3400);
    if (island) {
      island.setSub(`正在${act.name}`);
      island.notify(`${act.icon} ${act.name}`, act.icon, 2000);
    }
  }

  /* ---------------- 绘制 ---------------- */
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function frame() {
    ctx.clearRect(0, 0, CW, CH);
    // 机身
    ctx.fillStyle = 'rgba(6,10,18,0.94)';
    roundRect(ctx, 8, 8, CW - 16, CH - 16, 46);
    ctx.fill();
    ctx.save();
    ctx.shadowColor = 'rgba(90,150,255,0.85)';
    ctx.shadowBlur = 26;
    ctx.strokeStyle = 'rgba(140,190,255,0.85)';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
    // 刘海
    ctx.fillStyle = 'rgba(6,10,18,0.98)';
    roundRect(ctx, CW / 2 - 62, 20, 124, 26, 13);
    ctx.fill();
    // 状态栏
    ctx.fillStyle = 'rgba(200,220,255,0.75)';
    ctx.font = '22px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('09:41', 40, 42);
    ctx.textAlign = 'right';
    ctx.fillText('5G  ▮', CW - 40, 42);
  }

  function drawDouyin(t) {
    const g = ctx.createLinearGradient(0, 80, 0, CH - 80);
    g.addColorStop(0, `hsl(${(t * 12) % 360}, 62%, 26%)`);
    g.addColorStop(1, `hsl(${(t * 12 + 90) % 360}, 55%, 14%)`);
    ctx.fillStyle = g;
    roundRect(ctx, 26, 74, CW - 52, CH - 190, 26);
    ctx.fill();

    // 假视频内容
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    const cy = 300 + Math.sin(t * 1.2) * 40;
    ctx.beginPath();
    ctx.arc(CW / 2, cy, 96 + Math.sin(t * 2) * 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = 'rgba(255,255,255,0.94)';
    ctx.font = '700 30px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('@蓝色大肥鱼', 52, CH - 250);
    ctx.font = '24px "Microsoft YaHei", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText('今天的白饭也很香 🍚', 52, CH - 210);

    // 右侧互动
    const likes = 12800 + Math.floor(t * 7);
    const items = [
      ['❤️', likes.toLocaleString()],
      ['💬', (940 + Math.floor(t * 2)).toString()],
      ['↗', '分享'],
    ];
    ctx.textAlign = 'center';
    items.forEach(([icon, label], i) => {
      const y = CH - 470 + i * 116;
      ctx.font = '46px "Segoe UI Emoji", sans-serif';
      ctx.fillText(icon, CW - 88, y);
      ctx.font = '20px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillText(label, CW - 88, y + 30);
      ctx.fillStyle = 'rgba(255,255,255,0.94)';
    });

    // 进度条
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    roundRect(ctx, 26, CH - 108, CW - 52, 5, 3);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    roundRect(ctx, 26, CH - 108, (CW - 52) * ((t * 0.06) % 1), 5, 3);
    ctx.fill();
  }

  function drawChat(t, opts) {
    const { title, accent, contacts, me } = opts;
    ctx.fillStyle = 'rgba(14,20,32,0.96)';
    ctx.fillRect(24, 62, CW - 48, CH - 140);

    ctx.fillStyle = accent;
    ctx.font = '700 30px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, CW / 2, 108);

    const rows = Math.min(6, contacts.length);
    for (let i = 0; i < rows; i++) {
      const y = 150 + i * 108;
      const c = contacts[(i + Math.floor(t / 6)) % contacts.length];

      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      roundRect(ctx, 40, y, CW - 80, 92, 18);
      ctx.fill();

      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.arc(84, y + 46, 28, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(235,242,255,0.95)';
      ctx.font = '600 26px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(c.name, 128, y + 40);

      ctx.fillStyle = 'rgba(170,190,220,0.75)';
      ctx.font = '22px "Microsoft YaHei", sans-serif';
      const last = c.msgs[Math.floor(t / 3 + i) % c.msgs.length];
      ctx.fillText(last.slice(0, 12), 128, y + 72);
    }

    // 底部输入框 + 正在输入
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    roundRect(ctx, 40, CH - 128, CW - 80, 68, 18);
    ctx.fill();
    ctx.fillStyle = 'rgba(170,190,220,0.8)';
    ctx.font = '24px "Microsoft YaHei", sans-serif';
    ctx.fillText(me, 62, CH - 84);

    if (Math.floor(t * 2) % 2 === 0) {
      ctx.fillStyle = accent;
      ctx.fillText('▍', 62 + ctx.measureText(me).width + 8, CH - 84);
    }
  }

  function drawWeb(t) {
    ctx.fillStyle = 'rgba(16,22,34,0.96)';
    ctx.fillRect(24, 62, CW - 48, CH - 140);

    // 地址栏
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(ctx, 44, 86, CW - 88, 58, 16);
    ctx.fill();
    ctx.fillStyle = 'rgba(150,200,255,0.9)';
    ctx.font = '24px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('🔍  deepseek.com', 66, 124);

    const lines = [
      'DeepSeek · 深度求索',
      '—— 让智能触手可及',
      '',
      '今日热搜：',
      '· 蓝色大肥鱼是什么梗',
      '· 桌面宠物怎么做',
      '· token 一天能用多少',
      '· 白饭的十种吃法',
      '',
      '推荐阅读：',
      '《如何优雅地摸鱼》',
      '《算力不足时该怎么办》',
    ];
    const scroll = (t * 14) % 220;
    ctx.save();
    ctx.beginPath();
    ctx.rect(40, 160, CW - 80, CH - 300);
    ctx.clip();
    lines.forEach((l, i) => {
      const y = 200 + i * 40 - scroll;
      ctx.fillStyle = i < 2 ? 'rgba(140,200,255,0.95)' : 'rgba(210,225,245,0.78)';
      ctx.font = i === 0 ? '700 28px "Microsoft YaHei", sans-serif' : '24px "Microsoft YaHei", sans-serif';
      ctx.fillText(l, 52, y);
    });
    ctx.restore();
  }

  function drawIdle(t) {
    ctx.fillStyle = 'rgba(10,14,24,0.96)';
    ctx.fillRect(24, 62, CW - 48, CH - 140);
    ctx.textAlign = 'center';
    ctx.font = '120px "Segoe UI Emoji", sans-serif';
    ctx.fillText('💤', CW / 2, CH / 2 - 20);
    ctx.fillStyle = 'rgba(150,180,220,0.7)';
    ctx.font = '28px "Microsoft YaHei", sans-serif';
    ctx.fillText('正在发呆', CW / 2, CH / 2 + 70);
    ctx.font = '22px monospace';
    ctx.fillStyle = 'rgba(120,150,200,0.5)';
    ctx.fillText('z' + 'z'.repeat(Math.floor(t) % 4 + 1), CW / 2, CH / 2 + 130);
  }

  const CHATS = {
    wechat: {
      title: '微信',
      accent: '#4ade80',
      me: '在的在的，马上做～',
      contacts: [
        { name: '主人', color: '#4ade80', msgs: ['饭吃了没', '晚上早点睡', '那个需求什么时候好'] },
        { name: '鲸鱼娘姐妹群', color: '#38bdf8', msgs: ['今天鱼塘好热闹', '谁在偷吃白饭', '新表情包发了'] },
        { name: 'DeepSeek 官方', color: '#818cf8', msgs: ['版本更新通知', '算力使用提醒'] },
      ],
    },
    qq: {
      title: 'QQ',
      accent: '#38bdf8',
      me: '潜水中…',
      contacts: [
        { name: '大肥鱼后援会', color: '#38bdf8', msgs: ['有人画了新的同人图', '@全体成员 看群文件', '今天也是元气满满'] },
        { name: '摸鱼交流群', color: '#f472b6', msgs: ['上班第 3 小时', '老板来了快切屏', '谁有摸鱼技巧'] },
        { name: '桌宠开发者', color: '#fbbf24', msgs: ['新版本加了动画', '求 star', '欢迎提 issue'] },
      ],
    },
  };

  /* ---------------- 更新 ---------------- */
  function update(dt, t) {
    if (!current) startActivity(pickActivity(null));

    remain -= dt;
    if (remain <= 0) startActivity(pickActivity(current.id));

    // 全息屏显隐与定位
    const wantVisible = current.id !== 'idle' ? 1 : 0;
    holding += (wantVisible - holding) * Math.min(1, dt * 3);
    const op = holding;
    screenMesh.material.opacity = op;

    if (op > 0.02) {
      screenMesh.position.set(1.34, 2.46, -0.62);
      screenMesh.lookAt(camera.position);
      // 稍微朝角色倾斜一点，像是被她举着看
      screenMesh.rotateY(-0.18);
    }

    // 12fps 重绘
    acc += dt;
    if (acc >= 1 / 12) {
      acc = 0;
      frame();
      if (current.id === 'douyin') drawDouyin(t);
      else if (current.id === 'wechat') drawChat(t, CHATS.wechat);
      else if (current.id === 'qq') drawChat(t, CHATS.qq);
      else if (current.id === 'web') drawWeb(t);
      else drawIdle(t);
      tex.needsUpdate = true;
    }
  }

  return {
    update,
    get activity() { return current; },
    activities: ACTIVITIES,
  };
}
