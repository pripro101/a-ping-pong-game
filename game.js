// Supabase Configuration
const SUPABASE_URL = 'https://xvdeijzqjumkvchxabwc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2ZGVpanpxanVta3ZjaHhhYndjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwODMwMzEsImV4cCI6MjA2ODY1OTAzMX0.kf6fCNd4n2sVcb06qyHo9zJ_7lRxMUZgryaGbp2mDJ8';

// Initialize Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Game Elements
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
const authModal = document.getElementById('authModal');
const offlineUsernameModal = document.getElementById('offlineUsernameModal');
const gameContainer = document.getElementById('gameContainer');
const userBar = document.getElementById('userBar');
const onlineStatus = document.getElementById('onlineStatus');

// Game State
let ball, player, ai;
let playerScore = 0, aiScore = 0;
let isGameOver = false, winner = null;
let currentLevel = 1;
let aiSpeed = 2, maxPoints = 5;
let running = false;
let isGuest = false;
let username = "";
let user = null;
let deviceType = 'desktop';
let os = 'unknown';
let moveUp = false, moveDown = false;

// ========================
// INITIALIZATION
// ========================

function detectDevice() {
  const userAgent = navigator.userAgent;
  if (/android/i.test(userAgent)) os = 'Android';
  else if (/iPad|iPhone|iPod/.test(userAgent)) os = 'iOS';
  else if (/Windows/.test(userAgent)) os = 'Windows';
  else if (/Mac/.test(userAgent)) os = 'MacOS';
  else if (/Linux/.test(userAgent)) os = 'Linux';
  
  if (/Mobile|Android|iP(hone|od)|IEMobile/.test(userAgent)) deviceType = 'mobile';
  else if (/Tablet|iPad/.test(userAgent)) deviceType = 'tablet';
  
  document.getElementById('loaderDetails').innerHTML = `
    <i class="fas fa-${deviceType === 'mobile' ? 'mobile-alt' : deviceType === 'tablet' ? 'tablet-alt' : 'desktop'}"></i>
    ${os} | ${deviceType.toUpperCase()}
  `;
}

async function initializeGame() {
  detectDevice();
  await new Promise(resolve => setTimeout(resolve, 1500)); // Minimum loading time
  
  if (isOnline) {
    await checkSession();
  } else {
    updateOnlineStatus(false);
    document.getElementById('loadingScreen').style.display = 'none';
    authModal.style.display = 'flex';
  }
}

// ========================
// AUTHENTICATION
// ========================

async function checkSession() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await fetchUser();
      authModal.style.display = "none";
      gameContainer.style.display = "block";
      startGame();
    } else {
      authModal.style.display = "flex";
      showRegisterForm();
    }
  } catch (err) {
    console.error("Session check failed:", err);
    authModal.style.display = "flex";
    showRegisterForm();
  } finally {
    document.getElementById('loadingScreen').style.display = 'none';
  }
}

async function fetchUser() {
  try {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      user = currentUser;
      username = user.user_metadata?.username || user.email || "Player";
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
    fetchLeaderboard();
    
  } catch (err) {
    errorEl.textContent = err.message.includes('Invalid login credentials')
      ? "Incorrect email or password"
      : "Login failed. Please try again.";
    errorEl.style.color = "#ff5555";
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
  loop();
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

function update() {
  // [Previous update logic remains identical...]
}

function draw() {
  // [Previous draw logic remains identical...]
}

// ========================
// LEADERBOARD & PROGRESS
// ========================

async function fetchLeaderboard() {
  if (!isOnline || isGuest) return;
  
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
  if (!isOnline || isGuest || !user) return;
  
  try {
    await supabase
      .from('Leaderboard')
      .insert([{
        user_id: user.id,
        username,
        score: playerScore,
        level: currentLevel
      }]);
  } catch (err) {
    console.error("Score save failed:", err);
  }
}

async function loadSavedLevel() {
  if (!isOnline || isGuest) return;
  
  try {
    const { data, error } = await supabase
      .from('PlayerProgress')
      .select('level')
      .eq('user_id', user.id)
      .single();
    
    if (!error && data?.level) {
      currentLevel = data.level;
      const settings = getLevelSettings(currentLevel);
      aiSpeed = settings.aiSpeed;
      maxPoints = settings.maxPoints;
      updateLevelInfo();
    }
  } catch (err) {
    console.error("Level load failed:", err);
  }
}

// ========================
// EVENT LISTENERS
// ========================

// Initialize
window.addEventListener('load', initializeGame);
window.addEventListener('resize', resizeCanvas);
window.addEventListener('online', () => updateOnlineStatus(true));
window.addEventListener('offline', () => updateOnlineStatus(false));

// Auth Forms
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  await handleLogin(
    document.getElementById('loginEmail').value,
    document.getElementById('loginPassword').value
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

// [Rest of your event listeners remain unchanged...]

// Start the game
function beginGame() {
  resizeCanvas();
  startGame();
}