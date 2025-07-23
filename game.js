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
// GAME AREA SIZE CONFIGURATION
// ========================

function resizeCanvas() {
  // Make the game area larger by using 80% of window height
  const maxHeight = window.innerHeight * 0.8;
  const ratio = 16/9;
  const width = maxHeight * ratio;
  const height = maxHeight;
  
  // Ensure it doesn't overflow horizontally (95% of window width)
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

// ========================
// AUTHENTICATION IMPROVEMENTS
// ========================

async function handleRegister(email, password, username) {
  const errorEl = document.getElementById('regError');
  errorEl.textContent = '';
  
  try {
    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Please enter a valid email address (e.g., user@example.com)");
    }
    
    // Validate password strength
    if (!/(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*\W)/.test(password)) {
      throw new Error("Password must contain: uppercase, lowercase, number, and special character");
    }
    
    // Validate username
    if (!/^[a-zA-Z0-9_]{3,15}$/.test(username)) {
      throw new Error("Username must be 3-15 characters (letters, numbers, underscores only)");
    }

    // Check if username is available
    const { data: usernameCheck } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single();

    if (usernameCheck) {
      throw new Error("Username already taken");
    }

    // Check if email already exists
    const { data: emailCheck } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', email)
      .single();

    if (emailCheck) {
      throw new Error("Email already registered");
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          device: deviceType,
          os: os
        },
        emailRedirectTo: window.location.origin
      }
    });

    if (error) throw error;

    errorEl.textContent = "Registration successful! Please check your email to verify your account.";
    errorEl.style.color = "#00b894";

    // Auto-switch to login form after registration
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
    
  } catch (err) {
    errorEl.textContent = err.message || "Registration failed. Please check your details.";
    errorEl.style.color = "#ff5555";
  }
}

async function handleLogin(email, password) {
  const errorEl = document.getElementById('loginError');
  errorEl.textContent = '';
  
  try {
    // Basic email validation
    if (!email.includes('@')) {
      throw new Error("Please enter a valid email address");
    }
    
    // Basic password validation
    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (error) throw error;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Login failed - no session created");

    await fetchUser();
    authModal.style.display = "none";
    gameContainer.style.display = "block";
    startGame();
    
  } catch (err) {
    errorEl.textContent = err.message.includes('Invalid login credentials')
      ? "Incorrect email or password"
      : err.message || "Login failed. Please try again.";
    errorEl.style.color = "#ff5555";
  }
}

// ========================
// REST OF THE GAME CODE 
// (initGameObjects, gameLoop, update, draw, etc. remain exactly the same)
// ========================

[Previous game logic code remains unchanged...]

// ========================
// EVENT LISTENERS
// ========================

window.addEventListener('DOMContentLoaded', initializeGame);
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

[Rest of the event listeners remain unchanged...]