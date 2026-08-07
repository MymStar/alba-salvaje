// Altares de los dioses malvados (documento de diseño, partes 169-201).
// Generación DETERMINISTA por chunk (mismo patrón que world/terrain.js: hash
// puro de coordenadas, sin Math.random) para que el streaming de chunks de
// WorldScene pueda pedir "¿hay altar en este chunk?" en cualquier momento,
// entrar/salir de memoria, y siempre obtener el mismo resultado.

import Phaser from 'phaser';
import { TEX } from '../textureKeys.js';
import { TILE_SIZE, CHUNK_SIZE, GOD_TYPES, ALTARS_TO_SUMMON_GOD } from '../constants.js';
import { incrementAltarsDestroyed, addGold } from '../state.js';
import { summonGod } from './climate.js';

const SEED = 4242; // semilla propia de los altares (distinta a la del terreno)

/** Hash 2D determinista -> pseudoaleatorio en [0, 1). Mismo truco que terrain.js. */
function hash2D(x, y) {
  const s = Math.sin(x * 269.5 + y * 183.3 + SEED * 0.013) * 24634.6345;
  return s - Math.floor(s);
}

// ~1 de cada 12 chunks contiene un altar.
const ALTAR_CHANCE = 1 / 12;

const GOD_LIST = Object.values(GOD_TYPES);

/**
 * Devuelve los altares (0 o 1) que le corresponden a un chunk, de forma
 * determinista. Cada altar: { id, godId, tileX, tileY } (tileX/tileY son
 * coordenadas de tile ABSOLUTAS del mundo, no relativas al chunk).
 * @param {number} cx
 * @param {number} cy
 * @returns {{id:string, godId:string, tileX:number, tileY:number}[]}
 */
export function getAltarsForChunk(cx, cy) {
  // Parte 195: el jugador siempre debe encontrar un altar cerca de su punto
  // de aparición. Forzamos uno en el chunk de origen (0,0), centrado.
  if (cx === 0 && cy === 0) {
    const tileX = Math.floor(CHUNK_SIZE / 2);
    const tileY = Math.floor(CHUNK_SIZE / 2) + 2;
    const godId = GOD_LIST[Math.floor(hash2D(cx, cy) * GOD_LIST.length) % GOD_LIST.length];
    return [{ id: `altar_${cx}_${cy}`, godId, tileX, tileY }];
  }

  const presenceRoll = hash2D(cx, cy);
  if (presenceRoll >= ALTAR_CHANCE) return [];

  // Hashes independientes (offsets distintos) para elegir posición dentro
  // del chunk y el dios, así no quedan correlacionados con la presencia.
  const xRoll = hash2D(cx + 1000, cy - 1000);
  const yRoll = hash2D(cx - 1000, cy + 1000);
  const godRoll = hash2D(cx - 2000, cy + 2000);

  const localX = Math.floor(xRoll * CHUNK_SIZE);
  const localY = Math.floor(yRoll * CHUNK_SIZE);
  const tileX = cx * CHUNK_SIZE + localX;
  const tileY = cy * CHUNK_SIZE + localY;

  const godIndex = Math.floor(godRoll * GOD_LIST.length) % GOD_LIST.length;
  const godId = GOD_LIST[godIndex];

  return [{ id: `altar_${cx}_${cy}`, godId, tileX, tileY }];
}

// Color de tinte del sprite según el dios, para distinguirlos a simple vista
// además del sprite TEX.ALTAR genérico.
const GOD_TINT = {
  [GOD_TYPES.SEA]: 0x3f8fd6,
  [GOD_TYPES.WIND]: 0xd8d8d8,
  [GOD_TYPES.QUAKE]: 0x8a5a3c,
  [GOD_TYPES.VOLCANO]: 0xe0473f
};

/**
 * Crea el sprite visual de un altar en la escena. Sin física (no hace falta
 * colisión; la cercanía la comprueba el integrador con Distance.Between).
 * Guarda los datos del altar en `sprite.altarData` para identificarlo luego.
 * @param {Phaser.Scene} scene
 * @param {{id:string, godId:string, tileX:number, tileY:number}} altarData
 * @returns {Phaser.GameObjects.Sprite}
 */
export function spawnAltarSprite(scene, altarData) {
  const x = altarData.tileX * TILE_SIZE + TILE_SIZE / 2;
  const y = altarData.tileY * TILE_SIZE + TILE_SIZE / 2;
  const sprite = scene.add.sprite(x, y, TEX.ALTAR);
  sprite.setDepth(y);
  sprite.setTint(GOD_TINT[altarData.godId] ?? 0xffffff);
  sprite.altarData = altarData;
  return sprite;
}

/**
 * El jugador destruye un altar cercano: recompensa inmediata pequeña
 * (parte 201) + cuenta para el despertar del dios (cada ALTARS_TO_SUMMON_GOD
 * destruidos de un mismo dios lo invoca, ver climate.js).
 * @param {Phaser.Scene} scene
 * @param {Phaser.GameObjects.Sprite} altarSprite sprite devuelto por spawnAltarSprite
 */
export function destroyAltar(scene, altarSprite) {
  if (!altarSprite || !altarSprite.altarData) return;
  const { godId } = altarSprite.altarData;

  const total = incrementAltarsDestroyed(godId);

  // Recompensa inmediata pequeña pero tentadora (parte 201): tienta al
  // jugador a seguir destruyendo altares aunque eso enfurezca al dios.
  addGold(Phaser.Math.Between(30, 80));

  if (scene.tweens) {
    scene.tweens.add({
      targets: altarSprite,
      alpha: 0,
      scale: 0.3,
      angle: 90,
      duration: 400,
      onComplete: () => altarSprite.destroy()
    });
  } else {
    altarSprite.destroy();
  }

  if (total > 0 && total % ALTARS_TO_SUMMON_GOD === 0) {
    summonGod(scene, godId);
  }
}
