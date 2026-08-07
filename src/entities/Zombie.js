// Zombi: enemigo de velocidad intermedia, más peligroso que la planta hostil.
// Persigue al jugador, ataca por contacto y huye si le queda poca vida.

import Phaser from 'phaser';
import { TEX } from '../textureKeys.js';
import { GameState, damagePlayer, addXP, addItem, addGold } from '../state.js';
import { playSound } from '../systems/sound.js';

const HP_MIN = 40;
const HP_MAX = 60;
const AGGRO_RANGE = 180;
const ATTACK_RANGE = 26;
const ATTACK_COOLDOWN_MS = 1000;
const ATTACK_DMG_MIN = 8;
const ATTACK_DMG_MAX = 12;
const MOVE_SPEED = 95; // intermedia: más lenta que el jugador, más rápida que la planta
const FLEE_HP_RATIO = 0.2;
const FLEE_DURATION_MS = 2000;
const XP_REWARD = 15;
const GOLD_DROP_CHANCE = 0.2;
const GOLD_DROP_MIN = 5;
const GOLD_DROP_MAX = 15;

export default class Zombie extends Phaser.Physics.Arcade.Sprite {
  /**
   * Crea y registra un zombi en la escena.
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @returns {Zombie}
   */
  static spawn(scene, x, y) {
    const zombie = new Zombie(scene, x, y);
    scene.add.existing(zombie);
    scene.physics.add.existing(zombie);
    if (scene.zombiesGroup) scene.zombiesGroup.add(zombie);
    return zombie;
  }

  constructor(scene, x, y) {
    super(scene, x, y, TEX.ZOMBIE);

    this.maxHp = Phaser.Math.Between(HP_MIN, HP_MAX);
    this.hp = this.maxHp;
    this.setDepth(4);

    this.lastAttack = 0;
    this.dying = false;

    this.fleeing = false;
    this.fleeUntil = 0;
  }

  /**
   * @param {number} time
   * @param {number} delta
   * @param {Phaser.GameObjects.GameObject} player
   */
  update(time, delta, player) {
    if (this.dying || !this.active) return;
    if (!player || !GameState.player.alive) {
      this.setVelocity(0, 0);
      return;
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

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
      if (dx !== 0) this.setFlipX(dx < 0);

      if (dist < ATTACK_RANGE && time - this.lastAttack > ATTACK_COOLDOWN_MS) {
        this.lastAttack = time;
        damagePlayer(Phaser.Math.Between(ATTACK_DMG_MIN, ATTACK_DMG_MAX));
      }
    } else {
      this.setVelocity(0, 0);
    }
  }

  /**
   * Resta vida al zombi; si llega a 0, muere y otorga recompensas.
   * @param {number} amount
   */
  takeDamage(amount) {
    if (this.dying || !this.active) return;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.#morir();
    } else {
      this.setTintFill(0xffffff);
      this.scene?.time?.delayedCall(80, () => this.active && this.clearTint());
    }
  }

  #morir() {
    this.dying = true;
    this.setVelocity(0, 0);
    if (this.body) this.body.enable = false;

    addXP(XP_REWARD);
    addItem('food_meat', Phaser.Math.Between(1, 2));
    if (Math.random() < GOLD_DROP_CHANCE) {
      addGold(Phaser.Math.Between(GOLD_DROP_MIN, GOLD_DROP_MAX));
      playSound('coin');
    }

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
}
