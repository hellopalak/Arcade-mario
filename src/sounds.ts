// Synthesized retro game sounds using Web Audio API
let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playTone(freq: number, duration: number, type: OscillatorType = 'square', volume = 0.15) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

export function playCoinSound() {
  const ctx = getCtx();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(988, t);       // B5
  osc.frequency.setValueAtTime(1319, t + 0.07); // E6
  gain.gain.setValueAtTime(0.12, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.2);
}

export function playPowerUpSound() {
  const ctx = getCtx();
  const t = ctx.currentTime;
  const notes = [523, 659, 784, 1047, 1319, 1568]; // C5 E5 G5 C6 E6 G6
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t + i * 0.06);
    gain.gain.setValueAtTime(0.1, t + i * 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t + i * 0.06);
    osc.stop(t + i * 0.06 + 0.12);
  });
}

export function playDamageSound() {
  const ctx = getCtx();
  const t = ctx.currentTime;
  // Descending wah-wah
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(600, t);
  osc.frequency.linearRampToValueAtTime(150, t + 0.3);
  gain.gain.setValueAtTime(0.12, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.35);
}

export function playBulletHitSound() {
  const ctx = getCtx();
  const t = ctx.currentTime;
  // Quick harsh buzz
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, t);
  osc.frequency.linearRampToValueAtTime(80, t + 0.15);
  gain.gain.setValueAtTime(0.15, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.2);
  // Add noise burst
  playTone(110, 0.1, 'square', 0.08);
}

export function playDeathSound() {
  const ctx = getCtx();
  const t = ctx.currentTime;
  // Classic descending death jingle
  const notes = [
    { freq: 494, time: 0 },      // B4
    { freq: 466, time: 0.12 },   // Bb4
    { freq: 440, time: 0.24 },   // A4
    { freq: 392, time: 0.36 },   // G4
    { freq: 330, time: 0.52 },   // E4
    { freq: 262, time: 0.68 },   // C4
    { freq: 196, time: 0.84 },   // G3
  ];
  notes.forEach(n => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(n.freq, t + n.time);
    gain.gain.setValueAtTime(0.15, t + n.time);
    gain.gain.exponentialRampToValueAtTime(0.001, t + n.time + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t + n.time);
    osc.stop(t + n.time + 0.15);
  });
}

export function playJumpSound() {
  const ctx = getCtx();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(200, t);
  osc.frequency.exponentialRampToValueAtTime(600, t + 0.1);
  gain.gain.setValueAtTime(0.08, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.15);
}

export function playStompSound() {
  playTone(400, 0.08, 'square', 0.1);
  setTimeout(() => playTone(600, 0.06, 'square', 0.08), 40);
}
