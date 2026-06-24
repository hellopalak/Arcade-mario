import {
  TILE, T, type MarioState, type PowerUp, type Goomba, type CoinFX,
  type BlockBump, type LevelDef, type Bullet, type WarningFX, COIN_BRICK_MAX, buildLevel1,
} from './level';
import { drawTile, drawMario, drawPowerUp, drawGoomba, drawCoinFX, drawBullet, drawWarningFX } from './renderer';

export type SoundEvent = 'coin' | 'powerup' | 'damage' | 'bullet_hit' | 'death' | 'jump' | 'stomp';

export interface GameCallbacks {
  onScore: (score: number) => void;
  onCoins: (coins: number) => void;
  onGameOver: (finalScore: number) => void;
  onLevelComplete: (score: number) => void;
  onMarioState: (state: MarioState) => void;
  onSound?: (event: SoundEvent) => void;
}

interface Cloud { x: number; y: number; size: number; speed: number; layers: number; opacity: number; }
interface Hill { x: number; w: number; h: number; color: string; trees: { xOff: number; h: number }[]; }
interface Bush { x: number; w: number; h: number; }

const GRAVITY = 0.55;
const JUMP_FORCE = -11.5;
const ACCEL = 0.35;
const FRICTION = 0.82;
const SMALL_W = 28;
const SMALL_H = 32;
const BIG_W = 32;
const BIG_H = 56;

export class MarioGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cb: GameCallbacks;
  private bgImage: HTMLImageElement | null = null;
  private bgLoaded = false;
  private marioSprite: HTMLImageElement | null = null;
  private marioSpriteLoaded = false;
  private bushes: Bush[] = [];

  private running = false;
  private level!: LevelDef;
  private frame = 0;

  // Mario
  private mx = 0; private my = 0;
  private mvx = 0; private mvy = 0;
  private mw = SMALL_W; private mh = SMALL_H;
  private mState: MarioState = 'small';
  private grounded = false;
  private facingRight = true;
  private runFrame = 0;
  private invTimer = 0; // invincibility after power change
  private walkSpeed = 3.2;

  // Camera
  private camX = 0;
  private maxCamX = 0; // camera never goes left

  // Score
  private score = 0;
  private coins = 0;

  // Endless generation
  private lastGeneratedCol = 112;

  // Entities
  private powerUps: PowerUp[] = [];
  private goombas: Goomba[] = [];
  private bullets: Bullet[] = [];
  private warningFX: WarningFX[] = [];
  private coinFX: CoinFX[] = [];
  private bumps: BlockBump[] = [];
  private coinBrickCounts: Map<string, number> = new Map();
  private brickBreakFX: { x: number; y: number; vx: number; vy: number; t: number }[] = [];
  private cannonCols: number[] = []; // columns with cannons

  // Difficulty (0-10 scale)
  private difficulty = 0;

  // Input
  private keys = new Set<string>();
  private touchL = false; private touchR = false; private touchJ = false;

  // BG
  private clouds: Cloud[] = [];
  private hills: Hill[] = [];

  // Grow/shrink animation
  private transformTimer = 0;
  private transformTo: MarioState = 'small';

  constructor(canvas: HTMLCanvasElement, callbacks: GameCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.cb = callbacks;
    this.loadAssets();
    this.initBG();
    this.bindInput();
  }

  private loadAssets() {
    this.bgImage = new Image();
    this.bgImage.onload = () => { this.bgLoaded = true; };
    this.bgImage.src = '/game_background.png';

    const rawSprite = new Image();
    rawSprite.onload = () => {
      // Process sprite to remove white/light grid background
      const offscreen = document.createElement('canvas');
      offscreen.width = rawSprite.width;
      offscreen.height = rawSprite.height;
      const octx = offscreen.getContext('2d')!;
      octx.drawImage(rawSprite, 0, 0);
      const imgData = octx.getImageData(0, 0, offscreen.width, offscreen.height);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        // Make near-white and light gray pixels transparent
        if (d[i] > 220 && d[i+1] > 220 && d[i+2] > 220) {
          d[i+3] = 0;
        }
        // Also handle the light grid lines
        if (d[i] > 200 && d[i+1] > 200 && d[i+2] > 200 && d[i+3] > 0) {
          const brightness = (d[i] + d[i+1] + d[i+2]) / 3;
          if (brightness > 210) d[i+3] = 0;
        }
      }
      octx.putImageData(imgData, 0, 0);
      this.marioSprite = new Image();
      this.marioSprite.onload = () => { this.marioSpriteLoaded = true; };
      this.marioSprite.src = offscreen.toDataURL();
    };
    rawSprite.src = '/mario_sprite.png';
  }

  private initBG() {
    const hillColors = ['#4a8c3f', '#3d7a35', '#5a9c4a', '#347030'];
    this.clouds = [];
    for (let i = 0; i < 12; i++) {
      this.clouds.push({
        x: Math.random() * 4000, y: 15 + Math.random() * 100,
        size: 25 + Math.random() * 55, speed: 0.1 + Math.random() * 0.25,
        layers: 2 + Math.floor(Math.random() * 3),
        opacity: 0.7 + Math.random() * 0.3,
      });
    }
    this.hills = [];
    for (let i = 0; i < 20; i++) {
      const trees: { xOff: number; h: number }[] = [];
      const hw = 160 + Math.random() * 140;
      for (let t = 0; t < 2 + Math.floor(Math.random() * 3); t++) {
        trees.push({ xOff: 20 + Math.random() * (hw - 40), h: 12 + Math.random() * 18 });
      }
      this.hills.push({
        x: i * 250 - 100, w: hw, h: 35 + Math.random() * 55,
        color: hillColors[i % hillColors.length], trees,
      });
    }
    this.bushes = [];
    for (let i = 0; i < 25; i++) {
      this.bushes.push({ x: i * 200 + Math.random() * 100, w: 40 + Math.random() * 60, h: 12 + Math.random() * 14 });
    }
  }

  private bindInput() {
    const kd = (e: KeyboardEvent) => {
      this.keys.add(e.code);
      if ((e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') && this.grounded && this.running) {
        this.jump(); e.preventDefault();
      }
      if (e.code === 'ArrowUp') e.preventDefault();
      if (e.code === 'ArrowDown') e.preventDefault();
    };
    const ku = (e: KeyboardEvent) => this.keys.delete(e.code);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);

    // Mobile buttons
    const bind = (id: string, flag: 'touchL' | 'touchR' | 'touchJ') => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this[flag] = true;
        if (flag === 'touchJ' && this.grounded && this.running) this.jump();
      }, { passive: false });
      el.addEventListener('touchend', (e) => {
        e.preventDefault();
        this[flag] = false;
      }, { passive: false });
      el.addEventListener('touchcancel', () => { this[flag] = false; });
    };
    // Will bind after DOM is ready
    setTimeout(() => {
      bind('mobileLeftBtn', 'touchL');
      bind('mobileRightBtn', 'touchR');
      bind('mobileJumpBtn', 'touchJ');
    }, 100);
  }

  private jump() {
    if (!this.grounded || this.transformTimer > 0) return;
    this.mvy = JUMP_FORCE;
    this.grounded = false;
    this.cb.onSound?.('jump');
  }

  start() {
    this.level = buildLevel1();
    this.mx = this.level.marioSpawn[0];
    this.my = this.level.marioSpawn[1];
    this.mvx = 0; this.mvy = 0;
    this.mState = 'small';
    this.mw = SMALL_W; this.mh = SMALL_H;
    this.my = this.level.marioSpawn[1] + (TILE - SMALL_H); // align feet to ground
    this.grounded = false;
    this.facingRight = true;
    this.runFrame = 0;
    this.invTimer = 0;
    this.walkSpeed = 3.2;
    this.score = 0; this.coins = 0;
    this.frame = 0;
    this.camX = 0; this.maxCamX = 0;
    this.powerUps = [];
    this.coinFX = [];
    this.bumps = [];
    this.brickBreakFX = [];
    this.bullets = [];
    this.warningFX = [];
    this.cannonCols = [];
    this.difficulty = 0;
    this.transformTimer = 0;
    this.lastGeneratedCol = this.level.width; // 112

    // Reset map
    this.coinBrickCounts = new Map(this.level.coinBrickCounts);

    // Spawn initial goombas
    this.goombas = this.level.goombas.map(([gx, gy]) => ({
      x: gx, y: gy, vx: -1, vy: 0, alive: true, squishTimer: 0,
    }));

    this.running = true;
    this.cb.onScore(0);
    this.cb.onCoins(0);
    this.cb.onMarioState('small');
    this.loop();
  }

  stop() { this.running = false; }

  private loop = () => {
    if (!this.running) return;
    this.update();
    this.render();
    requestAnimationFrame(this.loop);
  };

  // ===== TILE HELPERS =====
  private tileAt(c: number, r: number): number {
    if (r < 0 || r >= this.level.height || c < 0) return T.AIR;
    if (c >= this.lastGeneratedCol - 15) {
      this.extendLevelTo(c);
    }
    if (c >= this.level.map[0].length) return T.AIR;
    return this.level.map[r][c];
  }

  private isSolid(t: number): boolean {
    return t !== T.AIR;
  }

  // ===== ENDLESS GENERATION =====
  private extendLevelTo(col: number) {
    while (col >= this.lastGeneratedCol - 15) {
      this.generateNextSegment();
    }
  }

  private generateNextSegment() {
    // More dangerous segment types at higher difficulty
    const baseTypes = ['flat', 'pipes', 'gap', 'bricks', 'stairs', 'enemies'];
    const hardTypes = ['trap_bricks', 'cannon_pipe', 'gauntlet'];
    const pool = this.difficulty >= 2 ? [...baseTypes, ...hardTypes] : baseTypes;
    if (this.difficulty >= 5) pool.push('cannon_pipe', 'gauntlet', 'trap_bricks'); // double chance
    const type = pool[Math.floor(Math.random() * pool.length)];
    let length = 10 + Math.floor(Math.random() * 8);
    const GR = 13;
    const startCol = this.lastGeneratedCol;
    let endCol = startCol + length;
    const d = this.difficulty;

    // Initialize columns
    for (let r = 0; r < this.level.height; r++) {
      for (let c = startCol; c < endCol; c++) {
        if (this.level.map[r].length <= c) {
          this.level.map[r].push(r >= GR ? T.GROUND : T.AIR);
        }
      }
    }

    switch (type) {
      case 'flat':
        if (Math.random() < 0.6) {
          const coinHeight = 9 - Math.floor(Math.random() * 2);
          for (let c = startCol + 2; c < endCol - 2; c++) {
            if (Math.random() < 0.4) this.level.map[coinHeight][c] = T.Q_COIN;
          }
        }
        // At higher difficulty add random enemies on flat
        if (d >= 3 && Math.random() < 0.6) {
          const n = 1 + Math.floor(d / 3);
          for (let i = 0; i < n; i++) {
            this.goombas.push({ x: (startCol + 3 + i * 3) * TILE, y: (GR - 1) * TILE, vx: -1.2, vy: 0, alive: true, squishTimer: 0 });
          }
        }
        break;

      case 'pipes': {
        const pipeCol = startCol + Math.floor(length / 2) - 1;
        const pipeHeight = 2 + Math.floor(Math.random() * 3);
        this.placePipeAt(pipeCol, pipeHeight, GR);
        if (Math.random() < 0.5 + d * 0.05) {
          this.goombas.push({ x: (pipeCol + 4) * TILE, y: (GR - 1) * TILE, vx: -1.2, vy: 0, alive: true, squishTimer: 0 });
        }
        break;
      }

      case 'gap': {
        const gapWidth = 2 + Math.floor(Math.random() * 2) + Math.floor(d / 4); // wider at higher difficulty
        const gapStart = startCol + Math.floor((length - gapWidth) / 2);
        for (let c = gapStart; c < Math.min(gapStart + gapWidth, endCol); c++) {
          this.level.map[GR][c] = T.AIR;
          this.level.map[GR + 1][c] = T.AIR;
        }
        break;
      }

      case 'bricks': {
        const row = 9;
        for (let c = startCol + 1; c < endCol - 1; c++) {
          if (c % 3 === 0) {
            this.level.map[row][c] = Math.random() < 0.3 ? T.Q_POWER : T.Q_COIN;
          } else if (c % 3 === 1) {
            this.level.map[row][c] = Math.random() < 0.25 ? T.COIN_BRICK : T.BRICK;
          }
        }
        break;
      }

      case 'trap_bricks': {
        // Brick row with hidden trap blocks mixed in
        const row = 9;
        for (let c = startCol + 1; c < endCol - 1; c++) {
          if (c % 4 === 0) {
            this.level.map[row][c] = T.TRAP; // trap!
          } else if (c % 4 === 2) {
            this.level.map[row][c] = Math.random() < 0.4 ? T.Q_COIN : T.BRICK;
          } else {
            this.level.map[row][c] = T.BRICK;
          }
        }
        break;
      }

      case 'cannon_pipe': {
        // Pipe with a cannon on top that fires bullets
        const pipeCol = startCol + Math.floor(length / 2) - 1;
        const pipeHeight = 3 + Math.floor(Math.random() * 2);
        this.placePipeAt(pipeCol, pipeHeight, GR);
        // Place cannon on top of pipe
        const cannonRow = GR - pipeHeight - 1;
        if (cannonRow >= 0) {
          this.level.map[cannonRow][pipeCol] = T.CANNON;
          this.cannonCols.push(pipeCol);
        }
        // Goombas near the pipe
        if (Math.random() < 0.7) {
          this.goombas.push({ x: (pipeCol + 4) * TILE, y: (GR - 1) * TILE, vx: -1.2, vy: 0, alive: true, squishTimer: 0 });
        }
        break;
      }

      case 'gauntlet': {
        // Multiple enemies + gaps — a real challenge
        const numEnemies = 2 + Math.floor(d / 2);
        for (let i = 0; i < numEnemies; i++) {
          this.goombas.push({ x: (startCol + 2 + i * 2) * TILE, y: (GR - 1) * TILE, vx: (i % 2 === 0 ? -1 : 1) * 1.2, vy: 0, alive: true, squishTimer: 0 });
        }
        // Small gap in the middle
        const gapMid = startCol + Math.floor(length / 2);
        const gw = 2 + Math.floor(d / 5);
        for (let c = gapMid; c < Math.min(gapMid + gw, endCol); c++) {
          this.level.map[GR][c] = T.AIR;
          this.level.map[GR + 1][c] = T.AIR;
        }
        // Trap block above gap
        if (d >= 3) {
          this.level.map[8][gapMid - 1] = T.TRAP;
        }
        break;
      }

      case 'stairs': {
        const peakHeight = 3 + Math.floor(Math.random() * 2);
        const actualWidth = peakHeight * 2;
        for (let r = 0; r < this.level.height; r++) {
          for (let c = startCol; c < startCol + actualWidth + 2; c++) {
            if (this.level.map[r].length <= c) {
              this.level.map[r].push(r >= GR ? T.GROUND : T.AIR);
            }
          }
        }
        let cOffset = 1;
        for (let step = 0; step < peakHeight; step++) {
          const c = startCol + cOffset + step;
          for (let r = GR - 1 - step; r < GR; r++) this.level.map[r][c] = T.STAIR;
        }
        cOffset += peakHeight;
        for (let step = 0; step < peakHeight; step++) {
          const c = startCol + cOffset + step;
          const h = peakHeight - step - 1;
          for (let r = GR - 1 - h; r < GR; r++) this.level.map[r][c] = T.STAIR;
        }
        length = actualWidth + 2;
        endCol = startCol + length;
        break;
      }

      case 'enemies': {
        const numGoombas = 1 + Math.floor(Math.random() * 2) + Math.floor(d / 3);
        for (let i = 0; i < numGoombas; i++) {
          this.goombas.push({ x: (startCol + 3 + i * 2) * TILE, y: (GR - 1) * TILE, vx: -1.2, vy: 0, alive: true, squishTimer: 0 });
        }
        break;
      }
    }

    this.lastGeneratedCol = endCol;
    this.level.width = endCol;
  }

  private placePipeAt(col: number, height: number, groundRow: number) {
    const topRow = groundRow - height;
    if (topRow < 0 || col < 0 || col + 1 >= this.level.width) return;
    this.level.map[topRow][col] = T.PIPE_TL;
    this.level.map[topRow][col + 1] = T.PIPE_TR;
    for (let r = topRow + 1; r < groundRow; r++) {
      this.level.map[r][col] = T.PIPE_BL;
      this.level.map[r][col + 1] = T.PIPE_BR;
    }
  }

  // ===== UPDATE =====
  private update() {
    if (this.transformTimer > 0) {
      this.transformTimer--;
      if (this.transformTimer === 0) {
        this.applyTransform();
      }
      this.frame++;
      return;
    }

    this.frame++;
    if (this.invTimer > 0) this.invTimer--;

    // Speed increase + difficulty scaling after col 95
    const baseCol = 95;
    const currentCol = Math.floor(this.mx / TILE);
    if (currentCol > baseCol) {
      this.walkSpeed = 3.2 + Math.min(3.8, (currentCol - baseCol) * 0.0065);
      this.difficulty = Math.min(10, Math.floor((currentCol - baseCol) / 30));
    }

    // Input
    const left = this.keys.has('ArrowLeft') || this.keys.has('KeyA') || this.touchL;
    const right = this.keys.has('ArrowRight') || this.keys.has('KeyD') || this.touchR;
    if (this.touchJ) { /* touch jump handled via event listener */ }

    if (right) { this.mvx += ACCEL; this.facingRight = true; }
    else if (left) { this.mvx -= ACCEL; this.facingRight = false; }
    else { this.mvx *= FRICTION; }
    this.mvx = Math.max(-this.walkSpeed, Math.min(this.walkSpeed, this.mvx));
    if (Math.abs(this.mvx) < 0.1) this.mvx = 0;

    // Gravity
    this.mvy += GRAVITY;
    if (this.mvy > 12) this.mvy = 12;

    // Move X then resolve
    this.mx += this.mvx;
    this.resolveX();

    // Move Y then resolve
    this.my += this.mvy;
    this.resolveY();

    // Clamp bounds
    if (this.mx < 0) { this.mx = 0; this.mvx = 0; }
    if (this.mx < this.camX) { this.mx = this.camX; this.mvx = 0; }

    // Run animation speed adjusts to walking speed
    if (this.grounded && Math.abs(this.mvx) > 0.5) {
      const rate = this.walkSpeed > 5.0 ? 3 : 5;
      if (this.frame % rate === 0) this.runFrame = (this.runFrame + 1) % 4;
    } else if (this.grounded) {
      this.runFrame = 0;
    }

    // Fall death
    if (this.my > this.level.height * TILE + 50) {
      this.running = false;
      this.cb.onSound?.('death');
      this.cb.onGameOver(this.score);
      return;
    }

    // Update camera
    const targetCam = this.mx - this.canvas.width * 0.35;
    this.camX += (targetCam - this.camX) * 0.1;
    if (this.camX < this.maxCamX) this.camX = this.maxCamX;
    else this.maxCamX = this.camX;
    const maxRight = this.level.width * TILE - this.canvas.width;
    if (this.camX > maxRight) this.camX = maxRight;
    if (this.camX < 0) this.camX = 0;

    // Update entities
    this.updatePowerUps();
    this.updateGoombas();
    this.updateBullets();
    this.updateCannons();
    this.updateFX();

    // Collisions
    this.checkPowerUpCollect();
    this.checkGoombaCollision();
    this.checkBulletCollision();

    // Cleanup far-away dead entities every 120 frames
    if (this.frame % 120 === 0) {
      const cleanBehind = this.camX - 500;
      this.goombas = this.goombas.filter(g => g.alive || g.x > cleanBehind);
      this.powerUps = this.powerUps.filter(p => p.active || p.x > cleanBehind);
    }

    // Update score based on distance run + bonus scores
    const distanceScore = Math.floor(this.mx / 10);
    this.cb.onScore(this.score + distanceScore);
    this.cb.onCoins(this.coins);
  }

  // ===== COLLISION RESOLUTION =====
  private resolveX() {
    const m = this;
    const top = Math.floor(m.my / TILE);
    const bot = Math.floor((m.my + m.mh - 1) / TILE);
    if (m.mvx > 0) {
      const col = Math.floor((m.mx + m.mw) / TILE);
      for (let r = top; r <= bot; r++) {
        if (this.isSolid(this.tileAt(col, r))) {
          m.mx = col * TILE - m.mw;
          m.mvx = 0;
          break;
        }
      }
    } else if (m.mvx < 0) {
      const col = Math.floor(m.mx / TILE);
      for (let r = top; r <= bot; r++) {
        if (this.isSolid(this.tileAt(col, r))) {
          m.mx = (col + 1) * TILE;
          m.mvx = 0;
          break;
        }
      }
    }
  }

  private resolveY() {
    const m = this;
    const left = Math.floor(m.mx / TILE);
    const right = Math.floor((m.mx + m.mw - 1) / TILE);

    if (m.mvy > 0) {
      const row = Math.floor((m.my + m.mh) / TILE);
      m.grounded = false;
      for (let c = left; c <= right; c++) {
        if (this.isSolid(this.tileAt(c, row))) {
          m.my = row * TILE - m.mh;
          m.mvy = 0;
          m.grounded = true;
          break;
        }
      }
    } else if (m.mvy < 0) {
      const row = Math.floor(m.my / TILE);
      for (let c = left; c <= right; c++) {
        const t = this.tileAt(c, row);
        if (this.isSolid(t)) {
          m.my = (row + 1) * TILE;
          m.mvy = 0;
          this.hitBlock(c, row, t);
          break;
        }
      }
    }
  }

  // ===== BLOCK INTERACTIONS =====
  private hitBlock(col: number, row: number, tile: number) {
    if (tile === T.Q_POWER) {
      this.level.map[row][col] = T.USED;
      this.bumps.push({ col, row, timer: 8 });
      if (this.mState === 'small') {
        this.spawnMushroom(col, row);
      } else {
        this.spawnFireFlower(col, row);
      }
    } else if (tile === T.Q_COIN) {
      this.level.map[row][col] = T.USED;
      this.bumps.push({ col, row, timer: 8 });
      this.collectCoin(col * TILE, row * TILE);
    } else if (tile === T.COIN_BRICK) {
      const key = `${col},${row}`;
      let remaining = this.coinBrickCounts.get(key) ?? COIN_BRICK_MAX;
      remaining--;
      this.bumps.push({ col, row, timer: 8 });
      this.collectCoin(col * TILE, row * TILE);
      if (remaining <= 0) {
        this.level.map[row][col] = T.USED;
        this.coinBrickCounts.delete(key);
      } else {
        this.coinBrickCounts.set(key, remaining);
      }
    } else if (tile === T.BRICK) {
      this.bumps.push({ col, row, timer: 8 });
      if (this.mState !== 'small') {
        this.level.map[row][col] = T.AIR;
        this.spawnBrickBreak(col * TILE + TILE / 2, row * TILE + TILE / 2);
        this.score += 50;
      }
    } else if (tile === T.TRAP) {
      this.level.map[row][col] = T.USED;
      this.bumps.push({ col, row, timer: 8 });
      this.warningFX.push({ x: col * TILE + TILE / 2, y: row * TILE, timer: 30 });
      // Spawn enemies around the trap
      const GR = 13;
      const numEnemies = 2 + Math.floor(this.difficulty / 3);
      for (let i = 0; i < numEnemies; i++) {
        const dir = i % 2 === 0 ? 1 : -1;
        this.goombas.push({
          x: col * TILE + dir * (3 + i) * TILE, y: (GR - 1) * TILE,
          vx: -1.2 * dir, vy: 0, alive: true, squishTimer: 0
        });
      }
      // At higher difficulty, also fire bullets from the trap
      if (this.difficulty >= 4) {
        this.bullets.push({ x: col * TILE - TILE, y: row * TILE + 4, vx: -4, active: true });
        this.bullets.push({ x: col * TILE + TILE * 2, y: row * TILE + 4, vx: 4, active: true });
      }
    }
  }

  private collectCoin(x: number, y: number) {
    this.coins++;
    this.score += 200;
    this.coinFX.push({ x, y, vy: -8, timer: 30 });
    this.cb.onCoins(this.coins);
    this.cb.onSound?.('coin');
  }

  private spawnMushroom(col: number, row: number) {
    this.powerUps.push({
      x: col * TILE, y: row * TILE,
      vx: 2, vy: 0,
      type: 'mushroom', active: true,
      rising: true, startY: (row - 1) * TILE,
    });
  }

  private spawnFireFlower(col: number, row: number) {
    this.powerUps.push({
      x: col * TILE + 2, y: row * TILE,
      vx: 0, vy: 0,
      type: 'flower', active: true,
      rising: true, startY: (row - 1) * TILE,
    });
  }

  private spawnBrickBreak(x: number, y: number) {
    for (let i = 0; i < 4; i++) {
      this.brickBreakFX.push({
        x, y, vx: (Math.random() - 0.5) * 6, vy: -5 - Math.random() * 4, t: 40,
      });
    }
  }

  // ===== POWER-UP UPDATE =====
  private updatePowerUps() {
    for (const p of this.powerUps) {
      if (!p.active) continue;
      if (p.rising) {
        p.y -= 1.5;
        if (p.y <= p.startY) {
          p.y = p.startY;
          p.rising = false;
        }
        continue;
      }
      if (p.type === 'mushroom') {
        p.vy += GRAVITY;
        p.x += p.vx;
        p.y += p.vy;

        const top = Math.floor(p.y / TILE);
        const bot = Math.floor((p.y + 28 - 1) / TILE);
        if (p.vx > 0) {
          const col = Math.floor((p.x + 28) / TILE);
          for (let r = top; r <= bot; r++) {
            if (this.isSolid(this.tileAt(col, r))) { p.x = col * TILE - 28; p.vx *= -1; break; }
          }
        } else if (p.vx < 0) {
          const col = Math.floor(p.x / TILE);
          for (let r = top; r <= bot; r++) {
            if (this.isSolid(this.tileAt(col, r))) { p.x = (col + 1) * TILE; p.vx *= -1; break; }
          }
        }
        if (p.vy > 0) {
          const row = Math.floor((p.y + 28) / TILE);
          const left = Math.floor(p.x / TILE);
          const right = Math.floor((p.x + 27) / TILE);
          for (let c = left; c <= right; c++) {
            if (this.isSolid(this.tileAt(c, row))) { p.y = row * TILE - 28; p.vy = 0; break; }
          }
        }
        if (p.y > this.level.height * TILE + 50) p.active = false;
      }
    }
  }

  // ===== GOOMBA UPDATE =====
  private updateGoombas() {
    const speedMult = this.walkSpeed / 3.2;
    for (const g of this.goombas) {
      if (g.squishTimer > 0) {
        g.squishTimer--;
        if (g.squishTimer <= 0) g.alive = false;
        continue;
      }
      if (!g.alive) return;

      g.vy += GRAVITY;
      g.vx = g.vx > 0 ? 1.2 * speedMult : -1.2 * speedMult;
      g.x += g.vx;
      g.y += g.vy;

      const top = Math.floor(g.y / TILE);
      const bot = Math.floor((g.y + 31) / TILE);
      if (g.vx > 0) {
        const col = Math.floor((g.x + 32) / TILE);
        for (let r = top; r <= bot; r++) {
          if (this.isSolid(this.tileAt(col, r))) { g.x = col * TILE - 32; g.vx *= -1; break; }
        }
      } else {
        const col = Math.floor(g.x / TILE);
        for (let r = top; r <= bot; r++) {
          if (this.isSolid(this.tileAt(col, r))) { g.x = (col + 1) * TILE; g.vx *= -1; break; }
        }
      }
      if (g.vy > 0) {
        const row = Math.floor((g.y + 32) / TILE);
        const left = Math.floor(g.x / TILE);
        const right = Math.floor((g.x + 31) / TILE);
        for (let c = left; c <= right; c++) {
          if (this.isSolid(this.tileAt(c, row))) { g.y = row * TILE - 32; g.vy = 0; break; }
        }
      }
    }
  }

  private updateFX() {
    for (const c of this.coinFX) {
      c.y += c.vy;
      c.vy += 0.5;
      c.timer--;
    }
    this.coinFX = this.coinFX.filter(c => c.timer > 0);

    for (const b of this.bumps) b.timer--;
    this.bumps = this.bumps.filter(b => b.timer > 0);

    for (const b of this.brickBreakFX) {
      b.x += b.vx; b.y += b.vy; b.vy += 0.5; b.t--;
    }
    this.brickBreakFX = this.brickBreakFX.filter(b => b.t > 0);

    // Warning FX
    for (const w of this.warningFX) w.timer--;
    this.warningFX = this.warningFX.filter(w => w.timer > 0);
  }

  // ===== BULLET UPDATE =====
  private updateBullets() {
    const speedMult = this.walkSpeed / 3.2;
    for (const b of this.bullets) {
      if (!b.active) continue;
      b.x += b.vx * speedMult;
      // Remove if off screen
      if (b.x < this.camX - 100 || b.x > this.camX + this.canvas.width + 100) {
        b.active = false;
      }
    }
    this.bullets = this.bullets.filter(b => b.active);
  }

  // ===== CANNON FIRING =====
  private updateCannons() {
    if (this.difficulty < 2) return; // cannons don't fire at low difficulty
    const fireInterval = Math.max(40, 120 - this.difficulty * 10);
    if (this.frame % fireInterval !== 0) return;

    for (const cc of this.cannonCols) {
      const cannonX = cc * TILE;
      // Only fire if cannon is on screen or close
      if (cannonX < this.camX - 200 || cannonX > this.camX + this.canvas.width + 200) continue;
      // Find the cannon row
      for (let r = 0; r < this.level.height; r++) {
        if (r < this.level.map.length && cc < this.level.map[r].length && this.level.map[r][cc] === T.CANNON) {
          const dir = this.mx < cannonX ? -1 : 1;
          const bulletSpeed = 3.5 + this.difficulty * 0.3;
          this.bullets.push({ x: cannonX + (dir > 0 ? TILE : -24), y: r * TILE + 4, vx: bulletSpeed * dir, active: true });
          break;
        }
      }
    }
  }

  // ===== BULLET COLLISION =====
  private checkBulletCollision() {
    for (const b of this.bullets) {
      if (!b.active) continue;
      if (this.boxOverlap(this.mx, this.my, this.mw, this.mh, b.x, b.y, 24, 24)) {
        b.active = false;
        this.cb.onSound?.('bullet_hit');
        this.takeDamage();
      }
    }
  }

  // ===== COLLISION CHECKS =====
  private checkPowerUpCollect() {
    for (const p of this.powerUps) {
      if (!p.active || p.rising) continue;
      if (this.boxOverlap(this.mx, this.my, this.mw, this.mh, p.x, p.y, 28, 28)) {
        p.active = false;
        this.cb.onSound?.('powerup');
        if (p.type === 'mushroom' && this.mState === 'small') {
          this.startTransform('super');
          this.score += 1000;
        } else if (p.type === 'flower') {
          this.startTransform('fire');
          this.score += 1000;
        } else if (p.type === 'mushroom') {
          this.score += 1000;
        }
      }
    }
  }

  private checkGoombaCollision() {
    for (const g of this.goombas) {
      if (!g.alive || g.squishTimer > 0) continue;
      if (!this.boxOverlap(this.mx, this.my, this.mw, this.mh, g.x, g.y, 32, 32)) continue;

      if (this.mvy > 0 && this.my + this.mh - g.y < 16) {
        g.squishTimer = 30;
        g.vx = 0;
        this.mvy = -8;
        this.score += 100;
        this.cb.onSound?.('stomp');
      } else if (this.invTimer <= 0) {
        this.takeDamage();
      }
    }
  }

  private takeDamage() {
    if (this.invTimer > 0) return;
    if (this.mState === 'small') {
      this.running = false;
      this.cb.onSound?.('death');
      const distanceScore = Math.floor(this.mx / 10);
      this.cb.onGameOver(this.score + distanceScore);
    } else {
      this.cb.onSound?.('damage');
      this.startTransform('small');
      this.invTimer = 120;
    }
  }

  private startTransform(to: MarioState) {
    this.transformTo = to;
    this.transformTimer = 30;
  }

  private applyTransform() {
    const oldH = this.mh;
    this.mState = this.transformTo;
    if (this.mState === 'small') {
      this.mw = SMALL_W; this.mh = SMALL_H;
    } else {
      this.mw = BIG_W; this.mh = BIG_H;
    }
    this.my += oldH - this.mh;
    this.invTimer = 90;
    this.cb.onMarioState(this.mState);
  }

  private boxOverlap(x1: number, y1: number, w1: number, h1: number, x2: number, y2: number, w2: number, h2: number): boolean {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
  }

  // ===== RENDER =====
  private render() {
    const { ctx, canvas } = this;
    const W = canvas.width, H = canvas.height;
    const groundScreenY = 13 * TILE;

    // Sky gradient - richer blue
    const sky = ctx.createLinearGradient(0, 0, 0, groundScreenY);
    sky.addColorStop(0, '#5b9ee1');
    sky.addColorStop(0.5, '#7dbbf5');
    sky.addColorStop(1, '#a8d8f8');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, groundScreenY);

    // Below-ground fill
    ctx.fillStyle = '#8b5e3c';
    ctx.fillRect(0, groundScreenY, W, H - groundScreenY);

    // Parallax background image layer
    if (this.bgLoaded && this.bgImage) {
      const bgW = this.bgImage.width;
      const bgH = this.bgImage.height;
      const scale = groundScreenY / (bgH * 0.7);
      const drawH = bgH * scale;
      const drawW = bgW * scale;
      const offsetX = -(this.camX * 0.15) % drawW;
      ctx.globalAlpha = 0.4;
      for (let x = offsetX - drawW; x < W + drawW; x += drawW) {
        ctx.drawImage(this.bgImage, x, groundScreenY - drawH + 30, drawW, drawH);
      }
      ctx.globalAlpha = 1.0;
    }

    // Clouds - fluffy pixel-art style with shading
    ctx.save();
    for (const c of this.clouds) {
      const sx = c.x - this.camX * 0.2 + Math.sin(this.frame * 0.003 + c.x) * 3;
      const wrapW = W + 400;
      const wrapped = ((sx % wrapW) + wrapW) % wrapW - 200;
      const s = c.size;

      // Shadow
      ctx.fillStyle = `rgba(180,210,240,${c.opacity * 0.3})`;
      this.drawCloudShape(ctx, wrapped + 2, c.y + 4, s);

      // Main cloud body
      ctx.fillStyle = `rgba(255,255,255,${c.opacity * 0.9})`;
      this.drawCloudShape(ctx, wrapped, c.y, s);

      // Highlight on top
      ctx.fillStyle = `rgba(255,255,255,${c.opacity * 0.5})`;
      ctx.beginPath();
      ctx.arc(wrapped, c.y - s * 0.12, s * 0.3, 0, Math.PI * 2);
      ctx.arc(wrapped + s * 0.28, c.y - s * 0.2, s * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Far hills (back layer) with gradient fills
    ctx.save();
    for (const h of this.hills) {
      const sx = h.x - this.camX * 0.3;
      const wrapW = 5000;
      const wrapped = ((sx % wrapW) + wrapW) % wrapW - 300;
      const hillGY = groundScreenY;

      const grad = ctx.createLinearGradient(wrapped, hillGY - h.h, wrapped, hillGY);
      grad.addColorStop(0, h.color);
      grad.addColorStop(1, this.darkenColor(h.color, 20));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(wrapped - 10, hillGY);
      ctx.bezierCurveTo(wrapped + h.w * 0.15, hillGY - h.h * 0.7, wrapped + h.w * 0.35, hillGY - h.h, wrapped + h.w * 0.5, hillGY - h.h);
      ctx.bezierCurveTo(wrapped + h.w * 0.65, hillGY - h.h, wrapped + h.w * 0.85, hillGY - h.h * 0.7, wrapped + h.w + 10, hillGY);
      ctx.closePath();
      ctx.fill();

      // Hill highlight
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.moveTo(wrapped + h.w * 0.2, hillGY);
      ctx.bezierCurveTo(wrapped + h.w * 0.3, hillGY - h.h * 0.6, wrapped + h.w * 0.4, hillGY - h.h * 0.9, wrapped + h.w * 0.5, hillGY - h.h);
      ctx.bezierCurveTo(wrapped + h.w * 0.55, hillGY - h.h * 0.95, wrapped + h.w * 0.5, hillGY - h.h * 0.5, wrapped + h.w * 0.45, hillGY);
      ctx.closePath();
      ctx.fill();

      // Trees on hills
      for (const tree of h.trees) {
        const tx = wrapped + tree.xOff;
        const ty = this.getHillY(wrapped, h.w, h.h, hillGY, tx);
        // Trunk
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(tx - 2, ty - tree.h * 0.4, 4, tree.h * 0.4);
        // Foliage
        ctx.fillStyle = '#2d6e2d';
        ctx.beginPath();
        ctx.arc(tx, ty - tree.h * 0.5, tree.h * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3a8a3a';
        ctx.beginPath();
        ctx.arc(tx - 3, ty - tree.h * 0.45, tree.h * 0.25, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Bushes near ground
    for (const bush of this.bushes) {
      const sx = bush.x - this.camX * 0.45;
      const wrapW = 5200;
      const wrapped = ((sx % wrapW) + wrapW) % wrapW - 200;
      const by = groundScreenY - bush.h * 0.3;
      ctx.fillStyle = '#4a9e4a';
      ctx.beginPath();
      ctx.arc(wrapped, by, bush.h, 0, Math.PI * 2);
      ctx.arc(wrapped + bush.w * 0.35, by - bush.h * 0.15, bush.h * 0.8, 0, Math.PI * 2);
      ctx.arc(wrapped - bush.w * 0.3, by + bush.h * 0.1, bush.h * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5ab85a';
      ctx.beginPath();
      ctx.arc(wrapped + 2, by - bush.h * 0.3, bush.h * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // World tiles
    ctx.save();
    ctx.translate(-Math.round(this.camX), 0);

    const startCol = Math.max(0, Math.floor(this.camX / TILE) - 1);
    const endCol = Math.min(this.level.width, Math.ceil((this.camX + W) / TILE) + 1);

    for (let r = 0; r < this.level.height; r++) {
      for (let c = startCol; c < endCol; c++) {
        const t = this.tileAt(c, r);
        if (t === T.AIR) continue;
        let tileY = r * TILE;
        const bump = this.bumps.find(b => b.col === c && b.row === r);
        if (bump) tileY -= Math.sin(bump.timer / 8 * Math.PI) * 6;
        drawTile(ctx, t, c * TILE, tileY, this.frame);
      }
    }

    for (const p of this.powerUps) {
      if (p.active) drawPowerUp(ctx, p);
    }

    for (const g of this.goombas) {
      if (g.alive || g.squishTimer > 0) drawGoomba(ctx, g, this.frame);
    }

    for (const c of this.coinFX) drawCoinFX(ctx, c);

    ctx.fillStyle = '#c0392b';
    for (const b of this.brickBreakFX) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.t * 0.2);
      ctx.fillRect(-5, -5, 10, 10);
      ctx.restore();
    }

    // Bullets
    for (const b of this.bullets) {
      if (b.active) drawBullet(ctx, b, this.frame);
    }

    // Warning FX
    for (const w of this.warningFX) drawWarningFX(ctx, w);

    // Mario - use sprite sheet if loaded
    if (this.marioSpriteLoaded && this.marioSprite) {
      this.drawMarioSprite(ctx);
    } else {
      drawMario(ctx, this.mx, this.my, this.mw, this.mh, this.mState, this.runFrame, !this.grounded, this.facingRight, this.invTimer > 0 || this.transformTimer > 0);
    }

    ctx.restore();
  }

  private drawCloudShape(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
    ctx.beginPath();
    ctx.arc(x, y, s * 0.38, 0, Math.PI * 2);
    ctx.arc(x + s * 0.32, y - s * 0.08, s * 0.28, 0, Math.PI * 2);
    ctx.arc(x - s * 0.3, y + s * 0.04, s * 0.25, 0, Math.PI * 2);
    ctx.arc(x + s * 0.15, y + s * 0.15, s * 0.22, 0, Math.PI * 2);
    ctx.arc(x - s * 0.12, y - s * 0.12, s * 0.2, 0, Math.PI * 2);
    ctx.arc(x + s * 0.45, y + s * 0.08, s * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }

  private darkenColor(hex: string, amount: number): string {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.max(0, (num >> 16) - amount);
    const g = Math.max(0, ((num >> 8) & 0xff) - amount);
    const b = Math.max(0, (num & 0xff) - amount);
    return `rgb(${r},${g},${b})`;
  }

  private getHillY(hillX: number, w: number, h: number, groundY: number, px: number): number {
    const t = Math.max(0, Math.min(1, (px - hillX) / w));
    const y = groundY - h * Math.sin(t * Math.PI);
    return y;
  }

  private drawMarioSprite(ctx: CanvasRenderingContext2D) {
    if (!this.marioSprite) return;
    const flicker = (this.invTimer > 0 || this.transformTimer > 0) && Math.floor(Date.now() / 80) % 2 === 0;
    if (flicker) return;

    // Sprite sheet is 2x2 grid of running frames (1024x1024 image, 4 frames)
    const imgW = this.marioSprite.width;
    const imgH = this.marioSprite.height;
    const frameW = imgW / 2;
    const frameH = imgH / 2;

    // Pick frame based on runFrame (0-3)
    const frameIdx = this.runFrame % 4;
    const srcX = (frameIdx % 2) * frameW;
    const srcY = Math.floor(frameIdx / 2) * frameH;

    // Trim transparent area - the sprites have padding
    const trimX = frameW * 0.2;
    const trimY = frameH * 0.1;
    const trimW = frameW * 0.6;
    const trimH = frameH * 0.8;

    ctx.save();
    if (!this.facingRight) {
      ctx.translate(this.mx + this.mw, this.my);
      ctx.scale(-1, 1);
      ctx.drawImage(this.marioSprite, srcX + trimX, srcY + trimY, trimW, trimH, 0, 0, this.mw, this.mh);
    } else {
      ctx.drawImage(this.marioSprite, srcX + trimX, srcY + trimY, trimW, trimH, this.mx, this.my, this.mw, this.mh);
    }
    ctx.restore();
  }

  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
  }
}
