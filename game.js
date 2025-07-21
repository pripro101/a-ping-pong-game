// Supabase settings
const SUPABASE_URL = 'https://xvdeijzqjumkvchxabwc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2ZGVpanpxanVta3ZjaHhhYndjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwODMwMzEsImV4cCI6MjA2ODY1OTAzMX0.kf6fCNd4n2sVcb06qyHo9zJ_7lRxMUZgryaGbp2mDJ8';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Auth Elements
const authModal = document.getElementById('authModal');
const registerForm = document.getElementById('registerForm');
const loginForm = document.getElementById('loginForm');
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

registerForm.onsubmit = async (e) => {
  e.preventDefault();
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
      options: { data: { username: uname } }
    });
    if (error) throw error;
    // Wait for email confirmation if required
    regError.textContent = "Registration successful! Please check your email to confirm.";
  } catch (err) {
    regError.textContent = err.message || "Registration failed.";
  }
};

loginForm.onsubmit = async (e) => {
  e.preventDefault();
  loginError.textContent = "";
  const email = loginEmail.value.trim();
  const pass = loginPassword.value;
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
    await fetchUser();
    authModal.style.display = "none";
    gameArea.style.display = "block";
    startGame();
    fetchLeaderboard();
  } catch (err) {
    loginError.textContent = err.message || "Login failed.";
  }
};

async function fetchUser() {
  const { data: { user: gotUser } } = await supabase.auth.getUser();
  user = gotUser;
  username = user?.user_metadata?.username || "Guest";
  userBar.textContent = `Logged in as: ${username}`;
}

//
// GAME LOGIC
//
function getLevelSettings(level) {
  if (level === 1) return { aiSpeed: 2, maxPoints: 5 };
  // For higher levels, randomize AI speed and max points (increase difficulty)
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
  // AI movement - gets stronger each level
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
    saveScore(username, playerScore, currentLevel, user?.id || null);
    restartBtn.style.display = "inline-block";
    restartBtn.textContent = "Next Level";
  } else {
    gameOverMsg.textContent = `Game Over! AI wins at Level ${currentLevel}.`;
    restartBtn.style.display = "inline-block";
    restartBtn.textContent = "Restart";
    currentLevel = 1;
  }
  fetchLeaderboard();
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
  // Show top 10 scores (username, score, level)
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
}

async function saveScore(username, score, level, userId) {
  await supabase
    .from('Leaderboard')
    .insert([{ user_id: userId, username, score, level }]);
  await fetchLeaderboard();
}

// On load: show auth modal if not logged in
window.onload = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    authModal.style.display = "flex";
    gameArea.style.display = "none";
    showRegisterForm();
  } else {
    await fetchUser();
    authModal.style.display = "none";
    gameArea.style.display = "block";
    startGame();
    fetchLeaderboard();
  }
};