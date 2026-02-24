# 贪吃蛇（纯静态网页 / GitHub Pages 可直接部署）

这是一个只使用 **HTML + CSS + JavaScript** 的贪吃蛇小游戏项目，无需 Node/npm、无打包工具、无 CDN 依赖。

## 项目结构

```text
.
├── index.html
├── styles.css
├── main.js
└── README.md
```

## 本地运行

1. 进入项目根目录。
2. 运行：

```bash
python -m http.server 8000
```

3. 浏览器打开：

```text
http://localhost:8000
```

## GitHub Pages 部署（main / root）

> 固定采用 **main 分支 + / (root)**。

1. 将 `index.html`、`styles.css`、`main.js`、`README.md` 提交到仓库 `main` 分支根目录。
2. 打开仓库 `Settings` → `Pages`。
3. `Source` 选择 `Deploy from a branch`。
4. `Branch` 选择 `main`，`Folder` 选择 `/ (root)`。
5. 保存后等待部署完成，访问生成的 Pages 地址。

## 操作说明

- 方向键 / WASD：移动
- 空格：暂停 / 继续
- R：重新开始（回到未开始状态）
- `+` / `=`：速度档位 +1（立刻生效）
- `-` / `_`：速度档位 -1（立刻生效）
- 移动端：页面底部方向按钮（上/下/左/右）

## 规则说明

1. 棋盘由 Canvas 网格渲染（非 div 网格）。
2. 初始蛇长度为 3，初始方向向右，蛇头位于棋盘中部。
3. 吃到豆子：蛇长 +1，分数 +10。
4. 撞墙或撞自己：Game Over，显示覆盖层与“重新开始”。
5. 禁止 180 度掉头。
6. 豆子不会生成在蛇身上；多豆模式下也不会与其它豆子重叠。
7. 速度支持“档位 + 自动提速”：
   - 档位共 7 档
   - 自动提速开启时，按分数每 50 分额外加速一次
   - 自动提速关闭时，仅按档位速度运行

## 设置面板说明

- rows（10-60）/ cols（10-60）
- 速度档位（1-7）
- 自动提速开关
- 穿墙模式开关（默认关）
- 豆子模式（单豆 / 多豆）
- beansCount（多豆时可设置，范围 2-10）
- 应用设置按钮

### 设置生效规则

- **网格大小、豆子模式/数量、穿墙模式**：需要重新开始后生效。
- **速度档位**：可立即生效（包括运行中）。
- rows/cols/beansCount 超出范围会自动纠正并 toast 提示。

## 技术实现要点

- 使用 `requestAnimationFrame + accumulator` 实现稳定步进更新。
- 状态机：`IDLE / RUNNING / PAUSED / GAME_OVER`。
- 主要函数：`resetGame`、`applySettings`、`spawnBeans`、`spawnOneBean`、`update`、`render`、`handleKeyboard`、`handleTouch`、`setSpeedTier`、`togglePause`。
- Canvas 按容器动态计算整数 `cellSize`，避免模糊并兼顾手机屏幕。
- 使用 WebAudio API 实现轻量音效（吃豆、死亡、调速提示）。
