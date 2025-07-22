// Supabase Configuration
const SUPABASE_URL = 'https://xvdeijzqjumkvchxabwc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2ZGVpanpxanVta3ZjaHhhYndjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwODMwMzEsImV4cCI6MjA2ODY1OTAzMX0.kf6fCNd4n2sVcb06qyHo9zJ_7lRxMUZgryaGbp2mDJ8';

// Initialize Supabase
let supabase;
let isOnline = navigator.onLine;
let deviceType = 'desktop';
let os = 'unknown';
let currentLevel = 1;
let lastLevel = 1;
let isGuest = false;
let username = "";
let user = null;

// DOM Elements
const loadingScreen = document.getElementById('loadingScreen');
const loaderDetails = document.getElementById('loaderDetails');
const authModal = document.getElementById('authModal');
const offlineUsernameModal = document.getElementById('offlineUsernameModal');
const gameContainer = document.getElementById('gameContainer');
const userBar = document.getElementById('userBar');
const onlineStatus = document.getElementById('onlineStatus');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const playerScoreEl = document.getElementById('playerScore');
const aiScoreEl = document.getElementById('aiScore');
const levelDisplay = document.getElementById('levelDisplay');
const maxPointsEl = document.getElementById('maxPoints');
const gameOverMsg = document.getElementById('gameOverMsg');
const startGameBtn = document.getElementById('startGameBtn');
const resetLevelBtn = document.getElementById('resetLevelBtn');
const upBtn = document.getElementById('upBtn');
const downBtn = document.getElementById('downBtn');

// Game State
let ball, player, ai;
let playerScore = 0, aiScore = 0;
let isGameOver = false, winner = null;
let aiSpeed = 2, maxPoints = 5;
let running = false;
let moveUp = false, moveDown = false;

// Device Detection
function detectDevice() {
  const userAgent = navigator.userAgent;
  
  // Detect OS
  if (/android/i.test(userAgent)) os = 'Android';
  else if (/iPad|iPhone|iPod/.test(userAgent)) os = 'iOS';
  else if (/Windows/.test(userAgent)) os = 'Windows';
  else if (/Mac/.test(userAgent)) os = 'MacOS';
  else if (/Linux/.test(userAgent)) os = 'Linux';
  
  // Detect Device Type
  if (/Mobile|Android|iP(hone|od)|IEMobile/.test(userAgent)) deviceType = 'mobile';
  else if (/Tablet|iPad/.test(userAgent)) deviceType = 'tablet';
  
  loaderDetails.innerHTML = `
    <i class="fas fa-${deviceType === 'mobile' ? 'mobile-alt' : deviceType === 'tablet' ? 'tablet-alt' : 'desktop'}"></i>
    ${os} | ${deviceType.toUpperCase()}
  `;
}

// Initialize Game
async function initializeGame() {
  // Show loading screen
  loadingScreen.style.display = 'flex';
  detectDevice();
  
  // Simulate loading (minimum 1.5 seconds for smooth UX)
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Initialize Supabase if online
  if (isOnline) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    updateOnlineStatus(true);
    
    // Check for existing session
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await fetchUser();
      await loadSavedLevel();
      showGameUI();
      return;
    }
  } else {
    updateOnlineStatus(false);
  }
  
  // Show auth modal if no session
  loadingScreen.style.display = 'none';
  authModal.style.display = 'flex';
}

// Show Game UI
function showGameUI() {
  loadingScreen.style.display = 'none';
  authModal.style.display = 'none';
  offlineUsernameModal.style.display = 'none';
  gameContainer.style.display = 'block';
  resizeCanvas();
  
  // Show mobile controls if on mobile
  if (deviceType === 'mobile' || deviceType === 'tablet') {
    document.getElementById('mobileControls').style.display = 'flex';
  }
  
  // Update leaderboard link with current username
  updateLeaderboardLink();
}

// Update leaderboard link with current username
function updateLeaderboardLink() {
  const leaderboardLinks = document.querySelectorAll('a[href="leaderboard.html"]');
  leaderboardLinks.forEach(link => {
    if (username && username !== "Guest") {
      link.href = `leaderboard.html?user=${encodeURIComponent(username)}`;
    } else {
      link.href = 'leaderboard.html';
    }
  });
}

// Canvas Resizing
function resizeCanvas() {
  const maxWidth = Math.min(800, window.innerWidth - 40);
  const ratio = 16/9;
  const height = Math.min(maxWidth / ratio, window.innerHeight - 250);
  const width = height * ratio;
  
  canvas.width = width;
  canvas.height = height;
  
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

// Start New Game
function startNewGame() {
  playerScore = 0;
  aiScore = 0;
  isGameOver = false;
  gameOverMsg.textContent = "";
  startGameBtn.style.display = 'none';
  
  initGameObjects();
  running = true;
  updateScore();
  loop();
}

// Game Loop
function loop() {
  if (!running) return;
  
  // Mobile controls
  if (moveUp) player.y -= player.speed;
  if (moveDown) player.y += player.speed;
  player.y = Math.max(0, Math.min(player.y, canvas.height - player.h));
  
  update();
  draw();
  requestAnimationFrame(loop);
}

// Update Game State
function update() {
  // Ball movement
  ball.x += ball.vx;
  ball.y += ball.vy;
  
  // Wall collision
  if (ball.y < ball.size || ball.y > canvas.height - ball.size) {
    ball.vy *= -1;
  }
  
  // Paddle collision
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
  
  // Scoring
  if (ball.x < 0) {
    aiScore++;
    resetBall(false);
  }
  
  if (ball.x > canvas.width) {
    playerScore++;
    resetBall(true);
  }
  
  // AI Movement
  const aiCenter = ai.y + ai.h/2;
  if (aiCenter < ball.y - 10) {
    ai.y += ai.speed;
  } else if (aiCenter > ball.y + 10) {
    ai.y -= ai.speed;
  }
  ai.y = Math.max(0, Math.min(ai.y, canvas.height - ai.h));
  
  // Win Condition
  if (playerScore >= maxPoints) {
    endGame(true);
  } else if (aiScore >= maxPoints) {
    endGame(false);
  }
}

// Drawing
function draw() {
  // Clear with translucent for trail effect
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Center line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 20; i < canvas.height; i += 40) {
    ctx.moveTo(canvas.width/2, i);
    ctx.lineTo(canvas.width/2, i + 20);
  }
  ctx.stroke();
  
  // Ball with gradient
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
  
  // Paddles with gradients
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

// Game Events
function resetBall(playerScored) {
  ball.x = canvas.width/2;
  ball.y = canvas.height/2;
  ball.vx = playerScored ? -Math.abs(canvas.width * 0.005) : Math.abs(canvas.width * 0.005);
  ball.vy = (Math.random() * 2 - 1) * canvas.height * 0.005;
  updateScore();
}

function endGame(won) {
  running = false;
  isGameOver = true;
  
  if (won) {
    gameOverMsg.innerHTML = `<i class="fas fa-trophy"></i> You won Level ${currentLevel}!`;
    currentLevel++;
    const settings = getLevelSettings(currentLevel);
    aiSpeed = settings.aiSpeed;
    maxPoints = settings.maxPoints;
    ai.speed = canvas.height * (0.005 * aiSpeed);
    updateLevelInfo();
    
    if (!isGuest && isOnline) {
      saveScore(username, playerScore, currentLevel - 1, user?.id);
      saveLevelProgress();
    }
    
    startGameBtn.textContent = 'Next Level';
  } else {
    gameOverMsg.innerHTML = `<i class="fas fa-times-circle"></i> Game Over at Level ${currentLevel}`;
    currentLevel = Math.max(1, currentLevel - 1);
    if (!isGuest && isOnline) saveLevelProgress();
    startGameBtn.textContent = 'Try Again';
  }
  
  startGameBtn.style.display = 'block';
  if (!isGuest && isOnline) fetchLeaderboard();
}

// Level Management
function getLevelSettings(level) {
  if (level === 1) return { aiSpeed: 2, maxPoints: 5 };
  return {
    aiSpeed: 2 + Math.min(level * 0.5, 8),
    maxPoints: 5 + Math.floor(level * 0.5)
  };
}

async function loadSavedLevel() {
  if (!isOnline || isGuest) return;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('PlayerProgress')
        .select('level')
        .eq('user_id', user.id)
        .single();
      
      if (data?.level) {
        lastLevel = data.level;
        currentLevel = data.level;
        const settings = getLevelSettings(currentLevel);
        aiSpeed = settings.aiSpeed;
        maxPoints = settings.maxPoints;
        updateLevelInfo();
      }
    }
  } catch (err) {
    console.error("Error loading level:", err);
  }
}

async function saveLevelProgress() {
  if (!isOnline || isGuest || !user) return;
  
  try {
    await supabase
      .from('PlayerProgress')
      .upsert({
        user_id: user.id,
        level: currentLevel,
        updated_at: new Date().toISOString()
      });
  } catch (err) {
    console.error("Error saving progress:", err);
  }
}

// UI Updates
function updateScore() {
  playerScoreEl.textContent = playerScore;
  aiScoreEl.textContent = aiScore;
}

function updateLevelInfo() {
  levelDisplay.textContent = currentLevel;
  maxPointsEl.textContent = maxPoints;
}

function updateOnlineStatus(online) {
  isOnline = online;
  onlineStatus.innerHTML = online 
    ? '<i class="fas fa-wifi"></i> ONLINE' 
    : '<i class="fas fa-plug"></i> OFFLINE';
  onlineStatus.className = online ? 'online' : 'offline';
  
  if (online && !supabase) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
}

// Event Listeners
window.addEventListener('load', initializeGame);
window.addEventListener('resize', resizeCanvas);
window.addEventListener('online', () => updateOnlineStatus(true));
window.addEventListener('offline', () => updateOnlineStatus(false));

startGameBtn.addEventListener('click', () => {
  if (isOnline || isGuest) {
    startNewGame();
  } else {
    authModal.style.display = 'none';
    offlineUsernameModal.style.display = 'flex';
  }
});

resetLevelBtn.addEventListener('click', () => {
  currentLevel = 1;
  const settings = getLevelSettings(currentLevel);
  aiSpeed = settings.aiSpeed;
  maxPoints = settings.maxPoints;
  updateLevelInfo();
  
  if (isOnline && !isGuest) saveLevelProgress();
  
  if (running) {
    startNewGame();
  }
});

// Mobile Controls
upBtn.addEventListener('touchstart', (e) => {
  e.preventDefault();
  moveUp = true;
}, { passive: false });

upBtn.addEventListener('touchend', (e) => {
  e.preventDefault();
  moveUp = false;
}, { passive: false });

downBtn.addEventListener('touchstart', (e) => {
  e.preventDefault();
  moveDown = true;
}, { passive: false });

downBtn.addEventListener('touchend', (e) => {
  e.preventDefault();
  moveDown = false;
}, { passive: false });

// Mouse/Touch Controls
canvas.addEventListener('mousemove', (e) => {
  if (!running) return;
  const rect = canvas.getBoundingClientRect();
  player.y = e.clientY - rect.top - player.h/2;
  player.y = Math.max(0, Math.min(player.y, canvas.height - player.h));
});

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (!running) return;
  const rect = canvas.getBoundingClientRect();
  player.y = e.touches[0].clientY - rect.top - player.h/2;
  player.y = Math.max(0, Math.min(player.y, canvas.height - player.h));
}, { passive: false });

// Auth Functions
document.getElementById('showLogin').addEventListener('click', showLoginForm);
document.getElementById('showRegister').addEventListener('click', showRegisterForm);

function showLoginForm() {
  document.getElementById('registerForm').style.display = 'none';
  document.getElementById('loginForm').style.display = 'block';
  document.getElementById('regError').textContent = '';
}

function showRegisterForm() {
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('registerForm').style.display = 'block';
  document.getElementById('loginError').textContent = '';
}

document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('regError');
  errorEl.textContent = '';
  
  if (!isOnline) {
    errorEl.textContent = "Can't register while offline";
    return;
  }
  
  const username = document.getElementById('regUsername').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  
  if (!username || !email || !password) {
    errorEl.textContent = "Please fill all fields";
    return;
  }
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
        emailRedirectTo: window.location.origin
      }
    });
    
    if (error) throw error;
    errorEl.textContent = "Registration successful! Check your email to verify.";
    errorEl.style.color = "#00b894";
  } catch (err) {
    errorEl.textContent = err.message || "Registration failed";
    errorEl.style.color = "#d63031";
  }
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('loginError');
  errorEl.textContent = '';
  
  if (!isOnline) {
    errorEl.textContent = "Can't login while offline";
    return;
  }
  
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    
    isGuest = false;
    await fetchUser();
    showGameUI();
    if (isOnline) fetchLeaderboard();
  } catch (err) {
    errorEl.textContent = err.message || "Login failed";
  }
});

document.getElementById('guestBtn').addEventListener('click', () => {
  isGuest = true;
  username = "Guest";
  userBar.textContent = `Playing as: ${username}`;
  showGameUI();
});

document.getElementById('offlineUsernameForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const usernameInput = document.getElementById('offlineUsernameInput');
  const username = usernameInput.value.trim();
  
  if (username) {
    isGuest = true;
    userBar.textContent = `Playing offline as: ${username}`;
    showGameUI();
    startNewGame();
  }
});

// User Management
async function fetchUser() {
  if (!isOnline) return;
  
  try {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    user = currentUser;
    username = user?.user_metadata?.username || "Player";
    userBar.textContent = `Logged in as: ${username}`;
    updateLeaderboardLink();
  } catch (err) {
    console.error("Error fetching user:", err);
  }
}

// Leaderboard Functions
async function fetchLeaderboard() {
  if (!isOnline || isGuest) return;
  
  try {
    const { data, error } = await supabase
      .from('Leaderboard')
      .select('username, score, level')
      .order('score', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    // In a real implementation, you might update an in-game leaderboard display
    console.log("Leaderboard data:", data);
  } catch (err) {
    console.error("Error fetching leaderboard:", err);
  }
}

async function saveScore(username, score, level, userId) {
  if (!isOnline || isGuest) return;
  
  try {
    await supabase
      .from('Leaderboard')
      .insert([{ user_id: userId, username, score, level }]);
  } catch (err) {
    console.error("Error saving score:", err);
  }
}