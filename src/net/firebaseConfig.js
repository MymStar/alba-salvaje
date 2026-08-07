// Configuración de Firebase para el chat multijugador y (a futuro) el mundo
// compartido en red.
//
// Esta clave "apiKey" NO es secreta: Firebase está diseñado para que esta
// configuración sea pública en el cliente (el navegador de cada jugador la
// necesita para conectarse). La seguridad real se controla con las
// "Firestore Security Rules" en la consola de Firebase, no ocultando esto.
// Aun así, nunca pongas aquí contraseñas, tarjetas o claves de servidor
// (esas son otra cosa: "service account keys", que jamás van en el cliente).
//
// CÓMO ACTIVARLO (gratis, sin tarjeta, ~5 minutos):
//   1. Ve a https://console.firebase.google.com/ y crea un proyecto (plan Spark, gratis).
//   2. En "Compilación" -> "Firestore Database" -> crear base de datos (modo producción).
//   3. En "Reglas" pega el contenido de firestore.rules (en la raíz del repo) y publica.
//   4. En "Configuración del proyecto" -> "Tus apps" -> "Añadir app web" (</>), copia
//      el objeto firebaseConfig que te da Firebase y pégalo abajo, reemplazando el vacío.
//   5. Guarda este archivo y recarga el juego: el chat pasará de "modo local" a "en línea".

export const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: ''
};

export const FIREBASE_ENABLED = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
