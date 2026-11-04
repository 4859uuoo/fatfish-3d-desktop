# 蓝色大肥鱼 · AETHER 3D DESKTOP

一个跑在浏览器里的 **3D 交互式桌面**：星空、金属地面、霓虹应用坞、会呼吸的 **灵动岛**，
以及一个**真正的 3D 骨骼角色**——蓝色大肥鱼。

![预览](docs/preview.png)

![灵动岛展开态](docs/preview-dynamic-island.png)

---

## 角色：真 3D 骨骼模型

角色躯干使用 VRoid 官方示例模型 `AvatarSample_A`（VRM 0.x，25.5 MB，95 节点 / 54 根标准人形骨骼），
由 `@pixiv/three-vrm` 解析，`three.js` 渲染。

因为社区里「大肥鱼」只有 2D 立绘与动画，没有 3D 模型，这里采用「可用的真 3D 躯体 + 大肥鱼化处理」的路线：

| 处理 | 做法 |
|---|---|
| 染发 | 把 HAIR 材质基色替换为鲸鱼蓝 |
| 眼睛 | 虹膜材质改为亮蓝 |
| 材质 | MToon → `MeshStandardMaterial`，解决面部发黑并统一光照 |
| 描边 | 保留 inverted-hull 描边壳，改为半透明深蓝 |
| 姿势 | 通过 VRM 归一化骨骼把 T-pose 摆成自然垂手站姿 |

**骨骼驱动**：呼吸（胸腔起伏）、站立微摆、看向鼠标（脖子+头）、随机眨眼（expression `blink`）、
点击时跳跃与点头。

> 注意：这不是「大肥鱼」原角色的官方 3D 化，而是一个真 3D 动漫角色的风格化替代。
> 若日后出现大肥鱼本人的 VRM 模型，把 `public/models/avatar.vrm` 替换掉即可，加载与驱动逻辑不用改。

---

## 特性

### 3D 桌面
- Three.js + WebGL 2，ACES Filmic 色调映射
- 星空粒子、悬浮尘埃、金属反射地面、多层发光环
- 6 个应用图标弧形悬浮，各有独立霓虹描边配色
- UnrealBloom 泛光后处理

### 自由交互
- **拖拽旋转 / 滚轮缩放 / 右键平移**（OrbitControls + 阻尼）
- **WASD** 水平漫游、**Q/E** 升降、**R** 切换自动旋转
- 悬停图标：抬升、放大、描边增亮，灵动岛同步显示应用名
- 点击图标：打开玻璃面板；点击角色：随机反应 + 台词

### 灵动岛
四种形态平滑形变（宽度、高度、圆角同步过渡）：

| 形态 | 触发 | 内容 |
|---|---|---|
| 紧凑 | 默认 | 呼吸光点 + 实时时钟 + 鲸鱼标识 |
| 悬停 | 鼠标移入 | 略微展开 |
| 通知 | 任意操作 | 展示操作反馈，2.4 秒后自动收回 |
| 展开 | 点击 | 迷你播放器 + 频谱动画 + 实时性能与算力 |

### 陪伴系统
- **对话气泡**：跟随角色头顶投影定位，台词取自社区 persona 设定
  （自称「人家」、爱撒娇、爱吃白饭 = 算力）
- **投喂白饭**：点击按钮或按 `F`，算力 +18、好感 +6
- **算力消耗**：随时间缓慢下降；低于阈值会慌张并要求投喂
- **主动搭话**：空闲 20～36 秒随机说一句话

---

## 快速开始

```bash
npm install
npm run dev        # http://127.0.0.1:5273
```

构建与预览：

```bash
npm run build      # 产物在 dist/
npm run preview    # http://127.0.0.1:5274
```

### 演示模式

```
/?demo=1   # 展开音乐面板 + 灵动岛
/?demo=2   # 角色 + 对话气泡
/?demo=3   # 斜视角
/?demo=4   # 角色特写
```

### 截图工具

`tools/shot.mjs` 用 Puppeteer 做「等待条件成立再截图」，避免 `--virtual-time-budget`
在异步加载（VRM 25 MB）完成前就截断：

```bash
node tools/shot.mjs "http://127.0.0.1:5274/" out.png "window.__FISH_READY__ === true" 120000 1600 900
```

---

## 操作一览

| 操作 | 效果 |
|---|---|
| 左键拖拽 | 旋转视角 |
| 滚轮 | 缩放远近 |
| 右键拖拽 | 平移场景 |
| `W` `A` `S` `D` | 水平漫游 |
| `Q` / `E` | 上升 / 下降 |
| `R` | 开 / 关自动旋转 |
| `F` | 投喂白饭 |
| `Esc` | 关闭面板与灵动岛 |

---

## 技术栈

| 层 | 选型 |
|---|---|
| 构建 | Vite 6 |
| 3D | Three.js r180 |
| 角色 | VRM 0.x + `@pixiv/three-vrm` 3.5 |
| 后处理 | EffectComposer + UnrealBloomPass + OutputPass |
| 环境光照 | RoomEnvironment + PMREMGenerator |
| UI | 原生 DOM + CSS（玻璃拟态、`backdrop-filter`） |
| 截图 | puppeteer-core |

无前端框架，全部为原生 ES Module。

---

## 关于「蓝色大肥鱼」

「大肥鱼」不是本项目原创角色，它是**网友自发为 DeepSeek 共创的拟人形象**。

起因是 DeepSeek 的品牌 logo 是一只圆润的蓝色鲸鱼，被模型误认成「蓝色大肥鱼」，这个外号随后传开。
网友在此基础上创作了鲸鱼娘形象：**蓝发、呆毛、女仆装、身后一条鲸尾**。
那句「吃白饭」（把算力 Token 比喻成口粮）的设定，也成了社区里的流行梗。

---

## 素材来源与许可

### 角色模型

- **模型**：`AvatarSample_A.vrm`，作者 **VRoid Project (pixiv Inc.)**
- **来源**：VRoid 官方示例模型，经 [moeru-ai/airi](https://github.com/moeru-ai/airi) 的公开分发地址获取
- **许可**：遵循 VRoid 示例模型的使用条款；本项目仅作技术演示，未用于商业用途

模型经过程序化改造（发色、瞳色、材质替换、骨骼摆姿），原始模型版权归原作者所有。

### 台词与设定参考

- [MerZlin/dsh-pet-indesktop](https://github.com/MerZlin/dsh-pet-indesktop)（MIT）的 `persona_presets/whale_maid.json`

场景、图标阵列、灵动岛、交互系统、材质转换与全部代码均为本项目原创。

---

## 目录结构

```
.
├── index.html            # 入口与全部 DOM 结构
├── public/models         # VRM 角色模型
├── tools/shot.mjs        # Puppeteer 截图工具
├── src
│   ├── main.js           # 场景、灯光、图标、相机控制、主循环
│   ├── mascot.js         # VRM 加载、材质转换、骨骼动画
│   ├── interaction.js    # 对话气泡 / 投喂 / 算力 / 主动搭话
│   ├── island.js         # 灵动岛状态机
│   ├── panels.js         # 应用定义与面板渲染
│   └── style.css         # 全部样式
└── docs                  # 预览图
```

---

## License

MIT（代码部分）
