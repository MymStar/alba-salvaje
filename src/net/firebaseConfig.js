// Configuración de Firebase para el chat, la identidad de jugador y las
// funciones multijugador (matrimonios, clanes, mercado). Usa **Realtime
// Database** (no Firestore) a propósito: Firestore exige vincular una
// tarjeta a Google Cloud incluso para uso gratuito; Realtime Database sigue
// siendo 100% gratis en el plan Spark sin necesidad de tarjeta.
//
// Esta clave "apiKey" NO es secreta: Firebase está diseñado para que esta
// configuración sea pública en el cliente (el navegador de cada jugador la
// necesita para conectarse). La seguridad real se controla con las reglas
// de Realtime Database en la consola de Firebase, no ocultando esto. Aun
// así, nunca pongas aquí contraseñas, tarjetas o claves de servidor (esas
// son otra cosa: "service account keys", que jamás van en el cliente).
//
// CÓMO ACTIVARLO (gratis, sin tarjeta, ~5 minutos):
//   1. Ve a https://console.firebase.google.com/ y crea un proyecto (plan Spark, gratis).
//   2. En "Compilación" -> "Realtime Database" -> crear base de datos -> modo bloqueado.
//   3. En "Reglas" pega el contenido de realtime-database.rules.json (raíz del repo) y publica.
//   4. En "Compilación" -> "Authentication" -> "Sign-in method" -> habilita "Anónimo".
//   5. En "Configuración del proyecto" -> "Tus apps" -> "Añadir app web" (</>), copia
//      el objeto firebaseConfig que te da Firebase (incluye "databaseURL") y pégalo abajo.
//   6. Guarda este archivo y recarga el juego: el chat y lo demás pasarán a "en línea".

export const firebaseConfig = {
  apiKey: 'AIzaSyDh3SNETz7vJRVXHCmM8zJpceNqxTuandE',
  authDomain: 'alba-salvaje.firebaseapp.com',
  databaseURL: 'https://alba-salvaje-default-rtdb.firebaseio.com',
  projectId: 'alba-salvaje',
  storageBucket: 'alba-salvaje.firebasestorage.app',
  messagingSenderId: '795356381960',
  appId: '1:795356381960:web:e4e6153baef2328cf9a2bd'
};

export const FIREBASE_ENABLED = Boolean(firebaseConfig.apiKey && firebaseConfig.databaseURL);
