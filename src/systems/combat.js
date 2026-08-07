// Sistema de combate: daño del jugador y aplicación de daño a enemigos.
// Módulo pequeño y sin estado propio para que Player/PlantEnemy/Zombie lo compartan.

import { GameState } from '../state.js';

/**
 * Aplica daño a un enemigo (PlantEnemy/Zombie) de forma segura.
 * @param {Phaser.Physics.Arcade.Sprite & {takeDamage:Function}} enemy
 * @param {number} amount
 */
export function dealDamageToEnemy(enemy, amount) {
  if (!enemy || !enemy.active || typeof enemy.takeDamage !== 'function') return;
  enemy.takeDamage(amount);
}

/**
 * Calcula el daño que inflige el jugador en un golpe, según su fuerza
 * actual (GameState.player.strength) con una pequeña variación aleatoria.
 * @returns {number}
 */
export function calcPlayerDamage() {
  const strength = GameState.player.strength || 1;
  const variacion = Math.floor(Math.random() * 4) - 1; // rango [-1, 2]
  return Math.max(1, strength + variacion);
}
