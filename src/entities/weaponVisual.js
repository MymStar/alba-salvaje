// Sprite visual del arma actualmente equipada (Fase 3, parte 4 del pedido).
// Es puramente decorativo: no tiene cuerpo físico ni colisión propia, solo
// sigue al jugador y se anima al atacar. El integrador conecta esto dentro
// de Player.update()/Player.attack() (ver entities/Player.js).
//
// Import restringido: solo constants.js, state.js, eventBus.js e
// itemCatalog.js (más Phaser). La textura del arma se obtiene siempre a
// través de getItem(id).tex, nunca importando textureKeys.js directo.

import Phaser from 'phaser';
import { GameState } from '../state.js';
import { getItem } from '../itemCatalog.js';
import { EventBus } from '../eventBus.js';
import { WEAPON_RANGE, WEAPON_RANGE_PX } from '../constants.js';

// Offset fijo respecto al centro del jugador, simulando la mano que sostiene
// el arma. Se refleja en X según hacia dónde mira el jugador (flipX).
const WEAPON_OFFSET_X = 14;
const WEAPON_OFFSET_Y = 4;

/** Textura del arma equipada según el catálogo, o null si no hay arma. */
function currentWeaponTex() {
  const weaponId = GameState.equipment.weapon;
  if (!weaponId) return null;
  const item = getItem(weaponId);
  return item?.tex ?? null;
}

/**
 * Crea y engancha el controlador visual del arma equipada a `owner`
 * (instancia de Player). Devuelve `{ update, playSwing, getRangePx, destroy }`.
 * @param {Phaser.Scene} scene
 * @param {Phaser.GameObjects.Sprite} owner sprite del jugador (Player)
 */
export function attachWeaponController(scene, owner) {
  // '__DEFAULT' es una textura interna que Phaser registra siempre (no
  // depende de textureKeys.js): la usamos como placeholder cuando no hay
  // arma equipada, y simplemente ocultamos el sprite (a puño limpio no se
  // dibuja nada encima del personaje).
  const initialTex = currentWeaponTex() ?? '__DEFAULT';
  const sprite = scene.add.image(owner.x + WEAPON_OFFSET_X, owner.y + WEAPON_OFFSET_Y, initialTex);
  sprite.setDepth((owner.depth || 5) + 1);
  // Pivote desplazado hacia la "empuñadura" para que el tween de rotación
  // de playSwing() se lea como un tajo/estocada y no como un giro sobre el centro.
  sprite.setOrigin(0.2, 0.8);
  sprite.setVisible(Boolean(currentWeaponTex()));

  function refreshTexture() {
    const tex = currentWeaponTex();
    if (tex) {
      sprite.setTexture(tex);
      sprite.setVisible(true);
    } else {
      sprite.setVisible(false);
    }
  }

  const onEquipmentChanged = () => refreshTexture();
  EventBus.on('equipment-changed', onEquipmentChanged);

  /** Reposiciona el sprite del arma junto a la mano del jugador. Llamar cada frame. */
  function update() {
    if (!sprite || !sprite.active) return;
    const dir = owner.flipX ? -1 : 1;
    sprite.x = owner.x + dir * WEAPON_OFFSET_X;
    sprite.y = owner.y + WEAPON_OFFSET_Y;
    sprite.setFlipX(owner.flipX);
    sprite.setDepth((owner.depth || 5) + 1);
  }

  /** Anima un golpe (tajo/estocada) sincronizado con el "lunge" de Player.attack(). */
  function playSwing() {
    if (!sprite || !sprite.active || !scene.tweens) return;
    scene.tweens.killTweensOf(sprite);
    const dir = owner.flipX ? -1 : 1;
    sprite.angle = -20 * dir;
    scene.tweens.add({
      targets: sprite,
      angle: 70 * dir,
      duration: 90,
      yoyo: true,
      ease: 'Sine.easeOut',
      onComplete: () => {
        sprite.angle = 0;
      }
    });
  }

  /** Alcance de ataque en píxeles según el arma equipada (o puño limpio). */
  function getRangePx() {
    const weaponId = GameState.equipment.weapon;
    const item = weaponId ? getItem(weaponId) : null;
    const range = item?.range ?? WEAPON_RANGE.SHORT;
    return WEAPON_RANGE_PX[range] ?? WEAPON_RANGE_PX[WEAPON_RANGE.SHORT];
  }

  function destroy() {
    EventBus.off('equipment-changed', onEquipmentChanged);
    sprite.destroy();
  }

  return { update, playSwing, getRangePx, destroy };
}
