# 贪吃蛇（纯静态网页版）

这是一个可直接部署到 **GitHub Pages** 的贪吃蛇小游戏项目，使用纯 **HTML + CSS + JavaScript** 编写，无需 Node/npm、无第三方库、无 CDN 依赖。

## 功能特性

- Canvas 网格渲染（可选 20x20 / 25x25）
- 初始蛇长度为 3，默认向右移动
- 吃到食物：长度 +1，分数 +10
- 撞墙/撞自己判定 Game Over
- 禁止 180° 掉头
- 食物绝不生成在蛇身上
- 难度递增：每 50 分提升速度（有上限）
- 空格暂停/继续，R 重新开始
- 支持方向键 + WASD
- 支持移动端屏幕方向按钮
- 显示分数、最高分（localStorage 持久化）、速度档位
- 设置面板：网格大小、初始速度、穿墙模式
- WebAudio 纯代码音效（吃食物 / Game Over）

## 项目结构

```text
.
├── index.html
├── styles.css
├── main.js
└── README.md
```

## 本地运行

1. 克隆或下载本仓库。
2. 在项目根目录执行：

```bash
python -m http.server 8000
```

3. 浏览器访问：

```text
http://localhost:8000
```

## GitHub Pages 部署（Deploy from branch）

本项目采用 **main 分支 / root** 方式部署。

1. 将以上 4 个文件提交到 GitHub 仓库 `main` 分支根目录。
2. 打开仓库页面，进入 `Settings` → `Pages`。
3. 在 `Build and deployment` 中选择：
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/ (root)`
4. 保存后等待部署完成，访问生成的 Pages 链接即可。

## 操作说明

- **开始游戏**：点击“开始游戏”按钮（首次进入默认未开始）。
- **移动**：方向键或 WASD。
- **暂停/继续**：空格键。
- **重新开始**：R 键或“重新开始”按钮。
- **移动端**：点击屏幕下方方向按钮控制。

## 规则说明

1. 蛇初始长度 3，头部位于棋盘中部，初始方向向右。
2. 每吃到 1 个食物，蛇身 +1，分数 +10。
3. 关闭穿墙模式时：撞墙即失败；开启时可从另一侧穿出。
4. 任意模式下撞到自己都判定失败。
5. 游戏进行中不可直接应用新设置；修改设置会提示“需重新开始生效”。
6. 分数每达到 50 的倍数提升一次速度，且有最小步进间隔上限，保证可玩。

## 设置面板说明

- **网格大小**：20x20 / 25x25
- **初始速度**：慢 / 中 / 快
- **穿墙模式**：开 / 关（默认关）

> 设置在未开始状态下可直接生效；游戏中修改会提示需重新开始。

## 技术实现简述

- 使用 `requestAnimationFrame + accumulator(delta time)` 驱动循环
- 明确状态机：`IDLE / RUNNING / PAUSED / GAME_OVER`
- 核心函数：`resetGame`、`spawnFood`、`update`、`render`、`setSpeed`、`handleKeyDown`
- 画布随容器自适应并按网格取整，减少模糊并兼容手机屏幕

祝你玩得开心，欢迎继续扩展（例如关卡、主题皮肤、排行榜等）。
