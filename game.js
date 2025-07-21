// Supabase settings
const SUPABASE_URL = 'https://xvdeijzqjumkvchxabwc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2ZGVpanpxanVta3ZjaHhhYndjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwODMwMzEsImV4cCI6MjA2ODY1OTAzMX0.kf6fCNd4n2sVcb06qyHo9zJ_7lRxMUZgryaGbp2mDJ8';

// Initialize Supabase only if online
let supabase;
let isOnline = navigator.onLine;
const onlineStatus = document.getElementById('onlineStatus');

if (isOnline) {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  onlineStatus.textContent = "ONLINE";
  onlineStatus.className = "online";
} else {
  onlineStatus.textContent = "OFFLINE";
  onlineStatus.className = "offline";
}

// Auth Elements
const authModal = document.getElementById('authModal');
const registerForm = document.getElementById('registerForm');
const loginForm = document.getElementById('loginForm');
const guestBtn = document.getElementById('guestBtn');
const regUsername = document.getElementById('regUsername');
const regEmail = document.getElementById('regEmail');
const regPassword = document.getElementById('regPassword');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const regError = document.getElementById('regError');
const loginError = document.getElementById('loginError');
const showLogin = document.getElementById('showLogin');
const showRegister = document.getElementById('showRegister');
const gameArea = document.getElementById('gameArea');
const userBar = document.getElementById('userBar');
const leaderboardBtn = document.getElementById('leaderboardBtn');

// Game Elements
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameOverMsg = document.getElementById('gameOverMsg');
const leaderboardList = document.getElementById('leaderboardList');
const restartBtn = document.getElementById('restartBtn');

// Game state
let ball, player, ai, playerScore, aiScore, isGameOver, winner;
let currentLevel = 1;
let aiSpeed = 2;
let maxPoints = 5;
let running = false;
let user = null;
let username = "";
let isGuest = false;

// Online/offline detection
window.addEventListener('online', () => {
  isOnline = true;
  onlineStatus.textContent = "ONLINE";
  onlineStatus.className = "online";
  if (!supabase) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  if (!isGuest) fetchLeaderboard();
});

window.addEventListener('offline', () => {
  isOnline = false;
  onlineStatus.textContent = "OFFLINE";
  onlineStatus.className = "offline";
  if (!isGuest) {
    leaderboardList.innerHTML = '<li>Leaderboard unavailable offline</li>';
  }
});

//
// AUTH LOGIC
//
function showRegisterForm() {
  loginForm.style.display = "none";
  registerForm.style.display = "block";
  regError.textContent = "";
  loginError.textContent = "";
}

function showLoginForm() {
  registerForm.style.display = "none";
  loginForm.style.display = "block";
  regError.textContent = "";
  loginError.textContent = "";
}

showLogin.onclick = showLoginForm;
showRegister.onclick = showRegisterForm;

// Guest account handler
guestBtn.onclick = () => {
  isGuest = true;
  username = "Guest";
  userBar.textContent = `Playing as: ${username}`;
  authModal.style.display = "none";
  gameArea.style.display = "block";
  leaderboardBtn.style.display = "none"; // Hide leaderboard button for guests
  startGame();
  
  // Show offline message for leaderboard
  if (!isOnline) {
    leaderboardList.innerHTML = '<li>Leaderboard unavailable for guests</li>';
  } else {
    leaderboardList.innerHTML = '<li>Sign in to see leaderboard</li>';
  }
};

registerForm.onsubmit = async (e) => {
  e.preventDefault();
  if (!isOnline) {
    regError.textContent = "Can't register while offline";
    return;
  }
  
  regError.textContent = "";
  const uname = regUsername.value.trim();
  const email = regEmail.value.trim();
  const pass = regPassword.value;
  
  if (!uname || !email || !pass) {
    regError.textContent = "Fill all fields.";
    return;
  }
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: { 
        data: { username: uname },
        emailRedirectTo: window.location.origin
      }
    });
    
    if (error) throw error;
    regError.textContent = "Registration successful! Please check your email to confirm.";
    regError.style.color = "#4CAF50";
  } catch (err) {
    regError.textContent = err.message || "Registration failed.";
    regError.style.color = "#f44336";
  }
};

loginForm.onsubmit = async (e) => {
  e.preventDefault();
  if (!isOnline) {
    loginError.textContent = "Can't login while offline";
    return;
  }
  
  loginError.textContent = "";
  const email = loginEmail.value.trim();
  const pass = loginPassword.value;
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
    isGuest = false;
    await fetchUser();
    authModal.style.display = "none";
    gameArea.style.display = "block";
    leaderboardBtn.style.display = "inline-block"; // Show leaderboard button
    startGame();
    fetchLeaderboard();
  } catch (err) {
    loginError.textContent = err.message || "Login failed.";
  }
};

async function fetchUser() {
  const { data: { user: gotUser } } = await supabase.auth.getUser();
  user = gotUser;
  username = user?.user_metadata?.username || "User";
  userBar.textContent = `Logged in as: ${username}`;
}

//
// GAME LOGIC (same as before, but with offline support)
//
function getLevelSettings(level) {
  if (level === 1) return { aiSpeed: 2, maxPoints: 5 };
  return {
    aiSpeed: Math.floor(2 + Math.random() * (level + 2)),
    maxPoints: Math.floor(5 + Math.random() * (level * 2))
  };
}

function startGame() {
  currentLevel = 1;
  setLevel(currentLevel);
  resetGame();
  running = true;
  loop();
}

function setLevel(level) {
  const settings = getLevelSettings(level);
  aiSpeed = settings.aiSpeed;
  maxPoints = settings.maxPoints;
}

function resetGame() {
  ball = { x: canvas.width/2, y: canvas.height/2, vx: 3, vy: 2, size: 10 };
  player = { y: canvas.height/2 - 30, h: 60, w: 10, x: 10 };
  ai = { y: canvas.height/2 - 30, h: 60, w: 10, x: canvas.width - 20 };
  playerScore = 0;
  aiScore = 0;
  isGameOver = false;
  winner = null;
  gameOverMsg.textContent = "";
  restartBtn.style.display = "none";
}

function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle='#444'; ctx.beginPath();
  for(let i=10; i<canvas.height; i+=30) ctx.rect(canvas.width/2-1,i,2,15);
  ctx.stroke();
  ctx.fillStyle='#fff'; ctx.fillRect(ball.x-ball.size/2, ball.y-ball.size/2, ball.size, ball.size);
  ctx.fillStyle='#4caf50'; ctx.fillRect(player.x, player.y, player.w, player.h);
  ctx.fillStyle='#f44336'; ctx.fillRect(ai.x, ai.y, ai.w, ai.h);
  ctx.font='24px monospace'; ctx.fillStyle='#fff';
  ctx.fillText(playerScore, canvas.width/2-40, 40);
  ctx.fillText(aiScore, canvas.width/2+20, 40);
  ctx.font='16px monospace'; ctx.fillStyle='#ffeb3b';
  ctx.fillText(`Level ${currentLevel}`, 10, 20);
  ctx.fillText(`Win at: ${maxPoints}`, canvas.width-110, 20);
}

function update() {
  if(isGameOver || !running) return;
  ball.x += ball.vx; ball.y += ball.vy;
  if(ball.y < ball.size/2 || ball.y > canvas.height-ball.size/2) ball.vy *= -1;
  if(ball.x-ball.size/2 < player.x+player.w && ball.y > player.y && ball.y < player.y+player.h) ball.vx *= -1;
  if(ball.x+ball.size/2 > ai.x && ball.y > ai.y && ball.y < ai.y+ai.h) ball.vx *= -1;
  if(ball.x < 0) { aiScore++; ball.x=canvas.width/2; ball.y=canvas.height/2; ball.vx=3; ball.vy=2; }
  if(ball.x > canvas.width) { playerScore++; ball.x=canvas.width/2; ball.y=canvas.height/2; ball.vx=-3; ball.vy=2; }
  // AI movement
  if(ai.y+ai.h/2 < ball.y) ai.y += aiSpeed;
  if(ai.y+ai.h/2 > ball.y) ai.y -= aiSpeed;
  ai.y = Math.max(0, Math.min(ai.y, canvas.height-ai.h));
  // Win condition
  if(playerScore >= maxPoints) { isGameOver = true; winner = 'You'; onGameOver(true); }
  if(aiScore >= maxPoints) { isGameOver = true; winner = 'AI'; onGameOver(false); }
}

function onGameOver(won) {
  running = false;
  if(won) {
    gameOverMsg.textContent = `You win Level ${currentLevel}! Score: ${playerScore} (AI Level ${aiSpeed})`;
    if (!isGuest && isOnline) {
      saveScore(username, playerScore, currentLevel, user?.id || null);
    }
    restartBtn.style.display = "inline-block";
    restartBtn.textContent = "Next Level";
  } else {
    gameOverMsg.textContent = `Game Over! AI wins at Level ${currentLevel}.`;
    restartBtn.style.display = "inline-block";
    restartBtn.textContent = "Restart";
    currentLevel = 1;
  }
  if (!isGuest && isOnline) fetchLeaderboard();
}

restartBtn.onclick = () => {
  if(winner === 'You') {
    currentLevel++;
    setLevel(currentLevel);
  } else {
    currentLevel = 1;
    setLevel(currentLevel);
  }
  resetGame();
  running = true;
  loop();
};

document.addEventListener('mousemove', function(e){
  if(!running) return;
  const rect = canvas.getBoundingClientRect();
  let mouseY = e.clientY - rect.top;
  player.y = Math.max(0, Math.min(mouseY - player.h/2, canvas.height-player.h));
});

function loop() {
  if(!running) return;
  update();
  draw();
  if(!isGameOver) requestAnimationFrame(loop);
}

//
// LEADERBOARD LOGIC
//
async function fetchLeaderboard() {
  if (!isOnline || isGuest) {
    leaderboardList.innerHTML = isGuest ? '<li>Sign in to see leaderboard</li>' : '<li>Leaderboard unavailable offline</li>';
    return;
  }
  
  try {
    const { data, error } = await supabase
      .from('Leaderboard')
      .select('username,score,level')
      .order('score', { ascending: false })
      .limit(10);
      
    leaderboardList.innerHTML = '';
    if(data && data.length) {
      data.forEach((entry, i) => {
        const li = document.createElement('li');
        li.textContent = `${i+1}. ${entry.username} - ${entry.score} pts (Level ${entry.level || 1})`;
        leaderboardList.appendChild(li);
      });
    } else {
      const li = document.createElement('li');
      li.textContent = 'No scores yet.';
      leaderboardList.appendChild(li);
    }
  } catch (err) {
    leaderboardList.innerHTML = '<li>Error loading leaderboard</li>';
  }
}

async function saveScore(username, score, level, userId) {
  if (!isOnline || isGuest) return;
  
  try {
    await supabase
      .from('Leaderboard')
      .insert([{ user_id: userId, username, score, level }]);
  } catch (err) {
    console.error("Failed to save score:", err);
  }
}

// On load
window.onload = async () => {
  // Show appropriate UI based on online status
  if (!isOnline) {
    onlineStatus.textContent = "OFFLINE";
    onlineStatus.className = "offline";
  }
  
  // Check for existing session only if online
  if (isOnline) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await fetchUser();
      authModal.style.display = "none";
      gameArea.style.display = "block";
      leaderboardBtn.style.display = "inline-block";
      startGame();
      fetchLeaderboard();
      return;
    }
  }
  
  // Show auth modal with guest option
  authModal.style.display = "flex";
  gameArea.style.display = "none";
  showRegisterForm();
};