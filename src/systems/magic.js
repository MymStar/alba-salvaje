// Sistema de magia (partes 113-116 del documento de diseño): hechizos
// sencillos que se desbloquean por nivel y consumen maná. Complemento al
// combate físico, no lo reemplaza.

import Phaser from 'phaser';
import { TEX } from '../textureKeys.js';
import { GameState, changeMana, hasSpell, unlockSpell, healPlayer } from '../state.js';
import { dealDamageToEnemy, calcPlayerDamage } from './combat.js';
import { EventBus } from '../eventBus.js';
import { t } from '../i18n.js';
import { playSound } from './sound.js';
import { destroyAltar } from '../world/altars.js';

const ALTAR_SPELL_RANGE = 90; // parte 6: la magia también puede destruir altares, no solo la tecla E

export const SPELLS = [
  { id: 'fireball', nameKey: 'spell.fireball', manaCost: 15, levelReq: 5, tex: TEX.FX_FIREBALL },
  { id: 'heal', nameKey: 'spell.heal', manaCost: 20, levelReq: 8, tex: TEX.FX_HEAL },
  { id: 'barrier', nameKey: 'spell.barrier', manaCost: 25, levelReq: 15, tex: TEX.FX_SHIELD },
  { id: 'summon', nameKey: 'spell.summon', manaCost: 30, levelReq: 20, tex: TEX.FX_HEAL }
];

export function getSpellDef(id) {
  return SPELLS.find((s) => s.id === id) || null;
}

let wired = false;

/** Desbloquea hechizos automáticamente al alcanzar su nivel. Llamar una vez desde main.js. */
export function wireMagicUnlocks() {
  if (wired) return;
  wired = true;

  const checkAll = () => {
    SPELLS.forEach((s) => {
      if (!hasSpell(s.id) && GameState.player.level >= s.levelReq) unlockSpell(s.id);
    });
  };

  checkAll(); // por si ya se carga con nivel suficiente de una partida guardada
  EventBus.on('levelup', checkAll);
}

/**
 * Intenta lanzar un hechizo. `scene` es la WorldScene activa (para efectos
 * visuales y para encontrar enemigos cercanos); `player` es la instancia
 * del jugador.
 */
export function castSpell(scene, spellId, player) {
  const def = getSpellDef(spellId);
  if (!def) return;
  if (!hasSpell(spellId)) {
    EventBus.emit('notify', t('spell.locked', { level: def.levelReq }));
    return;
  }
  if (GameState.player.mana < def.manaCost) {
    EventBus.emit('notify', t('notify.notEnoughMana'));
    return;
  }

  changeMana(-def.manaCost);
  playSound('spell');

  switch (spellId) {
    case 'fireball':
      castFireball(scene, player);
      break;
    case 'heal':
      healPlayer(30);
      spawnFx(scene, def.tex, player.x, player.y);
      break;
    case 'barrier':
      castBarrier(scene, player, def.tex);
      break;
    case 'summon':
      castSummonBoost(scene, player, def.tex);
      break;
    default:
      break;
  }
}

/** Busca el enemigo activo más cercano dentro de `range` px del jugador. */
function findNearestEnemy(scene, player, range) {
  const groups = [scene.monstersGroup, scene.bossGroup, scene.guardiansGroup];
  let nearest = null;
  let nearestDist = range;
  for (const group of groups) {
    if (!group) continue;
    group.getChildren().forEach((enemy) => {
      if (!enemy.active) return;
      const d = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
      if (d < nearestDist) {
        nearest = enemy;
        nearestDist = d;
      }
    });
  }
  return nearest;
}

/**
 * Parte 6 del pedido: los altares también se pueden destruir con magia (no
 * solo con la tecla E cuerpo a cuerpo). Busca el altar cargado en memoria
 * más cercano al jugador dentro de `range` px, en scene.loadedChunks (mismo
 * dato que usa WorldScene#tryDestroyNearbyAltar).
 */
function findNearestAltarSprite(scene, player, range) {
  if (!scene.loadedChunks) return null;
  let nearest = null;
  let nearestDist = range;
  for (const chunk of scene.loadedChunks.values()) {
    for (const sprite of chunk.altarSprites || []) {
      if (!sprite?.active) continue;
      const d = Phaser.Math.Distance.Between(player.x, player.y, sprite.x, sprite.y);
      if (d < nearestDist) {
        nearest = sprite;
        nearestDist = d;
      }
    }
  }
  return nearest;
}

function castFireball(scene, player) {
  const target = findNearestEnemy(scene, player, 260);
  const fx = scene.add.image(player.x, player.y, TEX.FX_FIREBALL).setDepth(20);

  const nearbyAltar = findNearestAltarSprite(scene, player, ALTAR_SPELL_RANGE);
  if (nearbyAltar) destroyAltar(scene, nearbyAltar);

  if (!target) {
    // Sin objetivo de combate: igual se ve el destello (y ya destruyó el
    // altar cercano si había uno), pero no hace daño a nadie.
    scene.tweens.add({ targets: fx, alpha: 0, scale: 1.6, duration: 300, onComplete: () => fx.destroy() });
    return;
  }
  scene.tweens.add({
    targets: fx,
    x: target.x,
    y: target.y,
    duration: 180,
    onComplete: () => {
      dealDamageToEnemy(target, calcPlayerDamage() * 2);
      fx.destroy();
    }
  });
}

function castBarrier(scene, player, tex) {
  const prevDefense = GameState.player.defense;
  GameState.player.defense += 15;
  spawnFx(scene, tex, player.x, player.y, 700);
  scene.time.delayedCall(5000, () => {
    GameState.player.defense = prevDefense;
    EventBus.emit('stats-changed');
  });
}

// Simplificación de "invocar criatura defensiva" (parte 113): en vez de una
// IA de aliado completa, otorga un impulso de fuerza temporal.
// TODO Fase 3: invocar una criatura aliada real con su propia IA.
function castSummonBoost(scene, player, tex) {
  const bonus = 5;
  GameState.player.strength += bonus;
  spawnFx(scene, tex, player.x, player.y, 900);
  scene.time.delayedCall(8000, () => {
    GameState.player.strength = Math.max(0, GameState.player.strength - bonus);
    EventBus.emit('stats-changed');
  });
}

function spawnFx(scene, tex, x, y, duration = 400) {
  const fx = scene.add.image(x, y, tex).setDepth(20).setScale(1);
  scene.tweens.add({
    targets: fx,
    scale: 1.8,
    alpha: 0,
    duration,
    onComplete: () => fx.destroy()
  });
}
