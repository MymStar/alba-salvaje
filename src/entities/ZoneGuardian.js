// Guardián de zona rara: enemigo reforzado que protege los territorios raros
// (parte 149, simplificado a un guardián fuerte reutilizable en vez de un
// boss único por territorio). Mismo patrón que Zombie.js (perseguir, atacar
// por contacto con cooldown, huir con poca vida) pero más agresivo y con
// recompensas mayores. Reutiliza la textura TEX.ZOMBIE agrandada y teñida de
// morado para diferenciarse visualmente sin necesitar un sprite nuevo.

import Phaser from 'phaser';
import { TEX } from '../textureKeys.js';
import { GameState, damagePlayer, addXP, addItem, addGold } from '../state.js';
import { playSound } from '../systems/sound.js';
import { EventBus } from '../eventBus.js';

const HP_MIN = 120;
const HP_MAX = 150;
const AGGRO_RANGE = 220;
const ATTACK_RANGE = 30;
const ATTACK_COOLDOWN_MS = 900;
const ATTACK_DMG_MIN = 12;
const ATTACK_DMG_MAX = 20;
const MOVE_SPEED = 110;
const FLEE_HP_RATIO = 0.15; // más agresivo que el zombi normal: huye recién con muy poca vida
const FLEE_DURATION_MS = 1500;
const XP_REWARD = 40;
const CRYSTAL_DROP_MIN = 1;
const CRYSTAL_DROP_MAX = 2;
const GOLD_DROP_CHANCE = 0.4;
const GOLD_DROP_MIN = 40;
const GOLD_DROP_MAX = 90;
const SCALE = 1.6;
const TINT = 0x8a4fd9;

export default class ZoneGuardian extends Phaser.Physics.Arcade.Sprite {
  /**
   * Crea y registra un guardián de zona en la escena.
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @returns {ZoneGuardian}
   */
  static spawn(scene, x, y) {
    const guardian = new ZoneGuardian(scene, x, y);
    scene.add.existing(guardian);
    scene.physics.add.existing(guardian);
    scene.guardiansGroup ??= scene.physics.add.group();
    scene.guardiansGroup.add(guardian);
    return guardian;
  }

  constructor(scene, x, y) {
    super(scene, x, y, TEX.ZOMBIE);

    this.setScale(SCALE);
    this.setTint(TINT);

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
   * Resta vida al guardián; si llega a 0, muere y otorga recompensas altas.
   * @param {number} amount
   */
  takeDamage(amount) {
    if (this.dying || !this.active) return;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.#morir();
    } else {
      this.setTintFill(0xffffff);
      this.scene?.time?.delayedCall(80, () => this.active && this.setTint(TINT));
    }
  }

  #morir() {
    this.dying = true;
    this.setVelocity(0, 0);
    if (this.body) this.body.enable = false;

    addXP(XP_REWARD);
    EventBus.emit('enemy-killed', 'zone_guardian');
    addItem('crystal', Phaser.Math.Between(CRYSTAL_DROP_MIN, CRYSTAL_DROP_MAX));
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
