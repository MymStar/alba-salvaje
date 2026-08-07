// Identidad de jugador compartida: perfil público mínimo (apodo, nivel,
// personaje) visible para otros jugadores, necesario para que matrimonios,
// clanes y mercado puedan "encontrarte". Usa autenticación anónima de
// Firebase (sin contraseñas) — ver firebaseApp.js#ensureAnonymousAuth.
//
// Sin Firebase configurado, todo esto queda inactivo (isRegistryOnline()
// devuelve false) — no tiene sentido un modo "local" para identidad
// multijugador, a diferencia del chat.

import { GameState, addGold, addGems } from '../state.js';
import { getNickname } from './chat.js';
import { FIREBASE_ENABLED } from './firebaseConfig.js';

let dbApi = null; // { db, ref, set, get, child } una vez inicializado
let myUid = null;
let online = false;

export function isRegistryOnline() {
  return online;
}

export function getMyUid() {
  return myUid;
}

/** Convierte un apodo en una clave válida de Realtime Database (sin ".#$[]/"). */
function sanitizeKey(str) {
  return String(str).toLowerCase().replace(/[.#$[\]/]/g, '_');
}

/**
 * Inicializa la identidad de jugador: autentica (anónimo) y publica el
 * perfil público. Llamar una vez desde main.js. No-op si Firebase no está
 * configurado.
 */
export async function initPlayerRegistry() {
  if (!FIREBASE_ENABLED) return;
  try {
    const { getFirebaseApp, ensureAnonymousAuth } = await import('./firebaseApp.js');
    const { getDatabase, ref, set, get, child } = await import('firebase/database');

    const app = await getFirebaseApp();
    myUid = await ensureAnonymousAuth();
    const db = getDatabase(app);
    dbApi = { db, ref, set, get, child };
    online = true;

    await publishMyProfile();
    await claimPendingPayouts();
  } catch (e) {
    console.warn('No se pudo iniciar la identidad de jugador (Firebase).', e);
    online = false;
  }
}

/**
 * "Buzón" de pagos pendientes: cuando alguien te compra algo en el mercado
 * (descendientes, ítems) mientras no estás conectado, el comprador deja el
 * pago acá (`pending_payouts/{tuUid}`) en vez de acreditártelo directo (no
 * puede: tu oro/diamantes viven en tu localStorage, no en Firebase). Al
 * conectarte, reclamás lo pendiente y se borra. Usado por
 * net/descendants.js y net/marketplace.js — no hace falta llamarlo a mano,
 * `initPlayerRegistry()` ya lo hace una vez al arrancar.
 */
export async function claimPendingPayouts() {
  if (!online || !dbApi || !myUid) return;
  const { db, ref, get, set, child } = dbApi;

  const snap = await get(child(ref(db), `pending_payouts/${myUid}`));
  if (!snap.exists()) return;

  const payouts = snap.val();
  let gold = 0;
  let gems = 0;
  Object.values(payouts).forEach((p) => {
    gold += p.gold || 0;
    gems += p.gems || 0;
  });

  if (gold > 0) addGold(gold);
  if (gems > 0) addGems(gems);

  await set(ref(db, `pending_payouts/${myUid}`), null);
}

/**
 * Deja un pago pendiente para OTRO jugador (ej. al comprarle algo en el
 * mercado). No requiere que ese jugador esté conectado ahora.
 * @param {string} uid
 * @param {{gold?:number, gems?:number}} amounts
 * @param {string} reason texto libre para depurar (no se muestra en UI)
 */
export async function sendPendingPayout(uid, amounts, reason) {
  if (!online || !dbApi) return;
  const { db, ref, set } = dbApi;
  const { push } = await import('firebase/database');
  const listRef = ref(db, `pending_payouts/${uid}`);
  await set(push(listRef), { gold: amounts.gold || 0, gems: amounts.gems || 0, reason: reason || '', ts: Date.now() });
}

/** Acceso interno de solo lectura a la conexión ya abierta, para otros módulos net/*.js. */
export function getDbApi() {
  return dbApi;
}

/** Vuelve a escribir el perfil público con el estado actual (apodo/nivel/personaje). */
export async function publishMyProfile() {
  if (!online || !dbApi || !myUid) return;
  const { db, ref, set } = dbApi;

  const nickname = getNickname();
  const profile = {
    nickname,
    level: GameState.player.level,
    characterId: GameState.character?.id || 'guerrero'
  };

  await set(ref(db, `players/${myUid}`), profile);
  await set(ref(db, `players_by_nickname/${sanitizeKey(nickname)}/${myUid}`), true);
}

/**
 * Busca jugadores por apodo EXACTO (sin distinguir mayúsculas). Devuelve
 * un array (normalmente 0 o 1 resultado, pero los apodos no son únicos).
 * @param {string} nickname
 * @returns {Promise<{uid:string, nickname:string, level:number, characterId:string}[]>}
 */
export async function findPlayersByNickname(nickname) {
  if (!online || !dbApi) return [];
  const { db, ref, get, child } = dbApi;

  const idxSnap = await get(child(ref(db), `players_by_nickname/${sanitizeKey(nickname)}`));
  if (!idxSnap.exists()) return [];
  const uids = Object.keys(idxSnap.val());

  const results = [];
  for (const uid of uids) {
    if (uid === myUid) continue; // no te muestres a ti mismo en tu propia búsqueda
    // eslint-disable-next-line no-await-in-loop
    const profile = await getPlayerProfile(uid);
    if (profile) results.push({ uid, ...profile });
  }
  return results;
}

/** @param {string} uid @returns {Promise<{nickname:string, level:number, characterId:string}|null>} */
export async function getPlayerProfile(uid) {
  if (!online || !dbApi) return null;
  const { db, ref, get, child } = dbApi;
  const snap = await get(child(ref(db), `players/${uid}`));
  return snap.exists() ? snap.val() : null;
}
