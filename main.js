/****************************************************************************************
 LOVE QUEST — FINAL GAME ENGINE (WITH ROMANTIC ENDING)
****************************************************************************************/

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const overlay = document.getElementById("overlay");
const overlayContent = document.getElementById("overlayContent");

const GRAVITY = 0.9;
const WORLD_WIDTH = 6000;
const GROUND_HEIGHT = 120;
const GROUND_Y = canvas.height - GROUND_HEIGHT;

let cameraX = 0;
let level = 1;
let heartsCollected = 0;
let gamePaused = false;

let level1CelebrationDone = false;
let level2CelebrationDone = false;
let level2QuestionShown = false;
let finalQuestionShown = false;

/* ================= INPUT ================= */
const keys = {};
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

/* ================= GIRL ================= */
const girl = {
  x: 150,
  y: GROUND_Y,
  vy: 0,
  scale: 1,
  onGround: true,
  anim: 0,

  jumpPower() {
    return level === 1 ? -22 : level === 2 ? -26 : -30;
  },

  update() {
    if (gamePaused) return;
    if (keys["ArrowLeft"]) this.x -= 5;
    if (keys["ArrowRight"]) this.x += 5;
    if (keys[" "] && this.onGround) {
      this.vy = this.jumpPower();
      this.onGround = false;
    }

    this.vy += GRAVITY;
    this.y += this.vy;

    if (this.y >= GROUND_Y) {
      this.y = GROUND_Y;
      this.vy = 0;
      this.onGround = true;
    }

    this.anim += 0.15;
    cameraX = Math.max(0, Math.min(this.x - canvas.width / 2, WORLD_WIDTH - canvas.width));
  },

  draw() {
    ctx.save();
    ctx.translate(this.x - cameraX, this.y);
    ctx.scale(this.scale, this.scale);

    ctx.fillStyle = "#ffddb3";
    ctx.fillRect(-8, -42, 16, 14);

    ctx.fillStyle = "#ff4d8d";
    ctx.fillRect(-7, -26, 14, 20);

    ctx.restore();
  }
};

/* ================= TREES ================= */
function Tree(x) {
  this.x = x;
  this.height = 90;
}
Tree.prototype.draw = function () {
  ctx.fillStyle = "#5b3a1e";
  ctx.fillRect(this.x - cameraX, GROUND_Y - this.height, 18, this.height);
};

const trees = [];
for (let i = 0; i < 30; i++) trees.push(new Tree(300 + i * 200));

/* ================= CATS ================= */
function Cat(x) {
  this.x = x;
}
Cat.prototype.update = function () {
  this.x += (girl.x - this.x) * 0.01;
};
Cat.prototype.draw = function () {
  ctx.fillStyle = "#f2c89b";
  ctx.fillRect(this.x - cameraX, GROUND_Y - 14, 20, 10);
};
const cats = [new Cat(600), new Cat(900)];

/* ================= HEARTS ================= */
let hearts = [];
function spawnHearts(count) {
  hearts = [];
  for (let i = 0; i < count; i++) {
    hearts.push({ x: 500 + i * 300, y: GROUND_Y - 150 });
  }
}

function drawHeart(x, y) {
  ctx.fillStyle = "red";
  ctx.beginPath();
  ctx.arc(x - cameraX, y, 8, 0, Math.PI * 2);
  ctx.fill();
}

/* ================= FINAL CELEBRATION ================= */
let finalCelebration = { active: false, stars: [], lanterns: [] };

const boy = {
  x: 0,
  y: GROUND_Y,
  update() {
    if (this.x > girl.x + 40) this.x -= 2;
  },
  draw() {
    ctx.fillStyle = "#222";
    ctx.fillRect(this.x - cameraX, this.y - 26, 16, 22);
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(this.x - cameraX + 14, this.y - 22, 4, 0, Math.PI * 2);
    ctx.fill();
  }
};

function startFinalCelebration() {
  overlay.style.display = "none";
  gamePaused = true;
  finalCelebration.active = true;
  boy.x = girl.x + 400;

  finalCelebration.stars = Array.from({ length: 100 }, () => ({
    x: Math.random() * WORLD_WIDTH,
    y: Math.random() * canvas.height * 0.6
  }));
}

function drawFinalCelebration() {
  ctx.fillStyle = "#050b2e";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#fff";
  finalCelebration.stars.forEach(s =>
    ctx.fillRect(s.x - cameraX, s.y, 2, 2)
  );

  ctx.fillStyle = "#1b3b1b";
  ctx.fillRect(-cameraX, GROUND_Y, WORLD_WIDTH, GROUND_HEIGHT);

  trees.forEach(t => t.draw());
  cats.forEach(c => c.draw());

  girl.draw();
  boy.update();
  boy.draw();

  if (Math.random() < 0.05) {
    finalCelebration.lanterns.push({
      x: girl.x - 300 + Math.random() * 600,
      y: GROUND_Y
    });
  }

  finalCelebration.lanterns.forEach(l => {
    l.y -= 1;
    ctx.fillStyle = "orange";
    ctx.beginPath();
    ctx.arc(l.x - cameraX, l.y, 6, 0, Math.PI * 2);
    ctx.fill();
  });
}

/* ================= QUESTIONS ================= */
function evasiveYes(cb) {
  document.getElementById("yes").onclick = cb;
}

function showFinalQuestion() {
  if (finalQuestionShown) return;
  finalQuestionShown = true;

  overlay.style.display = "flex";
  overlayContent.innerHTML = `
    <h2>Will you be my Valentine my Tanuda ❤️</h2>
    <button id="yes">Yes</button>
    <button>No</button>
  `;
  evasiveYes(startFinalCelebration);
}

/* ================= LOOP ================= */
function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (finalCelebration.active) {
    drawFinalCelebration();
    requestAnimationFrame(loop);
    return;
  }

  ctx.fillStyle = "#4caf50";
  ctx.fillRect(-cameraX, GROUND_Y, WORLD_WIDTH, GROUND_HEIGHT);

  trees.forEach(t => t.draw());
  cats.forEach(c => { c.update(); c.draw(); });

  girl.update();
  girl.draw();

  hearts.forEach((h, i) => {
    drawHeart(h.x, h.y);
    if (Math.abs(h.x - girl.x) < 30) {
      hearts.splice(i, 1);
      heartsCollected++;
    }
  });

  if (level === 3 && heartsCollected === 13) showFinalQuestion();

  requestAnimationFrame(loop);
}

/* ================= START ================= */
spawnHearts(13);
level = 3; // jump to final level for testing
loop();
