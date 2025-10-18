// Reset game state
function resetGame() {
  gameActive = false;
  clearInterval(spawnInterval);
  clearInterval(timerInterval);
  currentCans = 0;
  timeLeft = defaultTime;
  document.getElementById('current-cans').textContent = currentCans;
  document.getElementById('timer').textContent = timeLeft;
  document.getElementById('achievements').textContent = '';
  document.getElementById('achievements').className = 'achievement';
  // reflect difficulty and goal in UI
  const diffEl = document.getElementById('difficulty-label');
  if (diffEl) diffEl.textContent = currentDifficulty;
  const goalEl = document.getElementById('goal-cans');
  if (goalEl) goalEl.textContent = goalCans;
  createGrid();
}

// Obstacle: Mud puddle
// (moved to configurable difficulty below)
// const OBSTACLE_CHANCE = 0.25; // 25% chance to spawn obstacle instead of can

// Winning and losing messages
const winMessages = [
  "Amazing! You brought water to the village!",
  "Incredible speed! You're a Water Hero!",
  "You did it! Every drop counts!",
  "Victory! Clean water for all!"
];
const loseMessages = [
  "Try again! The village needs more water!",
  "So close! Give it another shot!",
  "Don't give up! Every can helps!",
  "Keep going! The world needs you!"
];
// Game configuration and state variables
// Replace single GOAL_CANS with configurable difficulty object
const DIFFICULTIES = {
  Easy:   { goal: 15, time: 40, spawnMs: 1200, obstacleChance: 0.10 },
  Normal: { goal: 25, time: 30, spawnMs: 1000, obstacleChance: 0.25 },
  Hard:   { goal: 35, time: 20, spawnMs: 800,  obstacleChance: 0.35 }
};

let currentDifficulty = 'Normal';
let goalCans = DIFFICULTIES[currentDifficulty].goal;
let spawnRateMs = DIFFICULTIES[currentDifficulty].spawnMs;
let obstacleChance = DIFFICULTIES[currentDifficulty].obstacleChance;
let defaultTime = DIFFICULTIES[currentDifficulty].time;

let currentCans = 0;         // Current number of items collected
let gameActive = false;      // Tracks if game is currently running
let spawnInterval;           // Holds the interval for spawning items
let timerInterval;           // Holds the interval for the countdown timer
let timeLeft = defaultTime;  // Time left in seconds
// Milestones
let milestones = [];
let triggeredMilestones = new Set();

function setMilestones() {
  milestones = [];
  triggeredMilestones.clear();
  if (!goalCans || goalCans <= 0) return;
  const unique = new Set();
  const quarter = Math.max(1, Math.ceil(goalCans * 0.25));
  const half = Math.max(1, Math.ceil(goalCans * 0.5));
  const threeQuarter = Math.max(1, Math.ceil(goalCans * 0.75));
  const full = goalCans;
  // push in order
  [{t: quarter, m: 'Nice start!'}, {t: half, m: 'Halfway there!'}, {t: threeQuarter, m: 'Almost there!'}, {t: full, m: 'Goal reached!'}].forEach(it => {
    if (!unique.has(it.t)) {
      unique.add(it.t);
      milestones.push({ threshold: it.t, message: it.m });
    }
  });
}

function showMilestone(msg) {
  const achievement = document.getElementById('achievements');
  if (!achievement) return;
  // Don't override persistent win/lose messages
  achievement.textContent = msg;
  achievement.className = 'achievement milestone';
  // Clear after 2.5s only if still a milestone message
  setTimeout(() => {
    if (achievement.className === 'achievement milestone') {
      achievement.textContent = '';
      achievement.className = 'achievement';
    }
  }, 2500);
}

function checkMilestones() {
  for (const m of milestones) {
    if (currentCans >= m.threshold && !triggeredMilestones.has(m.threshold)) {
      triggeredMilestones.add(m.threshold);
      showMilestone(m.message);
    }
  }
}
// Sound manager to centralize audio playback and mute state
const SoundManager = {
  muted: false,
  init() {
    const saved = localStorage.getItem('cw_game_muted');
    this.muted = saved === '1';
    this.collect = document.getElementById('collect-sound');
    this.hit = document.getElementById('hit-sound');
    this.miss = document.getElementById('miss-sound');
    this.click = document.getElementById('click-sound');
    this.win = document.getElementById('win-sound');
  },
  play(el) {
    if (this.muted || !el) return;
    try { el.currentTime = 0; el.play(); } catch (err) { /* ignore */ }
  },
  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('cw_game_muted', this.muted ? '1' : '0');
    const btn = document.getElementById('mute-toggle');
    if (btn) btn.textContent = this.muted ? '🔈' : '🔊';
  }
};

// Creates the 3x3 game grid where items will appear
function createGrid() {
  const grid = document.querySelector('.game-grid');
  grid.innerHTML = ''; // Clear any existing grid cells
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.className = 'grid-cell'; // Each cell represents a grid square
    grid.appendChild(cell);
  }
}

// Ensure the grid is created when the page loads
createGrid();

// New: apply difficulty selection
function applyDifficulty(name) {
  if (!DIFFICULTIES[name]) return;
  currentDifficulty = name;
  goalCans = DIFFICULTIES[name].goal;
  spawnRateMs = DIFFICULTIES[name].spawnMs;
  obstacleChance = DIFFICULTIES[name].obstacleChance;
  defaultTime = DIFFICULTIES[name].time;
  // update displayed values if the page contains these elements
  const diffEl = document.getElementById('difficulty-label');
  if (diffEl) diffEl.textContent = name;
  const goalEl = document.getElementById('goal-cans');
  if (goalEl) goalEl.textContent = goalCans;
  // if a game is not active, reflect the new default timer immediately
  if (!gameActive) {
    timeLeft = defaultTime;
    document.getElementById('timer').textContent = timeLeft;
  }
  // recompute milestones for the selected difficulty
  setMilestones();
}

// Hook up difficulty input if present (select with id="difficulty" or radio inputs name="difficulty")
const difficultySelect = document.getElementById('difficulty');
if (difficultySelect) {
  difficultySelect.value = currentDifficulty;
  difficultySelect.addEventListener('change', (e) => {
    const name = e.target.value;
    applyDifficulty(name);
    // If a game is currently running, update the spawn interval to match the new difficulty
    if (gameActive) {
      clearInterval(spawnInterval);
      spawnInterval = setInterval(spawnWaterCan, spawnRateMs);
    }
  });
} else {
  const radios = document.querySelectorAll('input[name="difficulty"]');
  radios.forEach(r => {
    if (r.value === currentDifficulty) r.checked = true;
    r.addEventListener('change', (e) => {
      if (e.target.checked) {
        applyDifficulty(e.target.value);
        if (gameActive) {
          clearInterval(spawnInterval);
          spawnInterval = setInterval(spawnWaterCan, spawnRateMs);
        }
      }
    });
  });
}

// Spawns a new item in a random grid cell
function spawnWaterCan() {
  if (!gameActive) return; // Stop if the game is not active
  const cells = document.querySelectorAll('.grid-cell');
  
  // If a can was present and is being cleared, that's a miss — play miss sound and register a strike
  for (const cell of cells) {
    const existingCan = cell.querySelector('.water-can');
    if (existingCan && existingCan.dataset.collected !== '1') {
      SoundManager.play(SoundManager.miss);
      // animate miss then remove the can
      existingCan.classList.add('missed');
      existingCan.addEventListener('animationend', () => {
        if (cell) cell.innerHTML = '';
      }, { once: true });
    } else {
      cell.innerHTML = '';
    }
  }

  // Select a random cell from the grid to place the item
  const randomCell = cells[Math.floor(Math.random() * cells.length)];

  // Decide whether to spawn a can or an obstacle (uses difficulty obstacleChance)
  if (Math.random() < obstacleChance) {
    // Spawn obstacle
    randomCell.innerHTML = `
      <div class="obstacle-wrapper">
        <div class="obstacle"></div>
      </div>
    `;
    const obstacle = randomCell.querySelector('.obstacle');
  if (obstacle) {
      // Remove the obstacle when clicked and apply penalty
      obstacle.addEventListener('click', function handleObstacleClick(e) {
        if (!gameActive) return;
        // Play hit sound if available
        SoundManager.play(SoundManager.hit);
  // Apply penalty: reduce cans if any
  if (currentCans > 0) currentCans--;
  document.getElementById('current-cans').textContent = currentCans;
        // Animate then remove the obstacle from the grid so it can't be clicked again
        const cell = obstacle.closest('.grid-cell');
        if (obstacle) {
          obstacle.classList.add('hit');
          obstacle.addEventListener('animationend', () => {
            if (cell) cell.innerHTML = '';
          }, { once: true });
        } else if (cell) {
          cell.innerHTML = '';
        }
        // no health mechanic — only penalty is losing a can
      }, { once: true });
    }
  } else {
    // Spawn water can
    randomCell.innerHTML = `
      <div class="water-can-wrapper">
        <div class="water-can"></div>
      </div>
    `;
    // Add click event to the water can
    const can = randomCell.querySelector('.water-can');
    if (can) {
      // When a can is clicked, mark it collected to avoid being counted as a miss,
      // increment the count, play sound, animate and remove it.
      can.addEventListener('click', function handleCanClick(e) {
        if (!gameActive) return;
        // mark as collected so spawnWaterCan won't treat it as a miss
        can.dataset.collected = '1';
        // Play collect sound if available
        SoundManager.play(SoundManager.collect);
        currentCans++;
        document.getElementById('current-cans').textContent = currentCans;
        // Animate then remove the can from the grid so it's visually gone
        const cell = can.closest('.grid-cell');
        if (can) {
          can.classList.add('collected');
          can.addEventListener('animationend', () => {
            if (cell) cell.innerHTML = '';
          }, { once: true });
        } else if (cell) {
          cell.innerHTML = '';
        }
        // Check milestones and win
        checkMilestones();
        if (currentCans >= goalCans) {
          endGame();
        }
      }, { once: true });
    }
  }
}

// (Health/lives feature removed)

// Initializes and starts a new game
function startGame() {
  if (gameActive) return; // Prevent starting a new game if one is already active
  gameActive = true;
  currentCans = 0;
  timeLeft = defaultTime;
  document.getElementById('current-cans').textContent = currentCans;
  document.getElementById('timer').textContent = timeLeft;
  // update UI labels for difficulty/goal
  const diffEl = document.getElementById('difficulty-label');
  if (diffEl) diffEl.textContent = currentDifficulty;
  const goalEl = document.getElementById('goal-cans');
  if (goalEl) goalEl.textContent = goalCans;
  // reset strikes and update lives
  // compute milestones for this game
  setMilestones();
  createGrid(); // Set up the game grid
  clearInterval(spawnInterval); // ensure no duplicate intervals
  spawnInterval = setInterval(spawnWaterCan, spawnRateMs); // spawn rate depends on difficulty
  timerInterval = setInterval(() => {
    if (!gameActive) return;
    timeLeft--;
    document.getElementById('timer').textContent = timeLeft;
    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);
}

function endGame() {
  gameActive = false; // Mark the game as inactive
  clearInterval(spawnInterval); // Stop spawning water cans
  clearInterval(timerInterval); // Stop the timer

  // Show win/lose message
  const achievement = document.getElementById('achievements');
  let message = '';
  // Win threshold uses current difficulty's goalCans
  if (currentCans >= goalCans) {
    message = winMessages[Math.floor(Math.random() * winMessages.length)];
    achievement.className = 'achievement win';
    // Confetti effect
    if (window.confetti) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    }
    // Play win sound if available
    const winAudio = document.getElementById('win-sound');
    if (winAudio) { try { winAudio.currentTime = 0; winAudio.play(); } catch (err) { } }
  } else {
    message = loseMessages[Math.floor(Math.random() * loseMessages.length)];
    achievement.className = 'achievement lose';
  }
  achievement.textContent = message;
}

// Set up click handler for the start button (play click sound)
const startBtn = document.getElementById('start-game');
if (startBtn) startBtn.addEventListener('click', function (e) {
  SoundManager.play(SoundManager.click);
  startGame();
});

// Set up click handler for the reset button (play click sound)
const resetBtn = document.getElementById('reset-game');
if (resetBtn) resetBtn.addEventListener('click', function (e) {
  SoundManager.play(SoundManager.click);
  resetGame();
});

// Apply initial difficulty so UI reflects defaults
applyDifficulty(currentDifficulty);

// Initialize sound manager and mute button state
SoundManager.init();
const muteBtn = document.getElementById('mute-toggle');
if (muteBtn) {
  muteBtn.textContent = SoundManager.muted ? '🔈' : '🔊';
  muteBtn.addEventListener('click', () => SoundManager.toggleMute());
}
