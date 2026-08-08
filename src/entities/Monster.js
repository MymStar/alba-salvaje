// Clase genérica de enemigo: sustituye al par Zombie.js/PlantEnemy.js con un
// único sistema parametrizado por una entrada de monsterCatalog.js (`def`) y
// un nivel. Mismo patrón de comportamiento que Zombie.js (aggro, ataque con
// cooldown, huida a poca vida, muerte con recompensas + fade-out), pero
// genérico para más de 50 tipos de monstruos distintos.
//
// El integrador reemplaza las llamadas a PlantEnemy.spawn/Zombie.spawn en
// WorldScene.js por Monster.spawn(...) o spawnRandomMonster(...)
// (ver entities/monsterSpawner.js).

import Phaser from 'phaser';
import { GameState, damagePlayer, addXP, addItem, addGold } from '../state.js';
import { playSound } from '../systems/sound.js';
import { EventBus } from '../eventBus.js';
import { getMonsterDef } from './monsterCatalog.js';

const FLEE_HP_RATIO = 0.2;
const FLEE_DURATION_MS = 2000;
const ATTACK_COOLDOWN_MIN_MS = 900;
const ATTACK_COOLDOWN_MAX_MS = 1300;
const GOLD_DROP_CHANCE = 0.2;
const GOLD_DROP_MIN = 5;
const GOLD_DROP_MAX = 20;

/** Recurso "razonable" a dropear según la familia del monstruo. */
function pickDropType(family) {
  switch (family) {
    case 'plant':
      return Math.random() < 0.5 ? 'fiber' : 'food_fruit';
    case 'beast':
    case 'reptile':
      return 'food_meat';
    case 'insect':
      return Math.random() < 0.5 ? 'fiber' : 'food_meat';
    default:
      // undead, construct, demon, spirit, elemental, slime...
      return Math.random() < 0.5 ? 'food_meat' : 'fiber';
  }
}

export default class Monster extends Phaser.Physics.Arcade.Sprite {
  /**
   * Crea y registra un monstruo genérico en la escena, a partir de un id de
   * entities/monsterCatalog.js y un nivel.
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {string} defId id de MONSTERS (monsterCatalog.js)
   * @param {number} level
   * @returns {Monster|null} null si el id no existe en el catálogo
   */
  static spawn(scene, x, y, defId, level) {
    const def = getMonsterDef(defId);
    if (!def) return null;

    const monster = new Monster(scene, x, y, def, level);
    scene.add.existing(monster);
    scene.physics.add.existing(monster);

    scene.monstersGroup ??= scene.physics.add.group();
    scene.monstersGroup.add(monster);

    return monster;
  }

  constructor(scene, x, y, def, level) {
    super(scene, x, y, def.id);

    this.def = def;
    this.level = Math.max(1, level | 0);

    this.maxHp = Math.round(def.baseHp + def.hpPerLevel * this.level);
    this.hp = this.maxHp;

    const dmg = def.baseDmg + def.dmgPerLevel * this.level;
    this.dmgMin = Math.max(1, Math.round(dmg * 0.85));
    this.dmgMax = Math.max(this.dmgMin, Math.round(dmg * 1.15));

    this.xpReward = Math.round(def.xpBase + def.xpPerLevel * this.level);

    this.setDepth(4);

    this.lastAttack = 0;
    this.attackCooldown = Phaser.Math.Between(ATTACK_COOLDOWN_MIN_MS, ATTACK_COOLDOWN_MAX_MS);
    this.dying = false;

    this.fleeing = false;
    this.fleeUntil = 0;

    this.domesticada = false;

    // Texto de nivel: pintado sobre el pecho del sprite (no sobre la cabeza),
    // con contorno oscuro para que se lea sobre cualquier fondo.
    this.levelText = scene.add.text(x, y - this.height * 0.15, String(this.level), {
      fontSize: '11px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.levelText.setOrigin(0.5);
    this.levelText.setDepth(5);
  }

  /**
   * @param {number} time
   * @param {number} delta
   * @param {Phaser.GameObjects.GameObject} player
   */
  update(time, delta, player) {
    if (this.dying || !this.active) return;

    if (this.levelText?.active) {
      this.levelText.setPosition(this.x, this.y - this.height * 0.15);
    }

    if (this.domesticada) {
      this.setVelocity(0, 0);
      return;
    }
    if (!player || !GameState.player.alive) {
      this.setVelocity(0, 0);
      return;
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const speed = this.def.speed;

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
        this.setVelocity((dx / len) * speed, (dy / len) * speed);
        return;
      }
    }

    if (dist < this.def.aggroRange) {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      this.setVelocity((dx / len) * speed, (dy / len) * speed);
      if (dx !== 0) this.setFlipX(dx < 0);

      if (dist < this.def.attackRange && time - this.lastAttack > this.attackCooldown) {
        this.lastAttack = time;
        damagePlayer(Phaser.Math.Between(this.dmgMin, this.dmgMax));
      }
    } else {
      this.setVelocity(0, 0);
    }
  }

  /**
   * Resta vida al monstruo; si llega a 0, muere y otorga recompensas.
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

    addXP(this.xpReward);
    EventBus.emit('enemy-killed', this.def.family);
    addItem(pickDropType(this.def.family), Phaser.Math.Between(1, 2));
    if (Math.random() < GOLD_DROP_CHANCE) {
      addGold(Phaser.Math.Between(GOLD_DROP_MIN, GOLD_DROP_MAX));
      playSound('coin');
    }

    this.levelText?.destroy();
    this.levelText = null;

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
   * Domestica al monstruo (solo tiene efecto si `def.tamable` es true, igual
   * que PlantEnemy.tame()): deja de ser hostil y se queda quieto.
   */
  tame() {
    if (!this.def.tamable || this.dying) return;
    this.domesticada = true;
    this.fleeing = false;
    this.setVelocity(0, 0);
    this.setTint(0xbfffbf);
    EventBus.emit('plant-tamed');
  }
}
