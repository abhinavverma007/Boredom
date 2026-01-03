// ===== SOUND ENGINE (No files, no copyright) =====
const AudioCtx = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioCtx();

function playTone(freq, duration = 0.15, type = "sine", volume = 0.15) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = type;
  osc.frequency.value = freq;

  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    audioCtx.currentTime + duration
  );

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}




const GRID_SIZE = 3;
const MIN = 1;
const MAX = 9;
const STORAGE_KEY = "number-smash-state";

let initialGrid = [];
let grid = [];
let score = 0;
let optimalScore = 0;

const gridEl = document.getElementById("grid");
const scoreEl = document.getElementById("score");

const resultModal = document.getElementById("resultModal");
const modalTitle = document.getElementById("modalTitle");
const modalMessage = document.getElementById("modalMessage");

const tryAgainBtn = document.getElementById("tryAgainBtn");
const nextLevelBtn = document.getElementById("nextLevelBtn");

const howToPlayModal = document.getElementById("howToPlayModal");
document.getElementById("howToPlay").onclick = () => {
  howToPlayModal.classList.remove("hidden");
};

function closeHowToPlay() {
  howToPlayModal.classList.add("hidden");
}

tryAgainBtn.onclick = replaySameGrid;
nextLevelBtn.onclick = startNewLevel;

/* ================= UTILS ================= */

function randomNumber() {
  return Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;
}

function colorForNumber(n) {
  return `hsl(${n * 40}, 80%, 55%)`;
}

/* ================= DP LOGIC ================= */

function computeOptimalScore(baseGrid) {
  const freq = Array(MAX + 1).fill(0);
  baseGrid.forEach(v => freq[v]++);

  const dp = Array(MAX + 1).fill(0);
  dp[0] = 0;
  dp[1] = freq[1];

  for (let i = 2; i <= MAX; i++) {
    dp[i] = Math.max(
      dp[i - 1],
      dp[i - 2] + freq[i] * i
    );
  }
  return dp[MAX];
}

/* ================= STORAGE ================= */

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    initialGrid,
    grid,
    score,
    optimalScore,
    levelCompleted: grid.every(v => v === null)
  }));
}


function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return false;

  const state = JSON.parse(saved);

  // 🔥 If level already completed, auto-advance
  if (state.levelCompleted === true) {
    return false;
  }

  initialGrid = state.initialGrid;
  grid = state.grid;
  score = state.score;
  optimalScore = state.optimalScore;

  return true;
}


/* ================= RENDER ================= */

function renderGrid() {
  gridEl.innerHTML = "";
  scoreEl.textContent = score;

  grid.forEach((value, i) => {
    if (value === null) {
      const empty = document.createElement("div");
      empty.className = "cell removed";
      gridEl.appendChild(empty);
      return;
    }

    const cell = document.createElement("div");
    cell.className = "cell";
    cell.textContent = value;
    cell.style.background = colorForNumber(value);
    cell.onclick = () => handleClick(value, i);
    gridEl.appendChild(cell);
  });
}

/* ================= GAME FLOW ================= */

function startNewLevel() {
  resultModal.classList.add("hidden");

  initialGrid = [];
  for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
    initialGrid.push(randomNumber());
  }

  grid = [...initialGrid];
  score = 0;
  optimalScore = computeOptimalScore(initialGrid);

  saveState();
  renderGrid();
}

function replaySameGrid() {
  resultModal.classList.add("hidden");

  grid = [...initialGrid];
  score = 0;

  saveState();
  renderGrid();
}

function handleClick(x) {
  let count = grid.filter(v => v === x).length;
  if (count === 0) return;

  playTone(440, 0.12, "triangle", 0.12);


  score += x * count;
  scoreEl.textContent = score;

  grid = grid.map(v =>
    v === x || v === x - 1 || v === x + 1 ? null : v
  );

  saveState();
  renderGrid();
  checkGameOver();
}

function checkGameOver() {
  if (grid.every(v => v === null)) {
    setTimeout(showResult, 300);
  }
}

function showResult() {
  const actions = document.querySelector(".modal-actions");

  if (score === optimalScore) {
        playTone(660, 0.18, "triangle", 0.18);

    modalTitle.textContent = "🎉 You Won!";
    modalMessage.textContent =
      "Yay! You played optimally.\nPerfect score achieved!";

    // Show only Next Level button
    tryAgainBtn.style.display = "none";
    nextLevelBtn.style.display = "inline-block";

    // Center align button
    actions.style.justifyContent = "center";
  } else {
        playTone(220, 0.35, "sine", 0.18);

    modalTitle.textContent = "📊 Game Over";
    modalMessage.textContent =
      "Your Score: " + score +
      "\nOptimal Score: " + optimalScore;

    // Show both buttons
    tryAgainBtn.style.display = "inline-block";
    nextLevelBtn.style.display = "none";

    // Normal spacing
    actions.style.display = "inline-block";
    actions.style.justifyContent = "space-between";
  }

  resultModal.classList.remove("hidden");
}

/* ================= INIT ================= */

if (!loadState()) {
  startNewLevel();
} else {
  renderGrid();
}
