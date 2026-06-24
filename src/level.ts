// Tile constants
export const TILE = 32;
export const T = {
  AIR: 0, GROUND: 1, BRICK: 2, Q_POWER: 3, Q_COIN: 4,
  USED: 5, PIPE_TL: 6, PIPE_TR: 7, PIPE_BL: 8, PIPE_BR: 9,
  STAIR: 10, COIN_BRICK: 11, TRAP: 12, CANNON: 13,
};

export type MarioState = 'small' | 'super' | 'fire';

export interface PowerUp {
  x: number; y: number; vx: number; vy: number;
  type: 'mushroom' | 'flower'; active: boolean;
  rising: boolean; startY: number;
}

export interface Goomba {
  x: number; y: number; vx: number; vy: number;
  alive: boolean; squishTimer: number;
}

export interface Bullet {
  x: number; y: number; vx: number;
  active: boolean;
}

export interface CoinFX {
  x: number; y: number; vy: number; timer: number;
}

export interface BlockBump {
  col: number; row: number; timer: number;
}

export interface WarningFX {
  x: number; y: number; timer: number;
}

// How many coins a coin-brick gives
export const COIN_BRICK_MAX = 8;

export interface LevelDef {
  map: number[][];
  width: number;
  height: number;
  marioSpawn: [number, number];
  goombas: [number, number][];
  coinBrickCounts: Map<string, number>;
  levelEnd: number; // x column for level complete
}

function makeMap(w: number, h: number): number[][] {
  const m: number[][] = [];
  for (let r = 0; r < h; r++) m[r] = new Array(w).fill(T.AIR);
  return m;
}

function placePipe(map: number[][], col: number, height: number, groundRow: number) {
  const topRow = groundRow - height;
  map[topRow][col] = T.PIPE_TL;
  map[topRow][col + 1] = T.PIPE_TR;
  for (let r = topRow + 1; r < groundRow; r++) {
    map[r][col] = T.PIPE_BL;
    map[r][col + 1] = T.PIPE_BR;
  }
}

export function buildLevel1(): LevelDef {
  const W = 112, H = 15, GR = 13; // GR = ground row
  const map = makeMap(W, H);

  // Ground rows 13-14 (full width, remove for pits later)
  for (let c = 0; c < W; c++) {
    map[GR][c] = T.GROUND;
    map[GR + 1][c] = T.GROUND;
  }

  // === Section 1: Start + First Power-Up ===
  // Floating block row at row 9, cols 11-16
  [11, 12, 13, 15, 16].forEach(c => map[9][c] = T.BRICK);
  map[9][14] = T.Q_POWER; // ? block with mushroom (flashing)

  // Pipe (mushroom bounces off this) - cols 20-21, 3 tiles tall
  placePipe(map, 20, 3, GR);

  // === Section 2: Two Pipes ===
  placePipe(map, 28, 3, GR); // first pipe
  placePipe(map, 33, 4, GR); // second taller pipe

  // === Section 3: Raised brick platform cols 38-54 ===
  for (let c = 38; c <= 54; c++) map[9][c] = T.BRICK;
  // Gap in platform at cols 47-49
  map[9][47] = T.AIR; map[9][48] = T.AIR; map[9][49] = T.AIR;
  // ? block above gap (Fire Flower / Mushroom depending on state)
  map[6][48] = T.Q_POWER;

  // === Section 4: After platform ===
  // Floating coin-brick at col 60, row 9
  map[9][60] = T.COIN_BRICK;

  // Pit cols 65-68
  for (let c = 65; c <= 68; c++) { map[GR][c] = T.AIR; map[GR + 1][c] = T.AIR; }

  // Three ? coin blocks at row 9
  map[9][73] = T.Q_COIN;
  map[9][75] = T.Q_COIN;
  map[9][77] = T.Q_COIN;

  // === Section 5: Pyramid staircase cols 83-91 ===
  for (let step = 0; step < 9; step++) {
    const col = 83 + step;
    for (let r = GR - 1 - step; r < GR; r++) {
      map[r][col] = T.STAIR;
    }
  }

  // Coin brick counts
  const cbc = new Map<string, number>();
  cbc.set('60,9', COIN_BRICK_MAX);

  return {
    map, width: W, height: H,
    marioSpawn: [3 * TILE, (GR - 1) * TILE],
    goombas: [[48 * TILE, (GR - 1) * TILE]],
    coinBrickCounts: cbc,
    levelEnd: 95 * TILE,
  };
}
