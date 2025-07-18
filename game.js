const canvas = document.getElementById('pongCanvas');
const ctx = canvas.getContext('2d');

const width = canvas.width;
const height = canvas.height;

// Paddle settings
const paddleWidth = 12;
const paddleHeight = 90;
const paddleSpeed = 6;

// Ball settings
const ballSize = 12;
let ballX = width / 2 - ballSize / 2;
let ballY = height / 2 - ballSize / 2;
let ballSpeedX = 5 * (Math.random() > 0.5 ? 1 : -1);
let ballSpeedY = 3 * (Math.random() > 0.5 ? 1 : -1);

// Left paddle (player)
let leftPaddleY = height / 2 - paddleHeight / 2;

// Right paddle (AI)
let rightPaddleY = height / 2 - paddleHeight / 2;

// Scores
let leftScore = 0;
let rightScore = 0;

// Mouse control for left paddle
canvas.addEventListener('mousemove', function(e) {
  const rect = canvas.getBoundingClientRect();
  let mouseY = e.clientY - rect.top;
  leftPaddleY = mouseY - paddleHeight / 2;
  // Clamp paddle inside canvas
  leftPaddleY = Math.max(0, Math.min(leftPaddleY, height - paddleHeight));
});

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
  ctx.strokeStyle = '#fff3';
  ctx.lineWidth = 2;
  for (let i = 0; i < height; i += 30) {
    ctx.beginPath();
    ctx.moveTo(width / 2, i);
    ctx.lineTo(width / 2, i + 20);
    ctx.stroke();
  }
}

function resetBall() {
  ballX = width / 2 - ballSize / 2;
  ballY = height / 2 - ballSize / 2;
  ballSpeedX = 5 * (Math.random() > 0.5 ? 1 : -1);
  ballSpeedY = 3 * (Math.random() > 0.5 ? 1 : -1);
}

function updateAI() {
  // Simple AI: move paddle center toward ball center
  const aiCenter = rightPaddleY + paddleHeight / 2;
  const ballCenter = ballY + ballSize / 2;
  if (aiCenter < ballCenter - 10) rightPaddleY += paddleSpeed;
  else if (aiCenter > ballCenter + 10) rightPaddleY -= paddleSpeed;
  // Clamp inside canvas
  rightPaddleY = Math.max(0, Math.min(rightPaddleY, height - paddleHeight));
}

function updateBall() {
  ballX += ballSpeedX;
  ballY += ballSpeedY;

  // Wall collision (top/bottom)
  if (ballY <= 0) {
    ballY = 0;
    ballSpeedY *= -1;
  }
  if (ballY + ballSize >= height) {
    ballY = height - ballSize;
    ballSpeedY *= -1;
  }

  // Paddle collision (left/player)
  if (
    ballX <= paddleWidth &&
    ballY + ballSize > leftPaddleY &&
    ballY < leftPaddleY + paddleHeight
  ) {
    ballX = paddleWidth;
    ballSpeedX *= -1;
    // Add some "spin" based on where ball hits paddle
    let hitPos = (ballY + ballSize / 2 - (leftPaddleY + paddleHeight / 2)) / (paddleHeight / 2);
    ballSpeedY += hitPos * 2;
  }

  // Paddle collision (right/AI)
  if (
    ballX + ballSize >= width - paddleWidth &&
    ballY + ballSize > rightPaddleY &&
    ballY < rightPaddleY + paddleHeight
  ) {
    ballX = width - paddleWidth - ballSize;
    ballSpeedX *= -1;
    // Add some "spin"
    let hitPos = (ballY + ballSize / 2 - (rightPaddleY + paddleHeight / 2)) / (paddleHeight / 2);
    ballSpeedY += hitPos * 2;
  }

  // Score!
  if (ballX < 0) {
    rightScore++;
    document.getElementById('rightScore').textContent = rightScore;
    resetBall();
  }
  if (ballX + ballSize > width) {
    leftScore++;
    document.getElementById('leftScore').textContent = leftScore;
    resetBall();
  }
}

function draw() {
  ctx.clearRect(0, 0, width, height);

  drawNet();

  // Left paddle (player)
  drawRect(0, leftPaddleY, paddleWidth, paddleHeight, '#43f');

  // Right paddle (AI)
  drawRect(width - paddleWidth, rightPaddleY, paddleWidth, paddleHeight, '#f34');

  // Ball
  drawBall(ballX, ballY, ballSize, '#fff');

  // Optionally, draw a shadow for ball (visual polish)
  ctx.globalAlpha = 0.2;
  drawBall(ballX + 6, ballY + 6, ballSize, '#000');
  ctx.globalAlpha = 1.0;
}

function gameLoop() {
  updateAI();
  updateBall();
  draw();
  requestAnimationFrame(gameLoop);
}

// Start game
resetBall();
gameLoop();