// Supabase Configuration
const SUPABASE_URL = 'https://xvdeijzqjumkvchxabwc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2ZGVpanpxanVta3ZjaHhhYndjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwODMwMzEsImV4cCI6MjA2ODY1OTAzMX0.kf6fCNd4n2sVcb06qyHo9zJ_7lRxMUZgryaGbp2mDJ8';

// Initialize Supabase with enhanced security
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
let isGameOver = false, winner = null;
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
let securityChecksPassed = false;

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
const securityStatus = document.getElementById('securityStatus');

// ========================
// SECURITY & INITIALIZATION
// ========================

async function initializeGame() {
  showLoading("Initializing Pripro Pong...");
  
  try {
    // Run security checks first
    await runSecurityChecks();
    
    // Detect device and OS
    detectDevice();
    
    // Minimum loading time (better UX)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (navigator.onLine) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await fetchUser();
        showGameUI();
        return;
      }
    }
    
    // Fallback to auth modal
    showAuthModal();
    
  } catch (error) {
    showError("Failed to load. Please refresh.");
    console.error("Initialization error:", error);
  } finally {
    hideLoading();
  }
}

async function runSecurityChecks() {
  try {
    // Check for dev tools
    const devtools = /./;
    devtools.toString = function() {
      securityStatus.innerHTML = '<i class="fas fa-shield-alt"></i> <span class="warning">Security Warning: Dev Tools Detected</span>';
      return '';
    };
    console.log('%c', devtools);
    
    // Check if running in iframe (prevent clickjacking)
    if (window.self !== window.top) {
      securityStatus.innerHTML = '<i class="fas fa-shield-alt"></i> <span class="error">Security Error: Frame Detected</span>';
      throw new Error("Frame detected - possible clickjacking attempt");
    }
    
    // Check for tampered localStorage
    try {
      localStorage.setItem('security_test', 'test');
      localStorage.removeItem('security_test');
    } catch (e) {
      securityStatus.innerHTML = '<i class="fas fa-shield-alt"></i> <span class="error">Security Error: Storage Tampered</span>';
      throw new Error("LocalStorage tampered with");
    }
    
    // All checks passed
    securityStatus.innerHTML = '<i class="fas fa-shield-alt"></i> <span class="success">Security Verified</span>';
    securityChecksPassed = true;
    
  } catch (err) {
    console.error("Security check failed:", err);
    throw err;
  }
}

function detectDevice() {
  const ua = navigator.userAgent;
  
  // Detect device type
  if (/mobile|android|iphone|ipad/i.test(ua)) {
    deviceType = 'mobile';
  } else if (/tablet|ipad/i.test(ua)) {
    deviceType = 'tablet';
  } else {
    deviceType = 'desktop';
  }
  
  // Detect OS
  if (/android/i.test(ua)) {
    os = 'android';
  } else if (/iphone|ipad|ipod/i.test(ua)) {
    os = 'ios';
  } else if (/mac/i.test(ua)) {
    os = 'mac';
  } else if (/windows/i.test(ua)) {
    os = 'windows';
  } else if (/linux/i.test(ua)) {
    os = 'linux';
  }
  
  document.getElementById('loaderDetails').textContent = `Device: ${deviceType.toUpperCase()} | OS: ${os.toUpperCase()}`;
}

function vibrateDevice(duration = 50) {
  if (deviceType !== 'mobile' && deviceType !== 'tablet') return;
  if ('vibrate' in navigator) {
    navigator.vibrate(duration);
  }
}

function showLoading(message) {
  document.getElementById('loadingScreen').style.display = 'flex';
  document.getElementById('loaderText').textContent = message;
}

function hideLoading() {
  document.getElementById('loadingScreen').style.display = 'none';
}

function showError(message) {
  const loader = document.getElementById('loadingScreen');
  loader.innerHTML = `
    <div class="error-message">
      <i class="fas fa-exclamation-triangle"></i>
      <p>${message}</p>
      <button onclick="window.location.reload()">Refresh</button>
    </div>
  `;
}

function showAuthModal() {
  authModal.style.display = 'flex';
}

function showGameUI() {
  authModal.style.display = 'none';
  gameContainer.style.display = 'block';
  resizeCanvas();
  if (deviceType === 'mobile' || deviceType === 'tablet') {
    document.getElementById('mobileControls').style.display = 'flex';
  }
}

// ========================
// GAME LOGIC
// ========================

function resizeCanvas() {
  const maxWidth = Math.min(800, window.innerWidth - 40);
  const ratio = 16/9;
  const height = Math.min(maxWidth / ratio, window.innerHeight - 250);
  canvas.width = height * ratio;
  canvas.height = height;
  if (running) initGameObjects();
}

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

function gameLoop() {
  if (!running) return;
  
  // Mobile controls
  if (moveUp) player.y -= player.speed;
  if (moveDown) player.y += player.speed;
  player.y = Math.max(0, Math.min(player.y, canvas.height - player.h));
  
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

function update() {
  // Ball movement
  ball.x += ball.vx;
  ball.y += ball.vy;
  
  // Wall collision
  if (ball.y < ball.size || ball.y > canvas.height - ball.size) {
    ball.vy *= -1;
    vibrateDevice(20);
  }
  
  // Paddle collision
  if (ball.x - ball.size < player.x + player.w && 
      ball.y > player.y && ball.y < player.y + player.h) {
    ball.vx = Math.abs(ball.vx) * 1.05;
    const hitPos = (ball.y - (player.y + player.h/2)) / (player.h/2);
    ball.vy = hitPos * 5;
    vibrateDevice(30);
  }
  
  if (ball.x + ball.size > ai.x && 
      ball.y > ai.y && ball.y < ai.y + ai.h) {
    ball.vx = -Math.abs(ball.vx) * 1.05;
    const hitPos = (ball.y - (ai.y + ai.h/2)) / (ai.h/2);
    ball.vy = hitPos * 5;
    vibrateDevice(30);
  }
  
  // Scoring
  if (ball.x < 0) {
    aiScore++;
    resetBall(false);
    vibrateDevice(100);
  }
  
  if (ball.x > canvas.width) {
    playerScore++;
    resetBall(true);
    vibrateDevice(100);
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

function resetBall(playerScored) {
  ball.x = canvas.width/2;
  ball.y = canvas.height/2;
  ball.vx = playerScored ? -Math.abs(canvas.width * 0.005) : Math.abs(canvas.width * 0.005);
  ball.vy = (Math.random() * 2 - 1) * canvas.height * 0.005;
  updateScore();
}

function updateScore() {
  playerScoreEl.textContent = playerScore;
  aiScoreEl.textContent = aiScore;
}

function updateLevelInfo() {
  levelDisplay.textContent = currentLevel;
  maxPointsEl.textContent = maxPoints;
}

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

function getLevelSettings(level) {
  if (level === 1) return { aiSpeed: 2, maxPoints: 5 };
  return {
    aiSpeed: 2 + Math.min(level * 0.5, 8),
    maxPoints: 5 + Math.floor(level * 0.5)
  };
}

// ========================
// AUTHENTICATION
// ========================

async function fetchUser() {
  try {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      user = currentUser;
      username = currentUser.user_metadata?.username || currentUser.email || "Player";
      userBar.textContent = `Logged in as: ${username}`;
      await loadSavedLevel();
      updateLeaderboardLink();
    }
  } catch (err) {
    console.error("Failed to fetch user:", err);
  }
}

async function handleLogin(email, password) {
  const errorEl = document.getElementById('loginError');
  errorEl.textContent = '';
  
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (error) throw error;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Session not created");

    await fetchUser();
    authModal.style.display = "none";
    gameContainer.style.display = "block";
    startGame();
    
  } catch (err) {
    errorEl.textContent = err.message.includes('Invalid login credentials')
      ? "Incorrect email or password"
      : "Login failed. Please try again.";
    errorEl.style.color = "#ff5555";
  }
}

async function handleRegister(email, password, username) {
  const errorEl = document.getElementById('regError');
  errorEl.textContent = '';
  
  try {
    // First check if username is available
    const { data: usernameCheck, error: usernameError } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single();

    if (usernameCheck) {
      throw new Error("Username already taken");
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          device: deviceType,
          os: os
        },
        emailRedirectTo: window.location.origin // Fix for email verification redirect
      }
    });

    if (error) throw error;

    errorEl.textContent = "Registration successful! Please check your email to verify your account.";
    errorEl.style.color = "#00b894";

    // Show login form after successful registration
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
    
  } catch (err) {
    errorEl.textContent = err.message || "Registration failed";
    errorEl.style.color = "#ff5555";
  }
}

// ========================
// LEADERBOARD & PROGRESS
// ========================

async function fetchLeaderboard() {
  if (isGuest || !navigator.onLine) return;
  
  try {
    const { data, error } = await supabase
      .from('Leaderboard')
      .select('username, score, level')
      .order('score', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    const leaderboardList = document.getElementById('leaderboardList');
    leaderboardList.innerHTML = '';
    
    if (data?.length) {
      data.forEach((entry, i) => {
        const li = document.createElement('li');
        li.textContent = `${i+1}. ${entry.username} - ${entry.score} pts (Lvl ${entry.level})`;
        leaderboardList.appendChild(li);
      });
    }
  } catch (err) {
    console.error("Leaderboard error:", err);
  }
}

async function saveScore() {
  if (isGuest || !user || !navigator.onLine) return;
  
  try {
    await supabase
      .from('Leaderboard')
      .insert([{
        user_id: user.id,
        username,
        score: playerScore,
        level: currentLevel,
        device: deviceType,
        os: os
      }]);
  } catch (err) {
    console.error("Score save failed:", err);
  }
}

async function loadSavedLevel() {
  if (isGuest || !navigator.onLine) return;
  
  try {
    const { data, error } = await supabase
      .from('PlayerProgress')
      .select('level')
      .eq('user_id', user.id)
      .single();
    
    if (!error && data?.level) {
      currentLevel = data.level;
      previousLevel = currentLevel;
      const settings = getLevelSettings(currentLevel);
      aiSpeed = settings.aiSpeed;
      maxPoints = settings.maxPoints;
      updateLevelInfo();
    }
  } catch (err) {
    console.error("Level load failed:", err);
  }
}

async function saveLevelProgress() {
  if (isGuest || !user || !navigator.onLine) return;
  
  try {
    await supabase
      .from('PlayerProgress')
      .upsert({
        user_id: user.id,
        level: currentLevel,
        updated_at: new Date().toISOString()
      });
  } catch (err) {
    console.error("Progress save failed:", err);
  }
}

function updateLeaderboardLink() {
  if (!isGuest && user) {
    leaderboardBtn.href = `leaderboard.html?user=${encodeURIComponent(username)}`;
  }
}

// ========================
// EVENT LISTENERS
// ========================

// Initialize game when DOM loads
window.addEventListener('DOMContentLoaded', initializeGame);

// Window resize handler
window.addEventListener('resize', resizeCanvas);

// Online/offline detection
window.addEventListener('online', () => {
  onlineStatus.innerHTML = '<i class="fas fa-wifi"></i> ONLINE';
  onlineStatus.className = 'online';
  if (!isGuest && user) fetchLeaderboard();
});

window.addEventListener('offline', () => {
  onlineStatus.innerHTML = '<i class="fas fa-plug"></i> OFFLINE';
  onlineStatus.className = 'offline';
});

// Auth forms
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

document.getElementById('guestBtn').addEventListener('click', () => {
  isGuest = true;
  username = "Guest";
  userBar.textContent = `Playing as: ${username}`;
  authModal.style.display = "none";
  gameContainer.style.display = "block";
  startGame();
});

document.getElementById('offlineUsernameForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const usernameInput = document.getElementById('offlineUsernameInput');
  const username = usernameInput.value.trim();
  
  if (username) {
    isGuest = true;
    username = username.substring(0, 15);
    userBar.textContent = `Playing offline as: ${username}`;
    offlineUsernameModal.style.display = 'none';
    gameContainer.style.display = 'block';
    startGame();
  }
});

// Game controls
startGameBtn.addEventListener('click', () => {
  if (isGuest || navigator.onLine) {
    startGame();
  } else {
    authModal.style.display = 'none';
    offlineUsernameModal.style.display = 'flex';
  }
});

resetLevelBtn.addEventListener('click', () => {
  previousLevel = currentLevel;
  currentLevel = 1;
  const settings = getLevelSettings(currentLevel);
  aiSpeed = settings.aiSpeed;
  maxPoints = settings.maxPoints;
  updateLevelInfo();
  
  if (!isGuest && navigator.onLine) saveLevelProgress();
  
  if (running) startGame();
});

prevLevelBtn.addEventListener('click', () => {
  if (previousLevel !== currentLevel) {
    const temp = currentLevel;
    currentLevel = previousLevel;
    previousLevel = temp;
    
    const settings = getLevelSettings(currentLevel);
    aiSpeed = settings.aiSpeed;
    maxPoints = settings.maxPoints;
    updateLevelInfo();
    
    if (!isGuest && navigator.onLine) saveLevelProgress();
    
    if (running) startGame();
  }
});

// Mobile controls
upBtn.addEventListener('touchstart', (e) => {
  e.preventDefault();
  moveUp = true;
  vibrateDevice(20);
}, { passive: false });

upBtn.addEventListener('touchend', (e) => {
  e.preventDefault();
  moveUp = false;
}, { passive: false });

downBtn.addEventListener('touchstart', (e) => {
  e.preventDefault();
  moveDown = true;
  vibrateDevice(20);
}, { passive: false });

downBtn.addEventListener('touchend', (e) => {
  e.preventDefault();
  moveDown = false;
}, { passive: false });

// Mouse/touch controls
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

// Toggle between login/register forms
document.getElementById('showLogin').addEventListener('click', () => {
  document.getElementById('registerForm').style.display = 'none';
  document.getElementById('loginForm').style.display = 'block';
  document.getElementById('regError').textContent = '';
});

document.getElementById('showRegister').addEventListener('click', () => {
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('registerForm').style.display = 'block';
  document.getElementById('loginError').textContent = '';
});