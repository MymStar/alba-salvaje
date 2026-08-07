// Eventos climáticos devastadores provocados por los dioses malvados
// (documento de diseño, partes 172, 184, 189). Se disparan desde altars.js
// cuando se destruyen suficientes altares de un mismo dios.
//
// TODO Fase 3: ciclos climáticos más largos y variados (el documento habla
// de ciclos de varias horas); aquí se simplifica a un evento corto de
// ~10-15s con aparición de boss, suficiente para demostrar la mecánica.

import Phaser from 'phaser';
import { GOD_TYPES } from '../constants.js';
import { markGodSummoned } from '../state.js';
import { playSound } from '../systems/sound.js';
import { EventBus } from '../eventBus.js';
import GodBoss from '../entities/GodBoss.js';

// Dioses actualmente "activos" (evento climático en curso), para no
// duplicar el evento si se destruyen altares en rápida sucesión. Distinto
// de GameState.world.godsSummoned, que es histórico (nunca se limpia).
const activeGods = new Set();

const GOD_FLASH_COLOR = {
  [GOD_TYPES.SEA]: 0x2255aa,
  [GOD_TYPES.WIND]: 0xdddddd,
  [GOD_TYPES.QUAKE]: 0x6b4226,
  [GOD_TYPES.VOLCANO]: 0xaa2222
};

const EVENT_DURATION_MS = 2500; // duración del efecto de pantalla antes de que aparezca el boss
const FLASH_CYCLES = 4;

/**
 * Dispara el evento climático de un dios: efecto de pantalla + boss.
 * No hace nada si ese dios ya tiene un evento activo en este momento.
 * @param {Phaser.Scene} scene
 * @param {string} godId uno de GOD_TYPES.*
 */
export function summonGod(scene, godId) {
  if (activeGods.has(godId)) return;
  activeGods.add(godId);

  playSound('thunder');
  EventBus.emit('notify', 'Un dios malvado ha despertado');
  EventBus.emit('god-summoned', godId);

  const cam = scene.cameras.main;
  const color = GOD_FLASH_COLOR[godId] ?? 0xffffff;

  const flash = scene.add.rectangle(
    cam.worldView.x + cam.width / 2,
    cam.worldView.y + cam.height / 2,
    cam.width,
    cam.height,
    color,
    0.35
  );
  flash.setScrollFactor(0);
  flash.setDepth(2000);

  if (scene.tweens) {
    scene.tweens.add({
      targets: flash,
      alpha: { from: 0.45, to: 0.08 },
      duration: EVENT_DURATION_MS / FLASH_CYCLES,
      yoyo: true,
      repeat: FLASH_CYCLES - 1,
      onComplete: () => flash.destroy()
    });
  } else {
    flash.destroy();
  }

  if (cam.shake) {
    cam.shake(EVENT_DURATION_MS, 0.006);
  }

  scene.time.delayedCall(EVENT_DURATION_MS, () => {
    activeGods.delete(godId);
    if (!scene.player) return; // la escena pudo cambiar mientras esperábamos

    const offsetX = Phaser.Math.Between(-120, 120);
    const offsetY = Phaser.Math.Between(-120, 120);
    GodBoss.spawn(scene, godId, scene.player.x + offsetX, scene.player.y + offsetY);
    markGodSummoned(godId);
  });
}
