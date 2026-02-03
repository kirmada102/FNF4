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


// Lantern music
const lanternMusic = new Audio("lanterns.mp3");
lanternMusic.loop = true;
lanternMusic.volume = 0.6;
let lanternMusicStarted = false;


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
let gameStarted = false;

let levelTimerFrames = 0;

function getLevelTarget() {
  if (level === 1) return 10;
  if (level === 2) return 12;
  return 13;
}

function formatTime(frames) {
  const totalSeconds = Math.floor(frames / 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function drawHUD() {
  const time = formatTime(levelTimerFrames);
  const target = getLevelTarget();

  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(16, 16, 210, 72);

  ctx.fillStyle = "#fff";
  ctx.font = "bold 14px Arial";
  ctx.textBaseline = "top";
  ctx.fillText(`Level ${level}`, 26, 26);
  ctx.font = "13px Arial";
  ctx.fillText(`Time: ${time}`, 26, 44);
  ctx.fillText(`Hearts: ${heartsCollected}/${target}`, 26, 60);
  ctx.restore();
}


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
   TREES — PIXEL CANOPY + BRANCHES + WINDY LEAVES
============================================================================= */
let wind = 0;
let windTarget = 0;
let windTick = 0;

function updateWind() {
  windTick += 0.02;
  if (Math.random() < 0.01) {
    windTarget = (Math.random() * 2 - 1) * 1.6;
  }
  wind += (windTarget - wind) * 0.02;
}

function drawWind() {
  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 2;

  for (let i = 0; i < 7; i++) {
    const y = (i * 90 + windTick * 60) % GROUND_Y;
    const x = (i * 160 + windTick * 80) % canvas.width;
    const len = 60 + i * 10;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len + wind * 25, y);
    ctx.stroke();
  }

  ctx.restore();
}

function Tree(x) {
  this.x = x;
  this.height = 110 + Math.random() * 70;
  this.trunkWidth = 22 + Math.random() * 10;
  this.sway = Math.random() * Math.PI * 2;
  this.swaySpeed = 0.002 + Math.random() * 0.003;
  this.swayAmount = 2 + Math.random() * 3;

  this.canopyBlocks = [];
  this.branches = [];
  this.vines = [];
  this.leaves = [];

  const canopyRadius = 60 + Math.random() * 20;
  const canopyY = -this.height + 10;
  const palette = ["#0f6a2c", "#1a7f36", "#7ebf3b", "#9bd24b"];

  const blockCount = 18 + Math.floor(Math.random() * 6);
  for (let i = 0; i < blockCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * canopyRadius;
    let size = 16 + Math.random() * 18;
    size = Math.round(size / 4) * 4;

    this.canopyBlocks.push({
      x: Math.round(Math.cos(angle) * r / 4) * 4,
      y: Math.round((Math.sin(angle) * r * 0.6 + canopyY) / 4) * 4,
      w: size,
      h: size,
      color: palette[Math.floor(Math.random() * palette.length)]
    });
  }

  for (let i = 0; i < 4; i++) {
    this.branches.push({
      y: -this.height + 30 + Math.random() * 50,
      len: 18 + Math.random() * 28,
      dir: Math.random() < 0.5 ? -1 : 1
    });
  }

  for (let i = 0; i < 6; i++) {
    this.vines.push({
      x: -40 + Math.random() * 80,
      y: canopyY + 20 + Math.random() * 40,
      len: 25 + Math.random() * 35,
      phase: Math.random() * Math.PI * 2
    });
  }
}

Tree.prototype.update = function () {
  this.sway += this.swaySpeed + Math.abs(wind) * 0.001;

  if (Math.random() < 0.04) {
    const c = this.canopyBlocks[Math.floor(Math.random() * this.canopyBlocks.length)];
    this.leaves.push({
      x: this.x + c.x + (Math.random() * 16 - 8),
      y: GROUND_Y + c.y + (Math.random() * 10 - 5),
      vx: wind * 0.4 + (Math.random() * 0.6 - 0.3),
      vy: 0.4 + Math.random() * 0.5,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: 0.05 + Math.random() * 0.05,
      size: 4 + Math.random() * 4,
      swing: Math.random() * Math.PI * 2,
      alpha: 1,
      color: Math.random() < 0.5 ? "#6fc04b" : "#5aa83b"
    });
  }

  this.leaves.forEach(l => {
    l.swing += 0.08;
    l.vx += wind * 0.01;
    l.x += l.vx + Math.sin(l.swing) * 0.2;
    l.y += l.vy;
    l.vy += 0.01;
    l.rot += l.rotSpeed;
    l.alpha -= 0.006;
  });

  this.leaves = this.leaves.filter(l => l.alpha > 0 && l.y < GROUND_Y + 40);
};

Tree.prototype.draw = function () {
  const swayOffset = Math.sin(this.sway) * this.swayAmount + wind * 2;
  const baseX = this.x - cameraX + swayOffset;

  ctx.save();
  ctx.translate(baseX, GROUND_Y);

  // trunk
  ctx.fillStyle = "#6a3f1b";
  ctx.fillRect(-this.trunkWidth / 2, -this.height, this.trunkWidth, this.height);
  ctx.fillStyle = "#8a5a2b";
  ctx.fillRect(-this.trunkWidth / 2 + 2, -this.height, this.trunkWidth / 3, this.height);
  ctx.fillStyle = "#4a2a12";
  ctx.fillRect(this.trunkWidth / 2 - 4, -this.height, 4, this.height);

  // branches
  this.branches.forEach(b => {
    ctx.fillStyle = "#5a3216";
    ctx.fillRect(0, b.y, b.len * b.dir, 6);
    ctx.fillRect(b.len * b.dir - 2 * b.dir, b.y - 4, 4 * b.dir, 4);
  });

  // canopy blocks
  this.canopyBlocks.forEach(c => {
    ctx.fillStyle = c.color;
    ctx.fillRect(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h);
  });

  // under-canopy shadow
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  ctx.fillRect(-60, -this.height + 40, 120, 24);

  // vines
  ctx.strokeStyle = "#0e5e28";
  ctx.lineWidth = 3;
  this.vines.forEach(v => {
    const sway = Math.sin(this.sway + v.phase + windTick * 1.5) * (2 + Math.abs(wind) * 3);
    ctx.beginPath();
    ctx.moveTo(v.x, v.y);
    ctx.lineTo(v.x + sway, v.y + v.len);
    ctx.stroke();
  });

  ctx.restore();

  // falling leaves
  this.leaves.forEach(l => {
    ctx.save();
    ctx.translate(l.x - cameraX, l.y);
    ctx.rotate(l.rot);
    ctx.fillStyle = `rgba(70,160,60,${l.alpha})`;
    ctx.fillRect(-l.size / 2, -l.size / 2, l.size, l.size);
    ctx.restore();
  });
};

const trees = [];
for (let i = 0; i < 30; i++) trees.push(new Tree(300 + i * 220));


/* =============================================================================
   CLOUDS + BIRDS (LEVELS 1–2 ONLY)
============================================================================= */

function Cloud(x, y, speed, scale) {
  this.x = x;
  this.y = y;
  this.speed = speed;
  this.scale = scale;
  this.wobble = Math.random() * Math.PI * 2;
}

Cloud.prototype.update = function () {
  this.x += this.speed + wind * 0.05;
  this.wobble += 0.01;

  if (this.x - 200 > WORLD_WIDTH) {
    this.x = -200;
    this.y = 60 + Math.random() * 180;
    this.speed = 0.2 + Math.random() * 0.4;
    this.scale = 0.8 + Math.random() * 0.6;
  }
};

Cloud.prototype.draw = function () {
  const x = this.x - cameraX * 0.3;
  const y = this.y + Math.sin(this.wobble) * 2;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(this.scale, this.scale);

  // pixel cloud style
  ctx.fillStyle = "#e8f2f2";
  ctx.fillRect(-32, -10, 64, 20);
  ctx.fillRect(-40, -6, 16, 12);
  ctx.fillRect(24, -6, 16, 12);
  ctx.fillRect(-20, -20, 40, 14);
  ctx.fillStyle = "#bfe2e2";
  ctx.fillRect(-30, 6, 60, 8);

  ctx.restore();
};

const clouds = [];
const cloudCount = 5 + Math.floor(Math.random() * 3);
for (let i = 0; i < cloudCount; i++) {
  clouds.push(
    new Cloud(
      Math.random() * WORLD_WIDTH,
      50 + Math.random() * 200,
      0.2 + Math.random() * 0.4,
      0.8 + Math.random() * 0.6
    )
  );
}

/* ----- BIRDS ----- */
function Bird(x, y, speed) {
  this.x = x;
  this.y = y;
  this.speed = speed;
  this.flap = Math.random() * Math.PI * 2;
  this.color = ["#f59b2c", "#d97022", "#f7d170"][Math.floor(Math.random() * 3)];
}

Bird.prototype.update = function () {
  this.x += this.speed;
  this.flap += 0.35;

  if (this.x > WORLD_WIDTH + 200) {
    this.x = -200;
    this.y = 120 + Math.random() * 160;
    this.speed = 0.8 + Math.random() * 1.2;
  }
};

Bird.prototype.draw = function () {
  const x = this.x - cameraX * 0.5;
  const y = this.y;

  ctx.save();
  ctx.translate(x, y);

  // body
  ctx.fillStyle = this.color;
  ctx.fillRect(-10, -4, 18, 8);

  // head
  ctx.fillStyle = "#395c5e";
  ctx.fillRect(-2, -8, 6, 6);

  // beak
  ctx.fillStyle = "#ff7f2a";
  ctx.fillRect(4, -6, 6, 3);

  // wings (flap)
  const wing = Math.sin(this.flap) * 5;
  ctx.strokeStyle = "#2b3d3f";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-6, -2);
  ctx.lineTo(-14, -8 + wing);
  ctx.moveTo(-6, 2);
  ctx.lineTo(-14, 8 - wing);
  ctx.stroke();

  ctx.restore();
};

const birds = [];
for (let i = 0; i < 4; i++) {
  birds.push(
    new Bird(
      Math.random() * WORLD_WIDTH,
      120 + Math.random() * 160,
      0.8 + Math.random() * 1.2
    )
  );
}



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

  // body
  ctx.fillStyle = this.color;
  ctx.fillRect(-16, -18, 32, 12);

  // stripes
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-10, -18);
  ctx.lineTo(-10, -6);
  ctx.moveTo(0, -18);
  ctx.lineTo(0, -6);
  ctx.moveTo(10, -18);
  ctx.lineTo(10, -6);
  ctx.stroke();

  // head
  ctx.fillStyle = this.color;
  ctx.fillRect(-10, -32, 20, 14);

  // ears
  ctx.beginPath();
  ctx.moveTo(-10, -32);
  ctx.lineTo(-4, -40);
  ctx.lineTo(0, -32);
  ctx.moveTo(10, -32);
  ctx.lineTo(4, -40);
  ctx.lineTo(0, -32);
  ctx.fill();

  // eyes
  ctx.fillStyle = "#000";
  ctx.fillRect(-5, -28, 3, 3);
  ctx.fillRect(2, -28, 3, 3);

  // nose
  ctx.fillStyle = "#ff6b6b";
  ctx.fillRect(-1, -24, 2, 2);

  // mouth
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-1, -22);
  ctx.lineTo(-4, -20);
  ctx.moveTo(-1, -22);
  ctx.lineTo(2, -20);
  ctx.stroke();

  // whiskers
  ctx.beginPath();
  ctx.moveTo(-8, -24);
  ctx.lineTo(-18, -26);
  ctx.moveTo(-8, -22);
  ctx.lineTo(-18, -22);
  ctx.moveTo(8, -24);
  ctx.lineTo(18, -26);
  ctx.moveTo(8, -22);
  ctx.lineTo(18, -22);
  ctx.stroke();

  // legs
  ctx.fillStyle = this.color;
  ctx.fillRect(-12, -6, 4, 6);
  ctx.fillRect(-2, -6, 4, 6);
  ctx.fillRect(6, -6, 4, 6);
  ctx.fillRect(12, -6, 4, 6);

  // tail
  ctx.strokeStyle = this.color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(16, -12);
  for (let i = 0; i < 5; i++) {
    ctx.lineTo(
      16 + i * 6,
      -12 + Math.sin(this.tailAnim + i) * (this.mood === "playful" ? 6 : 3)
    );
  }
  ctx.stroke();

  ctx.restore();
};

const cats = [new Cat(600), new Cat(900), new Cat(1200), new Cat(1500)];

/* =============================================================================
   ADVANCED HEART SYSTEM — ROTATING, SHINING, MARIO-STYLE
============================================================================= */

let hearts = [];

/* ================= SPAWN HEARTS ================= */
function spawnHearts(count) {
  hearts = [];
  for (let i = 0; i < count; i++) {
    hearts.push({
      x: 500 + i * 300,
      y: GROUND_Y - 150,
      baseY: GROUND_Y - 150,

      // animation
      rot: Math.random() * Math.PI * 2,
      rotSpeed: 0.04 + Math.random() * 0.02,
      floatT: Math.random() * Math.PI * 2,

      // visual depth
      scale: 1,
      shine: Math.random() * Math.PI * 2,
      glow: 0.6 + Math.random() * 0.4
    });
  }
}

/* ================= DRAW HEART ================= */
function drawHeart(h) {
  h.rot += h.rotSpeed;
  h.floatT += 0.03;
  h.shine += 0.05;

  // floating effect
  const floatY = Math.sin(h.floatT) * 10;

  // mario-style rotation illusion (width scaling)
  const rotScale = Math.abs(Math.cos(h.rot));
  const heartWidth = 16 * rotScale;
  const heartHeight = 16;

  const drawX = h.x - cameraX;
  const drawY = h.baseY + floatY;

  ctx.save();
  ctx.translate(drawX, drawY);

  /* ---- GLOW ---- */
  ctx.globalAlpha = 0.25 * h.glow;
  ctx.fillStyle = "rgba(255,80,120,1)";
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.fill();

  /* ---- SHINE ---- */
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.beginPath();
  ctx.arc(
    -6 * rotScale,
    -6,
    4 + Math.sin(h.shine) * 2,
    0,
    Math.PI * 2
  );
  ctx.fill();

  ctx.globalAlpha = 1;

  /* ---- HEART SHAPE ---- */
  ctx.fillStyle = "#ff2b6d";
  ctx.beginPath();

  // left curve
  ctx.moveTo(0, 6);
  ctx.bezierCurveTo(
    -heartWidth, -heartHeight,
    -heartWidth * 2, heartHeight / 2,
    0, heartHeight * 2
  );

  // right curve
  ctx.bezierCurveTo(
    heartWidth * 2, heartHeight / 2,
    heartWidth, -heartHeight,
    0, 6
  );

  ctx.fill();

  ctx.restore();
}

/* =============================================================================
   CELEBRATION OVERLAY
============================================================================= */
let celebrationActive = false;
let celebrationTimer = 0;
let celebrationText = "";
let celebrationCallback = null;
let celebrationMode = "normal"; // "normal" | "hearts" | "cats"

function startCelebration(text, cb) {
  celebrationActive = true;
  celebrationTimer = 180;
  celebrationText = text;
  celebrationCallback = cb;
  gamePaused = true;
}

/* ====== NEW CELEBRATION PARTICLES ====== */
let celebrationParticles = [];

function startHeartsCelebration(cb) {
  celebrationMode = "hearts";
  celebrationActive = true;
  celebrationTimer = 240;
  celebrationText = "LEVEL 1 COMPLETE ❤️";
  celebrationCallback = cb;
  gamePaused = true;

  celebrationParticles = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vy: 1 + Math.random() * 2,
    rot: Math.random() * Math.PI * 2,
    rotSpeed: 0.08 + Math.random() * 0.05,
    size: 10 + Math.random() * 18
  }));
}

function startCatsCelebration(cb) {
  celebrationMode = "cats";
  celebrationActive = true;
  celebrationTimer = 240;
  celebrationText = "LEVEL 2 COMPLETE 🐱";
  celebrationCallback = cb;
  gamePaused = true;

  celebrationParticles = Array.from({ length: 70 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vy: 0.6 + Math.random() * 1.6,
    sway: Math.random() * Math.PI * 2,
    size: 12 + Math.random() * 16,
    color: ["#f2c89b", "#d1a679", "#999", "#222", "#f5f5f5"][Math.floor(Math.random() * 5)]
  }));
}

function drawCelebration() {
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (celebrationMode === "hearts") {
    celebrationParticles.forEach(p => {
      p.y -= p.vy;
      p.rot += p.rotSpeed;
      if (p.y < -50) {
        p.y = canvas.height + 50;
        p.x = Math.random() * canvas.width;
      }

      const rotScale = Math.abs(Math.cos(p.rot));
      const w = p.size * rotScale;
      const h = p.size;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.fillStyle = "#ff2b6d";
      ctx.beginPath();
      ctx.moveTo(0, 4);
      ctx.bezierCurveTo(-w, -h, -w * 2, h / 2, 0, h * 2);
      ctx.bezierCurveTo(w * 2, h / 2, w, -h, 0, 4);
      ctx.fill();
      ctx.restore();
    });
  }

  if (celebrationMode === "cats") {
    celebrationParticles.forEach(p => {
      p.y -= p.vy;
      p.sway += 0.08;
      if (p.y < -40) {
        p.y = canvas.height + 40;
        p.x = Math.random() * canvas.width;
      }

      const swayX = Math.sin(p.sway) * 4;

      ctx.save();
      ctx.translate(p.x + swayX, p.y);
      ctx.fillStyle = p.color;
      ctx.fillRect(-10, -10, 20, 10);
      ctx.fillRect(-7, -22, 14, 12);
      ctx.restore();
    });
  }

  ctx.fillStyle = "#fff";
  ctx.font = "bold 30px Arial";
  ctx.textAlign = "center";
  ctx.fillText(celebrationText, canvas.width / 2, canvas.height / 2);

  celebrationTimer--;
  if (celebrationTimer <= 0) {
    celebrationActive = false;
    gamePaused = false;
    celebrationMode = "normal";

    // RESET PLAYER PHYSICS
    girl.vy = 0;
    girl.y = GROUND_Y;
    girl.onGround = true;

    celebrationCallback && celebrationCallback();
  }
}

/* =============================================================================
   VINTAGE QUESTION SCENE (GIRL BEATS BOY)
============================================================================= */
let questionActive = false;
let questionAnimT = 0;

function drawQuestionScene() {
  questionAnimT += 0.1;

  // background
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, "#c79d59");
  grad.addColorStop(1, "#7a5a2b");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // ground
  ctx.fillStyle = "#3b2f2f";
  ctx.fillRect(0, GROUND_Y, canvas.width, GROUND_HEIGHT);

  // girl (left) punching
  const girlX = canvas.width * 0.4;
  const girlY = GROUND_Y;
  const punch = Math.sin(questionAnimT) * 6;

  ctx.save();
  ctx.translate(girlX, girlY);
  ctx.fillStyle = "#ff4d8d";
  ctx.fillRect(-8, -26, 16, 22);
  ctx.fillStyle = "#ffddb3";
  ctx.fillRect(-7, -42, 14, 14);
  ctx.strokeStyle = "#000";
  ctx.beginPath();
  ctx.moveTo(7, -20);
  ctx.lineTo(18 + punch, -22 + punch);
  ctx.stroke();
  ctx.restore();

  // boy (right) getting hit
  const boyX = canvas.width * 0.6;
  const boyY = GROUND_Y;
  const recoil = Math.sin(questionAnimT + 1.2) * 5;

  ctx.save();
  ctx.translate(boyX, boyY);
  ctx.fillStyle = "#222";
  ctx.fillRect(-8, -26, 16, 22);
  ctx.fillStyle = "#ffddb3";
  ctx.fillRect(-7 + recoil, -42, 14, 14);
  ctx.restore();
}

/* =============================================================================
   LEVEL 1 QUESTION (VINTAGE)
============================================================================= */
let level1QuestionAnswered = false;

function showLevel1Question() {
  if (level1QuestionAnswered) return;

  questionActive = true;
  gamePaused = true;

  overlay.style.display = "flex";
  overlayContent.className = "vintage";
  overlayContent.style.fontFamily = "'Courier New', 'Lucida Console', monospace";
  overlayContent.innerHTML = `
    <h2>What was the first time you said I love you to me?</h2>
    <input id="loveAnswer" placeholder="Type your answer..." style="width:100%;padding:12px;font-size:16px;margin-top:12px;">
    <div id="hint" style="margin-top:12px;font-size:14px;opacity:0.85;"></div>
    <button id="submitAnswer">Submit</button>
  `;

  let tries = 0;

  document.getElementById("submitAnswer").onclick = () => {
    const val = document.getElementById("loveAnswer").value.trim().toLowerCase();
    tries++;

    const normalized = val
      .replace(/,/g, "")
      .replace(/\s+/g, " ");

    const correct = [
      "10th march 2024",
      "10 march 2024",
      "march 10 2024",
      "10/03/2024",
      "03/10/2024"
    ];

    if (correct.includes(normalized)) {
      level1QuestionAnswered = true;
      questionActive = false;
      overlay.style.display = "none";

      startHeartsCelebration(() => {
        level = 2;
        heartsCollected = 0;
        spawnHearts(12);
        levelTimerFrames = 0; // add here if you use the timer
      });
      return;
    }

    const hint = document.getElementById("hint");
    if (tries === 1) hint.textContent = "Hint: It was in March.";
    else if (tries === 2) hint.textContent = "Hint: It was on the 10th.";
    else hint.textContent = "Hint: 10th March 2024.";
  };
}

/* =============================================================================
   LEVEL 2 QUESTION (RUNAWAY NO)
============================================================================= */
let level2QuestionAnswered = false;
let noClickCount = 0;

function showLevel2Question() {
  if (level2QuestionAnswered) return;

  questionActive = true;
  gamePaused = true;

  overlay.style.display = "flex";
  overlayContent.className = "vintage";
  overlayContent.style.position = "relative";
  overlayContent.style.fontFamily = "'Courier New', 'Lucida Console', monospace";
  overlayContent.innerHTML = `
    <h2>Do you think I can live without you?</h2>
    <div id="noCount" style="margin-top:10px;font-size:14px;">Catch NO: 0 / 10</div>
    <button id="yesBtn">Yes</button>
    <button id="noBtn" style="position:relative;">No</button>
    <div id="level2Hint" style="margin-top:10px;font-size:14px;opacity:0.85;"></div>
  `;

  const yesBtn = document.getElementById("yesBtn");
  const noBtn = document.getElementById("noBtn");
  const hint = document.getElementById("level2Hint");
  const count = document.getElementById("noCount");

  yesBtn.onclick = () => {
    hint.textContent = "Hint: The correct answer is NO.";
  };

  function moveNoButton() {
    const box = overlayContent.getBoundingClientRect();
    const maxX = box.width - noBtn.offsetWidth - 20;
    const maxY = box.height - noBtn.offsetHeight - 20;

    const nx = Math.random() * maxX;
    const ny = Math.random() * maxY;

    noBtn.style.position = "absolute";
    noBtn.style.left = `${nx}px`;
    noBtn.style.top = `${ny}px`;
  }

  noBtn.onclick = () => {
    noClickCount++;
    count.textContent = `Catch NO: ${noClickCount} / 10`;
    moveNoButton();

    if (noClickCount >= 10) {
      level2QuestionAnswered = true;
      questionActive = false;
      overlay.style.display = "none";

      startCatsCelebration(() => {
        level = 3;
        heartsCollected = 0;
        spawnHearts(13);
        levelTimerFrames = 0; // add here if you use the timer
      });
    }
  };

  moveNoButton();
}

/* =============================================================================
   FINAL CELEBRATION — CINEMATIC NIGHT + LANTERNS
============================================================================= */

const FINAL_DURATION = 120 * 60; // 2 minutes at 60fps
const FINAL_TEXT_DELAY = 10 * 60; // 10 seconds after music starts
const FINAL_TEXT_SPEED_FRAMES = 3; // typewriter speed (1 char every 3 frames)

const FINAL_MESSAGE =
  "2 years with you my love and I think the reason every moment of our journey has been sp beautiful is because you were a part of every scenery I wish to live the whole eternity with you and you and you till the galaxies collide the world collapse and everything comes to dust. Happy valentines day my love. I hope you love my small gift i have working on months for.\n\nI love you Tanu. I always will.\n\n- yours geet.";

let finalCelebration = {
  active: false,
  timer: 0,
  stars: [],
  lanterns: [],
  lanternsSpawned: 0,
  maxLanterns: 220,
  phase: "boyWalk" // boyWalk → rose → lanterns
};

let finalTextStart = null;
let finalTextIndex = 0;
let finalChoiceShown = false;
let gameSubmitted = false;

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

    // legs + feet
    ctx.fillStyle = "#111";
    ctx.fillRect(-6, -8, 4, 8);
    ctx.fillRect(2, -8, 4, 8);
    ctx.fillStyle = "#333";
    ctx.fillRect(-8, -2, 8, 4);
    ctx.fillRect(0, -2, 8, 4);

    // body (tshirt)
    ctx.fillStyle = "#1b1b1b";
    ctx.fillRect(-10, -32, 20, 22);

    // shirt text
    ctx.fillStyle = "#ff3b7a";
    ctx.font = "bold 6px Arial";
    ctx.textAlign = "center";
    ctx.fillText("KIRMADA", 0, -18);

    // arms
    ctx.strokeStyle = "#1b1b1b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-10, -26);
    ctx.lineTo(-18, -18);
    ctx.moveTo(10, -26);
    ctx.lineTo(18, -20);
    ctx.stroke();

    // rose in hand
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(20, -22, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "green";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(18, -20);
    ctx.lineTo(24, -12);
    ctx.stroke();

    // head
    ctx.fillStyle = "#ffddb3";
    ctx.fillRect(-8, -48, 16, 16);

    // hair
    ctx.fillStyle = "#2b1b0a";
    ctx.fillRect(-8, -52, 16, 6);

    // eyes
    ctx.fillStyle = "#000";
    ctx.fillRect(-4, -44, 2, 2);
    ctx.fillRect(2, -44, 2, 2);

    // nose
    ctx.fillRect(-1, -41, 2, 2);

    // mouth
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-3, -38);
    ctx.lineTo(3, -38);
    ctx.stroke();

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

  finalTextStart = null;
  finalTextIndex = 0;
  finalChoiceShown = false;

  lanternMusic.pause();
  lanternMusic.currentTime = 0;
  lanternMusicStarted = false;

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

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + " ";
      y += lineHeight;
    } else {
      line = testLine;
    }
  }

  ctx.fillText(line, x, y);
  return y;
}

function showFinalChoice() {
  if (finalChoiceShown) return;
  finalChoiceShown = true;

  overlay.style.display = "flex";
  overlayContent.className = "vintage";
  overlayContent.style.fontFamily = "'Courier New', 'Lucida Console', monospace";
  overlayContent.innerHTML = `
    <h2>Replay the game?</h2>
    <button id="replayBtn">Replay</button>
    <button id="submitBtn">Submit</button>
  `;

  document.getElementById("replayBtn").onclick = () => {
    overlay.style.display = "none";
    resetGame();
  };

  document.getElementById("submitBtn").onclick = () => {
    overlay.style.display = "none";
    gameSubmitted = true;
  };
}

function resetGame() {
  gameSubmitted = false;
  finalChoiceShown = false;
  finalTextStart = null;
  finalTextIndex = 0;

  finalCelebration.active = false;
  finalCelebration.timer = 0;
  finalCelebration.phase = "boyWalk";
  finalCelebration.lanterns = [];
  finalCelebration.lanternsSpawned = 0;

  lanternMusic.pause();
  lanternMusic.currentTime = 0;
  lanternMusicStarted = false;

  level = 1;
  heartsCollected = 0;
  level1CelebrationDone = false;
  level2CelebrationDone = false;
  level2QuestionShown = false;
  finalQuestionShown = false;
  level1QuestionAnswered = false;
  level2QuestionAnswered = false;
  noClickCount = 0;

  celebrationActive = false;
  questionActive = false;
  gamePaused = false;

  levelTimerFrames = 0;
  spawnHearts(10);

  girl.x = 150;
  girl.y = GROUND_Y;
  girl.vy = 0;
  girl.onGround = true;
  cameraX = 0;

  gameStarted = true;
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

  /* ---- BOY (STAYS ON RIGHT) ---- */
  if (finalCelebration.phase === "boyWalk") {
    boy.update();
  }
  boy.draw();

  /* ---- START LANTERNS AFTER ROSE ---- */
  if (finalCelebration.phase === "rose" && finalCelebration.timer > 120) {
    finalCelebration.phase = "lanterns";

    if (!lanternMusicStarted) {
      lanternMusic.play().catch(() => {});
      lanternMusicStarted = true;
    }

    if (finalTextStart === null) {
      finalTextStart = finalCelebration.timer;
    }
  }

  /* ---- SPAWN LANTERNS (STOP AFTER 2 MIN) ---- */
  if (
    finalCelebration.phase === "lanterns" &&
    finalCelebration.lanternsSpawned < finalCelebration.maxLanterns &&
    finalCelebration.timer <= FINAL_DURATION
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

  /* ---- TYPEWRITER TEXT (10s AFTER MUSIC) ---- */
  if (finalTextStart !== null) {
    const elapsed = finalCelebration.timer - finalTextStart;

    if (elapsed >= FINAL_TEXT_DELAY && finalTextIndex < FINAL_MESSAGE.length) {
      if (finalCelebration.timer % FINAL_TEXT_SPEED_FRAMES === 0) {
        finalTextIndex++;
      }
    }

    if (elapsed >= FINAL_TEXT_DELAY) {
      const typed = FINAL_MESSAGE.slice(0, finalTextIndex);

      const panelW = Math.min(920, canvas.width - 80);
      const panelH = Math.min(320, canvas.height * 0.45);
      const panelX = (canvas.width - panelW) / 2;
      const panelY = 30;

      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(panelX, panelY, panelW, panelH);

      ctx.globalAlpha = 1;
      ctx.fillStyle = "#fff";
      ctx.font = "16px 'Courier New', 'Lucida Console', monospace";

      let y = panelY + 30;
      const lineHeight = 20;
      const paragraphs = typed.split("\n");

      paragraphs.forEach(p => {
        if (p.trim() === "") {
          y += lineHeight;
          return;
        }
        y = wrapText(ctx, p, panelX + 20, y, panelW - 40, lineHeight) + lineHeight;
      });

      ctx.restore();

      if (finalTextIndex >= FINAL_MESSAGE.length && !finalChoiceShown) {
        showFinalChoice();
      }
    }
  }

  /* ---- STOP MUSIC AFTER 2 MIN ---- */
  if (finalCelebration.timer > FINAL_DURATION && lanternMusicStarted) {
    lanternMusic.pause();
    lanternMusic.currentTime = 0;
    lanternMusicStarted = false;
  }
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
  if (!lanternMusicStarted) {
    lanternMusic.play().catch(() => {});
    lanternMusicStarted = true;
  }
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
    if (lanternMusicStarted) {
      lanternMusic.pause();
      lanternMusic.currentTime = 0;
      lanternMusicStarted = false;
    }
  }
}
/* =============================================================================
   Intro letter 
============================================================================= */
function showIntroLetter() {
  gamePaused = true;
  overlay.style.display = "flex";

  // make overlay content look like a parchment scroll
  overlayContent.className = "vintage";
  overlayContent.style.background = "transparent";
  overlayContent.style.boxShadow = "none";
  overlayContent.style.padding = "0";

  overlayContent.innerHTML = `
    <div style="
      position: relative;
      background: #f8e1c2;
      border: 6px solid #c19055;
      border-radius: 10px;
      padding: 28px 28px 38px;
      box-shadow: 0 18px 40px rgba(0,0,0,0.5);
      font-family: 'Courier New', 'Lucida Console', monospace;
      color: #3b2f2f;
    ">
      <div style="
        position: absolute;
        left: 18px;
        right: 18px;
        bottom: -16px;
        height: 14px;
        background: #e6c49a;
        border: 4px solid #c19055;
        border-top: none;
        border-radius: 0 0 10px 10px;
      "></div>

      <h2 style="margin-top:0;">Love Quest — Letter</h2>

      <p>This game is consist of 3 level. If you clear all of them and collect all the hearts you will recieve a big gift at the end.</p>

      <p><strong>Rules -</strong><br>
      Collect all the hearts.<br>
      Love me forever and ever and ever.</p>

      <p>You are advised to agree the follow:</p>

      <label style="display:block;margin:8px 0;">
        <input type="checkbox" class="intro-check"> i love the developer by all my heart.
      </label>
      <label style="display:block;margin:8px 0;">
        <input type="checkbox" class="intro-check"> I will play this game with all the love i have for him.
      </label>
      <label style="display:block;margin:8px 0;">
        <input type="checkbox" class="intro-check"> He is a bit stupid though (cause he is not with me)
      </label>

      <div id="introMsg" style="margin-top:12px;font-size:14px;min-height:18px;"></div>

      <button id="introAccept" style="
        margin-top:12px;width:100%;padding:12px;font-weight:bold;
        background:#ff3b7a;color:#fff;border:none;border-radius:8px;cursor:pointer;
      ">Next</button>

      <button id="introReject" style="
        margin-top:8px;width:100%;padding:10px;font-weight:bold;
        background:#333;color:#fff;border:none;border-radius:8px;cursor:pointer;
      ">Reject</button>
    </div>
  `;

  const checks = Array.from(document.querySelectorAll(".intro-check"));
  const msg = document.getElementById("introMsg");

  document.getElementById("introAccept").onclick = () => {
  const allChecked = checks.every(c => c.checked);
  if (!allChecked) {
    msg.textContent = "Please tick all the boxes to continue.";
    return;
  }

  // reset overlay styles so other popups look normal
  overlayContent.className = "";
  overlayContent.style.background = "";
  overlayContent.style.boxShadow = "";
  overlayContent.style.padding = "";
  overlayContent.style.position = "";

  overlay.style.display = "none";
  gamePaused = false;
  gameStarted = true;
};


  document.getElementById("introReject").onclick = () => {
    msg.textContent = "You must accept to play.";
  };
}

/* =============================================================================
   QUESTIONS
============================================================================= */
function evasiveYes(cb) {
  document.getElementById("yes").onclick = () => {
    // unlock audio for later playback
    lanternMusic.play().then(() => {
      lanternMusic.pause();
      lanternMusic.currentTime = 0;
    }).catch(() => {});
    cb();
  };
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
  if (!gameStarted) {
    requestAnimationFrame(loop);
    return;
  }

  if (gameSubmitted) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    requestAnimationFrame(loop);
    return;
  }
 
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  updateWind();

  if (questionActive) {
    drawQuestionScene();
    requestAnimationFrame(loop);
    return;
  }

  if (celebrationActive) {
    drawCelebration();
    requestAnimationFrame(loop);
    return;
  }

  if (finalCelebration.active) {
    drawFinalCelebration();
    requestAnimationFrame(loop);
    return;
  }

  levelTimerFrames++;

  ctx.fillStyle = "#4caf50";
  ctx.fillRect(-cameraX, GROUND_Y, WORLD_WIDTH, GROUND_HEIGHT);

  drawWind();
  if (level <= 2) {
   clouds.forEach(c => { c.update(); c.draw(); });
   birds.forEach(b => { b.update(); b.draw(); });
  }

  trees.forEach(t => { t.update(); t.draw(); });
  cats.forEach(c => { c.update(); c.draw(); });

  girl.update();
  girl.draw();

  hearts.forEach((h, i) => {
    drawHeart(h);

    const heartY = h.baseY + Math.sin(h.floatT) * 10;
    const dx = Math.abs(h.x - girl.x);
    const dy = Math.abs(heartY - girl.y);

    if (dx < 25 && dy < 35 && !girl.onGround) {
      hearts.splice(i, 1);
      heartsCollected++;
    }
  });

  drawHUD();

  if (level === 1 && heartsCollected === 10 && !level1CelebrationDone) {
    level1CelebrationDone = true;
    showLevel1Question();
  }

  if (level === 2 && heartsCollected === 12 && !level2CelebrationDone) {
    level2CelebrationDone = true;
    showLevel2Question();
  }

  if (level === 3 && heartsCollected === 13) showFinalQuestion();

  requestAnimationFrame(loop);
}


/* =============================================================================
   START GAME
============================================================================= */
spawnHearts(10);
showIntroLetter();
loop();
