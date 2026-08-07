// Ciclo día/noche: un rectángulo overlay fijo a la cámara que se atenúa u
// oscurece con una transición animada, alternado por un timer de Phaser.

import { DAY_LENGTH_MS, NIGHT_LENGTH_MS, PALETTE } from '../constants.js';
import { EventBus } from '../eventBus.js';

const TRANSITION_MS = 3500; // duración del fundido entre día y noche
const NIGHT_ALPHA = 0.45;

// Estado interno del módulo: solo puede existir un ciclo día/noche activo
// (una WorldScene a la vez), así que un getter simple basta como contrato
// para que otros sistemas (spawns, IA) consulten la fase actual.
let daytime = true;

/** true si actualmente es de día, según el último cambio de fase emitido. */
export function isDaytime() {
  return daytime;
}

/**
 * Crea el overlay de iluminación y el timer que alterna día/noche sobre
 * `scene`. Emite 'day-night-changed' con 'day' o 'night' en cada cambio.
 */
export function createDayNightCycle(scene) {
  daytime = true;

  const overlay = scene.add
    .rectangle(0, 0, scene.scale.width, scene.scale.height, PALETTE.nightTint, 0)
    .setOrigin(0, 0)
    .setScrollFactor(0)
    .setDepth(1000);

  // El overlay debe cubrir toda la pantalla aunque cambie el tamaño de la ventana.
  scene.scale.on('resize', (size) => {
    overlay.setSize(size.width, size.height);
  });

  function transitionTo(isDay) {
    daytime = isDay;
    scene.tweens.add({
      targets: overlay,
      alpha: isDay ? 0 : NIGHT_ALPHA,
      duration: TRANSITION_MS,
      ease: 'Sine.easeInOut'
    });
    EventBus.emit('day-night-changed', isDay ? 'day' : 'night');
  }

  function scheduleNext(isDayPhase) {
    const delay = isDayPhase ? DAY_LENGTH_MS : NIGHT_LENGTH_MS;
    scene.time.addEvent({
      delay,
      callback: () => {
        const nextIsDay = !isDayPhase;
        transitionTo(nextIsDay);
        scheduleNext(nextIsDay);
      }
    });
  }

  // Arranca en fase de día (alpha 0 ya puesto arriba) y programa el primer cambio.
  EventBus.emit('day-night-changed', 'day');
  scheduleNext(true);

  return overlay;
}
