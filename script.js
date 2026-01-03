const GRID_SIZE = 3;
const MIN = 1;
const MAX = 9;
const STORAGE_KEY = "number-smash-state";

let level = 1;
let initialGrid = [];
let grid = [];
let score = 0;
let optimalScore = 0;
let bestFirstMove = null;


const gridEl = document.getElementById("grid");
const scoreEl = document.getElementById("score");
const levelEl = document.getElementById("level");
const containerEl = document.querySelector(".container");
const modalActions = document.querySelector(".modal-actions");

const resultModal = document.getElementById("resultModal");
const modalTitle = document.getElementById("modalTitle");
const modalMessage = document.getElementById("modalMessage");
const tryAgainBtn = document.getElementById("tryAgainBtn");
const nextLevelBtn = document.getElementById("nextLevelBtn");

const confettiEl = document.getElementById("confetti");

document.getElementById("howToPlay").addEventListener("click", function (e) {
  e.preventDefault(); // ⬅️ critical
  howToPlayModal.classList.remove("hidden");
});

function closeHowToPlay() {
  howToPlayModal.classList.add("hidden");
}

/* ===== AUDIO ===== */
const AudioCtx = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioCtx();

function playTone(freq, duration, type = "triangle", volume = 0.15) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

/* ===== DP ===== */
function computeOptimalScore(baseGrid) {
  const freq = Array(MAX + 1).fill(0);
  baseGrid.forEach(v => freq[v]++);
  const dp = Array(MAX + 1).fill(0);
  dp[1] = freq[1];
  for (let i = 2; i <= MAX; i++) {
    dp[i] = Math.max(dp[i - 1], dp[i - 2] + freq[i] * i);
  }
  return dp[MAX];
}

function getBestFirstMove(baseGrid) {
  const uniqueValues = [...new Set(baseGrid)];
  let bestMove = null;
  let bestScore = -Infinity;

  for (let x of uniqueValues) {
    // Count x
    const countX = baseGrid.filter(v => v === x).length;
    if (countX === 0) continue;

    // First move score
    const firstScore = x * countX;

    // Simulate removal of x, x-1, x+1
    const remaining = baseGrid.filter(
      v => v !== x && v !== x - 1 && v !== x + 1
    );

    // Remaining optimal score
    const remainingScore =
      remaining.length > 0 ? computeOptimalScore(remaining) : 0;

    const totalScore = firstScore + remainingScore;

    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestMove = x;
    }
  }

  return bestMove;
}


/* ===== DIFFICULTY ===== */
function generateNumber() {
  if (level <= 3) return rand(1, 9);
  if (level <= 6) return weighted([2,3,4,5,6,7]);
  if (level <= 9) return weighted([5,6,7,8,9]);
  return weighted([6,7,8,9]);
}

function rand(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }
function weighted(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

/* ===== STORAGE ===== */
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    level, initialGrid, grid, score, optimalScore, bestFirstMove,
    completed: grid.every(v => v === null)
  }));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;

  const s = JSON.parse(raw);

  // 🔒 HARD GUARDS
  if (
    typeof s.level !== "number" ||
    !Array.isArray(s.initialGrid) ||
    !Array.isArray(s.grid)
  ) {
    return false;
  }

  // If level already completed, don't restore
  if (s.completed === true) return false;

  level = Number.isFinite(s.level) ? s.level : 1;
  initialGrid = s.initialGrid;
  grid = s.grid;
  score = typeof s.score === "number" ? s.score : 0;
  optimalScore = typeof s.optimalScore === "number"
    ? s.optimalScore
    : computeOptimalScore(initialGrid);
    bestFirstMove = s.bestFirstMove ?? getBestFirstMove(initialGrid);


  return true;
}


/* ===== GRID ===== */
function renderGrid() {
  gridEl.innerHTML = "";
  scoreEl.textContent = score;
  levelEl.textContent = level;

  grid.forEach(v => {
    const d = document.createElement("div");
    d.className = "cell" + (v === null ? " removed" : "");
    if (v !== null) {
      d.textContent = v;
      d.style.background = `hsl(${v*40},80%,55%)`;
      d.onclick = () => handleClick(v);
    }
    gridEl.appendChild(d);
  });
}

function startNewLevel() {
  level = Number.isFinite(level) ? level + 1 : 1;

  resultModal.classList.add("hidden");

  initialGrid = Array.from({ length: 9 }, generateNumber);
  grid = [...initialGrid];
  score = 0;
  optimalScore = computeOptimalScore(initialGrid);
  bestFirstMove = getBestFirstMove(initialGrid);


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

/* ===== GAME ===== */
function handleClick(x) {
  playTone(440,0.12);
  const count = grid.filter(v => v === x).length;
  score += x * count;
  const cells = document.querySelectorAll(".cell");

grid = grid.map((v, i) => {
  if (v === x) {
    cells[i].classList.add("clicked");
    return null;
  }
  if (v === x - 1 || v === x + 1) {
    cells[i].classList.add("faded");
    return null;
  }
  return v;
});
  saveState();
  renderGrid();
  if (grid.every(v=>v===null)) setTimeout(showResult,300);
}

function showResult() {
  if (score === optimalScore) {
    playTone(660,0.18); setTimeout(()=>playTone(880,0.18),200);
    celebrate();
    modalTitle.textContent="🎉 You Won!";
    modalMessage.textContent="Perfect play! Ready for the next level?";
    tryAgainBtn.style.display="none";
    nextLevelBtn.style.display="inline-block";
  } else {
    containerEl.classList.add("shake");
setTimeout(() => containerEl.classList.remove("shake"), 400);

    playTone(220,0.35,"sine",0.18);
    modalTitle.textContent="📊 Game Over";
modalMessage.textContent =
  "Your Score: " + score +
  "\nOptimal Score: " + optimalScore;
    tryAgainBtn.style.display="inline-block";
    nextLevelBtn.style.display="none";
    modalActions.style.display="inline";
  }
  resultModal.classList.remove("hidden");
}

function celebrate() {
  containerEl.classList.add("win");
  for (let i=0;i<40;i++){
    const c=document.createElement("div");
    c.className="confetti-piece";
    c.style.left=Math.random()*100+"%";
    c.style.background=`hsl(${Math.random()*360},80%,60%)`;
    confettiEl.appendChild(c);
    setTimeout(()=>c.remove(),1500);
  }
  setTimeout(()=>containerEl.classList.remove("win"),600);
}

/* ===== INIT ===== */
tryAgainBtn.onclick=replaySameGrid;
nextLevelBtn.onclick=startNewLevel;

if (!loadState()) {
  level = 1;
  initialGrid = Array.from({length:9}, generateNumber);
  grid = [...initialGrid];
  optimalScore = computeOptimalScore(initialGrid);

}
renderGrid();
