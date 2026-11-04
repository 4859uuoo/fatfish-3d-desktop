/**
 * 前端 ↔ 状态桥连接
 * 连上 ws://<host>:5275/ws 后，由外部 Agent 接管状态；连不上就退回本地自主循环。
 */
export function connectBridge({ onState, onStatus }) {
  const host = location.hostname || '127.0.0.1';
  const url = `ws://${host}:5275/ws`;
  let ws = null;
  let timer = null;
  let closed = false;

  function schedule() {
    if (closed) return;
    clearTimeout(timer);
    timer = setTimeout(open, 4000);
  }

  function open() {
    try {
      ws = new WebSocket(url);
    } catch {
      onStatus?.('offline');
      schedule();
      return;
    }

    ws.onopen = () => onStatus?.('connected');

    ws.onmessage = (e) => {
      try {
        const m = JSON.parse(e.data);
        if (m && m.type === 'state' && m.data) onState?.(m.data);
      } catch {
        /* ignore */
      }
    };

    ws.onerror = () => {
      try { ws.close(); } catch { /* ignore */ }
    };

    ws.onclose = () => {
      onStatus?.('offline');
      schedule();
    };
  }

  open();

  return {
    close() {
      closed = true;
      clearTimeout(timer);
      try { ws?.close(); } catch { /* ignore */ }
    },
    get connected() {
      return ws && ws.readyState === 1;
    },
  };
}
