/****************************************************************************************
 LOVE QUEST — FINAL GAME ENGINE (WITH ROMANTIC ENDING)
****************************************************************************************/

/* ================= CANVAS ================= */
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

/* ================= DOM ================= */
const overlay = document.getElementById("overlay");
const overlayContent = document.getElementById("overlayContent");

/* ================= WORLD ================= */
const GRAVITY = 0.9;
const WORLD_WIDTH = 6000;
const GROUND_HEIGHT = 120;
const GROUND_Y = canvas.height - GROUND_HEIGHT;

/* ================= STATE ================= */
let cameraX = 0;
let level = 1;
let heartsCollected = 0;
let gamePaused = false;

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
  this.baseHeight = 80 + Math.random() * 60;
  this.width = 16 + Math.random() * 6;

  this.sway = Math.random() * Math.PI * 2;
  this.swaySpeed = 0.004 + Math.random() * 0.006;
  this.swayAmount = 2 + Math.random() * 4;

  this.leafRadius = 40 + Math.random() * 25;
  this.leafColorMain = Math.random() > 0.5 ? "#1f8f3a" : "#2aa84a";
  this.leafColorShadow = "#145c2a";

  this.leaves = [];
  this.spawnTimer = Math.random() * 200;
}

Tree.prototype.update = function () {
  this.sway += this.swaySpeed;

  this.spawnTimer++;
  if (this.spawnTimer > 40 && Math.random() < 0.6) {
    this.spawnTimer = 0;
    this.leaves.push({
      x: this.x + (Math.random() * 40 - 20),
      y: GROUND_Y - this.baseHeight,
      vy: 0.5,
      alpha: 1
    });
  }

  this.leaves.forEach(l => {
    l.y += l.vy;
    l.alpha -= 0.01;
  });

  this.leaves = this.leaves.filter(l => l.alpha > 0);
};

Tree.prototype.draw = function () {
  const swayOffset = Math.sin(this.sway) * this.swayAmount;

  ctx.save();
  ctx.translate(this.x - cameraX + swayOffset, GROUND_Y);

  /* trunk */
  ctx.fillStyle = "#5b3a1e";
  ctx.fillRect(-this.width / 2, -this.baseHeight, this.width, this.baseHeight);

  /* canopy */
  ctx.fillStyle = this.leafColorShadow;
  ctx.beginPath();
  ctx.arc(0, -this.baseHeight, this.leafRadius * 1.05, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = this.leafColorMain;
  ctx.beginPath();
  ctx.arc(-18, -this.baseHeight - 10, this.leafRadius * 0.8, 0, Math.PI * 2);
  ctx.arc(18, -this.baseHeight - 10, this.leafRadius * 0.8, 0, Math.PI * 2);
  ctx.arc(0, -this.baseHeight - 26, this.leafRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  /* falling leaves */
  this.leaves.forEach(l => {
    ctx.fillStyle = `rgba(40,160,80,${l.alpha})`;
    ctx.beginPath();
    ctx.arc(l.x - cameraX, l.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
};

const trees = [];
for (let i = 0; i < 32; i++) trees.push(new Tree(250 + i * 220));

/* ================= CATS ================= */
function Cat(x) {
  this.x = x;
  this.y = GROUND_Y;
  this.anim = Math.random() * Math.PI * 2;
  this.tailAnim = Math.random() * Math.PI * 2;
  this.mood = ["playful", "lazy", "sleepy"][Math.floor(Math.random() * 3)];
  this.followSpeed = this.mood === "playful" ? 0.018 : this.mood === "lazy" ? 0.008 : 0.004;
  this.color = ["#f2c89b", "#d1a679", "#999", "#222", "#f5f5f5"][Math.floor(Math.random() * 5)];
}

Cat.prototype.update = function () {
  this.x += (girl.x - this.x) * this.followSpeed;
  this.anim += 0.12;
  this.tailAnim += 0.2;
};

Cat.prototype.draw = function () {
  ctx.save();
  ctx.translate(this.x - cameraX, this.y);
  ctx.fillStyle = this.color;
  ctx.fillRect(-14, -16, 28, 12);
  ctx.fillRect(-9, -30, 18, 14);
  ctx.restore();
};

const cats = [new Cat(600), new Cat(900), new Cat(1200), new Cat(1500)];

/* ================= HEARTS ================= */
let hearts = [];
function spawnHearts(count) {
  hearts = [];
  for (let i = 0; i < count; i++)
    hearts.push({ x: 500 + i * 300, y: GROUND_Y - 150 });
}

/* ================= FINAL ================= */
let finalCelebration = { active: false };

function startFinalCelebration() {
  overlay.style.display = "none";
  gamePaused = true;
  finalCelebration.active = true;
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

  ctx.fillStyle = "#4caf50";
  ctx.fillRect(-cameraX, GROUND_Y, WORLD_WIDTH, GROUND_HEIGHT);

  trees.forEach(t => { t.update(); t.draw(); });
  cats.forEach(c => { c.update(); c.draw(); });

  girl.update();
  girl.draw();

  hearts.forEach(h => {
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(h.x - cameraX, h.y, 8, 0, Math.PI * 2);
    ctx.fill();
  });

  if (level === 3 && hearts.length === 0) showFinalQuestion();

  requestAnimationFrame(loop);
}

/* ================= START ================= */
spawnHearts(13);
level = 3;
loop();
