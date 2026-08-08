// Sprite del jugador: movimiento con teclado (flechas/WASD) y ataque cuerpo a cuerpo
// contra plantas hostiles y zombis cercanos.

import Phaser from 'phaser';
import { TEX } from '../textureKeys.js';
import { PLAYER_SPEED } from '../constants.js';
import { GameState } from '../state.js';
import { dealDamageToEnemy, calcPlayerDamage } from '../systems/combat.js';
import { playSound } from '../systems/sound.js';
import { attachWeaponController } from './weaponVisual.js';
import { getGrowthTextureKey } from './growthTextures.js';
import { EventBus } from '../eventBus.js';

const ATTACK_COOLDOWN_MS = 400;

/** Textura de respaldo si por lo que sea no hay etapa de crecimiento válida (parte 8). */
function texturaSegunPersonaje() {
  const id = GameState.character?.id;
  if (id === 'exploradora') return TEX.PLAYER_EXPLORADORA;
  if (id === 'mago') return TEX.PLAYER_MAGO;
  return TEX.PLAYER_GUERRERO;
}

/** Textura real del jugador: varía por clase, género y nivel (bebé -> adulto, parte 8). */
function textureForCurrentPlayer() {
  const id = GameState.character?.id || 'guerrero';
  const gender = GameState.character?.gender;
  const level = GameState.player?.level || 1;
  return getGrowthTextureKey(id, gender, level) || texturaSegunPersonaje();
}

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, textureForCurrentPlayer());

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDrag(600);
    this.setDepth(5);
    this.setCollideWorldBounds(false);

    this.lastAttack = 0;

    // Fase 3 (parte 4): arma equipada visible sobre el personaje, que se
    // anima al atacar y da el alcance real según el tipo de arma.
    this.weaponController = attachWeaponController(scene, this);

    // Fase 3 (parte 8): al subir de nivel, cambia la textura del cuerpo a
    // la etapa de crecimiento que corresponda (bebé/niño/joven/adulto).
    this._onLevelUp = () => this.setTexture(textureForCurrentPlayer());
    EventBus.on('levelup', this._onLevelUp);
    scene.events.once('shutdown', () => {
      EventBus.off('levelup', this._onLevelUp);
      this.weaponController?.destroy();
    });

    // Controles propios: flechas + WASD, para no depender de que quien nos
    // instancie configure cursors correctamente.
    this.cursorKeys = scene.input.keyboard.createCursorKeys();
    this.wasdKeys = scene.input.keyboard.addKeys('W,A,S,D');
  }

  /**
   * Actualiza el movimiento del jugador. El parámetro `cursors` es opcional:
   * si se recibe un objeto de cursores de Phaser se usa además de WASD;
   * si no, se usan los controles propios creados en el constructor.
   * @param {Phaser.Types.Input.Keyboard.CursorKeys} [cursors]
   * @param {number} delta
   */
  update(cursors, delta) {
    this.weaponController?.update();

    if (!GameState.player.alive) {
      this.setVelocity(0, 0);
      return;
    }

    const keys = cursors || this.cursorKeys;
    const wasd = this.wasdKeys;

    let dx = 0;
    let dy = 0;

    if (keys?.left?.isDown || wasd.A.isDown) dx -= 1;
    if (keys?.right?.isDown || wasd.D.isDown) dx += 1;
    if (keys?.up?.isDown || wasd.W.isDown) dy -= 1;
    if (keys?.down?.isDown || wasd.S.isDown) dy += 1;

    const speed = PLAYER_SPEED * (GameState.player.speed || 1);

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
      this.setVelocity(dx * speed, dy * speed);
      if (dx !== 0) this.setFlipX(dx < 0);
    } else {
      this.setVelocity(0, 0);
    }
  }

  /**
   * Intenta atacar cuerpo a cuerpo: aplica cooldown, hace un pequeño "lunge"
   * visual y daña a los enemigos dentro de rango.
   */
  attack() {
    const now = Date.now();
    if (now - this.lastAttack < ATTACK_COOLDOWN_MS) return;
    this.lastAttack = now;
    playSound('attack');

    // Efecto visual simple: flash + lunge corto en la dirección actual.
    if (this.scene?.tweens) {
      this.setTint(0xffffff);
      const dir = this.flipX ? -1 : 1;
      this.scene.tweens.add({
        targets: this,
        x: this.x + dir * 8,
        duration: 70,
        yoyo: true,
        onComplete: () => this.clearTint()
      });
    }
    // Fase 3 (parte 4): el arma equipada se anima (tajo) en sincronía con el golpe.
    this.weaponController?.playSwing();

    const dano = calcPlayerDamage();
    const alcance = this.weaponController?.getRangePx() ?? 34;
    const grupos = [this.scene?.monstersGroup, this.scene?.bossGroup, this.scene?.guardiansGroup];

    for (const grupo of grupos) {
      if (!grupo) continue;
      grupo.getChildren().slice().forEach((enemy) => {
        if (!enemy.active) return;
        const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
        if (dist <= alcance) {
          dealDamageToEnemy(enemy, dano);
        }
      });
    }
  }
}
