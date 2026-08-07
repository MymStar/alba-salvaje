// Inicialización ÚNICA de la app de Firebase, compartida por todos los
// módulos de red (chat, identidad de jugador, matrimonios, clanes, mercado).
// Sin esto, cada módulo llamaría `initializeApp()` por su cuenta y Firebase
// lanzaría un error de "app ya inicializada" al segundo que lo intente.

import { firebaseConfig, FIREBASE_ENABLED } from './firebaseConfig.js';

let appPromise = null;
let authPromise = null;

/**
 * Devuelve (e inicializa la primera vez) la instancia de Firebase App.
 * Lanza si FIREBASE_ENABLED es false — quien llame debe comprobarlo antes
 * (todos los módulos de red ya tienen su propio modo "local" de respaldo).
 */
export async function getFirebaseApp() {
  if (!FIREBASE_ENABLED) {
    throw new Error('Firebase no está configurado (ver src/net/firebaseConfig.js).');
  }
  if (!appPromise) {
    appPromise = import('firebase/app').then(({ initializeApp }) => initializeApp(firebaseConfig));
  }
  return appPromise;
}

/**
 * Garantiza que haya una sesión (anónima) activa antes de leer/escribir en
 * Realtime Database — las reglas de seguridad exigen `auth != null` para
 * escribir. No pide ningún dato al jugador: Firebase genera un `uid`
 * estable por navegador/dispositivo. Devuelve ese `uid`.
 */
export async function ensureAnonymousAuth() {
  if (!authPromise) {
    authPromise = (async () => {
      const app = await getFirebaseApp();
      const { getAuth, signInAnonymously, onAuthStateChanged } = await import('firebase/auth');
      const auth = getAuth(app);
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
      // signInAnonymously ya resuelve con el usuario, pero por robustez
      // esperamos también el primer evento de auth por si acaso.
      await new Promise((resolve) => {
        const unsub = onAuthStateChanged(auth, (user) => {
          if (user) {
            unsub();
            resolve(user);
          }
        });
      });
      return auth.currentUser.uid;
    })();
  }
  return authPromise;
}
