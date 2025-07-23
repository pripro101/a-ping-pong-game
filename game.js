// Supabase Configuration
const SUPABASE_URL = 'https://xvdeijzqjumkvchxabwc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2ZGVpanpxanVta3ZjaHhhYndjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwODMwMzEsImV4cCI6MjA2ODY1OTAzMX0.kf6fCNd4n2sVcb06qyHo9zJ_7lRxMUZgryaGbp2mDJ8';

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
    loaderText.innerHTML = `<i class="fas fa-exclamation-triangle"></i><span class="icon-fallback">⚠️</span> ${message}`;
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

// [Rest of your original game.js code remains exactly the same]
// Including all game logic, event listeners, etc.
// Only the icon-related fixes were added at the top