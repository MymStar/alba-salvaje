// Chat multijugador.
//
// Modo "en línea" (recomendado): si src/net/firebaseConfig.js tiene una
// configuración válida, los mensajes se guardan en Firestore y se sincronizan
// en tiempo real entre TODOS los jugadores, en cualquier dispositivo.
//
// Modo "local" (por defecto, sin configurar nada): usa BroadcastChannel +
// localStorage para sincronizar el chat entre pestañas del MISMO navegador.
// Sirve para probar la función ya mismo, pero no conecta jugadores distintos
// hasta que se configure Firebase (ver firebaseConfig.js).

import { EventBus } from '../eventBus.js';
import { firebaseConfig, FIREBASE_ENABLED } from './firebaseConfig.js';
import { GameState } from '../state.js';

const MAX_MESSAGES = 50;
const MAX_LEN = 200;
const LOCAL_KEY = 'alba_salvaje_chat_v1';
const NAME_KEY = 'alba_salvaje_nick_v1';

let mode = 'offline'; // 'offline' | 'firebase'
let channel = null;
let firestoreRefs = null; // { db, collection, addDoc, onSnapshot, query, orderBy, limit, serverTimestamp }

export function getNickname() {
  let nick = localStorage.getItem(NAME_KEY);
  if (!nick) {
    const suffix = Math.floor(Math.random() * 9000 + 1000);
    nick = `${GameState?.character?.name || 'Jugador'}${suffix}`;
    localStorage.setItem(NAME_KEY, nick);
  }
  return nick;
}

export function setNickname(name) {
  const clean = String(name).trim().slice(0, 20) || getNickname();
  localStorage.setItem(NAME_KEY, clean);
  return clean;
}

export function isOnline() {
  return mode === 'firebase';
}

export async function initChat() {
  if (FIREBASE_ENABLED) {
    try {
      await initFirebaseMode();
      mode = 'firebase';
      EventBus.emit('chat-mode', 'firebase');
      return;
    } catch (e) {
      console.warn('No se pudo iniciar el chat en línea (Firebase). Se usa modo local.', e);
    }
  }
  initOfflineMode();
  mode = 'offline';
  EventBus.emit('chat-mode', 'offline');
}

function loadLocalHistory() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalHistory(list) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(list.slice(-MAX_MESSAGES)));
}

function initOfflineMode() {
  const history = loadLocalHistory();
  EventBus.emit('chat-history', history);

  if ('BroadcastChannel' in window) {
    channel = new BroadcastChannel('alba_salvaje_chat');
    channel.onmessage = (ev) => {
      const msg = ev.data;
      const history2 = loadLocalHistory();
      history2.push(msg);
      saveLocalHistory(history2);
      EventBus.emit('chat-message', msg);
    };
  }
}

async function initFirebaseMode() {
  const { initializeApp } = await import('firebase/app');
  const {
    getFirestore,
    collection,
    addDoc,
    onSnapshot,
    query,
    orderBy,
    limit,
    serverTimestamp
  } = await import('firebase/firestore');

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const colRef = collection(db, 'chat_global');
  const q = query(colRef, orderBy('ts', 'asc'), limit(MAX_MESSAGES));

  firestoreRefs = { db, colRef, addDoc, serverTimestamp };

  let first = true;
  onSnapshot(q, (snap) => {
    const msgs = snap.docs.map((d) => d.data());
    if (first) {
      EventBus.emit('chat-history', msgs);
      first = false;
    } else {
      const last = msgs[msgs.length - 1];
      if (last) EventBus.emit('chat-message', last);
    }
  });
}

export async function sendChatMessage(text) {
  const clean = String(text || '').trim().slice(0, MAX_LEN);
  if (!clean) return;

  const msg = {
    name: getNickname(),
    text: clean,
    ts: Date.now()
  };

  if (mode === 'firebase' && firestoreRefs) {
    const { colRef, addDoc, serverTimestamp } = firestoreRefs;
    await addDoc(colRef, { ...msg, ts: serverTimestamp() || msg.ts });
    return;
  }

  // modo local: guarda, emite localmente y avisa a otras pestañas
  const history = loadLocalHistory();
  history.push(msg);
  saveLocalHistory(history);
  EventBus.emit('chat-message', msg);
  if (channel) channel.postMessage(msg);
}
