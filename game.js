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

// DOM Elements
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const playerScoreElement = document.getElementById('playerScore');
const aiScoreElement = document.getElementById('aiScore');
const levelDisplay = document.getElementById('levelDisplay');
const maxPointsDisplay = document.getElementById('maxPoints');
const gameOverMsg = document.getElementById('gameOverMsg');
const startGameBtn = document.getElementById('startGameBtn');
const resetLevelBtn = document.getElementById('resetLevelBtn');
const prevLevelBtn = document.getElementById('prevLevelBtn');
const upBtn = document.getElementById('upBtn');
const downBtn = document.getElementById('downBtn');
const onlineStatus = document.getElementById('onlineStatus');
const userBar = document.getElementById('userBar');
const loadingScreen = document.getElementById('loadingScreen');
const loaderText = document.getElementById('loaderText');
const loaderDetails = document.getElementById('loaderDetails');
const securityStatus = document.getElementById('securityStatus');
const authModal = document.getElementById('authModal');
const registerForm = document.getElementById('registerForm');
const loginForm = document.getElementById('loginForm');
const showLogin = document.getElementById('showLogin');
const showRegister = document.getElementById('showRegister');
const guestBtn = document.getElementById('guestBtn');
const offlineUsernameModal = document.getElementById('offlineUsernameModal');
const offlineUsernameForm = document.getElementById('offlineUsernameForm');

// Utility Functions
function showLoading(message, details = "") {
  if (loadingScreen && loaderText && loaderDetails) {
    loadingScreen.style.display = 'flex';
    loaderText.textContent = message;
    loaderDetails.textContent = details;
  }
}

function hideLoading() {
  if (loadingScreen) loadingScreen.style.display = 'none';
}

function showError(message) {
  if (loadingScreen && loaderText) {
    loaderText.innerHTML = `<i class="fas fa-exclamation-triangle"></i> <span class="fa-fallback">⚠️</span> ${message}`;
    loaderText.style.color = 'var(--danger)';
  }
}

function showAuthModal() {
  if (authModal) authModal.style.display = 'flex';
}

function hideAuthModal() {
  if (authModal) authModal.style.display = 'none';
}

function showGameUI() {
  const gameContainer = document.getElementById('gameContainer');
  if (gameContainer) {
    gameContainer.style.display = 'block';
    resizeCanvas();
    updateUserBar();
  }
}

function detectDevice() {
  const userAgent = navigator.userAgent;
  deviceType = /mobile|android|iphone|ipad/i.test(userAgent) ? 'mobile' : 'desktop';
  
  if (/windows/i.test(userAgent)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(userAgent)) os = 'MacOS';
  else if (/linux/i.test(userAgent)) os = 'Linux';
  else if (/android/i.test(userAgent)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(userAgent)) os = 'iOS';
  else os = 'Unknown';
}

async function fetchUser() {
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      user = authUser;
      username = authUser.user_metadata?.username || authUser.email.split('@')[0];
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error fetching user:", error);
    return false;
  }
}

function updateUserBar() {
  if (userBar) {
    userBar.textContent = isGuest 
      ? `Playing as Guest: ${username}` 
      : `Logged in as: ${username}`;
  }
}

// Game Initialization
async function initializeGame() {
  showLoading("Initializing Pripro Pong...");
  
  try {
    detectDevice();
    
    // Initialize canvas
    if (!canvas || !ctx) {
      throw new Error("Canvas not available");
    }
    resizeCanvas();
    
    // Security check
    if (!runSecurityChecks()) {
      throw new Error("Security checks failed");
    }
    
    // Check if online
    if (navigator.onLine) {
      onlineStatus.className = 'online';
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await fetchUser();
        showGameUI();
        return;
      }
    } else {
      onlineStatus.className = 'offline';
      if (onlineStatus.querySelector('span')) {
        onlineStatus.querySelector('span').textContent = 'OFFLINE';
      }
    }
    
    showAuthModal();
  } catch (error) {
    showError("Failed to load. Please refresh.");
    console.error("Initialization error:", error);
  } finally {
    hideLoading();
  }
}

function runSecurityChecks() {
  try {
    // Check for dev tools
    const devtools = /./;
    devtools.toString = function() {
      if (securityStatus) {
        securityStatus.innerHTML = '<i class="fas fa-shield-alt"></i> <span class="fa-fallback">🛡️</span> <span class="warning">Security Warning</span>';
      }
      return '';
    };
    console.log('%c', devtools);
    
    // Check if running in iframe
    if (window.self !== window.top) {
      throw new Error("Frame detected");
    }
    
    // Check localStorage
    localStorage.setItem('security_test', 'test');
    localStorage.removeItem('security_test');
    
    if (securityStatus) {
      securityStatus.innerHTML = '<i class="fas fa-shield-alt"></i> <span class="fa-fallback">🛡️</span> <span class="success">Security Verified</span>';
    }
    return true;
  } catch (err) {
    console.error("Security check failed:", err);
    return false;
  }
}

// Game Core Functions
function resizeCanvas() {
  try {
    const maxHeight = window.innerHeight * 0.8;
    const ratio = 16/9;
    const width = Math.min(maxHeight * ratio, window.innerWidth * 0.95);
    
    if (canvas) {
      canvas.width = width;
      canvas.height = width / ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${width / ratio}px`;
    }
    
    if (running) initGameObjects();
  } catch (error) {
    console.error("Canvas resize error:", error);
  }
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

function update() {
  // Ball movement
  ball.x += ball.vx;
  ball.y += ball.vy;
  
  // Ball collision with top and bottom
  if (ball.y - ball.size/2 < 0 || ball.y + ball.size/2 > canvas.height) {
    ball.vy = -ball.vy;
    vibrateDevice(20);
  }
  
  // AI movement
  const aiCenter = ai.y + ai.h/2;
  if (aiCenter < ball.y - 10) {
    ai.y += ai.speed;
  } else if (aiCenter > ball.y + 10) {
    ai.y -= ai.speed;
  }
  ai.y = Math.max(0, Math.min(ai.y, canvas.height - ai.h));
  
  // Ball collision with paddles
  if (ball.x - ball.size/2 < player.x + player.w && 
      ball.x + ball.size/2 > player.x && 
      ball.y + ball.size/2 > player.y && 
      ball.y - ball.size/2 < player.y + player.h) {
    ball.vx = Math.abs(ball.vx) * 1.05;
    ball.vy = (ball.y - (player.y + player.h/2)) * 0.02;
    vibrateDevice(30);
  }
  
  if (ball.x + ball.size/2 > ai.x && 
      ball.x - ball.size/2 < ai.x + ai.w && 
      ball.y + ball.size/2 > ai.y && 
      ball.y - ball.size/2 < ai.y + ai.h) {
    ball.vx = -Math.abs(ball.vx) * 1.05;
    ball.vy = (ball.y - (ai.y + ai.h/2)) * 0.02;
    vibrateDevice(30);
  }
  
  // Scoring
  if (ball.x < 0) {
    aiScore++;
    resetBall();
    updateScore();
    vibrateDevice(100);
  } else if (ball.x > canvas.width) {
    playerScore++;
    resetBall();
    updateScore();
    vibrateDevice(100);
  }
  
  // Check game over
  if (playerScore >= maxPoints || aiScore >= maxPoints) {
    gameOver();
  }
}

function draw() {
  // Clear canvas
  ctx.fillStyle = '#1e272e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw center line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(canvas.width/2, 0);
  ctx.lineTo(canvas.width/2, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);
  
  // Draw ball
  ctx.fillStyle = '#a29bfe';
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.size/2, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw paddles
  ctx.fillStyle = '#6c5ce7';
  ctx.fillRect(player.x, player.y, player.w, player.h);
  ctx.fillRect(ai.x, ai.y, ai.w, ai.h);
}

function resetBall() {
  ball.x = canvas.width/2;
  ball.y = canvas.height/2;
  ball.vx = canvas.width * 0.005 * (Math.random() > 0.5 ? 1 : -1);
  ball.vy = canvas.height * 0.005 * (Math.random() * 2 - 1);
}

function updateScore() {
  if (playerScoreElement) playerScoreElement.textContent = playerScore;
  if (aiScoreElement) aiScoreElement.textContent = aiScore;
}

function gameOver() {
  running = false;
  isGameOver = true;
  winner = playerScore > aiScore ? 'player' : 'ai';
  
  if (gameOverMsg) {
    gameOverMsg.innerHTML = winner === 'player' 
      ? `<i class="fas fa-trophy"></i> <span class="fa-fallback">🏆</span> You Win!` 
      : `<i class="fas fa-skull"></i> <span class="fa-fallback">💀</span> Game Over`;
    gameOverMsg.style.color = winner === 'player' ? '#00b894' : '#d63031';
  }
  
  if (winner === 'player' && !isGuest && navigator.onLine) {
    submitScore();
  }
  
  if (startGameBtn) {
    startGameBtn.innerHTML = '<i class="fas fa-redo"></i> <span class="fa-fallback">↻</span> Play Again';
  }
  
  vibrateDevice(200);
}

async function submitScore() {
  try {
    const { error } = await supabase
      .from('Leaderboard')
      .insert([{
        username: username,
        score: playerScore,
        level: currentLevel,
        device: deviceType,
        os: os
      }]);
    
    if (error) throw error;
  } catch (error) {
    console.error("Error submitting score:", error);
  }
}

function startGame() {
  if (running) return;
  
  playerScore = 0;
  aiScore = 0;
  isGameOver = false;
  updateScore();
  
  if (gameOverMsg) {
    gameOverMsg.textContent = '';
  }
  
  if (startGameBtn) {
    startGameBtn.innerHTML = '<i class="fas fa-play"></i> <span class="fa-fallback">▶️</span> Start Game';
  }
  
  initGameObjects();
  running = true;
  gameLoop();
}

function gameLoop() {
  if (!running) return;
  
  if (moveUp) player.y -= player.speed;
  if (moveDown) player.y += player.speed;
  player.y = Math.max(0, Math.min(player.y, canvas.height - player.h));
  
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

function getLevelSettings(level) {
  if (level === 1) return { aiSpeed: 2, maxPoints: 5 };
  return {
    aiSpeed: 2 + Math.min(level * 0.5, 8),
    maxPoints: 5 + Math.floor(level * 0.5)
  };
}

function setLevel(level) {
  currentLevel = level;
  const settings = getLevelSettings(level);
  aiSpeed = settings.aiSpeed;
  maxPoints = settings.maxPoints;
  
  if (levelDisplay) levelDisplay.textContent = currentLevel;
  if (maxPointsDisplay) maxPointsDisplay.textContent = maxPoints;
  
  if (ai) {
    ai.speed = canvas.height * (0.005 * aiSpeed);
  }
  
  vibrateDevice(50);
}

function vibrateDevice(duration = 50) {
  if (deviceType === 'mobile' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(duration);
    } catch (e) {
      console.error("Vibration failed:", e);
    }
  }
}

// Event Listeners
window.addEventListener('DOMContentLoaded', () => {
  // Initialize after all resources are loaded
  window.addEventListener('load', initializeGame);
});

window.addEventListener('resize', resizeCanvas);

// Keyboard controls
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp' || e.key === 'w') moveUp = true;
  if (e.key === 'ArrowDown' || e.key === 's') moveDown = true;
});

window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowUp' || e.key === 'w') moveUp = false;
  if (e.key === 'ArrowDown' || e.key === 's') moveDown = false;
});

// Mobile controls
if (upBtn && downBtn) {
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
}

// Game controls
if (startGameBtn) {
  startGameBtn.addEventListener('click', startGame);
}

if (resetLevelBtn) {
  resetLevelBtn.addEventListener('click', () => {
    setLevel(1);
    previousLevel = 1;
  });
}

if (prevLevelBtn) {
  prevLevelBtn.addEventListener('click', () => {
    if (currentLevel > 1) {
      previousLevel = currentLevel;
      setLevel(currentLevel - 1);
    }
  });
}

// Auth forms
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const username = document.getElementById('regUsername').value;
    
    await handleRegister(email, password, username);
  });
}

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    await handleLogin(email, password);
  });
}

if (showLogin) {
  showLogin.addEventListener('click', () => {
    registerForm.style.display = 'none';
    loginForm.style.display = 'flex';
  });
}

if (showRegister) {
  showRegister.addEventListener('click', () => {
    loginForm.style.display = 'none';
    registerForm.style.display = 'flex';
  });
}

if (guestBtn) {
  guestBtn.addEventListener('click', () => {
    hideAuthModal();
    offlineUsernameModal.style.display = 'flex';
  });
}

if (offlineUsernameForm) {
  offlineUsernameForm.addEventListener('submit', (e) => {
    e.preventDefault();
    username = document.getElementById('offlineUsernameInput').value.trim();
    isGuest = true;
    offlineUsernameModal.style.display = 'none';
    showGameUI();
  });
}

// Online status
window.addEventListener('online', () => {
  if (onlineStatus) {
    onlineStatus.className = 'online';
    onlineStatus.querySelector('span').textContent = 'ONLINE';
  }
});

window.addEventListener('offline', () => {
  if (onlineStatus) {
    onlineStatus.className = 'offline';
    onlineStatus.querySelector('span').textContent = 'OFFLINE';
  }
});

// Auth Handlers
async function handleRegister(email, password, username) {
  const regError = document.getElementById('regError');
  
  try {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Invalid email format");
    }
    
    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }
    
    if (!/^[a-zA-Z0-9_]{3,15}$/.test(username)) {
      throw new Error("Username must be 3-15 alphanumeric characters");
    }
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username
        }
      }
    });
    
    if (error) throw error;
    
    if (regError) {
      regError.textContent = "Check your email for confirmation!";
      regError.style.color = '#00b894';
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    await handleLogin(email, password);
  } catch (error) {
    console.error("Registration error:", error);
    if (regError) {
      regError.textContent = error.message;
      regError.style.color = '#d63031';
    }
  }
}

async function handleLogin(email, password) {
  const loginError = document.getElementById('loginError');
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    
    await fetchUser();
    hideAuthModal();
    showGameUI();
  } catch (error) {
    console.error("Login error:", error);
    if (loginError) {
      loginError.textContent = error.message;
      loginError.style.color = '#d63031';
    }
  }
}