// Supabase Configuration
const SUPABASE_URL = 'https://xvdeijzqjumkvchxabwc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2ZGVpanpxanVta3ZjaHhhYndjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwODMwMzEsImV4cCI6MjA2ODY1OTAzMX0.kf6fCNd4n2sVcb06qyHo9zJ_7lRxMUZgryaGbp2mDJ8';

// Initialize Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Game State Variables
let ball, player, ai;
let playerScore = 0, aiScore = 0;
let isGameOver = false;
let currentLevel = 1;
let previousLevel = 1;
let aiSpeed = 2, maxPoints = 5;
let running = false;
let isGuest = false;
let username = "";
let user = null;
let deviceType = 'desktop';
let os = 'unknown';
let moveUp = false, moveDown = false;

// DOM Elements
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const playerScoreEl = document.getElementById('playerScore');
const aiScoreEl = document.getElementById('aiScore');
const levelDisplay = document.getElementById('levelDisplay');
const maxPointsEl = document.getElementById('maxPoints');
const gameOverMsg = document.getElementById('gameOverMsg');
const startGameBtn = document.getElementById('startGameBtn');
const resetLevelBtn = document.getElementById('resetLevelBtn');
const prevLevelBtn = document.getElementById('prevLevelBtn');
const upBtn = document.getElementById('upBtn');
const downBtn = document.getElementById('downBtn');
const authModal = document.getElementById('authModal');
const offlineUsernameModal = document.getElementById('offlineUsernameModal');
const gameContainer = document.getElementById('gameContainer');
const userBar = document.getElementById('userBar');
const onlineStatus = document.getElementById('onlineStatus');
const leaderboardBtn = document.getElementById('leaderboardBtn');

// Initialize Game
function initGame() {
  resizeCanvas();
  if (deviceType === 'mobile' || deviceType === 'tablet') {
    document.getElementById('mobileControls').style.display = 'flex';
  }
}

// Resize Canvas
function resizeCanvas() {
  const maxHeight = window.innerHeight * 0.8;
  const ratio = 16/9;
  const width = maxHeight * ratio;
  const height = maxHeight;
  
  const maxWidth = window.innerWidth * 0.95;
  if (width > maxWidth) {
    canvas.width = maxWidth;
    canvas.height = maxWidth / ratio;
  } else {
    canvas.width = width;
    canvas.height = height;
  }
  
  if (running) initGameObjects();
}

// Initialize Game Objects
function initGameObjects() {
  ball = {
    x: canvas.width/2,
    y: canvas.height/2,
    vx: canvas.width * 0.005 * (Math.random() > 0.5 ? 1 : -1),
    vy: canvas.height * 0.005 * (Math.random() * 2 - 1),
    size: canvas.width * 0.015
  };
  
  player = {
    x: canvas.width * 0.02,
    y: canvas.height/2 - canvas.height * 0.1,
    w: canvas.width * 0.015,
    h: canvas.height * 0.2,
    speed: canvas.height * 0.015
  };
  
  ai = {
    x: canvas.width - canvas.width * 0.03,
    y: canvas.height/2 - canvas.height * 0.1,
    w: canvas.width * 0.015,
    h: canvas.height * 0.2,
    speed: canvas.height * (0.005 * aiSpeed)
  };
}

// Start Game
function startGame() {
  playerScore = 0;
  aiScore = 0;
  isGameOver = false;
  gameOverMsg.textContent = "";
  startGameBtn.style.display = 'none';
  initGameObjects();
  running = true;
  updateScore();
  gameLoop();
}

// Game Loop
function gameLoop() {
  if (!running) return;
  
  if (moveUp) player.y -= player.speed;
  if (moveDown) player.y += player.speed;
  player.y = Math.max(0, Math.min(player.y, canvas.height - player.h));
  
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// Update Game State
function update() {
  ball.x += ball.vx;
  ball.y += ball.vy;
  
  if (ball.y < ball.size || ball.y > canvas.height - ball.size) {
    ball.vy *= -1;
  }
  
  if (ball.x - ball.size < player.x + player.w && 
      ball.y > player.y && ball.y < player.y + player.h) {
    ball.vx = Math.abs(ball.vx) * 1.05;
    const hitPos = (ball.y - (player.y + player.h/2)) / (player.h/2);
    ball.vy = hitPos * 5;
  }
  
  if (ball.x + ball.size > ai.x && 
      ball.y > ai.y && ball.y < ai.y + ai.h) {
    ball.vx = -Math.abs(ball.vx) * 1.05;
    const hitPos = (ball.y - (ai.y + ai.h/2)) / (ai.h/2);
    ball.vy = hitPos * 5;
  }
  
  if (ball.x < 0) {
    aiScore++;
    resetBall(false);
  }
  
  if (ball.x > canvas.width) {
    playerScore++;
    resetBall(true);
  }
  
  const aiCenter = ai.y + ai.h/2;
  if (aiCenter < ball.y - 10) {
    ai.y += ai.speed;
  } else if (aiCenter > ball.y + 10) {
    ai.y -= ai.speed;
  }
  ai.y = Math.max(0, Math.min(ai.y, canvas.height - ai.h));
  
  if (playerScore >= maxPoints) {
    endGame(true);
  } else if (aiScore >= maxPoints) {
    endGame(false);
  }
}

// Draw Game
function draw() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 20; i < canvas.height; i += 40) {
    ctx.moveTo(canvas.width/2, i);
    ctx.lineTo(canvas.width/2, i + 20);
  }
  ctx.stroke();
  
  const ballGradient = ctx.createRadialGradient(
    ball.x, ball.y, 0,
    ball.x, ball.y, ball.size
  );
  ballGradient.addColorStop(0, '#fd79a8');
  ballGradient.addColorStop(1, '#e84393');
  ctx.fillStyle = ballGradient;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.size, 0, Math.PI * 2);
  ctx.fill();
  
  const playerGradient = ctx.createLinearGradient(
    player.x, 0, player.x + player.w, 0
  );
  playerGradient.addColorStop(0, '#00b894');
  playerGradient.addColorStop(1, '#55efc4');
  ctx.fillStyle = playerGradient;
  ctx.fillRect(player.x, player.y, player.w, player.h);
  
  const aiGradient = ctx.createLinearGradient(
    ai.x, 0, ai.x + ai.w, 0
  );
  aiGradient.addColorStop(0, '#d63031');
  aiGradient.addColorStop(1, '#ff7675');
  ctx.fillStyle = aiGradient;
  ctx.fillRect(ai.x, ai.y, ai.w, ai.h);
}

// Reset Ball
function resetBall(playerScored) {
  ball.x = canvas.width/2;
  ball.y = canvas.height/2;
  ball.vx = playerScored ? -Math.abs(canvas.width * 0.005) : Math.abs(canvas.width * 0.005);
  ball.vy = (Math.random() * 2 - 1) * canvas.height * 0.005;
  updateScore();
}

// Update Score
function updateScore() {
  playerScoreEl.textContent = playerScore;
  aiScoreEl.textContent = aiScore;
}

// Update Level Info
function updateLevelInfo() {
  levelDisplay.textContent = currentLevel;
  maxPointsEl.textContent = maxPoints;
}

// End Game
function endGame(won) {
  running = false;
  isGameOver = true;
  
  if (won) {
    gameOverMsg.innerHTML = `<i class="fas fa-trophy"></i> You won Level ${currentLevel}!`;
    previousLevel = currentLevel;
    currentLevel++;
    const settings = getLevelSettings(currentLevel);
    aiSpeed = settings.aiSpeed;
    maxPoints = settings.maxPoints;
    ai.speed = canvas.height * (0.005 * aiSpeed);
    updateLevelInfo();
    
    if (!isGuest && navigator.onLine) {
      saveScore();
      saveLevelProgress();
    }
    
    startGameBtn.textContent = 'Next Level';
  } else {
    gameOverMsg.innerHTML = `<i class="fas fa-times-circle"></i> Game Over at Level ${currentLevel}`;
    previousLevel = currentLevel;
    currentLevel = Math.max(1, currentLevel - 1);
    if (!isGuest && navigator.onLine) saveLevelProgress();
    startGameBtn.textContent = 'Try Again';
  }
  
  startGameBtn.style.display = 'block';
}

// Get Level Settings
function getLevelSettings(level) {
  if (level === 1) return { aiSpeed: 2, maxPoints: 5 };
  return {
    aiSpeed: 2 + Math.min(level * 0.5, 8),
    maxPoints: 5 + Math.floor(level * 0.5)
  };
}

// Authentication
async function handleRegister(email, password, username) {
  const errorEl = document.getElementById('regError');
  errorEl.textContent = '';
  
  try {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Please enter a valid email address");
    }
    
    if (!/(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*\W)/.test(password)) {
      throw new Error("Password must contain uppercase, lowercase, number and special character");
    }
    
    if (!/^[a-zA-Z0-9_]{3,15}$/.test(username)) {
      throw new Error("Username must be 3-15 characters (letters, numbers, underscores)");
    }

    const { data: usernameCheck } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single();

    if (usernameCheck) throw new Error("Username already taken");

    const { data: emailCheck } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', email)
      .single();

    if (emailCheck) throw new Error("Email already registered");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, device: deviceType, os },
        emailRedirectTo: window.location.origin
      }
    });

    if (error) throw error;

    errorEl.textContent = "Registration successful! Check your email.";
    errorEl.style.color = "#00b894";
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
    
  } catch (err) {
    errorEl.textContent = err.message || "Registration failed";
    errorEl.style.color = "#ff5555";
  }
}

// [Rest of the authentication and game functions remain the same...]

// Event Listeners
window.addEventListener('DOMContentLoaded', initGame);
window.addEventListener('resize', resizeCanvas);

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  await handleLogin(
    document.getElementById('loginEmail').value,
    document.getElementById('loginPassword').value
  );
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  await handleRegister(
    document.getElementById('regEmail').value,
    document.getElementById('regPassword').value,
    document.getElementById('regUsername').value
  );
});

// [Rest of the event listeners remain the same...]