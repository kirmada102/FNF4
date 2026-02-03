/****************************************************************************************
 LOVE QUEST — FINAL GAME ENGINE (FULL WORKING VERSION)
****************************************************************************************/

/* =============================================================================
   CANVAS & DOM
============================================================================= */
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const overlay = document.getElementById("overlay");
const overlayContent = document.getElementById("overlayContent");

/* =============================================================================
   WORLD CONSTANTS
============================================================================= */
const GRAVITY = 0.9;
const WORLD_WIDTH = 6000;
const GROUND_HEIGHT = 120;
const GROUND_Y = canvas.height - GROUND_HEIGHT;

/* =============================================================================
   GLOBAL STATE
============================================================================= */
let cameraX = 0;
let level = 1;
let heartsCollected = 0;
let gamePaused = false;

let level1CelebrationDone = false;
let level2CelebrationDone = false;
let level2QuestionShown = false;
let finalQuestionShown = false;

/* =============================================================================
   INPUT
============================================================================= */
const keys = {};
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

/* =============================================================================
   PLAYER — GIRL
============================================================================= */
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

    cameraX = Math.max(
      0,
      Math.min(this.x - canvas.width / 2, WORLD_WIDTH - canvas.width)
    );
  },

  draw() {
    ctx.save();
    ctx.translate(this.x - cameraX, this.y);
    ctx.scale(this.scale, this.scale);

    ctx.fillStyle = "#5a2d0c";
    ctx.fillRect(-10, -48, 20, 6);

    ctx.fillStyle = "#ffddb3";
    ctx.fillRect(-8, -42, 16, 14);

    ctx.fillStyle = "#000";
    ctx.fillRect(-4, -38, 2, 2);
    ctx.fillRect(2, -38, 2, 2);

    ctx.fillStyle = "#ff4d8d";
    ctx.fillRect(-7, -26, 14, 20);

    ctx.strokeStyle = "#000";
    ctx.beginPath();
    ctx.moveTo(-7, -22);
    ctx.lineTo(-14, -18 + Math.sin(this.anim) * 4);
    ctx.moveTo(7, -22);
    ctx.lineTo(14, -18 - Math.sin(this.anim) * 4);
    ctx.stroke();

    ctx.fillRect(-6, -6 + Math.sin(this.anim) * 2, 4, 8);
    ctx.fillRect(2, -6 - Math.sin(this.anim) * 2, 4, 8);

    ctx.restore();
  }
};

/* =============================================================================
   TREES — WAVY + FALLING LEAVES
============================================================================= */
function Tree(x) {
  this.x = x;
  this.height = 80 + Math.random() * 50;
  this.width = 16 + Math.random() * 6;
  this.sway = Math.random() * Math.PI * 2;
  this.swaySpeed = 0.004 + Math.random() * 0.006;
  this.swayAmount = 2 + Math.random() * 4;
  this.leafRadius = 40 + Math.random() * 20;
  this.leaves = [];
}

Tree.prototype.update = function () {
  this.sway += this.swaySpeed;

  if (Math.random() < 0.03) {
    this.leaves.push({
      x: this.x + Math.random() * 40 - 20,
      y: GROUND_Y - this.height,
      vy: 0.6,
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

  ctx.fillStyle = "#5b3a1e";
  ctx.fillRect(-this.width / 2, -this.height, this.width, this.height);

  ctx.fillStyle = "#1f8f3a";
  ctx.beginPath();
  ctx.arc(0, -this.height, this.leafRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  this.leaves.forEach(l => {
    ctx.fillStyle = `rgba(40,160,80,${l.alpha})`;
    ctx.beginPath();
    ctx.arc(l.x - cameraX, l.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
};

const trees = [];
for (let i = 0; i < 30; i++) trees.push(new Tree(300 + i * 220));

/* =============================================================================
   CATS — MOODS + WAVY TAILS
============================================================================= */
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

  ctx.strokeStyle = this.color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(14, -12);
  for (let i = 0; i < 5; i++) {
    ctx.lineTo(
      14 + i * 6,
      -12 + Math.sin(this.tailAnim + i) * (this.mood === "playful" ? 6 : 3)
    );
  }
  ctx.stroke();

  ctx.restore();
};

const cats = [new Cat(600), new Cat(900), new Cat(1200), new Cat(1500)];

/* =============================================================================
   HEARTS
============================================================================= */
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

/* =============================================================================
   CELEBRATION OVERLAY
============================================================================= */
let celebrationActive = false;
let celebrationTimer = 0;
let celebrationText = "";
let celebrationCallback = null;

function startCelebration(text, cb) {
  celebrationActive = true;
  celebrationTimer = 180;
  celebrationText = text;
  celebrationCallback = cb;
  gamePaused = true;
}

function drawCelebration() {
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 32px Arial";
  ctx.textAlign = "center";
  ctx.fillText(celebrationText, canvas.width / 2, canvas.height / 2);
  celebrationTimer--;
  if (celebrationTimer <= 0) {
    celebrationActive = false;
    gamePaused = false;
    celebrationCallback && celebrationCallback();
  }
}

/* =============================================================================
   FINAL CELEBRATION — CINEMATIC NIGHT + LANTERNS
============================================================================= */

const FINAL_DURATION = 20 * 60; // ~20 seconds at 60fps

let finalCelebration = {
  active: false,
  timer: 0,
  stars: [],
  lanterns: [],
  lanternsSpawned: 0,
  maxLanterns: 220,
  phase: "boyWalk" // boyWalk → rose → lanterns → fade
};

/* ================= BOY CHARACTER ================= */
const boy = {
  x: 0,
  y: GROUND_Y,
  speed: 2,
  stopped: false,

  update() {
    if (!this.stopped) {
      if (this.x > girl.x + 50) {
        this.x -= this.speed;
      } else {
        this.stopped = true;
        finalCelebration.phase = "rose";
      }
    }
  },

  draw() {
    ctx.save();
    ctx.translate(this.x - cameraX, this.y);

    // hoodie
    ctx.fillStyle = "#222";
    ctx.fillRect(-8, -26, 16, 22);

    // head
    ctx.fillStyle = "#ffddb3";
    ctx.fillRect(-7, -42, 14, 14);

    // rose
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(14, -22, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
};

/* ================= START FINAL CELEBRATION ================= */
function startFinalCelebration() {
  overlay.style.display = "none";
  gamePaused = true;

  finalCelebration.active = true;
  finalCelebration.timer = 0;
  finalCelebration.phase = "boyWalk";
  finalCelebration.lanterns = [];
  finalCelebration.lanternsSpawned = 0;

  boy.x = girl.x + 450;
  boy.stopped = false;

  // stars
  finalCelebration.stars = Array.from({ length: 180 }, () => ({
    x: Math.random() * WORLD_WIDTH,
    y: Math.random() * canvas.height * 0.6,
    r: Math.random() * 1.8 + 0.2,
    tw: Math.random() * Math.PI * 2
  }));
}

/* ================= FIRE LANTERN ================= */
function createLantern() {
  finalCelebration.lanterns.push({
    x: girl.x - 500 + Math.random() * 1000,
    y: GROUND_Y + 20 + Math.random() * 40,
    vy: 0.4 + Math.random() * 0.6,
    sway: Math.random() * Math.PI * 2,
    swaySpeed: 0.01 + Math.random() * 0.02,
    size: 6 + Math.random() * 6,
    glow: 0.6 + Math.random() * 0.4,
    alpha: 1,
    depth: 0.6 + Math.random() * 0.6 // parallax
  });
}

/* ================= DRAW FINAL SCENE ================= */
function drawFinalCelebration() {
  finalCelebration.timer++;

  /* ---- NIGHT SKY GRADIENT ---- */
  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, "#020111");
  g.addColorStop(0.5, "#050b2e");
  g.addColorStop(1, "#0b1b3f");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  /* ---- STARS ---- */
  ctx.fillStyle = "#fff";
  finalCelebration.stars.forEach(s => {
    s.tw += 0.02;
    const twinkle = Math.sin(s.tw) * 0.5 + 0.5;
    ctx.globalAlpha = 0.4 + twinkle * 0.6;
    ctx.beginPath();
    ctx.arc(s.x - cameraX * 0.2, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  /* ---- GROUND ---- */
  ctx.fillStyle = "#142b14";
  ctx.fillRect(-cameraX, GROUND_Y, WORLD_WIDTH, GROUND_HEIGHT);

  trees.forEach(t => t.draw());
  cats.forEach(c => c.draw());
  girl.draw();

  /* ---- BOY ---- */
  if (finalCelebration.phase === "boyWalk" || finalCelebration.phase === "rose") {
    boy.update();
    boy.draw();
  }

  /* ---- START LANTERNS AFTER ROSE ---- */
  if (finalCelebration.phase === "rose" && finalCelebration.timer > 120) {
    finalCelebration.phase = "lanterns";
  }

  /* ---- SPAWN LANTERNS ---- */
  if (
    finalCelebration.phase === "lanterns" &&
    finalCelebration.lanternsSpawned < finalCelebration.maxLanterns
  ) {
    for (let i = 0; i < 3; i++) {
      createLantern();
      finalCelebration.lanternsSpawned++;
      if (finalCelebration.lanternsSpawned >= finalCelebration.maxLanterns) break;
    }
  }

  /* ---- DRAW LANTERNS ---- */
  finalCelebration.lanterns.forEach(l => {
    l.y -= l.vy * l.depth;
    l.sway += l.swaySpeed;
    l.x += Math.sin(l.sway) * 0.2;
    l.alpha -= 0.0008;

    // glow
    ctx.globalAlpha = l.alpha * 0.6;
    ctx.fillStyle = "rgba(255,180,80,0.4)";
    ctx.beginPath();
    ctx.arc(l.x - cameraX * l.depth, l.y, l.size * 2.5, 0, Math.PI * 2);
    ctx.fill();

    // lantern body
    ctx.globalAlpha = l.alpha;
    ctx.fillStyle = "rgb(255,200,120)";
    ctx.beginPath();
    ctx.ellipse(
      l.x - cameraX * l.depth,
      l.y,
      l.size,
      l.size * 1.3,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
  });

  ctx.globalAlpha = 1;

  /* ---- END AFTER ~20s ---- */
  if (finalCelebration.timer > FINAL_DURATION) {
    finalCelebration.active = false;
  }
}


/* =============================================================================
   QUESTIONS
============================================================================= */
function evasiveYes(cb) {
  document.getElementById("yes").onclick = cb;
}

function showFinalQuestion() {
  if (finalQuestionShown) return;
  finalQuestionShown = true;
  overlay.style.display = "flex";
  overlayContent.innerHTML = `
    <h2>Will you be my Valentine ❤️</h2>
    <button id="yes">Yes</button>
    <button>No</button>
  `;
  evasiveYes(startFinalCelebration);
}

/* =============================================================================
   MAIN LOOP
============================================================================= */
function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (finalCelebration.active) {
    ctx.fillStyle = "#050b2e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    finalCelebration.stars.forEach(s => ctx.fillRect(s.x - cameraX, s.y, 2, 2));
    ctx.fillStyle = "#1b3b1b";
    ctx.fillRect(-cameraX, GROUND_Y, WORLD_WIDTH, GROUND_HEIGHT);
    trees.forEach(t => t.draw());
    girl.draw();
    boy.update();
    boy.draw();
    requestAnimationFrame(loop);
    return;
  }

 if (finalCelebration.active) {
  drawFinalCelebration();
  requestAnimationFrame(loop);
  return;
}

  ctx.fillStyle = "#4caf50";
  ctx.fillRect(-cameraX, GROUND_Y, WORLD_WIDTH, GROUND_HEIGHT);

  trees.forEach(t => { t.update(); t.draw(); });
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

  if (level === 1 && heartsCollected === 10 && !level1CelebrationDone) {
    level1CelebrationDone = true;
    startCelebration("LEVEL 1 COMPLETE ❤️", () => {
      level = 2;
      heartsCollected = 0;
      spawnHearts(12);
    });
  }

  if (level === 2 && heartsCollected === 12 && !level2CelebrationDone) {
    level2CelebrationDone = true;
    startCelebration("LEVEL 2 COMPLETE ❤️", () => {
      level = 3;
      heartsCollected = 0;
      spawnHearts(13);
    });
  }

  if (level === 3 && heartsCollected === 13) showFinalQuestion();

  requestAnimationFrame(loop);
}

/* =============================================================================
   START GAME
============================================================================= */
spawnHearts(10);
loop();
