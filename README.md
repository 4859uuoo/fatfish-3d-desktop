# 大肥鱼 · 海景小屋

一只住在海边的圆滚滚蓝灰色小鲸鱼。她自己会过日子：心情、饱腹、精力三条底层数值驱动她
在沙发、窗边、沙滩、床上、桌前之间来回，发呆、看海、刷视频、写日记、找你说话。

3D 部分用 Three.js 实时渲染；状态由一个可外部接管的 Agent 引擎驱动。

![预览](docs/preview.png)

---

## 她能做什么

| 行为 | 触发条件 | 表现 |
|---|---|---|
| 睡觉 | 精力 < 25，或夜间 0~7 点 | 趴到床上，眼睛闭上，精力回升 |
| 发呆 | 精力中等、心情平淡 | 窝在沙发边，偶尔自言自语 |
| 看海 | 心情偏低 | 走到落地窗前，望着海面 |
| 刷短视频 | 饱腹 > 50 且精力 > 45 | 坐到桌前 |
| 写日记 | 心情波动 > 12，或独处 > 45 分钟 | 每天最多 3 次，右侧滑出日记卡 |
| 干饭 | 饱腹 < 45 | 挪到桌前 |
| 找你聊天 | 独处 ≥ 25 分钟、饱腹 ≥ 40、精力 ≥ 40、每小时最多 1 次 | 说一句话 |
| 整理小屋 | 低概率 | 在窗边晃一圈 |

**降级与保护**

- 饱腹 < 20 → 省电模式：关掉刷视频与主动聊天
- 饱腹 = 0 → 停止一切自主行为，只会蔫蔫喊饿
- 夜间 0~7 点 → 睡眠权重拉满
- 心情低 → 鱼鳍会耷拉下来；心情高 → 尾巴摆得更快

---

## 状态契约（给外部 Agent）

每次状态变化都会输出一行隐藏 JSON：

```json
{"pos":"沙发","action":"发呆","mood":62,"energy":55,"full":68}
```

`pos` 取值：`沙发 / 窗边 / 沙滩 / 床上 / 桌前`
`action` 取值：`发呆 / 看海 / 刷短视频 / 写日记 / 干饭 / 找你聊天 / 睡觉 / 整理小屋`

### 两种运行模式

**1. 本地自主（默认，零依赖）**

```bash
npm install
npm run dev        # http://127.0.0.1:5273
```

前端自己跑 Agent 循环，不需要任何后端。

**2. 外部 Agent 接管（对接 DSH / AstrBot / 脚本）**

```bash
npm run build
node server/bridge.mjs     # http://127.0.0.1:5275
```

桥接服务提供：

| 接口 | 用途 |
|---|---|
| `GET  /state` | 读取当前状态 |
| `POST /state` | 写入状态（自动持久化并广播） |
| `WS   /ws` | 状态实时推送，前端连上后自动切换到外部接管 |
| `GET  /health` | 健康检查 |

状态持久化在 `state/dfy-state.json`，重启不丢。

```bash
curl -X POST http://127.0.0.1:5275/state \
  -H "content-type: application/json" \
  -d '{"pos":"沙发","action":"发呆","mood":62,"energy":55,"full":68}'
```

前端连上 WS 后会打印 `外部状态接管: 开`，此后她的位置、动作、数值全部由外部推送决定。

---

## 项目结构

```
.
├── index.html            # 页面骨架（HUD / 气泡 / 日记 / 按钮）
├── server/bridge.mjs     # 状态桥：托管前端 + WS 推送 + 持久化 + HTTP 写入
├── tools/shot.mjs        # Puppeteer 截图（等条件成立再截）
└── src
    ├── main.js           # 渲染器、相机、主循环、UI 绑定
    ├── room.js           # 海景小屋：落地窗、海面 shader、沙滩、家具、灯光
    ├── whale.js          # 角色：圆滚滚鲸鱼、表情、鱼鳍、尾巴、居家服
    ├── agent.js          # 状态机：数值衰减、加权决策、日记、主动搭话
    ├── bridge.js         # 前端 WS 客户端
    └── style.css
```

---

## 已被验证的链路

- `POST /state` 写入 → 落盘 → WS 广播 → 前端角色走到对应位置、数值条同步（实测通过）
- 断开桥接后前端自动回落到本地自主循环
- 夜间/饥饿/低精力等降级分支在 `agent.js` 的 `weights()` 中

---

## 附：清单里那些 GitHub 地址的真实情况

| 清单中的地址 | 核实结果 |
|---|---|
| `DeepSeek-AI/deepseek-harness` | ✅ 存在（272k★） |
| `NapCatQQ/NapCat` | ❌ 不存在 → 正确的是 [NapNeko/NapCatQQ](https://github.com/NapNeko/NapCatQQ) |
| `DSH-PluginHub`（及 onebot-adapter / browser-tool / ws-push / tts） | ❌ **整个组织不存在** |
| `threejs/examples` | ❌ 不存在 → 正确的是 [mrdoob/three.js](https://github.com/mrdoob/three.js) |
| `chroma-core/chroma` | ✅ 存在 |
| `AstrBotDevs/AstrBot` | ✅ 存在（46k★） |

缺失的 `ws-push` 与 `VariableStore` 已由本项目 `server/bridge.mjs` 实现。

---

## 还没做的部分

这些需要真实账号或额外授权，没有在此擅自安装：

- **QQ 收发**：需要 [NapNeko/NapCatQQ](https://github.com/NapNeko/NapCatQQ) + 小号扫码登录（大号有风控风险）
- **真实刷视频**：浏览器自动化，平台风控严格，且需登录态
- **向量记忆 / TTS**：分别需要 Chroma 与云厂商 TTS Key

---

## License

MIT（代码部分）
