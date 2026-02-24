(() => {
  const GAME_STATE = {
    IDLE: 'IDLE',
    RUNNING: 'RUNNING',
    PAUSED: 'PAUSED',
    GAME_OVER: 'GAME_OVER'
  };

  const SPEED_TIERS = [220, 180, 150, 130, 110, 95, 80];
  const MIN_STEP_MS = 55;
  const AUTO_SPEED_EVERY_SCORE = 50;
  const AUTO_SPEED_STEP = 8;

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const scoreEl = document.getElementById('score');
  const bestScoreEl = document.getElementById('bestScore');
  const speedTierEl = document.getElementById('speedTier');
  const stepMsEl = document.getElementById('stepMs');
  const beanModeTextEl = document.getElementById('beanModeText');
  const statusTextEl = document.getElementById('statusText');

  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayMessage = document.getElementById('overlayMessage');
  const overlayBtn = document.getElementById('overlayBtn');

  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const restartBtn = document.getElementById('restartBtn');

  const rowsInput = document.getElementById('rowsInput');
  const colsInput = document.getElementById('colsInput');
  const speedTierSelect = document.getElementById('speedTierSelect');
  const autoSpeedToggle = document.getElementById('autoSpeedToggle');
  const wallPassToggle = document.getElementById('wallPassToggle');
  const beanModeSelect = document.getElementById('beanModeSelect');
  const beansCountInput = document.getElementById('beansCountInput');
  const beansCountLabel = document.getElementById('beansCountLabel');
  const applySettingsBtn = document.getElementById('applySettingsBtn');

  const toastEl = document.getElementById('toast');
  const mobileControls = document.querySelector('.mobile-controls');

  let state = GAME_STATE.IDLE;
  let rows = 20;
  let cols = 20;
  let cellSize = 20;

  let snake = [];
  let direction = { x: 1, y: 0 };
  let queuedDirection = { x: 1, y: 0 };
  let beans = [];

  let score = 0;
  let bestScore = Number(localStorage.getItem('snakeBestScore') || 0);

  let speedTier = 4;
  let stepMs = SPEED_TIERS[speedTier - 1];

  let accumulator = 0;
  let lastTime = 0;

  const settings = {
    rows: 20,
    cols: 20,
    speedTier: 4,
    autoSpeed: true,
    wallPass: false,
    beanMode: 'single',
    beansCount: 3
  };

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
      toastEl.classList.remove('show');
    }, 1600);
  }

  function clampInt(v, min, max) {
    if (Number.isNaN(v)) return min;
    return Math.max(min, Math.min(max, Math.round(v)));
  }

  function syncBeanInputVisibility() {
    const isMulti = beanModeSelect.value === 'multi';
    beansCountLabel.classList.toggle('hidden', !isMulti);
  }

  function setStatus(text) {
    statusTextEl.textContent = text;
  }

  function setOverlay(show, title = '', message = '', buttonText = '开始游戏') {
    overlay.classList.toggle('show', show);
    overlayTitle.textContent = title;
    overlayMessage.textContent = message;
    overlayBtn.textContent = buttonText;
  }

  function playTone(freq, duration, type = 'sine', volume = 0.06) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    oscillator.type = type;
    oscillator.frequency.value = freq;
    gain.gain.value = volume;

    oscillator.connect(gain);
    gain.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
  }

  function refreshHUD() {
    scoreEl.textContent = String(score);
    bestScoreEl.textContent = String(bestScore);
    speedTierEl.textContent = String(speedTier);
    stepMsEl.textContent = String(stepMs);
    beanModeTextEl.textContent = settings.beanMode === 'single' ? '单豆' : `多豆（${settings.beansCount}）`;
  }

  function computeStepMs() {
    const base = SPEED_TIERS[speedTier - 1];
    if (!settings.autoSpeed) {
      stepMs = base;
      return;
    }
    const bonusLevel = Math.floor(score / AUTO_SPEED_EVERY_SCORE);
    stepMs = Math.max(base - bonusLevel * AUTO_SPEED_STEP, MIN_STEP_MS);
  }

  function setSpeedTier(nextTier, announce = false) {
    speedTier = clampInt(nextTier, 1, 7);
    speedTierSelect.value = String(speedTier);
    computeStepMs();
    refreshHUD();
    if (announce) {
      showToast(`速度档位已调整为 ${speedTier} 档（${stepMs}ms）`);
      playTone(720, 0.04, 'square', 0.04);
    }
  }

  function isReverse(next, current) {
    return next.x === -current.x && next.y === -current.y;
  }

  function applyCanvasSize() {
    const wrapWidth = canvas.parentElement.clientWidth - 28;
    const maxW = Math.min(760, wrapWidth);
    const maxH = Math.min(window.innerHeight * 0.7, maxW);

    const cellByWidth = Math.floor(maxW / cols);
    const cellByHeight = Math.floor(maxH / rows);
    cellSize = Math.max(8, Math.min(cellByWidth, cellByHeight));

    canvas.width = cols * cellSize;
    canvas.height = rows * cellSize;
    render();
  }

  function isCellOnSnake(x, y) {
    return snake.some((p) => p.x === x && p.y === y);
  }

  function isCellOnBeans(x, y) {
    return beans.some((b) => b.x === x && b.y === y);
  }

  function spawnOneBean() {
    const maxTries = rows * cols * 2;
    for (let i = 0; i < maxTries; i += 1) {
      const x = Math.floor(Math.random() * cols);
      const y = Math.floor(Math.random() * rows);
      if (!isCellOnSnake(x, y) && !isCellOnBeans(x, y)) {
        beans.push({ x, y });
        return true;
      }
    }
    return false;
  }

  function spawnBeans() {
    beans = [];
    const targetCount = settings.beanMode === 'single' ? 1 : settings.beansCount;
    while (beans.length < targetCount) {
      const ok = spawnOneBean();
      if (!ok) break;
    }
  }

  function resetGame() {
    rows = settings.rows;
    cols = settings.cols;

    const headX = Math.floor(cols / 2);
    const headY = Math.floor(rows / 2);
    snake = [
      { x: headX - 2, y: headY },
      { x: headX - 1, y: headY },
      { x: headX, y: headY }
    ];

    direction = { x: 1, y: 0 };
    queuedDirection = { x: 1, y: 0 };
    score = 0;
    accumulator = 0;

    setSpeedTier(settings.speedTier);
    spawnBeans();
    applyCanvasSize();
    refreshHUD();
    render();
  }

  function validateAndNormalizeInputs() {
    const rawRows = Number(rowsInput.value);
    const rawCols = Number(colsInput.value);
    const rawBeans = Number(beansCountInput.value);

    const fixedRows = clampInt(rawRows, 10, 60);
    const fixedCols = clampInt(rawCols, 10, 60);
    const fixedBeans = clampInt(rawBeans, 2, 10);

    if (fixedRows !== rawRows || fixedCols !== rawCols || fixedBeans !== rawBeans) {
      showToast('输入超出范围，已自动纠正。');
    }

    rowsInput.value = String(fixedRows);
    colsInput.value = String(fixedCols);
    beansCountInput.value = String(fixedBeans);

    return { rows: fixedRows, cols: fixedCols, beansCount: fixedBeans };
  }

  function applySettings() {
    const normalized = validateAndNormalizeInputs();
    const next = {
      rows: normalized.rows,
      cols: normalized.cols,
      speedTier: clampInt(Number(speedTierSelect.value), 1, 7),
      autoSpeed: autoSpeedToggle.checked,
      wallPass: wallPassToggle.checked,
      beanMode: beanModeSelect.value,
      beansCount: normalized.beansCount
    };

    const needsRestart =
      next.rows !== settings.rows ||
      next.cols !== settings.cols ||
      next.beanMode !== settings.beanMode ||
      next.beansCount !== settings.beansCount ||
      next.wallPass !== settings.wallPass;

    Object.assign(settings, next);

    // 速度允许立即生效（运行中也生效）
    setSpeedTier(settings.speedTier);

    if ((state === GAME_STATE.RUNNING || state === GAME_STATE.PAUSED) && needsRestart) {
      showToast('网格/豆子/穿墙设置需重新开始生效。');
      return;
    }

    if (state === GAME_STATE.IDLE || state === GAME_STATE.GAME_OVER) {
      resetGame();
      setStatus(state === GAME_STATE.IDLE ? '未开始' : '游戏结束');
      showToast('设置已应用。');
      return;
    }

    showToast('速度设置已即时生效。');
  }

  function onGameOver() {
    state = GAME_STATE.GAME_OVER;
    setStatus('游戏结束');

    let msg = `本局分数：${score}`;
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('snakeBestScore', String(bestScore));
      msg += '，恭喜刷新最高分！';
    }

    refreshHUD();
    playTone(190, 0.22, 'triangle', 0.08);
    setOverlay(true, 'Game Over', msg, '重新开始');
  }

  function update() {
    direction = queuedDirection;

    const nextHead = {
      x: snake[snake.length - 1].x + direction.x,
      y: snake[snake.length - 1].y + direction.y
    };

    if (settings.wallPass) {
      nextHead.x = (nextHead.x + cols) % cols;
      nextHead.y = (nextHead.y + rows) % rows;
    } else if (nextHead.x < 0 || nextHead.x >= cols || nextHead.y < 0 || nextHead.y >= rows) {
      onGameOver();
      return;
    }

    if (snake.some((part) => part.x === nextHead.x && part.y === nextHead.y)) {
      onGameOver();
      return;
    }

    snake.push(nextHead);

    const eatenIndex = beans.findIndex((b) => b.x === nextHead.x && b.y === nextHead.y);
    if (eatenIndex >= 0) {
      beans.splice(eatenIndex, 1);
      score += 10;
      playTone(560, 0.08, 'sine', 0.06);

      const ok = spawnOneBean();
      if (!ok) {
        // 地图快满了，允许继续但不强制报错。
      }

      computeStepMs();
      refreshHUD();
    } else {
      snake.shift();
    }
  }

  function renderGrid() {
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let r = 0; r <= rows; r += 1) {
      const y = r * cellSize + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    for (let c = 0; c <= cols; c += 1) {
      const x = c * cellSize + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
  }

  function render() {
    renderGrid();

    const pulse = (Math.sin(performance.now() / 180) + 1) * 0.5;
    beans.forEach((bean) => {
      const radius = cellSize * 0.32 + pulse * 1.4;
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc((bean.x + 0.5) * cellSize, (bean.y + 0.5) * cellSize, radius, 0, Math.PI * 2);
      ctx.fill();
    });

    snake.forEach((part, idx) => {
      const isHead = idx === snake.length - 1;
      ctx.fillStyle = isHead ? '#4ade80' : '#22c55e';
      ctx.fillRect(part.x * cellSize + 1, part.y * cellSize + 1, cellSize - 2, cellSize - 2);
    });
  }

  function gameLoop(ts) {
    if (!lastTime) lastTime = ts;
    const delta = ts - lastTime;
    lastTime = ts;

    if (state === GAME_STATE.RUNNING) {
      accumulator += delta;
      while (accumulator >= stepMs) {
        update();
        accumulator -= stepMs;
        if (state !== GAME_STATE.RUNNING) break;
      }
    }

    render();
    requestAnimationFrame(gameLoop);
  }

  function togglePause() {
    if (state === GAME_STATE.RUNNING) {
      state = GAME_STATE.PAUSED;
      setStatus('已暂停');
      setOverlay(true, '已暂停', '按空格或点击按钮继续。', '继续游戏');
      return;
    }
    if (state === GAME_STATE.PAUSED) {
      state = GAME_STATE.RUNNING;
      accumulator = 0;
      setStatus('进行中');
      setOverlay(false);
    }
  }

  function beginGame() {
    if (state === GAME_STATE.RUNNING) return;

    if (state === GAME_STATE.IDLE || state === GAME_STATE.GAME_OVER) {
      resetGame();
    }

    state = GAME_STATE.RUNNING;
    setStatus('进行中');
    setOverlay(false);
  }

  function restartToIdle() {
    resetGame();
    state = GAME_STATE.IDLE;
    setStatus('未开始');
    setOverlay(true, '准备开始', '点击开始游戏，或按空格开始。', '开始游戏');
  }

  function changeDirection(nextDir) {
    if (isReverse(nextDir, direction) || isReverse(nextDir, queuedDirection)) return;
    queuedDirection = nextDir;
  }

  function handleKeyboard(e) {
    const key = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' ', 'r', '+', '=', '-', '_'].includes(key)) {
      e.preventDefault();
    }

    if (key === 'arrowup' || key === 'w') changeDirection({ x: 0, y: -1 });
    if (key === 'arrowdown' || key === 's') changeDirection({ x: 0, y: 1 });
    if (key === 'arrowleft' || key === 'a') changeDirection({ x: -1, y: 0 });
    if (key === 'arrowright' || key === 'd') changeDirection({ x: 1, y: 0 });

    if (key === ' ') {
      if (state === GAME_STATE.IDLE) beginGame();
      else togglePause();
    }

    if (key === 'r') restartToIdle();

    if (key === '+' || key === '=') {
      setSpeedTier(speedTier + 1, true);
      settings.speedTier = speedTier;
    }

    if (key === '-' || key === '_') {
      setSpeedTier(speedTier - 1, true);
      settings.speedTier = speedTier;
    }
  }

  function handleTouch(e) {
    const btn = e.target.closest('button[data-dir]');
    if (!btn) return;
    const dir = btn.dataset.dir;
    if (dir === 'up') changeDirection({ x: 0, y: -1 });
    if (dir === 'down') changeDirection({ x: 0, y: 1 });
    if (dir === 'left') changeDirection({ x: -1, y: 0 });
    if (dir === 'right') changeDirection({ x: 1, y: 0 });
    playTone(680, 0.03, 'square', 0.03);
  }

  function initEvents() {
    startBtn.addEventListener('click', beginGame);
    pauseBtn.addEventListener('click', () => {
      if (state === GAME_STATE.IDLE) return;
      togglePause();
    });
    restartBtn.addEventListener('click', restartToIdle);

    overlayBtn.addEventListener('click', () => {
      if (state === GAME_STATE.PAUSED) togglePause();
      else beginGame();
    });

    applySettingsBtn.addEventListener('click', applySettings);

    beanModeSelect.addEventListener('change', () => {
      syncBeanInputVisibility();
      showToast('豆子模式已更新，点击“应用设置”生效。');
    });

    speedTierSelect.addEventListener('change', () => {
      const next = clampInt(Number(speedTierSelect.value), 1, 7);
      settings.speedTier = next;
      setSpeedTier(next, true);
    });

    window.addEventListener('keydown', handleKeyboard);
    window.addEventListener('resize', applyCanvasSize);
    mobileControls.addEventListener('click', handleTouch);
  }

  function boot() {
    bestScoreEl.textContent = String(bestScore);
    syncBeanInputVisibility();
    initEvents();

    resetGame();
    setStatus('未开始');
    setOverlay(true, '准备开始', '点击开始游戏，或按空格开始。', '开始游戏');
    refreshHUD();

    requestAnimationFrame(gameLoop);
  }

  boot();
})();
