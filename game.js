const canvas = document.getElementById('pongCanvas');
const ctx = canvas.getContext('2d');

// Responsive canvas
function resizeCanvas() {
  let w = Math.min(window.innerWidth * 0.96, 800);
  let h = Math.min(window.innerWidth * 0.6, 500);
  if (window.innerHeight < h + 120) h = window.innerHeight - 120;
  canvas.width = w;
  canvas.height = h;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Variables depend on canvas size
function getSettings() {
  return {
    width: canvas.width,
    height: canvas.height,
    paddleWidth: Math.max(10, canvas.width * 0.015),
    paddleHeight: Math.max(60, canvas.height * 0.18),
    paddleSpeed: Math.max(4, canvas.height * 0.012),
    ballSize: Math.max(10, canvas.width * 0.015)
  };
}

let leftScore = 0;
let rightScore = 0;

// State variables
let leftPaddleY, rightPaddleY, ballX, ballY, ballSpeedX, ballSpeedY;

function resetState() {
  const s = getSettings();
  leftPaddleY = s.height / 2 - s.paddleHeight / 2;
  rightPaddleY = s.height / 2 - s.paddleHeight / 2;
  ballX = s.width / 2 - s.ballSize / 2;
  ballY = s.height / 2 - s.ballSize / 2;
  ballSpeedX = (s.width / 160) * (Math.random() > 0.5 ? 1 : -1);
  ballSpeedY = (s.height / 180) * (Math.random() > 0.5 ? 1 : -1);
}
resetState();

function resetBall() {
  const s = getSettings();
  ballX = s.width / 2 - s.ballSize / 2;
  ballY = s.height / 2 - s.ballSize / 2;
  ballSpeedX = (s.width / 160) * (Math.random() > 0.5 ? 1 : -1);
  ballSpeedY = (s.height / 180) * (Math.random() > 0.5 ? 1 : -1);
}

// Mouse control (PC)
canvas.addEventListener('mousemove', function(e) {
  const rect = canvas.getBoundingClientRect();
  let mouseY = e.clientY - rect.top;
  const s = getSettings();
  leftPaddleY = mouseY - s.paddleHeight / 2;
  leftPaddleY = Math.max(0, Math.min(leftPaddleY, s.height - s.paddleHeight));
});

// Touch control (Phone)
canvas.addEventListener('touchmove', function(e) {
  if (e.touches.length > 0) {
    const rect = canvas.getBoundingClientRect();
    let touchY = e.touches[0].clientY - rect.top;
    const s = getSettings();
    leftPaddleY = touchY - s.paddleHeight / 2;
    leftPaddleY = Math.max(0, Math.min(leftPaddleY, s.height - s.paddleHeight));
  }
  e.preventDefault();
}, { passive: false });

function drawRect(x, y, w, h, color = '#fff') {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function drawBall(x, y, size, color = '#fff') {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawNet() {
  const s = getSettings();
  ctx.strokeStyle = '#fff3';
  ctx.lineWidth = 2;
  for (let i = 0; i < s.height; i += 30) {
    ctx.beginPath();
    ctx.moveTo(s.width / 2, i);
    ctx.lineTo(s.width / 2, i + 20);
    ctx.stroke();
  }
}

function updateAI() {
  const s = getSettings();
  const aiCenter = rightPaddleY + s.paddleHeight / 2;
  const ballCenter = ballY + s.ballSize / 2;
  if (aiCenter < ballCenter - 10) rightPaddleY += s.paddleSpeed;
  else if (aiCenter > ballCenter + 10) rightPaddleY -= s.paddleSpeed;
  rightPaddleY = Math.max(0, Math.min(rightPaddleY, s.height - s.paddleHeight));
}

function updateBall() {
  const s = getSettings();
  ballX += ballSpeedX;
  ballY += ballSpeedY;

  // Wall collision
  if (ballY <= 0) {
    ballY = 0;
    ballSpeedY *= -1;
  }
  if (ballY + s.ballSize >= s.height) {
    ballY = s.height - s.ballSize;
    ballSpeedY *= -1;
  }

  // Paddle collision (left/player)
  if (
    ballX <= s.paddleWidth &&
    ballY + s.ballSize > leftPaddleY &&
    ballY < leftPaddleY + s.paddleHeight
  ) {
    ballX = s.paddleWidth;
    ballSpeedX *= -1;
    let hitPos = (ballY + s.ballSize / 2 - (leftPaddleY + s.paddleHeight / 2)) / (s.paddleHeight / 2);
    ballSpeedY += hitPos * 2;
  }

  // Paddle collision (right/AI)
  if (
    ballX + s.ballSize >= s.width - s.paddleWidth &&
    ballY + s.ballSize > rightPaddleY &&
    ballY < rightPaddleY + s.paddleHeight
  ) {
    ballX = s.width - s.paddleWidth - s.ballSize;
    ballSpeedX *= -1;
    let hitPos = (ballY + s.ballSize / 2 - (rightPaddleY + s.paddleHeight / 2)) / (s.paddleHeight / 2);
    ballSpeedY += hitPos * 2;
  }

  // Score!
  if (ballX < 0) {
    rightScore++;
    document.getElementById('rightScore').textContent = rightScore;
    resetBall();
  }
  if (ballX + s.ballSize > s.width) {
    leftScore++;
    document.getElementById('leftScore').textContent = leftScore;
    resetBall();
  }
}

function draw() {
  const s = getSettings();
  ctx.clearRect(0, 0, s.width, s.height);

  drawNet();

  // Left paddle (player)
  drawRect(0, leftPaddleY, s.paddleWidth, s.paddleHeight, '#43f');

  // Right paddle (AI)
  drawRect(s.width - s.paddleWidth, rightPaddleY, s.paddleWidth, s.paddleHeight, '#f34');

  // Ball
  drawBall(ballX, ballY, s.ballSize, '#fff');

  // Ball shadow
  ctx.globalAlpha = 0.2;
  drawBall(ballX + 6, ballY + 6, s.ballSize, '#000');
  ctx.globalAlpha = 1.0;
}

// Reset state when canvas is resized
window.addEventListener('resize', () => {
  resetState();
});

function gameLoop() {
  updateAI();
  updateBall();
  draw();
  requestAnimationFrame(gameLoop);
}

// Start game
gameLoop();