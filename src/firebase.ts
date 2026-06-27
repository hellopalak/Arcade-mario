import { initializeApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { getAuth, signOut, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import type { User, Auth } from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import type { Unsubscribe, Firestore } from 'firebase/firestore';

// Firebase configuration — loaded from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Lazy initialization — nothing runs until explicitly called
let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _firebaseReady = false;

export function ensureFirebase(): boolean {
  if (!_firebaseReady) {
    try {
      _app = initializeApp(firebaseConfig);
      _auth = getAuth(_app);
      _db = getFirestore(_app);
      _firebaseReady = true;
    } catch (e) {
      console.warn('Firebase init failed:', e);
      _firebaseReady = false;
    }
  }
  return _firebaseReady;
}

export interface PlayerData {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  playerName: string;
  bestScore: number;
  totalScore: number;
  gamesPlayed: number;
  lastPlayed: number;
}

export interface LeaderboardEntry {
  uid: string;
  playerName: string;
  photoURL: string;
  bestScore: number;
  totalScore: number;
  gamesPlayed: number;
}

// --- Auth Functions ---
export async function signInAnonymouslyUser(): Promise<User | null> {
  if (!ensureFirebase() || !_auth) return null;
  try {
    const result = await signInAnonymously(_auth);
    return result.user;
  } catch (e) {
    console.warn('Anonymous auth failed:', e);
    return null;
  }
}

export async function logOut(): Promise<void> {
  if (_auth) await signOut(_auth);
}

export function onAuthChange(callback: (user: User | null) => void): (() => void) | null {
  if (!ensureFirebase() || !_auth) return null;
  return onAuthStateChanged(_auth, callback);
}

export function getCurrentUser(): User | null {
  return _auth?.currentUser ?? null;
}

// --- Player Data Functions ---
export async function getPlayerData(uid: string): Promise<PlayerData | null> {
  if (!ensureFirebase() || !_db) return null;
  const docRef = doc(_db, 'players', uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as PlayerData;
  }
  return null;
}

// Create a new player doc in Firestore using a local UID (no auth required / anonymous auth)
export async function syncPlayerToFirestore(data: PlayerData): Promise<void> {
  if (!ensureFirebase() || !_db) return;
  const docRef = doc(_db, 'players', data.uid);
  const existing = await getDoc(docRef);

  if (!existing.exists()) {
    await setDoc(docRef, {
      uid: data.uid,
      displayName: data.displayName || data.playerName,
      email: data.email || '',
      photoURL: data.photoURL || '',
      playerName: data.playerName,
      bestScore: data.bestScore || 0,
      totalScore: data.totalScore || 0,
      gamesPlayed: data.gamesPlayed || 0,
      lastPlayed: Date.now(),
    });
  }
}

export async function updatePlayerScore(uid: string, score: number, playerName?: string): Promise<void> {
  if (!ensureFirebase() || !_db) return;
  const docRef = doc(_db, 'players', uid);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data() as PlayerData;
    const newBest = Math.max(data.bestScore, score);
    const newTotal = data.totalScore + score;
    const newGames = data.gamesPlayed + 1;

    const updatePayload: any = {
      bestScore: newBest,
      totalScore: newTotal,
      gamesPlayed: newGames,
      lastPlayed: Date.now(),
    };

    if (playerName && data.playerName !== playerName) {
      updatePayload.playerName = playerName;
      updatePayload.displayName = playerName;
    }

    await updateDoc(docRef, updatePayload);
  } else {
    // Player doc doesn't exist yet — create it with this score
    await setDoc(docRef, {
      uid,
      displayName: playerName || uid,
      email: '',
      photoURL: '',
      playerName: playerName || uid,
      bestScore: score,
      totalScore: score,
      gamesPlayed: 1,
      lastPlayed: Date.now(),
    });
  }
}

// --- Leaderboard Functions ---
export function subscribeToLeaderboard(
  callback: (entries: LeaderboardEntry[]) => void,
  maxEntries: number = 20
): Unsubscribe | null {
  if (!ensureFirebase() || !_db) return null;
  const q = query(
    collection(_db, 'players'),
    orderBy('bestScore', 'desc'),
    limit(maxEntries)
  );

  return onSnapshot(q, (snapshot) => {
    const entries: LeaderboardEntry[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as PlayerData;
      entries.push({
        uid: data.uid,
        playerName: data.playerName,
        photoURL: data.photoURL,
        bestScore: data.bestScore,
        totalScore: data.totalScore,
        gamesPlayed: data.gamesPlayed,
      });
    });
    callback(entries);
  });
}

export async function getLeaderboard(maxEntries: number = 20): Promise<LeaderboardEntry[]> {
  if (!ensureFirebase() || !_db) return [];
  const q = query(
    collection(_db, 'players'),
    orderBy('bestScore', 'desc'),
    limit(maxEntries)
  );
  const snapshot = await getDocs(q);
  const entries: LeaderboardEntry[] = [];
  snapshot.forEach((d) => {
    const data = d.data() as PlayerData;
    entries.push({
      uid: data.uid,
      playerName: data.playerName,
      photoURL: data.photoURL,
      bestScore: data.bestScore,
      totalScore: data.totalScore,
      gamesPlayed: data.gamesPlayed,
    });
  });
   return entries;
}
