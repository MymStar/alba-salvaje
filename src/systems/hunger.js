// Sistema de supervivencia: ticker de hambre/energía y consumo de comida.

import { changeHunger, changeEnergy, changeMana, damagePlayer, GameState, hasItem, removeItem, addXP } from '../state.js';
import { EventBus } from '../eventBus.js';
import { t } from '../i18n.js';
import { playSound } from './sound.js';

const TICK_DELAY_MS = 4000;
const HUNGER_DRAIN = 2;
const ENERGY_DRAIN_NORMAL = 1;
const ENERGY_DRAIN_SIN_HAMBRE = 3;
const DAMAGE_POR_INANICION = 2;
const MANA_REGEN_PER_TICK = 1;

/**
 * Arranca el "reloj" de supervivencia de la escena: baja hambre/energía
 * periódicamente y daña al jugador si el hambre llega a 0.
 * Debe llamarse UNA sola vez desde WorldScene.create().
 * @param {Phaser.Scene} scene
 */
export function startSurvivalTicker(scene) {
  scene.time.addEvent({
    delay: TICK_DELAY_MS,
    loop: true,
    callback: () => {
      changeHunger(-HUNGER_DRAIN);
      if (GameState.player.hunger > 0) {
        changeEnergy(-ENERGY_DRAIN_NORMAL);
      } else {
        changeEnergy(-ENERGY_DRAIN_SIN_HAMBRE);
      }
      if (GameState.player.hunger <= 0) {
        damagePlayer(DAMAGE_POR_INANICION);
      }
      // Fase 3 (parte 6): el maná NUNCA se agota solo — solo baja cuando el
      // jugador lanza un hechizo (ver changeMana en systems/magic.js). Aquí
      // además se regenera solo un poco mientras no se usa, como en la
      // mayoría de juegos con maná.
      if (GameState.player.alive) changeMana(MANA_REGEN_PER_TICK);
    }
  });
}

/**
 * Come un item de comida del inventario si el jugador lo tiene, curando
 * hambre y dando algo de experiencia. Usado por InventoryUI (Agente C).
 * @param {string} type - 'food_fruit' | 'food_meat' (u otro tipo de comida futuro)
 */
export function eatFood(type) {
  if (!hasItem(type)) {
    EventBus.emit('notify', t('notify.noFood'));
    return;
  }
  removeItem(type, 1);
  const cura = type === 'food_meat' ? 50 : type === 'food_fruit' ? 30 : 20;
  changeHunger(cura);
  addXP(5);
  playSound('coin');
}
