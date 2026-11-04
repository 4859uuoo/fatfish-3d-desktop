/**
 * 灵动岛控制器：管理 紧凑 / 悬停 / 通知 / 展开 四种形态的切换
 */
export class Island {
  constructor() {
    this.el = document.getElementById('island');
    this.clockEl = document.getElementById('island-clock');
    this.icoEl = document.getElementById('notify-ico');
    this.txtEl = document.getElementById('notify-txt');
    this.subEl = document.getElementById('ip-sub');
    this.playBtn = document.getElementById('ip-play');
    this.bars = document.querySelector('.ip-bars');

    this.isOpen = false;
    this.isHover = false;
    this.notifyUntil = 0;
    this.lastSec = -1;
    this.playing = true;
    this._state = '';

    this.el.addEventListener('mouseenter', () => {
      this.isHover = true;
      this._apply();
    });
    this.el.addEventListener('mouseleave', () => {
      this.isHover = false;
      this._apply();
    });
    this.el.addEventListener('click', (e) => {
      if (e.target.closest('#ip-play')) return;
      this.isOpen = !this.isOpen;
      this._apply();
    });
    this.el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.isOpen = !this.isOpen;
        this._apply();
      }
    });

    if (this.playBtn) {
      this.playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.playing = !this.playing;
        this.playBtn.textContent = this.playing ? '▶' : '❚❚';
        this.bars.classList.toggle('paused', !this.playing);
      });
    }

    this._apply();
  }

  _apply() {
    const now = performance.now();
    let state;
    if (this.isOpen) state = 'open';
    else if (now < this.notifyUntil) state = 'notify';
    else if (this.isHover) state = 'hover';
    else state = 'compact';

    if (state !== this._state) {
      this._state = state;
      this.el.dataset.state = state;
    }
  }

  /** 短暂展示一条消息，随后自动收回 */
  notify(text, icon = '✦', duration = 2600) {
    if (this.txtEl) this.txtEl.textContent = text;
    if (this.icoEl) this.icoEl.textContent = icon;
    this.notifyUntil = performance.now() + duration;
    this._apply();
  }

  open() { this.isOpen = true; this._apply(); }
  close() { this.isOpen = false; this._apply(); }

  setStats({ fps, objects, distance }) {
    const f = document.getElementById('st-fps');
    const o = document.getElementById('st-obj');
    const c = document.getElementById('st-cam');
    if (f && fps !== undefined) f.textContent = Math.round(fps);
    if (o && objects !== undefined) o.textContent = objects;
    if (c && distance !== undefined) c.textContent = distance.toFixed(1);
  }

  setSub(text) {
    if (this.subEl) this.subEl.textContent = text;
  }

  /** 每帧调用：更新时钟与形态 */
  tick() {
    const now = new Date();
    if (now.getSeconds() !== this.lastSec) {
      this.lastSec = now.getSeconds();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      if (this.clockEl) this.clockEl.textContent = `${hh}:${mm}`;
    }
    this._apply();
  }
}
