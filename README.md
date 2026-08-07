# 🌄 Alba Salvaje

Prototipo jugable (Fase 1) de un juego de supervivencia de mundo abierto, ligero
y multiplataforma: personajes personalizables, plantas hostiles de día, zombis
de noche, construcción básica, inventario, subida de nivel, tienda con
oro/diamantes virtuales y chat entre jugadores.

Basado en el documento de diseño original: [`DISEÑO_ORIGINAL.rtf`](./DISEÑO_ORIGINAL.rtf)
(visión completa del proyecto — un MMO de supervivencia/construcción/herencia
genética a gran escala). Este repositorio implementa el **núcleo jugable**
de esa visión; ver [Roadmap](#-roadmap--qué-falta-y-qué-necesito-de-ti) abajo
para lo que viene después y qué requiere de ti.

## 🎮 Jugar en local

```bash
npm install
npm run dev
```

Abre la URL que te muestre Vite (normalmente http://localhost:5173).

Controles: **WASD / flechas** para moverte, **espacio o click izquierdo** para
atacar (o construir, si el modo construcción está activo), **E** o botón 💬
para el chat.

## 🧱 Stack técnico

- **[Phaser 3](https://phaser.io/)** — motor 2D ligero, tal como pide el documento de diseño.
- **[Vite](https://vitejs.dev/)** — build/dev server rápido.
- **[Firebase (Firestore)](https://firebase.google.com/)** — capa gratuita opcional para el chat multijugador en tiempo real (ver abajo).
- Sin frameworks pesados, sin assets de imagen externos: todos los sprites se generan por código (`src/scenes/BootScene.js`) para mantener el juego liviano y sin dependencias de licencias de arte.

## 📁 Estructura

```
src/
  constants.js       Constantes compartidas (tamaños, colores, tipos)
  textureKeys.js      Claves de texturas procedurales
  sceneKeys.js         Claves de escenas
  eventBus.js          Bus de eventos global
  state.js              Estado del jugador (vida, inventario, monedas) + guardado local
  buildSelection.js     Selección de pieza de construcción activa
  net/
    chat.js              Chat multijugador (Firebase o modo local)
    firebaseConfig.js     Configuración pública de Firebase (a completar, ver abajo)
  scenes/
    BootScene.js          Genera todas las texturas del juego
    MenuScene.js           Menú principal / selección de personaje
    WorldScene.js           Mundo, día/noche, spawns
    HUDScene.js              Interfaz superpuesta (vida, inventario, tienda...)
  entities/                Jugador, plantas, zombis
  systems/                  Combate, hambre/energía
  world/                     Terreno procedural, guardado de construcciones, ciclo día/noche
  ui/                         Inventario, tienda, construcción, chat, páginas legales
```

## 🚀 Despliegue (gratis)

Este repo está conectado a **Netlify** (build automático en cada `git push`):
build command `npm run build`, carpeta publicada `dist/` (ver `netlify.toml`).

## 💬 Activar el chat multijugador real (opcional, gratis)

Por defecto el chat funciona en **modo local** (solo sincroniza entre pestañas
del mismo navegador, útil para probar). Para que jugadores en dispositivos
distintos se vean entre sí, hace falta un backend gratuito de Firebase:

1. Crea un proyecto gratis en <https://console.firebase.google.com/> (plan Spark, sin tarjeta).
2. Activa **Firestore Database** (modo producción).
3. En "Reglas", pega el contenido de [`firestore.rules`](./firestore.rules) y publica.
4. En "Configuración del proyecto → Tus apps → Añadir app web", copia el objeto `firebaseConfig`.
5. Pégalo en `src/net/firebaseConfig.js` (esos valores son públicos por diseño, no son secretos).
6. Vuelve a desplegar (`git push`, Netlify hace el resto).

## 💰 Economía y pagos — nota importante

El oro y los diamantes de este prototipo son **monedas virtuales que se ganan
jugando**. La pantalla de tienda incluye una pestaña de "paquetes premium"
que **muestra** los precios definidos en el documento de diseño, pero **no
procesa pagos reales** — los botones están deshabilitados a propósito.

Para vender paquetes con dinero real en el futuro, hace falta integrar un
procesador de pagos real (ej. Stripe, PayPal) con una cuenta de comerciante
verificada. **Nunca se debe escribir un número de tarjeta o cuenta bancaria
directamente en el código** (es público en GitHub, y además viola normas de
seguridad de pagos/PCI-DSS) — el dinero siempre debe pasar por el procesador,
que lo deposita a tu cuenta bancaria por fuera del código fuente.

## 🗺️ Roadmap — qué falta y qué necesito de ti

Este prototipo cubre el núcleo jugable. El documento original describe un
MMO mucho más grande. Estas son las piezas grandes que siguen, y lo que cada
una requiere de tu parte:

| Función | Qué requiere de ti |
|---|---|
| Mundo persistente compartido entre todos los jugadores (no solo tu navegador) | Backend con base de datos (Firebase/servidor propio) — más ingeniería, posible costo si crece mucho |
| Apps para Android/iOS (Play Store / App Store) | Cuenta de Google Play ($25 una vez) y cuenta Apple Developer ($99/año), ambas a tu nombre |
| App de escritorio Windows instalable | Empaquetado con Electron (viable sin costo adicional) |
| Pagos reales de oro/diamantes | Cuenta con Stripe o similar a tu nombre, verificación de identidad/negocio |
| Registro con correo/teléfono/Google, doble factor | Backend de autenticación (Firebase Auth es una opción gratuita razonable) |
| Sistema anti-cheat / anti-bots | Requiere mover la lógica de juego al servidor (hoy corre en el navegador de cada jugador, lo normal para un prototipo pero no seguro para dinero real) |
| Herencia genética / hijos / matrimonios, clanes, dioses, jefes, mercado entre jugadores | Fases futuras de desarrollo, una vez el núcleo esté probado |

---

<sub>© 2026 Mario López Valdés — Diseñador y Programador Experto. Nacido en Cuba en 1988. Creador y propietario intelectual del proyecto. Registro de autor: Carne 88121617542. Todos los derechos reservados.</sub>
