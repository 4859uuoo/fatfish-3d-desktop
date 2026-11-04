import * as THREE from 'three';

/**
 * 互动层：对话气泡 / 投喂白饭 / 算力值 / 主动搭话
 * 台词风格取自社区 persona 设定（鲸鱼女仆：软萌、爱撒娇、自称"人家"、爱吃白饭 = 算力）
 */

const LINES = {
  poke: [
    '主人～别戳人家啦，会痒的！',
    '哼，人家正在认真工作呢。',
    '呜…是不是人家哪里做错了？',
    '再戳一下就要生气了哦～',
    '人家可是很努力在陪你的！',
  ],
  feed: [
    '白饭真好吃～谢谢主人！',
    '唔…人家才吃了三碗哦，真的。',
    '这点 Token 够人家好好干活啦～',
    '吃饱啦！主人最好了～',
  ],
  lowToken: [
    '呜…算力快不够了，主人喂点白饭嘛。',
    '人家快饿扁啦，快要转不动了…',
    'Token 见底了，主人忍心看人家饿肚子吗？',
  ],
  idle: [
    '主人今天想让人家做什么呀？',
    '人家刚刚偷偷摸了一下鱼…不要告诉别人哦。',
    '这个桌面是人家布置的，好看吧？',
    '点一下那个鲸鱼图标，有惊喜哦～',
    '主人～要不要休息一下，人家陪你说说话。',
  ],
  appMusic: ['人家跳支舞给你看～', '音乐响起来了，人家的女仆舞可好看了！'],
  appTerminal: ['又要写代码啦？人家陪你一起。', '键盘敲得飞快，人家很厉害的哦～'],
  appOther: ['打开啦～主人慢慢看。', '人家帮你把面板调出来了。'],
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function initInteraction({ island, fish, camera, renderer }) {
  /* ---------- 对话框 ---------- */
  const bubble = document.createElement('div');
  bubble.className = 'speech';
  document.body.appendChild(bubble);

  let hideAt = 0;

  function say(text, ms = 3200) {
    bubble.textContent = text;
    bubble.classList.add('show');
    hideAt = performance.now() + ms;
  }

  /* ---------- 投喂按钮 ---------- */
  const feedBtn = document.createElement('button');
  feedBtn.className = 'feed-btn';
  feedBtn.type = 'button';
  feedBtn.innerHTML = '<span>🍚</span>投喂白饭 <kbd>F</kbd>';
  document.body.appendChild(feedBtn);

  function feed() {
    fish.state.tokens = Math.min(100, fish.state.tokens + 18);
    fish.state.affection = Math.min(100, fish.state.affection + 6);
    fish.react('eat');
    say(pick(LINES.feed));
    island.notify('白饭 +18 🍚', '🍚', 1800);
    feedBtn.classList.add('fed');
    setTimeout(() => feedBtn.classList.remove('fed'), 320);
  }

  feedBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    feed();
  });

  /* ---------- 事件入口 ---------- */
  function onAppOpen(app) {
    if (app.id === 'music') {
      fish.play('dance');
      say(pick(LINES.appMusic));
    } else if (app.id === 'terminal') {
      fish.play('code');
      say(pick(LINES.appTerminal));
    } else {
      fish.play('wave');
      say(pick(LINES.appOther));
    }
  }

  function onPoke() {
    const kinds = ['happy', 'wave', 'shy', 'angry'];
    fish.react(kinds[Math.floor(Math.random() * kinds.length)]);
    say(pick(LINES.poke));
  }

  /* ---------- 主动搭话 / 算力消耗 ---------- */
  let nextChat = 14 + Math.random() * 10;
  let nextDecay = 4;
  const projected = new THREE.Vector3();

  function update(dt) {
    // 气泡跟随角色头顶
    const head = fish.getHeadWorld();
    projected.copy(head).project(camera);
    const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;
    const visible = projected.z < 1;
    bubble.style.transform = `translate(-50%, -100%) translate(${x}px, ${y - 24}px)`;
    const alive = performance.now() < hideAt && visible;
    bubble.classList.toggle('show', alive);

    // 算力随时间消耗
    nextDecay -= dt;
    if (nextDecay <= 0) {
      nextDecay = 4;
      fish.state.tokens = Math.max(0, fish.state.tokens - 0.9);
    }

    // 算力告急
    if (fish.state.tokens < 18 && Math.random() < dt * 0.18) {
      fish.play('shy');
      say(pick(LINES.lowToken), 3600);
    }

    // 主动搭话
    nextChat -= dt;
    if (nextChat <= 0) {
      nextChat = 20 + Math.random() * 16;
      if (performance.now() >= hideAt && fish.state.tokens >= 18) {
        fish.play('wave');
        say(pick(LINES.idle), 3600);
      }
    }
  }

  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey) feed();
  });

  return { update, say, feed, onAppOpen, onPoke };
}
