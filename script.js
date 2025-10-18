// Reset game state
function resetGame() {
  gameActive = false;
  clearInterval(spawnInterval);
  clearInterval(timerInterval);
  currentCans = 0;
  timeLeft = 30;
  document.getElementById('current-cans').textContent = currentCans;
  document.getElementById('timer').textContent = timeLeft;
  document.getElementById('achievements').textContent = '';
  document.getElementById('achievements').className = 'achievement';
  createGrid();
}

// Set up click handler for the reset button
document.getElementById('reset-game').addEventListener('click', resetGame);
// Obstacle: Mud puddle
const OBSTACLE_CHANCE = 0.25; // 25% chance to spawn obstacle instead of can
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
const GOAL_CANS = 25;        // Total items needed to collect
let currentCans = 0;         // Current number of items collected
let gameActive = false;      // Tracks if game is currently running
let spawnInterval;          // Holds the interval for spawning items
let timerInterval;          // Holds the interval for the countdown timer
let timeLeft = 30;          // Time left in seconds

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

// Spawns a new item in a random grid cell
function spawnWaterCan() {
  if (!gameActive) return; // Stop if the game is not active
  const cells = document.querySelectorAll('.grid-cell');
  
  // Clear all cells before spawning a new water can
  cells.forEach(cell => (cell.innerHTML = ''));

  // Select a random cell from the grid to place the item
  const randomCell = cells[Math.floor(Math.random() * cells.length)];

  // Decide whether to spawn a can or an obstacle
  if (Math.random() < OBSTACLE_CHANCE) {
    // Spawn obstacle
    randomCell.innerHTML = `
      <div class="obstacle-wrapper">
        <div class="obstacle"></div>
      </div>
    `;
    const obstacle = randomCell.querySelector('.obstacle');
    if (obstacle) {
      obstacle.addEventListener('click', function handleObstacleClick(e) {
        if (!gameActive) return;
        if (currentCans > 0) currentCans--;
        document.getElementById('current-cans').textContent = currentCans;
        obstacle.style.pointerEvents = 'none';
      });
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
      can.addEventListener('click', function handleCanClick(e) {
        if (!gameActive) return;
        currentCans++;
        document.getElementById('current-cans').textContent = currentCans;
        // Prevent multiple clicks on the same can
        can.style.pointerEvents = 'none';
      });
    }
  }
}

// Initializes and starts a new game
function startGame() {
  if (gameActive) return; // Prevent starting a new game if one is already active
  gameActive = true;
  currentCans = 0;
  timeLeft = 30;
  document.getElementById('current-cans').textContent = currentCans;
  document.getElementById('timer').textContent = timeLeft;
  createGrid(); // Set up the game grid
  spawnInterval = setInterval(spawnWaterCan, 1000); // Spawn water cans every second
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
  if (currentCans >= 20) {
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
  } else {
    message = loseMessages[Math.floor(Math.random() * loseMessages.length)];
    achievement.className = 'achievement lose';
  }
  achievement.textContent = message;
}

// Set up click handler for the start button
document.getElementById('start-game').addEventListener('click', startGame);
