import { TILE, T, type MarioState, type PowerUp, type Goomba, type CoinFX, type Bullet, type WarningFX } from './level';

// Draw a single tile
export function drawTile(ctx: CanvasRenderingContext2D, type: number, x: number, y: number, frame: number) {
  const S = TILE;
  switch (type) {
    case T.GROUND: {
      ctx.fillStyle = '#c84c09';
      ctx.fillRect(x, y, S, S);
      ctx.fillStyle = '#e07020';
      ctx.fillRect(x + 1, y + 1, S - 2, S - 2);
      ctx.strokeStyle = '#a03800';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, S / 2, S / 2);
      ctx.strokeRect(x + S / 2, y + S / 2, S / 2, S / 2);
      break;
    }
    case T.BRICK: {
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(x, y, S, S);
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(x + 1, y + 1, S - 2, S - 2);
      ctx.strokeStyle = '#922b21';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, S / 2, S / 2);
      ctx.strokeRect(x + S / 2, y + S / 2, S / 2, S / 2);
      break;
    }
    case T.Q_POWER:
    case T.Q_COIN: {
      const pulse = Math.sin(frame * 0.1) * 0.15 + 0.85;
      ctx.fillStyle = '#e67e22';
      ctx.fillRect(x, y, S, S);
      const r = Math.floor(200 * pulse), g = Math.floor(160 * pulse);
      ctx.fillStyle = `rgb(${r},${g},30)`;
      ctx.fillRect(x + 2, y + 2, S - 4, S - 4);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('?', x + S / 2, y + S / 2 + 1);
      break;
    }
    case T.USED: {
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(x, y, S, S);
      ctx.fillStyle = '#7a5a3a';
      ctx.fillRect(x + 2, y + 2, S - 4, S - 4);
      break;
    }
    case T.PIPE_TL: {
      ctx.fillStyle = '#2ecc71';
      ctx.fillRect(x - 4, y, S + 4, S);
      ctx.fillStyle = '#27ae60';
      ctx.fillRect(x - 4, y, S + 4, 4);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(x - 2, y + 4, 6, S - 4);
      break;
    }
    case T.PIPE_TR: {
      ctx.fillStyle = '#2ecc71';
      ctx.fillRect(x, y, S + 4, S);
      ctx.fillStyle = '#27ae60';
      ctx.fillRect(x, y, S + 4, 4);
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(x + S - 4, y + 4, 6, S - 4);
      break;
    }
    case T.PIPE_BL: {
      ctx.fillStyle = '#27ae60';
      ctx.fillRect(x, y, S, S);
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(x + 2, y, 6, S);
      break;
    }
    case T.PIPE_BR: {
      ctx.fillStyle = '#27ae60';
      ctx.fillRect(x, y, S, S);
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(x + S - 8, y, 6, S);
      break;
    }
    case T.STAIR: {
      ctx.fillStyle = '#b8860b';
      ctx.fillRect(x, y, S, S);
      ctx.fillStyle = '#d4a020';
      ctx.fillRect(x + 1, y + 1, S - 2, S - 2);
      ctx.strokeStyle = '#8b6914';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 2, y + 2, S - 4, S - 4);
      break;
    }
    case T.COIN_BRICK: {
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(x, y, S, S);
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(x + 1, y + 1, S - 2, S - 2);
      ctx.strokeStyle = '#922b21';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, S / 2, S / 2);
      ctx.strokeRect(x + S / 2, y + S / 2, S / 2, S / 2);
      // coin shimmer
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(x + S / 2, y + S / 2, 5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case T.TRAP: {
      // Skull block - dark purple with skull icon, pulses menacingly
      const pulse = Math.sin(frame * 0.08) * 0.1 + 0.9;
      ctx.fillStyle = '#2d1b4e';
      ctx.fillRect(x, y, S, S);
      const rr = Math.floor(80 * pulse), gg = Math.floor(30 * pulse);
      ctx.fillStyle = `rgb(${rr},${gg},${Math.floor(100 * pulse)})`;
      ctx.fillRect(x + 2, y + 2, S - 4, S - 4);
      // Skull face
      ctx.fillStyle = `rgba(255,255,255,${0.6 + Math.sin(frame * 0.12) * 0.2})`;
      ctx.beginPath();
      ctx.arc(x + S / 2, y + S / 2 - 2, 8, 0, Math.PI * 2);
      ctx.fill();
      // Eyes
      ctx.fillStyle = '#2d1b4e';
      ctx.fillRect(x + 11, y + 11, 4, 4);
      ctx.fillRect(x + 19, y + 11, 4, 4);
      // Mouth
      ctx.fillRect(x + 12, y + 19, 2, 3);
      ctx.fillRect(x + 15, y + 19, 2, 3);
      ctx.fillRect(x + 18, y + 19, 2, 3);
      break;
    }
    case T.CANNON: {
      // Dark steel cannon block on top of a pipe
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(x, y, S, S);
      ctx.fillStyle = '#34495e';
      ctx.fillRect(x + 2, y + 2, S - 4, S - 4);
      // Barrel opening
      ctx.fillStyle = '#1a252f';
      ctx.beginPath();
      ctx.arc(x + S / 2, y + S / 2, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2c3e50';
      ctx.beginPath();
      ctx.arc(x + S / 2, y + S / 2, 6, 0, Math.PI * 2);
      ctx.fill();
      // Flash when about to fire
      if (frame % 90 < 15) {
        ctx.fillStyle = `rgba(255,100,0,${0.3 + Math.sin(frame * 0.4) * 0.2})`;
        ctx.beginPath();
        ctx.arc(x + S / 2, y + S / 2, 8, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
  }
}

// Draw Mario in different states
export function drawMario(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  state: MarioState, runFrame: number, isJumping: boolean,
  facingRight: boolean, invincibleFlicker: boolean
) {
  if (invincibleFlicker && Math.floor(Date.now() / 80) % 2 === 0) return;

  ctx.save();
  if (!facingRight) {
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    ctx.translate(0, 0);
  } else {
    ctx.translate(x, y);
  }

  const hatColor = state === 'fire' ? '#f0f0f0' : '#e74c3c';
  const shirtColor = state === 'fire' ? '#f0f0f0' : '#e74c3c';
  const overallColor = state === 'fire' ? '#e74c3c' : '#2980b9';
  const skinColor = '#f5cba7';

  if (h > 40) {
    // Super / Fire Mario (tall)
    // Hat
    ctx.fillStyle = hatColor;
    ctx.fillRect(6, 0, 20, 6);
    ctx.fillRect(4, 4, 24, 5);
    // Face
    ctx.fillStyle = skinColor;
    ctx.fillRect(6, 9, 20, 10);
    // Hair
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(4, 9, 5, 5);
    // Eye
    ctx.fillStyle = '#222';
    ctx.fillRect(20, 11, 4, 4);
    // Mustache
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(14, 15, 12, 4);
    // Shirt
    ctx.fillStyle = shirtColor;
    ctx.fillRect(4, 19, 24, 10);
    // Arms
    if (isJumping) {
      ctx.fillRect(0, 17, 6, 6);
      ctx.fillRect(26, 17, 6, 6);
    } else {
      const f = runFrame % 4;
      if (f === 1) { ctx.fillRect(26, 20, 6, 5); ctx.fillRect(-2, 24, 6, 5); }
      else if (f === 3) { ctx.fillRect(-2, 20, 6, 5); ctx.fillRect(26, 24, 6, 5); }
      else { ctx.fillRect(0, 22, 5, 5); ctx.fillRect(27, 22, 5, 5); }
    }
    // Overalls
    ctx.fillStyle = overallColor;
    ctx.fillRect(6, 29, 20, 10);
    // Buttons
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(10, 30, 3, 3);
    ctx.fillRect(19, 30, 3, 3);
    // Belt
    ctx.fillStyle = state === 'fire' ? '#8b0000' : '#1a5276';
    ctx.fillRect(6, 29, 20, 2);
    // Legs + shoes
    ctx.fillStyle = overallColor;
    if (isJumping) {
      ctx.fillRect(6, 39, 10, 8);
      ctx.fillRect(16, 39, 10, 10);
      ctx.fillStyle = '#6d4c41';
      ctx.fillRect(4, 46, 12, 5);
      ctx.fillRect(14, 48, 14, 5);
    } else {
      const f = runFrame % 4;
      if (f === 0 || f === 2) {
        ctx.fillRect(6, 39, 10, 8); ctx.fillRect(16, 39, 10, 8);
        ctx.fillStyle = '#6d4c41';
        ctx.fillRect(4, 47, 12, h - 47); ctx.fillRect(16, 47, 12, h - 47);
      } else if (f === 1) {
        ctx.fillRect(2, 39, 10, 8); ctx.fillRect(20, 39, 10, 6);
        ctx.fillStyle = '#6d4c41';
        ctx.fillRect(0, 47, 12, h - 47); ctx.fillRect(20, 45, 12, h - 45);
      } else {
        ctx.fillRect(8, 39, 10, 6); ctx.fillRect(14, 39, 10, 8);
        ctx.fillStyle = '#6d4c41';
        ctx.fillRect(8, 45, 12, h - 45); ctx.fillRect(12, 47, 12, h - 47);
      }
    }
  } else {
    // Small Mario
    // Hat
    ctx.fillStyle = hatColor;
    ctx.fillRect(6, 0, 18, 5);
    ctx.fillRect(4, 3, 22, 4);
    // Face
    ctx.fillStyle = skinColor;
    ctx.fillRect(6, 7, 18, 8);
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(4, 7, 4, 4);
    ctx.fillStyle = '#222';
    ctx.fillRect(18, 9, 3, 3);
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(12, 12, 10, 3);
    // Body
    ctx.fillStyle = shirtColor;
    ctx.fillRect(4, 15, 22, 6);
    // Overalls
    ctx.fillStyle = overallColor;
    ctx.fillRect(6, 20, 18, 5);
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(9, 21, 2, 2); ctx.fillRect(19, 21, 2, 2);
    // Legs + shoes
    ctx.fillStyle = overallColor;
    if (isJumping) {
      ctx.fillRect(4, 25, 8, 4); ctx.fillRect(16, 25, 8, 5);
      ctx.fillStyle = '#6d4c41';
      ctx.fillRect(2, 28, 10, 4); ctx.fillRect(16, 29, 10, 3);
    } else {
      const f = runFrame % 4;
      if (f === 0 || f === 2) {
        ctx.fillRect(6, 25, 8, 4); ctx.fillRect(16, 25, 8, 4);
        ctx.fillStyle = '#6d4c41';
        ctx.fillRect(4, 28, 10, 4); ctx.fillRect(16, 28, 10, 4);
      } else if (f === 1) {
        ctx.fillRect(2, 25, 8, 4); ctx.fillRect(18, 25, 8, 3);
        ctx.fillStyle = '#6d4c41';
        ctx.fillRect(0, 28, 10, 4); ctx.fillRect(18, 27, 10, 4);
      } else {
        ctx.fillRect(8, 25, 8, 3); ctx.fillRect(14, 25, 8, 4);
        ctx.fillStyle = '#6d4c41';
        ctx.fillRect(8, 27, 10, 4); ctx.fillRect(12, 28, 10, 4);
      }
    }
  }
  ctx.restore();
}

export function drawPowerUp(ctx: CanvasRenderingContext2D, p: PowerUp) {
  if (!p.active) return;
  if (p.type === 'mushroom') {
    // Red cap
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(p.x + 14, p.y + 10, 14, Math.PI, 0);
    ctx.fill();
    // White spots
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(p.x + 8, p.y + 6, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(p.x + 20, p.y + 6, 4, 0, Math.PI * 2); ctx.fill();
    // Stem
    ctx.fillStyle = '#f5deb3';
    ctx.fillRect(p.x + 6, p.y + 10, 16, 14);
    // Eyes
    ctx.fillStyle = '#222';
    ctx.fillRect(p.x + 9, p.y + 14, 3, 3);
    ctx.fillRect(p.x + 17, p.y + 14, 3, 3);
  } else {
    // Fire Flower
    const bob = Math.sin(Date.now() * 0.005) * 2;
    const fx = p.x, fy = p.y + bob;
    // Petals
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath(); ctx.arc(fx + 14, fy + 4, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(fx + 6, fy + 10, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(fx + 22, fy + 10, 5, 0, Math.PI * 2); ctx.fill();
    // Center
    ctx.fillStyle = '#f39c12';
    ctx.beginPath(); ctx.arc(fx + 14, fy + 10, 5, 0, Math.PI * 2); ctx.fill();
    // Stem
    ctx.fillStyle = '#27ae60';
    ctx.fillRect(fx + 12, fy + 15, 4, 10);
    // Leaves
    ctx.beginPath(); ctx.ellipse(fx + 8, fy + 20, 5, 3, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(fx + 20, fy + 20, 5, 3, 0.3, 0, Math.PI * 2); ctx.fill();
  }
}

export function drawGoomba(ctx: CanvasRenderingContext2D, g: Goomba, frame: number) {
  if (g.squishTimer > 0) {
    // Squished
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(g.x + 2, g.y + 24, 28, 8);
    return;
  }
  if (!g.alive) return;
  // Body
  ctx.fillStyle = '#8b4513';
  ctx.beginPath(); ctx.ellipse(g.x + 16, g.y + 20, 16, 12, 0, 0, Math.PI * 2); ctx.fill();
  // Head
  ctx.fillStyle = '#a0522d';
  ctx.beginPath(); ctx.ellipse(g.x + 16, g.y + 8, 13, 11, 0, Math.PI, Math.PI * 2); ctx.fill();
  // Eyes
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(g.x + 10, g.y + 10, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(g.x + 22, g.y + 10, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(g.x + 11, g.y + 11, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(g.x + 23, g.y + 11, 2, 0, Math.PI * 2); ctx.fill();
  // Feet (animated)
  ctx.fillStyle = '#654321';
  const footOff = frame % 20 < 10 ? 0 : 3;
  ctx.fillRect(g.x + 2 - footOff, g.y + 26, 10, 6);
  ctx.fillRect(g.x + 20 + footOff, g.y + 26, 10, 6);
}

export function drawBullet(ctx: CanvasRenderingContext2D, b: Bullet, frame: number) {
  if (!b.active) return;
  // Bullet Bill body
  const bx = b.x, by = b.y;
  const goingLeft = b.vx < 0;

  ctx.save();
  if (!goingLeft) {
    ctx.translate(bx + 24, by + 12);
    ctx.scale(-1, 1);
    ctx.translate(-12, -12);
  } else {
    ctx.translate(bx, by);
  }

  // Main body (dark cylinder)
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.ellipse(12, 12, 12, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Nose cone
  ctx.fillStyle = '#0d0d1a';
  ctx.beginPath();
  ctx.moveTo(0, 4);
  ctx.lineTo(-4, 12);
  ctx.lineTo(0, 20);
  ctx.fill();

  // Eye
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(8, 10, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(7, 10, 2, 0, Math.PI * 2);
  ctx.fill();

  // Arm band
  ctx.fillStyle = '#e74c3c';
  ctx.fillRect(14, 4, 4, 16);

  // Exhaust trail
  const trailAlpha = 0.3 + Math.sin(frame * 0.3) * 0.15;
  ctx.fillStyle = `rgba(255,200,50,${trailAlpha})`;
  ctx.beginPath();
  ctx.arc(22, 12, 4 + Math.sin(frame * 0.5) * 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawWarningFX(ctx: CanvasRenderingContext2D, w: WarningFX) {
  const alpha = Math.min(1, w.timer / 15);
  const scale = 1 + (30 - w.timer) * 0.05;
  ctx.save();
  ctx.globalAlpha = alpha * 0.7;
  ctx.translate(w.x, w.y);
  ctx.scale(scale, scale);
  // Danger ring
  ctx.strokeStyle = '#ff3333';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, Math.PI * 2);
  ctx.stroke();
  // Exclamation
  ctx.fillStyle = '#ff3333';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('!', 0, 0);
  ctx.restore();
}

export function drawCoinFX(ctx: CanvasRenderingContext2D, c: CoinFX) {
  const sx = Math.abs(Math.cos(c.timer * 0.3));
  ctx.save();
  ctx.translate(c.x + 8, c.y + 8);
  ctx.scale(sx, 1);
  ctx.fillStyle = '#ffd700';
  ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffec80';
  ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#b8860b';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('$', 0, 0);
  ctx.restore();
}
