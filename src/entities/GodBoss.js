// Jefe "dios malvado" (documento de diseño, partes 172-230): criatura lenta
// pero con ataques de área masivos y siempre "escapable" (parte 218) y
// recompensas legendarias al derrotarlo. Mismo patrón de entidad que
// Zombie.js/PlantEnemy.js (Phaser.Physics.Arcade.Sprite + spawn estático).

import Phaser from 'phaser';
import { TEX } from '../textureKeys.js';
import { GOD_TYPES } from '../constants.js';
import { damagePlayer, addGold, addGems, addItem, recordGodDefeat, GameState } from '../state.js';
import { playSound } from '../systems/sound.js';
import { EventBus } from '../eventBus.js';

const HP_MIN = 400;
const HP_MAX = 600;
const MOVE_SPEED = 40; // muy lento: parte 212, se compensa con alcance de área
const AOE_RADIUS = 200; // radio del pulso de daño de área
const AOE_MIN_COOLDOWN_MS = 2500;
const AOE_MAX_COOLDOWN_MS = 3500;
const AOE_TELEGRAPH_DELAY_MS = 400; // ventana para que el jugador escape (parte 218)
const AOE_DMG_MIN = 15;
const AOE_DMG_MAX = 25;

// Mapea GOD_TYPES.* -> TEX.GOD_* correspondiente.
const GOD_TEXTURE = {
  [GOD_TYPES.SEA]: TEX.GOD_SEA,
  [GOD_TYPES.WIND]: TEX.GOD_WIND,
  [GOD_TYPES.QUAKE]: TEX.GOD_QUAKE,
  [GOD_TYPES.VOLCANO]: TEX.GOD_VOLCANO
};

export default class GodBoss extends Phaser.Physics.Arcade.Sprite {
  /**
   * Crea y registra un dios malvado en la escena.
   * @param {Phaser.Scene} scene
   * @param {string} godId uno de GOD_TYPES.*
   * @param {number} x
   * @param {number} y
   * @returns {GodBoss}
   */
  static spawn(scene, godId, x, y) {
    const boss = new GodBoss(scene, godId, x, y);
    scene.add.existing(boss);
    scene.physics.add.existing(boss);
    scene.bossGroup ??= scene.physics.add.group();
    scene.bossGroup.add(boss);
    playSound('bossRoar');
    return boss;
  }

  constructor(scene, godId, x, y) {
    super(scene, x, y, GOD_TEXTURE[godId] ?? TEX.GOD_SEA);

    this.godId = godId;
    this.maxHp = Phaser.Math.Between(HP_MIN, HP_MAX);
    this.hp = this.maxHp;
    this.setDepth(10);

    this.dying = false;
    this.nextAoeAt = 0;
    this.aoeTelegraphing = false;
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

    // Persigue muy despacio, siempre (aunque esté lejos): es implacable pero
    // fácil de dejar atrás por lo lento que es.
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    this.setVelocity((dx / len) * MOVE_SPEED, (dy / len) * MOVE_SPEED);
    if (dx !== 0) this.setFlipX(dx < 0);

    if (!this.nextAoeAt) {
      this.nextAoeAt = time + Phaser.Math.Between(AOE_MIN_COOLDOWN_MS, AOE_MAX_COOLDOWN_MS);
    }

    if (!this.aoeTelegraphing && dist < AOE_RADIUS && time > this.nextAoeAt) {
      this.#lanzarPulsoArea(player);
    }
  }

  /** Telegrafía y ejecuta el pulso de daño de área (parte 212/218). */
  #lanzarPulsoArea(player) {
    this.aoeTelegraphing = true;
    this.nextAoeAt = 0; // se recalcula tras el pulso

    playSound('thunder');
    if (this.scene?.tweens) {
      this.scene.tweens.add({
        targets: this,
        scale: 1.35,
        duration: AOE_TELEGRAPH_DELAY_MS,
        yoyo: true,
        ease: 'Sine.easeInOut'
      });
    }

    this.scene?.time?.delayedCall(AOE_TELEGRAPH_DELAY_MS, () => {
      this.aoeTelegraphing = false;
      if (this.dying || !this.active) return;
      const stillInRange = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) < AOE_RADIUS;
      if (stillInRange && GameState.player.alive) {
        damagePlayer(Phaser.Math.Between(AOE_DMG_MIN, AOE_DMG_MAX));
      }
      this.nextAoeAt = this.scene.time.now + Phaser.Math.Between(AOE_MIN_COOLDOWN_MS, AOE_MAX_COOLDOWN_MS);
    });
  }

  /**
   * Resta vida al dios; al llegar a 0 muere y otorga recompensas legendarias
   * (partes 174/187): desbloquea nivel 1000, oro/gemas/cristales grandes.
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

    recordGodDefeat(this.godId);
    addGold(500);
    addGems(200);
    addItem('crystal', 5);
    EventBus.emit('notify', '¡Recompensa legendaria obtenida!');

    if (this.scene?.tweens) {
      this.scene.tweens.add({
        targets: this,
        alpha: 0,
        scale: 0.2,
        duration: 600,
        onComplete: () => this.destroy()
      });
    } else {
      this.destroy();
    }
  }
}
