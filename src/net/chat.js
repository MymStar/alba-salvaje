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
let dbRefs = null; // { push, chatRef, serverTimestamp } (Realtime Database)

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
  const { getFirebaseApp, ensureAnonymousAuth } = await import('./firebaseApp.js');
  const { getDatabase, ref, push, onValue, query, limitToLast, serverTimestamp } =
    await import('firebase/database');

  const app = await getFirebaseApp();
  await ensureAnonymousAuth();
  const db = getDatabase(app);
  const chatRef = ref(db, 'chat_global');
  const q = query(chatRef, limitToLast(MAX_MESSAGES));

  dbRefs = { push, chatRef, serverTimestamp };

  // Realtime Database no tiene "solo lo nuevo desde la última vez" como
  // Firestore onSnapshot: onValue siempre entrega la lista completa (ya
  // recortada a los últimos MAX_MESSAGES por la query). Para no repetir
  // toda la lista cada vez como si fueran mensajes nuevos, se recuerda la
  // marca de tiempo del último mensaje visto y solo se emiten los más nuevos.
  let lastTs = 0;
  let first = true;
  onValue(q, (snap) => {
    const val = snap.val() || {};
    const msgs = Object.values(val).sort((a, b) => (a.ts || 0) - (b.ts || 0));
    if (first) {
      EventBus.emit('chat-history', msgs);
      lastTs = msgs.length ? msgs[msgs.length - 1].ts : 0;
      first = false;
      return;
    }
    const nuevos = msgs.filter((m) => (m.ts || 0) > lastTs);
    nuevos.forEach((m) => EventBus.emit('chat-message', m));
    if (msgs.length) lastTs = msgs[msgs.length - 1].ts;
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

  if (mode === 'firebase' && dbRefs) {
    const { push, chatRef, serverTimestamp } = dbRefs;
    await push(chatRef, { ...msg, ts: serverTimestamp() });
    return;
  }

  // modo local: guarda, emite localmente y avisa a otras pestañas
  const history = loadLocalHistory();
  history.push(msg);
  saveLocalHistory(history);
  EventBus.emit('chat-message', msg);
  if (channel) channel.postMessage(msg);
}
