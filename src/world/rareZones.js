// Territorios raros (partes 143-154 del documento de diseño): zonas fijas,
// no infinitas, que se desbloquean al cumplir una condición de progresión y
// que el integrador "pinta" encima del terreno normal en WorldScene.
//
// Todo acá es determinista (mismo estilo que src/world/terrain.js: hash
// trigonométrico puro, sin Math.random) para que la posición de los nodos de
// cristal y la textura alternativa del bosque encantado sean siempre iguales
// entre recargas, dado el mismo id de zona + índice.

import { TEX } from '../textureKeys.js';
import { TILE_SIZE } from '../constants.js';
import { GameState, saveState, addItem, addXP } from '../state.js';
import { playSound } from '../systems/sound.js';
import { EventBus } from '../eventBus.js';

/** Hash 1D determinista -> pseudoaleatorio en [0, 1). Mismo truco que terrain.js. */
function hash1D(n) {
  const s = Math.sin(n * 12.9898) * 43758.5453123;
  return s - Math.floor(s);
}

// Las 2 zonas raras fijas del juego. `condition` se evalúa en checkRareZoneUnlocks().
const RARE_ZONES = [
  {
    id: 'enchanted_forest',
    name: 'Bosque Encantado',
    centerX: 140,
    centerY: -40,
    radius: 10,
    condition: () => GameState.stats.plantsTamed >= 3
  },
  {
    id: 'ancestral_cave',
    name: 'Cueva Ancestral',
    centerX: -140,
    centerY: 90,
    radius: 10,
    condition: () => GameState.player.godsDefeated.length > 0
  }
];

/**
 * Revisa las condiciones de desbloqueo de las 2 zonas raras. Segura de llamar
 * muchas veces (idempotente): solo notifica/emite la primera vez que una
 * zona cumple su condición. Llamarla periódicamente o tras eventos relevantes
 * (domesticar planta, derrotar dios) desde WorldScene.
 */
export function checkRareZoneUnlocks() {
  for (const zone of RARE_ZONES) {
    if (GameState.world.rareZonesFound.includes(zone.id)) continue;
    if (!zone.condition()) continue;

    GameState.world.rareZonesFound.push(zone.id);
    saveState();
    EventBus.emit('notify', 'Has descubierto: ' + zone.name);
    EventBus.emit('rare-zone-found');
  }
}

/**
 * @param {number} worldTileX
 * @param {number} worldTileY
 * @returns {{id:string,name:string,centerX:number,centerY:number,radius:number}|null}
 * La zona rara YA desbloqueada que contiene esa coordenada de tile, o null si
 * no hay ninguna (incluye el caso en que geométricamente cae dentro de una
 * zona todavía no desbloqueada).
 */
export function getZoneAt(worldTileX, worldTileY) {
  for (const zone of RARE_ZONES) {
    if (!GameState.world.rareZonesFound.includes(zone.id)) continue;
    const dx = worldTileX - zone.centerX;
    const dy = worldTileY - zone.centerY;
    if (Math.sqrt(dx * dx + dy * dy) <= zone.radius) {
      return {
        id: zone.id,
        name: zone.name,
        centerX: zone.centerX,
        centerY: zone.centerY,
        radius: zone.radius
      };
    }
  }
  return null;
}

/**
 * Textura alternativa para "pintar" encima del terreno normal dentro de una
 * zona rara ya desbloqueada. Devuelve null si la coordenada no cae en
 * ninguna zona desbloqueada (el integrador debe usar el terreno normal).
 * @param {number} worldTileX
 * @param {number} worldTileY
 * @returns {string|null}
 */
export function getTileOverrideAt(worldTileX, worldTileY) {
  const zone = getZoneAt(worldTileX, worldTileY);
  if (!zone) return null;

  if (zone.id === 'ancestral_cave') {
    // Cueva: todo piedra.
    return TEX.TILE_STONE;
  }

  // Bosque encantado: claros de piedra musgosa dispersos de forma
  // determinista sobre el pasto normal (el integrador deja el resto igual).
  const n = hash1D(worldTileX * 91.7 + worldTileY * 53.3 + 4.21);
  return n > 0.72 ? TEX.TILE_STONE : null;
}

/**
 * Coloca nodos de cristal (recurso de un solo uso) dentro de cada zona rara
 * ya desbloqueada al momento de llamar. Pensada para llamarse UNA vez desde
 * WorldScene.create().
 * // TODO: re-llamar tras desbloquear una zona nueva (esta función no se
 * // repite sola cuando checkRareZoneUnlocks() desbloquea una zona después).
 * @param {Phaser.Scene} scene
 */
export function spawnCrystalNodes(scene) {
  const NODES_PER_ZONE = 8;

  for (const zone of RARE_ZONES) {
    if (!GameState.world.rareZonesFound.includes(zone.id)) continue;

    for (let i = 0; i < NODES_PER_ZONE; i++) {
      const angle = hash1D(zone.centerX * 13.1 + zone.centerY * 7.7 + i * 3.37) * Math.PI * 2;
      const distFactor = hash1D(zone.centerX * 5.3 + zone.centerY * 11.9 + i * 9.13);
      const dist = distFactor * zone.radius * 0.85; // se mantiene lejos del borde

      const tileX = zone.centerX + Math.cos(angle) * dist;
      const tileY = zone.centerY + Math.sin(angle) * dist;
      const worldX = tileX * TILE_SIZE + TILE_SIZE / 2;
      const worldY = tileY * TILE_SIZE + TILE_SIZE / 2;

      const node = scene.add.sprite(worldX, worldY, TEX.CRYSTAL_NODE);
      node.setDepth(3);
      node.setInteractive({ useHandCursor: true });
      node.once('pointerdown', () => {
        if (!node.active) return;
        addItem('crystal', 1);
        addXP(10);
        playSound('coin');
        scene.tweens.add({
          targets: node,
          alpha: 0,
          scale: 1.6,
          duration: 220,
          onComplete: () => node.destroy()
        });
      });
    }
  }
}
