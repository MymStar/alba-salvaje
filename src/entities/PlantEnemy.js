// Planta hostil: enemigo lento que persigue al jugador de cerca, ataca por
// contacto y huye cuando le queda poca vida. También puede domesticarse
// (transformarse en aliada) según el documento de diseño.

import Phaser from 'phaser';
import { TEX } from '../textureKeys.js';
import { GameState, damagePlayer, addXP, addItem } from '../state.js';

const HP_MIN = 20;
const HP_MAX = 30;
const AGGRO_RANGE = 180;
const ATTACK_RANGE = 26;
const ATTACK_COOLDOWN_MS = 1300;
const ATTACK_DMG_MIN = 4;
const ATTACK_DMG_MAX = 6;
const MOVE_SPEED = 55; // más lenta que el jugador (PLAYER_SPEED=160)
const FLEE_HP_RATIO = 0.2;
const FLEE_DURATION_MS = 2500;
const XP_REWARD = 8;

export default class PlantEnemy extends Phaser.Physics.Arcade.Sprite {
  /**
   * Crea y registra una planta hostil en la escena.
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @returns {PlantEnemy}
   */
  static spawn(scene, x, y) {
    const plant = new PlantEnemy(scene, x, y);
    scene.add.existing(plant);
    scene.physics.add.existing(plant);
    if (scene.plantsGroup) scene.plantsGroup.add(plant);
    return plant;
  }

  constructor(scene, x, y) {
    super(scene, x, y, TEX.PLANT_HOSTILE);

    this.maxHp = Phaser.Math.Between(HP_MIN, HP_MAX);
    this.hp = this.maxHp;
    this.setDepth(4);

    this.lastAttack = 0;
    this.dying = false;

    this.fleeing = false;
    this.fleeUntil = 0;

    this.domesticada = false;
  }

  /**
   * @param {number} time
   * @param {number} delta
   * @param {Phaser.GameObjects.GameObject} player
   */
  update(time, delta, player) {
    if (this.dying || !this.active) return;
    if (this.domesticada) {
      this.setVelocity(0, 0);
      return;
    }
    if (!player || !GameState.player.alive) {
      this.setVelocity(0, 0);
      return;
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    // Huida si la vida está muy baja
    if (this.hp <= this.maxHp * FLEE_HP_RATIO) {
      if (!this.fleeing) {
        this.fleeing = true;
        this.fleeUntil = time + FLEE_DURATION_MS;
      }
    }

    if (this.fleeing) {
      if (time > this.fleeUntil) {
        this.fleeing = false;
      } else {
        const dx = this.x - player.x;
        const dy = this.y - player.y;
        const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        this.setVelocity((dx / len) * MOVE_SPEED, (dy / len) * MOVE_SPEED);
        return;
      }
    }

    if (dist < AGGRO_RANGE) {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      this.setVelocity((dx / len) * MOVE_SPEED, (dy / len) * MOVE_SPEED);

      if (dist < ATTACK_RANGE && time - this.lastAttack > ATTACK_COOLDOWN_MS) {
        this.lastAttack = time;
        damagePlayer(Phaser.Math.Between(ATTACK_DMG_MIN, ATTACK_DMG_MAX));
      }
    } else {
      this.setVelocity(0, 0);
    }
  }

  /**
   * Resta vida a la planta; si llega a 0, muere y otorga recompensas.
   * @param {number} amount
   */
  takeDamage(amount) {
    if (this.dying || !this.active) return;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.#morir();
    } else {
      // pequeño feedback visual de golpe
      this.setTintFill(0xffffff);
      this.scene?.time?.delayedCall(80, () => this.active && this.clearTint());
    }
  }

  #morir() {
    this.dying = true;
    this.setVelocity(0, 0);
    if (this.body) this.body.enable = false;

    addXP(XP_REWARD);
    const tipo = Math.random() < 0.5 ? 'fiber' : 'food_fruit';
    addItem(tipo, Phaser.Math.Between(1, 2));

    if (this.scene?.tweens) {
      this.scene.tweens.add({
        targets: this,
        alpha: 0,
        scale: 0.2,
        duration: 250,
        onComplete: () => this.destroy()
      });
    } else {
      this.destroy();
    }
  }

  /**
   * Domestica la planta: deja de ser hostil y pasa a textura aliada.
   * TODO Fase 2: comportamiento completo de aliada (seguir al jugador, ayudar en combate, etc.)
   */
  tame() {
    if (this.dying) return;
    this.domesticada = true;
    this.fleeing = false;
    this.setTexture(TEX.PLANT_ALLY);
    this.setVelocity(0, 0);
  }
}
