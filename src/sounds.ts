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

// ===== MARIO BGM (Synthesized Overworld Theme) =====
// Classic Super Mario Bros overworld melody at very low volume

interface BGMNote {
  freq: number;  // Hz, 0 = rest
  dur: number;   // beats
}

const BGM_VOLUME = 0.025 // Very low — just barely audible
const BGM_BPM = 100;

// Super Mario Bros overworld melody (simplified, loopable)
const bgmMelody: BGMNote[] = [
  // Bar 1-2: E E _ E _ C E _ G _ _ _ G _ _ _
  { freq: 659, dur: 0.5 }, { freq: 659, dur: 0.5 }, { freq: 0, dur: 0.5 },
  { freq: 659, dur: 0.5 }, { freq: 0, dur: 0.5 }, { freq: 523, dur: 0.5 },
  { freq: 659, dur: 0.5 }, { freq: 0, dur: 0.5 }, { freq: 784, dur: 0.5 },
  { freq: 0, dur: 1.5 }, { freq: 392, dur: 0.5 }, { freq: 0, dur: 1.5 },

  // Bar 3-4: C _ _ G _ _ E _ _ A _ B _ Bb A _
  { freq: 523, dur: 0.75 }, { freq: 0, dur: 0.25 }, { freq: 392, dur: 0.75 },
  { freq: 0, dur: 0.25 }, { freq: 330, dur: 0.75 }, { freq: 0, dur: 0.25 },
  { freq: 440, dur: 0.5 }, { freq: 494, dur: 0.5 }, { freq: 0, dur: 0.25 },
  { freq: 466, dur: 0.25 }, { freq: 440, dur: 0.5 },

  // Bar 5-6: G E G A _ F G _ E _ C D B _ _
  { freq: 392, dur: 0.33 }, { freq: 659, dur: 0.33 }, { freq: 784, dur: 0.34 },
  { freq: 880, dur: 0.5 }, { freq: 0, dur: 0.25 }, { freq: 698, dur: 0.25 },
  { freq: 784, dur: 0.5 }, { freq: 0, dur: 0.25 }, { freq: 659, dur: 0.25 },
  { freq: 0, dur: 0.25 }, { freq: 523, dur: 0.25 }, { freq: 587, dur: 0.25 },
  { freq: 494, dur: 0.25 }, { freq: 0, dur: 0.5 },

  // Bar 7-8 (repeat feel): high run
  { freq: 0, dur: 0.5 },
  { freq: 784, dur: 0.25 }, { freq: 740, dur: 0.25 }, { freq: 698, dur: 0.25 },
  { freq: 622, dur: 0.5 }, { freq: 659, dur: 0.5 }, { freq: 0, dur: 0.25 },
  { freq: 415, dur: 0.25 }, { freq: 440, dur: 0.25 }, { freq: 523, dur: 0.25 },
  { freq: 0, dur: 0.25 }, { freq: 440, dur: 0.25 }, { freq: 523, dur: 0.25 },
  { freq: 587, dur: 0.25 },

  // Bar 9-10 (repeat feel)
  { freq: 0, dur: 0.5 },
  { freq: 784, dur: 0.25 }, { freq: 740, dur: 0.25 }, { freq: 698, dur: 0.25 },
  { freq: 622, dur: 0.5 }, { freq: 659, dur: 0.5 }, { freq: 0, dur: 0.25 },
  { freq: 1047, dur: 0.5 }, { freq: 1047, dur: 0.25 }, { freq: 1047, dur: 0.25 },
  { freq: 0, dur: 1 },

  // Bar 11-12: repeat opening
  { freq: 659, dur: 0.5 }, { freq: 659, dur: 0.5 }, { freq: 0, dur: 0.5 },
  { freq: 659, dur: 0.5 }, { freq: 0, dur: 0.5 }, { freq: 523, dur: 0.5 },
  { freq: 659, dur: 0.5 }, { freq: 0, dur: 0.5 }, { freq: 784, dur: 0.5 },
  { freq: 0, dur: 1.5 }, { freq: 392, dur: 0.5 }, { freq: 0, dur: 1.5 },
];

// Bass line (accompaniment)
const bgmBass: BGMNote[] = [
  { freq: 165, dur: 0.5 }, { freq: 165, dur: 0.5 }, { freq: 0, dur: 0.5 },
  { freq: 165, dur: 0.5 }, { freq: 0, dur: 0.5 }, { freq: 131, dur: 0.5 },
  { freq: 165, dur: 0.5 }, { freq: 0, dur: 0.5 }, { freq: 196, dur: 0.5 },
  { freq: 0, dur: 1.5 }, { freq: 98, dur: 0.5 }, { freq: 0, dur: 1.5 },

  { freq: 131, dur: 0.75 }, { freq: 0, dur: 0.25 }, { freq: 98, dur: 0.75 },
  { freq: 0, dur: 0.25 }, { freq: 82, dur: 0.75 }, { freq: 0, dur: 0.25 },
  { freq: 110, dur: 0.5 }, { freq: 123, dur: 0.5 }, { freq: 0, dur: 0.25 },
  { freq: 117, dur: 0.25 }, { freq: 110, dur: 0.5 },

  { freq: 98, dur: 0.33 }, { freq: 165, dur: 0.33 }, { freq: 196, dur: 0.34 },
  { freq: 220, dur: 0.5 }, { freq: 0, dur: 0.25 }, { freq: 175, dur: 0.25 },
  { freq: 196, dur: 0.5 }, { freq: 0, dur: 0.25 }, { freq: 165, dur: 0.25 },
  { freq: 0, dur: 0.25 }, { freq: 131, dur: 0.25 }, { freq: 147, dur: 0.25 },
  { freq: 123, dur: 0.25 }, { freq: 0, dur: 0.5 },

  // Simplified loop for remaining bars
  { freq: 0, dur: 0.5 },
  { freq: 196, dur: 0.5 }, { freq: 185, dur: 0.5 }, { freq: 175, dur: 0.5 },
  { freq: 156, dur: 0.5 }, { freq: 165, dur: 0.5 }, { freq: 0, dur: 0.25 },
  { freq: 104, dur: 0.25 }, { freq: 110, dur: 0.25 }, { freq: 131, dur: 0.5 },
  { freq: 110, dur: 0.25 }, { freq: 131, dur: 0.25 }, { freq: 147, dur: 0.25 },

  { freq: 0, dur: 0.5 },
  { freq: 196, dur: 0.5 }, { freq: 185, dur: 0.5 }, { freq: 175, dur: 0.5 },
  { freq: 156, dur: 0.5 }, { freq: 165, dur: 0.5 }, { freq: 0, dur: 0.25 },
  { freq: 262, dur: 0.5 }, { freq: 262, dur: 0.25 }, { freq: 262, dur: 0.25 },
  { freq: 0, dur: 1 },

  { freq: 165, dur: 0.5 }, { freq: 165, dur: 0.5 }, { freq: 0, dur: 0.5 },
  { freq: 165, dur: 0.5 }, { freq: 0, dur: 0.5 }, { freq: 131, dur: 0.5 },
  { freq: 165, dur: 0.5 }, { freq: 0, dur: 0.5 }, { freq: 196, dur: 0.5 },
  { freq: 0, dur: 1.5 }, { freq: 98, dur: 0.5 }, { freq: 0, dur: 1.5 },
];

let bgmPlaying = false;
let bgmLoopTimeout: number | null = null;
let bgmGainNode: GainNode | null = null;

function scheduleTrack(
  notes: BGMNote[],
  ctx: AudioContext,
  startTime: number,
  type: OscillatorType,
  gainNode: GainNode,
) {
  let t = startTime;
  const beatSec = 60 / BGM_BPM;

  for (const note of notes) {
    const duration = note.dur * beatSec;
    if (note.freq > 0) {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(note.freq, t);
      noteGain.gain.setValueAtTime(1, t);
      noteGain.gain.setValueAtTime(0.8, t + duration * 0.8);
      noteGain.gain.linearRampToValueAtTime(0, t + duration * 0.98);
      osc.connect(noteGain);
      noteGain.connect(gainNode);
      osc.start(t);
      osc.stop(t + duration);
    }
    t += duration;
  }
  return t; // end time of this track
}

function loopBGM() {
  if (!bgmPlaying) return;
  const ctx = getCtx();

  if (!bgmGainNode) {
    bgmGainNode = ctx.createGain();
    bgmGainNode.gain.setValueAtTime(BGM_VOLUME, ctx.currentTime);
    bgmGainNode.connect(ctx.destination);
  }

  const startTime = ctx.currentTime + 0.05;

  // Schedule melody (square wave — classic 8-bit)
  const melodyEnd = scheduleTrack(bgmMelody, ctx, startTime, 'square', bgmGainNode);

  // Schedule bass (triangle wave — warm low end)
  scheduleTrack(bgmBass, ctx, startTime, 'triangle', bgmGainNode);

  // Schedule next loop just before this one ends
  const loopDuration = (melodyEnd - startTime) * 1000;
  bgmLoopTimeout = window.setTimeout(() => {
    if (bgmPlaying) loopBGM();
  }, loopDuration - 100);
}

export function startBGM() {
  if (bgmPlaying) return;
  bgmPlaying = true;
  bgmGainNode = null; // fresh gain node each start
  loopBGM();
}

export function stopBGM() {
  bgmPlaying = false;
  if (bgmLoopTimeout !== null) {
    clearTimeout(bgmLoopTimeout);
    bgmLoopTimeout = null;
  }
  // Fade out the gain node
  if (bgmGainNode) {
    try {
      const ctx = getCtx();
      bgmGainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
    } catch { /* ignore */ }
    bgmGainNode = null;
  }
}

export function pauseBGM() {
  if (!bgmPlaying) return;
  bgmPlaying = false;
  if (bgmLoopTimeout !== null) {
    clearTimeout(bgmLoopTimeout);
    bgmLoopTimeout = null;
  }
  if (bgmGainNode) {
    try {
      const ctx = getCtx();
      bgmGainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
    } catch { /* ignore */ }
    bgmGainNode = null;
  }
}

export function resumeBGM() {
  if (bgmPlaying) return;
  startBGM();
}
