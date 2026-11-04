/**
 * 应用定义与面板渲染
 */

export const APPS = [
  {
    id: 'fish',
    label: '大肥鱼',
    icon: '🐳',
    color: 0x3f7ae0,
    accent: '#3f7ae0',
    render: () => `
      <div class="big-fish-card" style="background:linear-gradient(135deg,rgba(63,122,224,.18),rgba(34,211,238,.1));border-color:rgba(63,122,224,.28)">
        <div class="emoji">🐳</div>
        <div>
          <h4>蓝色大肥鱼 · 鲸鱼娘</h4>
          <p>蓝发、呆毛、女仆装、身后一条鲸尾。<br/>点她一下，会害羞地转个圈并冒出爱心。</p>
        </div>
      </div>
      <div class="row"><span class="k">本体</span><span class="v">DeepSeek 蓝鲸</span></div>
      <div class="row"><span class="k">口粮</span><span class="v">Token（白饭）</span></div>
      <div class="row"><span class="k">心情</span><span class="v">想讨点算力</span></div>
      <div class="row"><span class="k">特长</span><span class="v">卖萌 / 摸鱼 / 撒娇</span></div>
    `,
  },
  {
    id: 'files',
    label: '文件',
    icon: '📁',
    color: 0x22d3ee,
    accent: '#22d3ee',
    render: () => `
      <div class="file-item"><span class="fi-ico">📄</span><span class="fi-name">README.md</span><span class="fi-size">2.1 KB</span></div>
      <div class="file-item"><span class="fi-ico">🎨</span><span class="fi-name">style.css</span><span class="fi-size">14.6 KB</span></div>
      <div class="file-item"><span class="fi-ico">🐟</span><span class="fi-name">fish.js</span><span class="fi-size">9.8 KB</span></div>
      <div class="file-item"><span class="fi-ico">🖥️</span><span class="fi-name">main.js</span><span class="fi-size">18.2 KB</span></div>
      <div class="file-item"><span class="fi-ico">📦</span><span class="fi-name">package.json</span><span class="fi-size">0.4 KB</span></div>
      <div class="row" style="margin-top:10px"><span class="k">存储占用</span><span class="v">45.1 KB</span></div>
    `,
  },
  {
    id: 'terminal',
    label: '终端',
    icon: '⌨️',
    color: 0x34d399,
    accent: '#34d399',
    render: () => `
      <div class="term">
<span class="m">$</span> <span class="c">neofetch</span><br/>
<span class="g">AETHER</span> 3D Desktop v0.1.0<br/>
<span class="m">内核</span>   three.js r180<br/>
<span class="m">渲染</span>   WebGL 2 · Bloom<br/>
<span class="m">角色</span>   大肥鱼 × 1<br/>
<span class="m">灵动岛</span> 已连接<br/>
<br/>
<span class="m">$</span> <span class="c">fish --status</span><br/>
<span class="g">✓</span> 大肥鱼状态良好，正在眨眼<br/>
<span class="m">$</span> <span class="caret"></span>
      </div>
    `,
  },
  {
    id: 'music',
    label: '音乐',
    icon: '🎵',
    color: 0xa78bfa,
    accent: '#a78bfa',
    render: () => `
      <div class="big-fish-card" style="background:linear-gradient(135deg,rgba(167,139,250,.16),rgba(34,211,238,.1));border-color:rgba(167,139,250,.25)">
        <div class="emoji">🐠</div>
        <div>
          <h4>Fat Fish Dreams</h4>
          <p>Neon Aquarium · 深海水族馆</p>
        </div>
      </div>
      <div class="row"><span class="k">时长</span><span class="v">03:42</span></div>
      <div class="row"><span class="k">音质</span><span class="v">Lossless</span></div>
      <div class="row"><span class="k">播放列表</span><span class="v">深海漫游 12 首</span></div>
      <p style="color:var(--muted);font-size:10.5px;margin-top:10px;font-family:var(--mono)">
        提示：点顶部灵动岛展开完整播放器
      </p>
    `,
  },
  {
    id: 'settings',
    label: '设置',
    icon: '⚙️',
    color: 0xfbbf24,
    accent: '#fbbf24',
    render: () => `
      <div class="row"><span class="k">渲染质量</span><span class="v">ULTRA</span></div>
      <div class="row"><span class="k">泛光强度</span><span class="v">0.82</span></div>
      <div class="row"><span class="k">阴影</span><span class="v">开启</span></div>
      <div class="row"><span class="k">鱼体尺寸</span><span class="v">100%</span></div>
      <div class="row"><span class="k">自由漫游</span><span class="v">WASD</span></div>
      <div class="row"><span class="k">版本</span><span class="v">v0.1.0</span></div>
    `,
  },
  {
    id: 'github',
    label: 'GitHub',
    icon: '🐙',
    color: 0xe5e7eb,
    accent: '#e5e7eb',
    render: () => `
      <div class="big-fish-card" style="background:linear-gradient(135deg,rgba(229,231,235,.1),rgba(34,211,238,.08));border-color:rgba(229,231,235,.2)">
        <div class="emoji">🐙</div>
        <div>
          <h4>fatfish-3d-desktop</h4>
          <p>本项目的源代码仓库<br/>由 gh CLI 推送</p>
        </div>
      </div>
      <div class="row"><span class="k">账号</span><span class="v">4859uuoo</span></div>
      <div class="row"><span class="k">协议</span><span class="v">HTTPS</span></div>
      <div class="row"><span class="k">分支</span><span class="v">main</span></div>
      <div class="row"><span class="k">构建</span><span class="v">Vite 6</span></div>
    `,
  },
];

let panelEl, titleEl, icoEl, bodyEl, closeEl;
let hideTimer = null;

export function initPanel(onClose) {
  panelEl = document.getElementById('app-panel');
  titleEl = document.getElementById('ap-title');
  icoEl = document.getElementById('ap-ico');
  bodyEl = document.getElementById('ap-body');
  closeEl = document.getElementById('ap-close');

  closeEl.addEventListener('click', () => {
    closePanel();
    if (onClose) onClose();
  });
}

export function openPanel(app) {
  if (!panelEl) return;
  titleEl.textContent = app.label;
  icoEl.textContent = app.icon;
  icoEl.style.filter = `drop-shadow(0 0 10px ${app.accent})`;
  bodyEl.innerHTML = app.render();
  panelEl.classList.add('show');
  panelEl.setAttribute('aria-hidden', 'false');
}

export function closePanel() {
  if (!panelEl) return;
  panelEl.classList.remove('show');
  panelEl.setAttribute('aria-hidden', 'true');
}

export function isPanelOpen() {
  return panelEl && panelEl.classList.contains('show');
}
