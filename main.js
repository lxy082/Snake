(() => {
  const GAME_STATE = {
    IDLE: 'IDLE',
    RUNNING: 'RUNNING',
    PAUSED: 'PAUSED',
    GAME_OVER: 'GAME_OVER'
  };

  const SPEED_PRESETS = {
    slow: 220,
    medium: 170,
    fast: 130
  };

  const SPEED_UP_EVERY_SCORE = 50;
  const SPEED_STEP = 12;
  const MIN_STEP_MS = 70;

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const scoreEl = document.getElementById('score');
  const bestScoreEl = document.getElementById('bestScore');
  const speedLevelEl = document.getElementById('speedLevel');
  const statusTextEl = document.getElementById('statusText');

  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayMessage = document.getElementById('overlayMessage');
  const overlayButton = document.getElementById('overlayButton');

  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const restartBtn = document.getElementById('restartBtn');

  const gridSizeSelect = document.getElementById('gridSizeSelect');
  const speedSelect = document.getElementById('speedSelect');
  const wallModeToggle = document.getElementById('wallModeToggle');

  const mobileControls = document.querySelector('.mobile-controls');

  let gridSize = 20;
  let cellSize = 25;
  let state = GAME_STATE.IDLE;
  let snake = [];
  let direction = { x: 1, y: 0 };
  let queuedDirection = { x: 1, y: 0 };
  let food = { x: 0, y: 0 };
  let score = 0;
  let bestScore = Number(localStorage.getItem('snakeBestScore') || 0);
  let baseStepMs = SPEED_PRESETS.medium;
  let stepMs = baseStepMs;
  let accumulator = 0;
  let lastTime = 0;
  let wallPassMode = false;

  bestScoreEl.textContent = String(bestScore);

  function applyCanvasSize() {
    const cardWidth = canvas.parentElement.clientWidth - 24;
    const target = Math.max(280, Math.min(cardWidth, 560));
    const clamped = Math.floor(target / gridSize) * gridSize;
    canvas.width = clamped;
    canvas.height = clamped;
    cellSize = clamped / gridSize;
    render();
  }

  function isReverse(next, current) {
    return next.x === -current.x && next.y === -current.y;
  }

  function setStatus(text) {
    statusTextEl.textContent = text;
  }

  function setOverlay(show, title = '', message = '', buttonText = '开始游戏') {
    overlay.classList.toggle('show', show);
    overlayTitle.textContent = title;
    overlayMessage.textContent = message;
    overlayButton.textContent = buttonText;
  }

  function updateHUD() {
    scoreEl.textContent = String(score);
    const level = Math.floor((baseStepMs - stepMs) / SPEED_STEP) + 1;
    speedLevelEl.textContent = `${level}（${stepMs}ms/步）`;
  }

  function playTone(freq, duration, type = 'sine', volume = 0.08) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const audioCtx = new AudioCtx();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  }

  function setSpeed() {
    const bonusLevel = Math.floor(score / SPEED_UP_EVERY_SCORE);
    stepMs = Math.max(baseStepMs - bonusLevel * SPEED_STEP, MIN_STEP_MS);
    updateHUD();
  }

  function spawnFood() {
    let x;
    let y;
    do {
      x = Math.floor(Math.random() * gridSize);
      y = Math.floor(Math.random() * gridSize);
    } while (snake.some((part) => part.x === x && part.y === y));
    food = { x, y };
  }

  function resetGame(useCurrentSettings = true) {
    if (useCurrentSettings) {
      gridSize = Number(gridSizeSelect.value);
      baseStepMs = SPEED_PRESETS[speedSelect.value];
      wallPassMode = wallModeToggle.checked;
    }

    const cx = Math.floor(gridSize / 2);
    const cy = Math.floor(gridSize / 2);
    snake = [
      { x: cx - 2, y: cy },
      { x: cx - 1, y: cy },
      { x: cx, y: cy }
    ];

    direction = { x: 1, y: 0 };
    queuedDirection = { x: 1, y: 0 };
    score = 0;
    accumulator = 0;
    stepMs = baseStepMs;

    spawnFood();
    applyCanvasSize();
    updateHUD();
    render();
  }

  function lockSettingsIfRunning() {
    if (state === GAME_STATE.RUNNING || state === GAME_STATE.PAUSED) {
      alert('设置需重新开始生效。');
      return true;
    }
    return false;
  }

  function onGameOver() {
    state = GAME_STATE.GAME_OVER;
    setStatus('游戏结束');

    let msg = `本局得分：${score}`;
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('snakeBestScore', String(bestScore));
      bestScoreEl.textContent = String(bestScore);
      msg += '，恭喜你打破最高分！';
    }

    playTone(180, 0.22, 'triangle', 0.1);

    setOverlay(true, 'Game Over', msg, '重新开始');
  }

  function update() {
    direction = queuedDirection;
    const nextHead = {
      x: snake[snake.length - 1].x + direction.x,
      y: snake[snake.length - 1].y + direction.y
    };

    if (wallPassMode) {
      nextHead.x = (nextHead.x + gridSize) % gridSize;
      nextHead.y = (nextHead.y + gridSize) % gridSize;
    } else {
      if (nextHead.x < 0 || nextHead.x >= gridSize || nextHead.y < 0 || nextHead.y >= gridSize) {
        onGameOver();
        return;
      }
    }

    if (snake.some((part) => part.x === nextHead.x && part.y === nextHead.y)) {
      onGameOver();
      return;
    }

    snake.push(nextHead);

    if (nextHead.x === food.x && nextHead.y === food.y) {
      score += 10;
      playTone(560, 0.08, 'sine', 0.07);
      spawnFood();
      setSpeed();
    } else {
      snake.shift();
    }

    updateHUD();
  }

  function renderGrid() {
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;

    for (let i = 0; i <= gridSize; i += 1) {
      const p = i * cellSize + 0.5;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, canvas.height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(canvas.width, p);
      ctx.stroke();
    }
  }

  function render() {
    renderGrid();

    const blink = (Math.sin(performance.now() / 180) + 1) * 0.5;
    const foodRadius = (cellSize * 0.35) + blink * 1.6;

    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc((food.x + 0.5) * cellSize, (food.y + 0.5) * cellSize, foodRadius, 0, Math.PI * 2);
    ctx.fill();

    snake.forEach((part, i) => {
      const isHead = i === snake.length - 1;
      ctx.fillStyle = isHead ? '#4ade80' : '#22c55e';
      ctx.fillRect(part.x * cellSize + 1, part.y * cellSize + 1, cellSize - 2, cellSize - 2);
    });
  }

  function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const delta = timestamp - lastTime;
    lastTime = timestamp;

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

  function beginGame() {
    if (state === GAME_STATE.RUNNING) return;

    if (state === GAME_STATE.GAME_OVER || state === GAME_STATE.IDLE) {
      resetGame(true);
    }

    state = GAME_STATE.RUNNING;
    setStatus('进行中');
    setOverlay(false);
  }

  function togglePause() {
    if (state === GAME_STATE.RUNNING) {
      state = GAME_STATE.PAUSED;
      setStatus('已暂停');
      setOverlay(true, '已暂停', '按空格或点击“暂停”继续游戏。', '继续游戏');
    } else if (state === GAME_STATE.PAUSED) {
      state = GAME_STATE.RUNNING;
      setStatus('进行中');
      setOverlay(false);
    }
  }

  function restartGame() {
    resetGame(true);
    state = GAME_STATE.IDLE;
    setStatus('未开始');
    setOverlay(true, '准备开始', '点击“开始游戏”后开始移动。', '开始游戏');
  }

  function changeDirection(nextDir) {
    if (isReverse(nextDir, direction) || isReverse(nextDir, queuedDirection)) return;
    queuedDirection = nextDir;
  }

  function handleKeyDown(e) {
    const key = e.key.toLowerCase();

    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'w', 'a', 's', 'd', 'r'].includes(key)) {
      e.preventDefault();
    }

    if (key === 'arrowup' || key === 'w') changeDirection({ x: 0, y: -1 });
    if (key === 'arrowdown' || key === 's') changeDirection({ x: 0, y: 1 });
    if (key === 'arrowleft' || key === 'a') changeDirection({ x: -1, y: 0 });
    if (key === 'arrowright' || key === 'd') changeDirection({ x: 1, y: 0 });

    if (key === ' ') {
      if (state === GAME_STATE.IDLE) {
        beginGame();
      } else {
        togglePause();
      }
    }

    if (key === 'r') {
      restartGame();
    }
  }

  startBtn.addEventListener('click', beginGame);
  pauseBtn.addEventListener('click', () => {
    if (state === GAME_STATE.IDLE) return;
    togglePause();
  });
  restartBtn.addEventListener('click', restartGame);
  overlayButton.addEventListener('click', () => {
    if (state === GAME_STATE.PAUSED) {
      togglePause();
    } else {
      beginGame();
    }
  });

  [gridSizeSelect, speedSelect, wallModeToggle].forEach((el) => {
    el.addEventListener('change', () => {
      if (lockSettingsIfRunning()) {
        gridSizeSelect.value = String(gridSize);
        speedSelect.value = Object.keys(SPEED_PRESETS).find((k) => SPEED_PRESETS[k] === baseStepMs) || 'medium';
        wallModeToggle.checked = wallPassMode;
        return;
      }
      resetGame(true);
      state = GAME_STATE.IDLE;
      setStatus('未开始');
      setOverlay(true, '准备开始', '设置已更新，点击开始游戏。', '开始游戏');
    });
  });

  mobileControls.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-dir]');
    if (!btn) return;
    const dir = btn.dataset.dir;
    if (dir === 'up') changeDirection({ x: 0, y: -1 });
    if (dir === 'down') changeDirection({ x: 0, y: 1 });
    if (dir === 'left') changeDirection({ x: -1, y: 0 });
    if (dir === 'right') changeDirection({ x: 1, y: 0 });
  });

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('resize', applyCanvasSize);

  resetGame(true);
  setOverlay(true, '准备开始', '点击“开始游戏”后开始移动。', '开始游戏');
  setStatus('未开始');
  requestAnimationFrame(gameLoop);
})();
