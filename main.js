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
/* =============================================================================
   ADVANCED WAVY TREES WITH FALLING LEAVES
============================================================================= */

function Tree(x) {
  this.x = x;
  this.baseHeight = 80 + Math.random() * 60;
  this.width = 16 + Math.random() * 6;

  // wind / sway
  this.sway = Math.random() * Math.PI * 2;
  this.swaySpeed = 0.004 + Math.random() * 0.006;
  this.swayAmount = 2 + Math.random() * 4;

  // canopy
  this.leafRadius = 40 + Math.random() * 25;
  this.leafColorMain = Math.random() > 0.5 ? "#1f8f3a" : "#2aa84a";
  this.leafColorShadow = "#145c2a";

  // falling leaves
  this.leaves = [];
  this.spawnTimer = Math.random() * 200;
}

/* ---------- TREE UPDATE ---------- */
Tree.prototype.update = function () {
  this.sway += this.swaySpeed;

  // spawn falling leaves
  this.spawnTimer++;
  if (this.spawnTimer > 40) {
    this.spawnTimer = 0;
    if (Math.random() < 0.6) {
      this.leaves.push({
        x: this.x + (Math.random() * 40 - 20),
        y: GROUND_Y - this.baseHeight - Math.random() * 40,
        vy: 0.5 + Math.random(),
        vx: Math.random() * 0.6 - 0.3,
        rot: Math.random() * Math.PI,
        rotSpeed: Math.random() * 0.1 - 0.05,
        size: 4 + Math.random() * 3,
        alpha: 0.8
      });
    }
  }

  // update leaves
  this.leaves.forEach(l => {
    l.vy += 0.01;
    l.y += l.vy;
    l.x += l.vx + Math.sin(this.sway) * 0.2;
    l.rot += l.rotSpeed;
    l.alpha -= 0.002;
  });

  // cleanup
  this.leaves = this.leaves.filter(l => l.y < GROUND_Y && l.alpha > 0);
};

/* ---------- TREE DRAW ---------- */
Tree.prototype.draw = function () {
  const swayOffset = Math.sin(this.sway) * this.swayAmount;

  ctx.save();
  ctx.translate(this.x - cameraX + swayOffset, GROUND_Y);

  /* ===== TRUNK ===== */
  ctx.fillStyle = "#5b3a1e";
  ctx.fillRect(
    -this.width / 2,
    -this.baseHeight,
    this.width,
    this.baseHeight
  );

  /* wood grain */
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(-this.width / 2 + Math.random() * this.width, -this.baseHeight);
    ctx.lineTo(-this.width / 2 + Math.random() * this.width, 0);
    ctx.stroke();
  }

  /* ===== CANOPY (LAYERED LEAVES) ===== */
  ctx.fillStyle = this.leafColorShadow;
  ctx.beginPath();
  ctx.arc(0, -this.baseHeight + 6, this.leafRadius * 1.05, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = this.leafColorMain;
  ctx.beginPath();
  ctx.arc(-18, -this.baseHeight - 6, this.leafRadius * 0.8, 0, Math.PI * 2);
  ctx.arc(18, -this.baseHeight - 6, this.leafRadius * 0.8, 0, Math.PI * 2);
  ctx.arc(0, -this.baseHeight - 20, this.leafRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

 /* ================= CATS ================= */

 /* =============================================================================
   REALISTIC CATS — MOODS, WAVY TAILS, COLORS
============================================================================= */

function Cat(x) {
  this.x = x;
  this.y = GROUND_Y;

  // animation
  this.anim = Math.random() * Math.PI * 2;
  this.tailAnim = Math.random() * Math.PI * 2;

  // personality
  const moods = ["playful", "lazy", "sleepy"];
  this.mood = moods[Math.floor(Math.random() * moods.length)];

  // movement speed based on mood
  this.followSpeed =
    this.mood === "playful" ? 0.018 :
    this.mood === "lazy" ? 0.008 : 0.004;

  // appearance
  const colors = ["#f2c89b", "#d1a679", "#999999", "#222222", "#f5f5f5"];
  this.color = colors[Math.floor(Math.random() * colors.length)];

  this.hasStripes = Math.random() > 0.5;
  this.eyeOpen = this.mood !== "sleepy";
}

Cat.prototype.update = function () {
  // follow girl softly
  this.x += (girl.x - this.x) * this.followSpeed;

  this.anim += 0.12;
  this.tailAnim += 0.2;
};

Cat.prototype.draw = function () {
  ctx.save();
  ctx.translate(this.x - cameraX, this.y);

  const bounce =
    this.mood === "playful" ? Math.sin(this.anim) * 4 :
    this.mood === "lazy" ? Math.sin(this.anim) * 1.5 : 0;

  ctx.translate(0, bounce);

  /* ---- BODY ---- */
  ctx.fillStyle = this.color;
  ctx.fillRect(-14, -16, 28, 12); // body

  /* ---- STRIPES ---- */
  if (this.hasStripes) {
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(-10, -15, 3, 10);
    ctx.fillRect(-2, -15, 3, 10);
    ctx.fillRect(6, -15, 3, 10);
  }

  /* ---- HEAD ---- */
  ctx.fillStyle = this.color;
  ctx.fillRect(-9, -30, 18, 14);

  /* ---- EARS ---- */
  ctx.fillRect(-9, -36, 5, 6);
  ctx.fillRect(4, -36, 5, 6);

  /* ---- EYES ---- */
  ctx.fillStyle = "#000";
  if (this.eyeOpen) {
    ctx.fillRect(-4, -24, 2, 2);
    ctx.fillRect(2, -24, 2, 2);
  } else {
    ctx.fillRect(-4, -23, 4, 1); // sleepy eyes
  }

  /* ---- LEGS ---- */
  ctx.fillStyle = this.color;
  ctx.fillRect(-10, -4 + Math.sin(this.anim) * 2, 4, 6);
  ctx.fillRect(-2, -4 - Math.sin(this.anim) * 2, 4, 6);
  ctx.fillRect(6, -4 + Math.sin(this.anim) * 2, 4, 6);

  /* ---- WAVY TAIL ---- */
  ctx.strokeStyle = this.color;
  ctx.lineWidth = 3;
  ctx.beginPath();

  let tailX = 14;
  let tailY = -12;

  ctx.moveTo(tailX, tailY);

  for (let i = 0; i < 5; i++) {
    const wave =
      Math.sin(this.tailAnim + i * 0.8) *
      (this.mood === "playful" ? 6 : this.mood === "lazy" ? 3 : 1);

    ctx.lineTo(
      tailX + i * 6,
      tailY + wave
    );
  }

  ctx.stroke();

  ctx.restore();
};

/* ---- CREATE MULTIPLE CATS ---- */
const cats = [
  new Cat(600),
  new Cat(900),
  new Cat(1200),
  new Cat(1500)
];


  /* ===== FALLING LEAVES ===== */
  this.leaves.forEach(l => {
    ctx.save();
    ctx.translate(l.x - cameraX, l.y);
    ctx.rotate(l.rot);
    ctx.fillStyle = `rgba(40,160,80,${l.alpha})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, l.size, l.size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
};

/* ---------- TREE INSTANCES ---------- */
const trees = [];
for (let i = 0; i < 32; i++) {
  trees.push(new Tree(250 + i * 220));
}

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
