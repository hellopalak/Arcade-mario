import './style.css';
import {
  updatePlayerScore,
  syncPlayerToFirestore,
  subscribeToLeaderboard,
  getLeaderboard,
} from './firebase';
import type { PlayerData, LeaderboardEntry } from './firebase';
import { MarioGame } from './game';
import type { SoundEvent } from './game';
import type { Unsubscribe } from 'firebase/firestore';
import {
  playCoinSound, playPowerUpSound, playDamageSound,
  playBulletHitSound, playDeathSound, playJumpSound, playStompSound,
} from './sounds';

// ===== STATE =====
let playerData: PlayerData | null = null;
let game: MarioGame | null = null;
let lbUnsubscribe: Unsubscribe | null = null;
let isFirebaseAvailable = true;
let lbViewMode: 'leaderboard' | 'my_runs' = 'leaderboard';
let firebaseLeaderboard: LeaderboardEntry[] = [];

// ===== STORAGE =====
function getLocalPlayerData(): PlayerData | null {
  const raw = localStorage.getItem('arcade_player');
  return raw ? JSON.parse(raw) : null;
}

function getPlayerDataByUid(uid: string): PlayerData | null {
  const raw = localStorage.getItem('arcade_player_' + uid);
  return raw ? JSON.parse(raw) : null;
}

function setLocalPlayerData(data: PlayerData) {
  localStorage.setItem('arcade_player', JSON.stringify(data));
  localStorage.setItem('arcade_player_' + data.uid, JSON.stringify(data));
}


// Leaderboard: one entry per player, shows their LATEST score, sorted descending
interface LBEntry {
  uid: string;
  playerName: string;
  latestScore: number;
  bestScore: number;
  gamesPlayed: number;
  timestamp: number;
}

function getLeaderboardEntries(): LBEntry[] {
  const raw = localStorage.getItem('arcade_lb_entries');
  return raw ? JSON.parse(raw) : [];
}

function upsertLeaderboardEntry(uid: string, playerName: string, score: number, gamesPlayed: number, bestScore: number): LBEntry[] {
  const entries = getLeaderboardEntries();
  const idx = entries.findIndex(e => e.uid === uid);
  const entry: LBEntry = { uid, playerName, latestScore: score, bestScore, gamesPlayed, timestamp: Date.now() };
  if (idx >= 0) entries[idx] = entry;
  else entries.push(entry);
  entries.sort((a, b) => b.latestScore - a.latestScore);
  const trimmed = entries.slice(0, 50);
  localStorage.setItem('arcade_lb_entries', JSON.stringify(trimmed));
  return trimmed;
}

// Per-player run history
interface ScoreRun {
  score: number;
  timestamp: number;
}

function getPlayerRuns(uid: string): ScoreRun[] {
  const raw = localStorage.getItem('arcade_runs_' + uid);
  return raw ? JSON.parse(raw) : [];
}

function addPlayerRun(uid: string, score: number): ScoreRun[] {
  const runs = getPlayerRuns(uid);
  runs.unshift({ score, timestamp: Date.now() }); // newest first
  const trimmed = runs.slice(0, 50);
  localStorage.setItem('arcade_runs_' + uid, JSON.stringify(trimmed));
  return trimmed;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

// ===== SOUND HANDLER =====
function handleSound(event: SoundEvent) {
  switch (event) {
    case 'coin': playCoinSound(); break;
    case 'powerup': playPowerUpSound(); break;
    case 'damage': playDamageSound(); break;
    case 'bullet_hit': playBulletHitSound(); break;
    case 'death': playDeathSound(); break;
    case 'jump': playJumpSound(); break;
    case 'stomp': playStompSound(); break;
  }
}

// ===== RENDER APP =====
function renderApp() {
  const app = document.getElementById('app')!;
  app.innerHTML = `
    <div id="loadingScreen" class="screen loading-screen active">
      <div class="spinner"></div>
      <div class="loading-text">Loading...</div>
    </div>

    <div id="nameScreen" class="screen name-screen">
      <div class="name-card">
        <div class="name-card-icon">🍄</div>
        <h2>SUPER MARIO</h2>
        <p>Enter your name to start playing</p>
        <input id="playerNameInput" class="name-input" type="text" placeholder="Your player name..." maxlength="20" autofocus />
        <button id="startGameBtn" class="btn-primary" disabled>PLAY</button>
      </div>
    </div>

    <div id="gameScreen" class="screen game-screen">
      <div class="game-header">
        <div class="game-header-left">
          <div class="game-title">SUPER MARIO</div>
          <div class="game-stats">
            <div class="stat-item">
              <span class="stat-label">Score</span>
              <span id="liveScore" class="stat-value">0</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Coins</span>
              <span id="liveCoins" class="stat-value coin-val">🪙 0</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">World</span>
              <span id="liveWorld" class="stat-value">1-1</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Best</span>
              <span id="liveBest" class="stat-value">0</span>
            </div>
          </div>
        </div>
        <div class="game-header-right">
          <div id="playerTagGame" class="player-tag">
            <img id="playerTagAvatar" src="" alt="" />
            <span id="playerTagName"></span>
          </div>
          <button id="leaderboardBtn" class="btn-icon" title="Leaderboard">🏆</button>
          <button id="logoutBtn" class="btn-icon" title="Sign Out">⏏</button>
        </div>
      </div>
      <div class="game-canvas-wrap">
        <canvas id="gameCanvas"></canvas>
        <div id="startOverlay" class="game-overlay">
          <div class="overlay-title">SUPER MARIO</div>
          <div class="overlay-sub">World 1-1</div>
          <button id="playBtn" class="btn-play">▶ PLAY</button>
          <div class="controls-hint">
            <kbd>←</kbd><kbd>→</kbd> / <kbd>A</kbd><kbd>D</kbd> Move · <kbd>↑</kbd> / <kbd>W</kbd> Jump<br>
            Mobile: Use on-screen controls
          </div>
        </div>
        <div id="gameOverOverlay" class="gameover-overlay">
          <div class="gameover-title">GAME OVER</div>
          <div id="finalScore" class="gameover-score">Score: 0</div>
          <div id="bestScoreDisplay" class="gameover-best">Best: 0</div>
          <div id="newBestLabel" class="new-best" style="display:none">★ NEW BEST! ★</div>
          <div class="gameover-actions">
            <button id="retryBtn" class="btn-retry">PLAY AGAIN</button>
            <button id="menuBtn" class="btn-menu">MENU</button>
          </div>
        </div>
        <div id="levelCompleteOverlay" class="levelcomplete-overlay">
          <div class="levelcomplete-title">★ LEVEL COMPLETE! ★</div>
          <div id="lcScore" class="levelcomplete-score">Score: 0</div>
          <div class="levelcomplete-actions">
            <button id="lcRetryBtn" class="btn-retry">PLAY AGAIN</button>
            <button id="lcMenuBtn" class="btn-menu">MENU</button>
          </div>
        </div>
        <div class="mobile-controls">
          <div class="mobile-dpad">
            <div id="mobileLeftBtn" class="mobile-ctrl-btn">◀</div>
            <div id="mobileRightBtn" class="mobile-ctrl-btn">▶</div>
          </div>
          <div id="mobileJumpBtn" class="mobile-ctrl-btn mobile-jump-btn">▲</div>
        </div>
      </div>
    </div>

    <div id="lbBackdrop" class="lb-backdrop"></div>
    <div id="leaderboardPanel" class="leaderboard-panel">
      <div class="lb-header">
        <h2>🏆 LEADERBOARD</h2>
        <button id="lbCloseBtn" class="lb-close">✕</button>
      </div>
      <div class="lb-tabs">
        <button id="lbTabBoard" class="lb-tab active">RANKINGS</button>
        <button id="lbTabRuns" class="lb-tab">MY RUNS</button>
      </div>
      <div id="lbList" class="lb-list">
        <div class="lb-empty">No scores yet. Be the first!</div>
      </div>
    </div>

    <div id="toast" class="toast"></div>
  `;
  bindEvents();
}

// ===== SCREEN MANAGEMENT =====
function showScreen(id: string) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
}

function showToast(msg: string, duration = 3000) {
  const toast = document.getElementById('toast')!;
  toast.textContent = msg;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), duration);
}

// ===== EVENT BINDINGS =====
function bindEvents() {
  const nameInput = document.getElementById('playerNameInput') as HTMLInputElement;
  const startBtn = document.getElementById('startGameBtn') as HTMLButtonElement;

  nameInput.addEventListener('input', () => {
    startBtn.disabled = nameInput.value.trim().length < 2;
  });

  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !startBtn.disabled) startBtn.click();
  });

  startBtn.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    if (name.length < 2) return;
    startBtn.disabled = true;
    startBtn.textContent = 'Loading...';

    // Each player name gets its own unique ID and stats
    const nameKey = 'arcade_pid_' + name.toLowerCase();
    let localId = localStorage.getItem(nameKey);
    if (!localId) {
      localId = 'player_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      localStorage.setItem(nameKey, localId);
    }

    const existingData = getPlayerDataByUid(localId);
    playerData = existingData ? {
      ...existingData,
      playerName: name,
    } : {
      uid: localId,
      displayName: name,
      email: '',
      photoURL: '',
      playerName: name,
      bestScore: 0,
      totalScore: 0,
      gamesPlayed: 0,
      lastPlayed: Date.now(),
    };
    setLocalPlayerData(playerData);

    // Sync player to Firestore so they appear on the global leaderboard
    try {
      await syncPlayerToFirestore(playerData);
    } catch (e) {
      console.warn('Could not sync player to Firestore:', e);
    }

    // Subscribe to real-time Firestore leaderboard
    startFirebaseLeaderboard();

    setupGameScreen();
    showScreen('gameScreen');
    initGame();
  });

  document.getElementById('playBtn')!.addEventListener('click', startGame);
  document.getElementById('retryBtn')!.addEventListener('click', startGame);
  document.getElementById('lcRetryBtn')!.addEventListener('click', startGame);
  document.getElementById('menuBtn')!.addEventListener('click', goToMenu);
  document.getElementById('lcMenuBtn')!.addEventListener('click', goToMenu);

  document.getElementById('leaderboardBtn')!.addEventListener('click', openLeaderboard);
  document.getElementById('lbCloseBtn')!.addEventListener('click', closeLeaderboard);
  document.getElementById('lbBackdrop')!.addEventListener('click', closeLeaderboard);

  document.getElementById('lbTabBoard')!.addEventListener('click', () => {
    lbViewMode = 'leaderboard';
    document.getElementById('lbTabBoard')!.classList.add('active');
    document.getElementById('lbTabRuns')!.classList.remove('active');
    refreshLeaderboardView();
  });
  document.getElementById('lbTabRuns')!.addEventListener('click', () => {
    lbViewMode = 'my_runs';
    document.getElementById('lbTabRuns')!.classList.add('active');
    document.getElementById('lbTabBoard')!.classList.remove('active');
    refreshLeaderboardView();
  });

  document.getElementById('logoutBtn')!.addEventListener('click', () => {
    game?.stop();
    if (lbUnsubscribe) lbUnsubscribe();
    playerData = null;
    showScreen('nameScreen');
    const nameInput = document.getElementById('playerNameInput') as HTMLInputElement;
    nameInput.value = '';
    nameInput.focus();
    (document.getElementById('startGameBtn') as HTMLButtonElement).disabled = true;
    (document.getElementById('startGameBtn') as HTMLButtonElement).textContent = 'PLAY';
  });
}

function goToMenu() {
  game?.stop();
  document.getElementById('gameOverOverlay')!.classList.remove('active');
  document.getElementById('levelCompleteOverlay')!.classList.remove('active');
  document.getElementById('startOverlay')!.classList.remove('hidden');
}

// ===== GAME SETUP =====
function setupGameScreen() {
  if (!playerData) return;
  const avatar = document.getElementById('playerTagAvatar') as HTMLImageElement;
  const name = document.getElementById('playerTagName')!;
  avatar.src = playerData.photoURL || '/arcade_logo.png';
  name.textContent = playerData.playerName;
  document.getElementById('liveBest')!.textContent = String(playerData.bestScore);
}

function initGame() {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  const wrap = canvas.parentElement!;
  canvas.width = wrap.clientWidth;
  canvas.height = wrap.clientHeight;

  game = new MarioGame(canvas, {
    onScore: (score) => {
      document.getElementById('liveScore')!.textContent = String(score);
    },
    onCoins: (coins) => {
      document.getElementById('liveCoins')!.textContent = `🪙 ${coins}`;
    },
    onGameOver: (finalScore) => handleGameOver(finalScore),
    onLevelComplete: (finalScore) => handleLevelComplete(finalScore),
    onMarioState: () => {
      const stateEl = document.getElementById('liveWorld');
      if (stateEl) stateEl.textContent = '1-1';
    },
    onSound: handleSound,
  });

  const onResize = () => {
    canvas.width = wrap.clientWidth;
    canvas.height = wrap.clientHeight;
    game?.resize(canvas.width, canvas.height);
  };
  window.addEventListener('resize', onResize);

  // Draw initial sky
  const ctx = canvas.getContext('2d')!;
  const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  skyGrad.addColorStop(0, '#4a90d9');
  skyGrad.addColorStop(1, '#87ceeb');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function startGame() {
  document.getElementById('startOverlay')!.classList.add('hidden');
  document.getElementById('gameOverOverlay')!.classList.remove('active');
  document.getElementById('levelCompleteOverlay')!.classList.remove('active');
  document.getElementById('liveScore')!.textContent = '0';
  document.getElementById('liveCoins')!.textContent = '🪙 0';
  game?.start();
}

async function handleGameOver(finalScore: number) {
  document.getElementById('gameOverOverlay')!.classList.add('active');
  document.getElementById('finalScore')!.textContent = `Score: ${finalScore}`;
  await saveScore(finalScore);
}

async function handleLevelComplete(finalScore: number) {
  document.getElementById('levelCompleteOverlay')!.classList.add('active');
  document.getElementById('lcScore')!.textContent = `Score: ${finalScore}`;
  showToast('🎉 Level Complete! Amazing!');
  await saveScore(finalScore);
}

async function saveScore(finalScore: number) {
  const prevBest = playerData?.bestScore || 0;
  const isNewBest = finalScore > prevBest;
  document.getElementById('newBestLabel')!.style.display = isNewBest ? 'block' : 'none';

  if (playerData) {
    playerData.bestScore = Math.max(playerData.bestScore, finalScore);
    playerData.totalScore += finalScore;
    playerData.gamesPlayed += 1;
    playerData.lastPlayed = Date.now();
    setLocalPlayerData(playerData);

    // Add to personal run history
    addPlayerRun(playerData.uid, finalScore);

    // Update leaderboard (one entry per player, latest score)
    upsertLeaderboardEntry(
      playerData.uid, playerData.playerName, finalScore,
      playerData.gamesPlayed, playerData.bestScore
    );

    refreshLeaderboardView();
  }

  document.getElementById('bestScoreDisplay')!.textContent = `Best: ${playerData?.bestScore || finalScore}`;
  document.getElementById('liveBest')!.textContent = String(playerData?.bestScore || finalScore);

  if (isFirebaseAvailable && playerData) {
    try { await updatePlayerScore(playerData.uid, finalScore); } catch { /* ignore */ }
  }

  if (isNewBest) showToast('🎉 New personal best!');
}

// ===== FIREBASE LEADERBOARD =====
function startFirebaseLeaderboard() {
  if (lbUnsubscribe) lbUnsubscribe();

  // First, try to load leaderboard immediately
  getLeaderboard(50).then(entries => {
    if (entries.length > 0) {
      firebaseLeaderboard = entries;
      if (lbViewMode === 'leaderboard') renderRankingsView();
    }
  }).catch(() => { /* ignore */ });

  // Then subscribe to real-time updates
  const unsub = subscribeToLeaderboard((entries) => {
    firebaseLeaderboard = entries;
    if (lbViewMode === 'leaderboard') renderRankingsView();
  }, 50);

  if (unsub) lbUnsubscribe = unsub;
}

// ===== LEADERBOARD =====
function refreshLeaderboardView() {
  if (lbViewMode === 'leaderboard') {
    renderRankingsView();
  } else {
    renderMyRunsView();
  }
}

function renderRankingsView() {
  const list = document.getElementById('lbList');
  if (!list) return;

  // Use Firestore data if available, otherwise fall back to local
  if (firebaseLeaderboard.length > 0) {
    list.innerHTML = firebaseLeaderboard.map((entry, i) => {
      const rank = i + 1;
      const topClass = rank <= 3 ? ` top-${rank}` : '';
      const currentClass = entry.uid === playerData?.uid ? ' current-user' : '';
      const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}`;
      return `
        <div class="lb-entry${topClass}${currentClass}">
          <div class="lb-rank">${medal}</div>
          <div class="lb-run-icon">🎮</div>
          <div class="lb-info">
            <div class="lb-name">${escapeHtml(entry.playerName)}</div>
            <div class="lb-meta">Games: ${entry.gamesPlayed} · Total: ${entry.totalScore.toLocaleString()}</div>
          </div>
          <div class="lb-score">${entry.bestScore.toLocaleString()}</div>
        </div>`;
    }).join('');
  } else {
    // Fallback to local leaderboard
    const entries = getLeaderboardEntries();
    if (entries.length === 0) {
      list.innerHTML = '<div class="lb-empty">No scores yet. Play a game!</div>';
      return;
    }
    list.innerHTML = entries.map((entry, i) => {
      const rank = i + 1;
      const topClass = rank <= 3 ? ` top-${rank}` : '';
      const currentClass = entry.uid === playerData?.uid ? ' current-user' : '';
      const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}`;
      return `
        <div class="lb-entry${topClass}${currentClass}">
          <div class="lb-rank">${medal}</div>
          <div class="lb-run-icon">🎮</div>
          <div class="lb-info">
            <div class="lb-name">${escapeHtml(entry.playerName)}</div>
            <div class="lb-meta">${timeAgo(entry.timestamp)} · Best: ${entry.bestScore.toLocaleString()}</div>
          </div>
          <div class="lb-score">${entry.latestScore.toLocaleString()}</div>
        </div>`;
    }).join('');
  }
}

function renderMyRunsView() {
  const list = document.getElementById('lbList');
  if (!list || !playerData) return;
  const runs = getPlayerRuns(playerData.uid);

  // Stats summary
  const totalRuns = runs.length;
  const totalScore = runs.reduce((sum, r) => sum + r.score, 0);
  const avgScore = totalRuns > 0 ? Math.round(totalScore / totalRuns) : 0;

  let html = `
    <div class="my-stats-summary">
      <div class="my-stats-title">📊 ${escapeHtml(playerData.playerName)}'s Stats</div>
      <div class="my-stats-grid">
        <div class="my-stat"><span class="my-stat-val">${totalRuns}</span><span class="my-stat-lbl">Total Runs</span></div>
        <div class="my-stat"><span class="my-stat-val">${playerData.bestScore.toLocaleString()}</span><span class="my-stat-lbl">Best Score</span></div>
        <div class="my-stat"><span class="my-stat-val">${totalScore.toLocaleString()}</span><span class="my-stat-lbl">Total Score</span></div>
        <div class="my-stat"><span class="my-stat-val">${avgScore.toLocaleString()}</span><span class="my-stat-lbl">Avg Score</span></div>
      </div>
    </div>`;

  if (runs.length === 0) {
    html += '<div class="lb-empty">No runs yet. Go play!</div>';
  } else {
    html += '<div class="my-runs-label">Run History</div>';
    html += runs.map((run, i) => {
      const isBest = run.score === playerData!.bestScore;
      const bestClass = isBest ? ' run-best' : '';
      return `
        <div class="lb-entry current-user${bestClass}">
          <div class="lb-rank" style="color:var(--text-muted)">#${i + 1}</div>
          <div class="lb-run-icon">${isBest ? '⭐' : '🎮'}</div>
          <div class="lb-info">
            <div class="lb-name">Run ${runs.length - i}${isBest ? ' (BEST!)' : ''}</div>
            <div class="lb-meta">${timeAgo(run.timestamp)}</div>
          </div>
          <div class="lb-score">${run.score.toLocaleString()}</div>
        </div>`;
    }).join('');
  }
  list.innerHTML = html;
}

function openLeaderboard() {
  refreshLeaderboardView();
  document.getElementById('leaderboardPanel')!.classList.add('open');
  document.getElementById('lbBackdrop')!.classList.add('active');
}

function closeLeaderboard() {
  document.getElementById('leaderboardPanel')!.classList.remove('open');
  document.getElementById('lbBackdrop')!.classList.remove('active');
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===== INIT =====
renderApp();

const savedPlayer = getLocalPlayerData();
if (savedPlayer) {
  const nameInput = document.getElementById('playerNameInput') as HTMLInputElement;
  if (nameInput) {
    nameInput.value = savedPlayer.playerName;
    (document.getElementById('startGameBtn') as HTMLButtonElement).disabled = false;
  }
}
showScreen('nameScreen');
