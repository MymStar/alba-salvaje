// Ciclo día/noche: overlay fijo a la cámara que se atenúa u oscurece con una
// transición animada (alternado por un timer de Phaser), MÁS un sol/luna que
// recorren un arco por la pantalla y una fase lunar que avanza cada noche
// (parte 12 del pedido, reemplaza el archivo original completo).

import { DAY_LENGTH_MS, NIGHT_LENGTH_MS, MOON_PHASES, PALETTE } from '../constants.js';
import { EventBus } from '../eventBus.js';

const TRANSITION_MS = 3500; // duración del fundido entre día y noche
const NIGHT_ALPHA = 0.45;

// ---------------------------------------------------------------------
// Estado interno del módulo: solo puede existir un ciclo día/noche activo
// (una WorldScene a la vez), así que variables de módulo bastan como
// contrato para que otros sistemas (spawns, IA, world/caves.js) consulten.
// ---------------------------------------------------------------------

let daytime = true;
let forcedDarkness = false;
let moonPhaseCounter = -1; // -1 = todavía no hubo ninguna noche

let sceneRef = null;
let overlay = null;
let sunSprite = null;
let moonSprite = null;
let activeArcTween = null;

/** true si actualmente es de día, según el último cambio de fase emitido. */
export function isDaytime() {
  return daytime;
}

/** Índice de fase lunar actual (0 a MOON_PHASES-1), avanza cada noche nueva. */
export function getMoonPhaseIndex() {
  return moonPhaseCounter < 0 ? 0 : moonPhaseCounter;
}

/**
 * Activa/desactiva la "oscuridad forzada" (usada por el integrador cuando el
 * jugador está dentro de una cueva): mientras esté activa, el overlay se
 * mantiene siempre al nivel de "noche" y el sol/luna dejan de renderizarse,
 * sin importar la fase día/noche real de la superficie. El ciclo real sigue
 * corriendo por debajo y se retoma visualmente al volver a `false`.
 * @param {boolean} active
 */
export function setForcedDarkness(active) {
  forcedDarkness = Boolean(active);
  if (!overlay) return; // aún no se creó el ciclo (createDayNightCycle no llamado)

  if (forcedDarkness) {
    overlay.setAlpha(NIGHT_ALPHA);
    if (sunSprite) sunSprite.setVisible(false);
    if (moonSprite) moonSprite.setVisible(false);
  } else {
    overlay.setAlpha(daytime ? 0 : NIGHT_ALPHA);
    if (sunSprite) sunSprite.setVisible(daytime);
    if (moonSprite) moonSprite.setVisible(!daytime);
  }
}

/** Valor actual del flag de oscuridad forzada. */
export function isForcedDarkness() {
  return forcedDarkness;
}

/** Posición del sol/luna en un arco de borde izquierdo a borde derecho de pantalla. */
function positionOnArc(sprite, progress) {
  if (!sceneRef) return;
  const w = sceneRef.scale.width;
  const h = sceneRef.scale.height;
  const margin = 60;
  const x = margin + (w - margin * 2) * progress;
  const baseY = h * 0.32;
  const apexY = h * 0.08;
  const arc = Math.sin(progress * Math.PI); // 0 en los bordes, 1 en el punto más alto
  const y = baseY - arc * (baseY - apexY);
  sprite.setPosition(x, y);
}

function startArcTween(sprite, duration) {
  if (!sceneRef) return null;
  return sceneRef.tweens.addCounter({
    from: 0,
    to: 1,
    duration,
    onUpdate: (tw) => positionOnArc(sprite, tw.getValue())
  });
}

function swapCelestialBody(isDay) {
  if (activeArcTween) {
    activeArcTween.stop();
    activeArcTween = null;
  }
  if (isDay) {
    moonSprite.setVisible(false);
    sunSprite.setVisible(!forcedDarkness);
    positionOnArc(sunSprite, 0);
    activeArcTween = startArcTween(sunSprite, DAY_LENGTH_MS);
  } else {
    sunSprite.setVisible(false);
    moonSprite.setVisible(!forcedDarkness);
    positionOnArc(moonSprite, 0);
    activeArcTween = startArcTween(moonSprite, NIGHT_LENGTH_MS);
  }
}

function transitionTo(scene, isDay) {
  daytime = isDay;

  if (!isDay) {
    // Empieza una noche nueva: avanza la fase lunar (ciclo, vuelve a 0
    // después de la última fase), imitando el sistema de Terraria.
    moonPhaseCounter = (moonPhaseCounter + 1) % MOON_PHASES;
    moonSprite.setTexture(SKY_TEX.MOON(moonPhaseCounter));
  }

  if (!forcedDarkness) {
    scene.tweens.add({
      targets: overlay,
      alpha: isDay ? 0 : NIGHT_ALPHA,
      duration: TRANSITION_MS,
      ease: 'Sine.easeInOut'
    });
  }

  swapCelestialBody(isDay);
  EventBus.emit('day-night-changed', isDay ? 'day' : 'night');
}

function scheduleNext(scene, isDayPhase) {
  const delay = isDayPhase ? DAY_LENGTH_MS : NIGHT_LENGTH_MS;
  scene.time.addEvent({
    delay,
    callback: () => {
      const nextIsDay = !isDayPhase;
      transitionTo(scene, nextIsDay);
      scheduleNext(scene, nextIsDay);
    }
  });
}

/**
 * Crea el overlay de iluminación + sol/luna + el timer que alterna día/noche
 * sobre `scene`. Emite 'day-night-changed' con 'day' o 'night' en cada cambio.
 * @param {Phaser.Scene} scene
 * @returns {Phaser.GameObjects.Rectangle} el overlay (igual que antes)
 */
export function createDayNightCycle(scene) {
  daytime = true;
  forcedDarkness = false;
  moonPhaseCounter = -1;
  sceneRef = scene;

  overlay = scene.add
    .rectangle(0, 0, scene.scale.width, scene.scale.height, PALETTE.nightTint, 0)
    .setOrigin(0, 0)
    .setScrollFactor(0)
    .setDepth(1000);

  sunSprite = scene.add.image(0, 0, SKY_TEX.SUN).setScrollFactor(0).setDepth(900);
  moonSprite = scene.add.image(0, 0, SKY_TEX.MOON(0)).setScrollFactor(0).setDepth(900).setVisible(false);

  // El overlay debe cubrir toda la pantalla aunque cambie el tamaño de la ventana.
  scene.scale.on('resize', (size) => {
    overlay.setSize(size.width, size.height);
  });

  // Arranca en fase de día (alpha 0 ya puesto arriba) y programa el primer cambio.
  swapCelestialBody(true);
  EventBus.emit('day-night-changed', 'day');
  scheduleNext(scene, true);

  return overlay;
}

// ---------------------------------------------------------------------
// Texturas: sol (círculo cálido con halo) y MOON_PHASES fases lunares
// (disco + sombra tipo creciente, igual concepto visual que Terraria).
// ---------------------------------------------------------------------

// SKY_TEX.SUN: clave fija. SKY_TEX.MOON(i): función que da la clave de la
// fase lunar `i` (0 a MOON_PHASES-1).
export const SKY_TEX = {
  SUN: 'sky_sun',
  MOON: (i) => `sky_moon_${i}`
};

function drawSun(g) {
  const s = 90;
  g.clear();
  g.fillStyle(0xffdd88, 0.12);
  g.fillCircle(s / 2, s / 2, s * 0.5);
  g.fillStyle(0xffcc55, 0.22);
  g.fillCircle(s / 2, s / 2, s * 0.36);
  g.fillStyle(0xffb833, 0.9);
  g.fillCircle(s / 2, s / 2, s * 0.24);
  g.fillStyle(0xfff2c4, 1);
  g.fillCircle(s / 2, s / 2, s * 0.16);
  g.generateTexture(SKY_TEX.SUN, s, s);
}

// Desplazamiento horizontal del disco de sombra respecto al disco iluminado,
// según la fase (técnica clásica de "dos círculos superpuestos": a
// desplazamiento 0 la sombra cubre todo el disco -> luna nueva; a
// desplazamiento 2*r no hay solapamiento -> luna llena).
function moonShadowOffset(i, r) {
  const half = MOON_PHASES / 2;
  if (i <= half) return 2 * r * (i / half); // 0..2r, creciente (nueva -> llena)
  return -(2 * r * ((MOON_PHASES - i) / half)); // 2r..0 mirado del otro lado (llena -> nueva)
}

function drawMoonPhase(g, i) {
  const s = 64;
  const r = s * 0.32;
  const cx = s / 2;
  const cy = s / 2;
  g.clear();
  g.fillStyle(0xcfd8ff, 0.1);
  g.fillCircle(cx, cy, r * 1.5);
  g.fillStyle(0xe7ecff, 1);
  g.fillCircle(cx, cy, r);
  const dx = moonShadowOffset(i, r);
  g.fillStyle(0x1b1f33, 1);
  g.fillCircle(cx + dx, cy, r);
  g.generateTexture(SKY_TEX.MOON(i), s, s);
}

/**
 * Genera la textura del sol y las MOON_PHASES texturas de fase lunar con
 * `g.generateTexture`. Llamar una vez desde BootScene con el mismo Graphics
 * que genera el resto del juego.
 * @param {Phaser.GameObjects.Graphics} g
 */
export function registerDayNightTextures(g) {
  drawSun(g);
  for (let i = 0; i < MOON_PHASES; i++) drawMoonPhase(g, i);
}
