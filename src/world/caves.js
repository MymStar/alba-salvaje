// Cuevas (parte 14 del pedido). Reutilizan el MISMO sistema de
// chunks/streaming de la superficie: el "interior de cueva" es simplemente
// una región del mundo muy alejada (worldTileX >= CAVE_WORLD_OFFSET). Cada
// entrada en superficie mapea a una región única de 200x200 tiles dentro de
// ese offset, hasheando su id (mismo espíritu que world/altars.js: "1
// estructura determinista por chunk", pero aquí además "1 región determinista
// por entrada").

import { TILE_SIZE, CHUNK_SIZE, CAVE_WORLD_OFFSET, BIOME_TYPES } from '../constants.js';
import { addGold, GameState, saveState } from '../state.js';
import { EventBus } from '../eventBus.js';
import { getAllItems } from '../itemCatalog.js';
import { getBiomeAt } from './biomes.js';

// ---------------------------------------------------------------------
// Ruido determinista para el patrón de piso/pared (misma técnica que
// terrain.js/biomes.js, semilla propia).
// ---------------------------------------------------------------------

const SEED = 8081;
function hash2D(x, y) {
  const s = Math.sin(x * 191.9 + y * 271.3 + SEED * 0.031) * 51234.1234;
  return s - Math.floor(s);
}
function smooth(t) {
  return t * t * (3 - 2 * t);
}
function valueNoise(x, y, freq) {
  const fx = x * freq;
  const fy = y * freq;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const tx = smooth(fx - x0);
  const ty = smooth(fy - y0);
  const v00 = hash2D(x0, y0);
  const v10 = hash2D(x1, y0);
  const v01 = hash2D(x0, y1);
  const v11 = hash2D(x1, y1);
  const a = v00 + (v10 - v00) * tx;
  const b = v01 + (v11 - v01) * tx;
  return a + (b - a) * ty;
}

// Hash independiente para decidir presencia/posición de entradas (semilla propia).
const ENTRANCE_SEED = 9192;
function entranceHash2D(x, y) {
  const s = Math.sin(x * 211.7 + y * 337.1 + ENTRANCE_SEED * 0.019) * 33321.777;
  return s - Math.floor(s);
}

// ~1 de cada 10 chunks de bioma HILLS tiene una entrada de cueva.
const CAVE_ENTRANCE_CHANCE = 1 / 10;

/**
 * Entrada de cueva (0 o 1) que le corresponde a un chunk de superficie, de
 * forma determinista. Solo puede aparecer en chunks cuyo centro cae en
 * bioma HILLS.
 * @param {number} cx
 * @param {number} cy
 * @returns {null|{id:string, tileX:number, tileY:number}}
 */
export function getCaveEntranceForChunk(cx, cy) {
  const centerX = cx * CHUNK_SIZE + Math.floor(CHUNK_SIZE / 2);
  const centerY = cy * CHUNK_SIZE + Math.floor(CHUNK_SIZE / 2);
  if (getBiomeAt(centerX, centerY) !== BIOME_TYPES.HILLS) return null;

  const presenceRoll = entranceHash2D(cx, cy);
  if (presenceRoll >= CAVE_ENTRANCE_CHANCE) return null;

  const xRoll = entranceHash2D(cx + 4000, cy - 4000);
  const yRoll = entranceHash2D(cx - 4000, cy + 4000);
  const localX = Math.floor(xRoll * CHUNK_SIZE);
  const localY = Math.floor(yRoll * CHUNK_SIZE);
  const tileX = cx * CHUNK_SIZE + localX;
  const tileY = cy * CHUNK_SIZE + localY;

  return { id: `cave_${cx}_${cy}`, tileX, tileY };
}

/**
 * Crea el sprite visual de una entrada de cueva en la superficie.
 * @param {Phaser.Scene} scene
 * @param {{id:string, tileX:number, tileY:number}} data
 * @returns {Phaser.GameObjects.Sprite}
 */
export function spawnCaveEntranceSprite(scene, data) {
  const x = data.tileX * TILE_SIZE + TILE_SIZE / 2;
  const y = data.tileY * TILE_SIZE + TILE_SIZE / 2;
  const sprite = scene.add.sprite(x, y, CAVE_TEX.ENTRANCE);
  sprite.setDepth(y);
  sprite.caveEntranceData = data;
  return sprite;
}

/** true si la coordenada de tile cae dentro de la región de cuevas. */
export function isInsideCave(worldTileX, worldTileY) {
  return worldTileX >= CAVE_WORLD_OFFSET;
}

// Cada entrada reserva un bloque de 200x200 tiles dentro del offset. El
// punto local (100,100) de CUALQUIER bloque siempre es 'floor' garantizado
// (radio forzado), igual que altars.js fuerza el altar de spawn en (0,0).
const REGION_SIZE = 200;
const REGION_CENTER = 100;
const FORCED_FLOOR_RADIUS = 13;

/**
 * Tipo de tile dentro de una cueva: 'floor' o 'wall'. Ruido orgánico tipo
 * cavidades conectadas (no tablero de ajedrez), con un área abierta forzada
 * en el punto de origen de cada región de 200x200.
 * @param {number} worldTileX
 * @param {number} worldTileY
 * @returns {'floor'|'wall'}
 */
export function getCaveTileTypeAt(worldTileX, worldTileY) {
  const lx = worldTileX - CAVE_WORLD_OFFSET;
  const ly = worldTileY - CAVE_WORLD_OFFSET;

  const blockLocalX = ((lx % REGION_SIZE) + REGION_SIZE) % REGION_SIZE;
  const blockLocalY = ((ly % REGION_SIZE) + REGION_SIZE) % REGION_SIZE;
  const dx = blockLocalX - REGION_CENTER;
  const dy = blockLocalY - REGION_CENTER;
  if (dx * dx + dy * dy <= FORCED_FLOOR_RADIUS * FORCED_FLOOR_RADIUS) {
    return 'floor';
  }

  const n1 = valueNoise(lx, ly, 0.045);
  const n2 = valueNoise(lx * 1.7 + 91, ly * 1.7 - 91, 0.09);
  const n = n1 * 0.65 + n2 * 0.35;
  return n > 0.53 ? 'wall' : 'floor';
}

// ---------------------------------------------------------------------
// Asignación de región única por entranceId (hash de string -> desplazamiento
// grande dentro del offset).
// ---------------------------------------------------------------------

function stringHash(str, salt) {
  let h = salt >>> 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(h, 31) + str.charCodeAt(i)) >>> 0;
  }
  return h;
}
function hashToUnit(h) {
  return (h % 1000003) / 1000003;
}

// Grilla de bloques de 200x200 reservados por entrada: MAX_BLOCKS^2
// posiciones posibles, más que suficiente para que las cuevas del prototipo
// no se solapen en la práctica.
const MAX_BLOCKS = 3000;

/**
 * Origen (en tiles, dentro del offset) único para una entrada de cueva. Cae
 * siempre en un tile 'floor' garantizado (ver FORCED_FLOOR_RADIUS arriba).
 * @param {string} entranceId
 * @returns {{x:number, y:number}}
 */
export function getCaveRegionOrigin(entranceId) {
  const gx = Math.floor(hashToUnit(stringHash(entranceId, 111)) * MAX_BLOCKS);
  const gy = Math.floor(hashToUnit(stringHash(entranceId, 222)) * MAX_BLOCKS);
  return {
    x: CAVE_WORLD_OFFSET + gx * REGION_SIZE + REGION_CENTER,
    y: CAVE_WORLD_OFFSET + gy * REGION_SIZE + REGION_CENTER
  };
}

/** Punto donde se coloca el marcador de salida de la cueva (cerca del origen). */
export function getCaveExitPoint(entranceId) {
  const origin = getCaveRegionOrigin(entranceId);
  return { x: origin.x + 3, y: origin.y + 3 };
}

/**
 * Botín determinista (3 a 6 cofres) dentro de la región de una cueva, en
 * tiles garantizados 'floor' (dentro del radio forzado alrededor del origen).
 * @param {string} entranceId
 * @returns {{id:string, tileX:number, tileY:number, gold:number, itemId?:string}[]}
 */
export function getCaveLootForRegion(entranceId) {
  const origin = getCaveRegionOrigin(entranceId);
  const countRoll = hashToUnit(stringHash(entranceId, 333));
  const count = 3 + Math.floor(countRoll * 4); // 3..6
  const items = getAllItems();
  const loot = [];

  for (let i = 0; i < count; i++) {
    const angle = hashToUnit(stringHash(entranceId, 1000 + i)) * Math.PI * 2;
    const dist = 3 + hashToUnit(stringHash(entranceId, 2000 + i)) * (FORCED_FLOOR_RADIUS - 4);
    const tileX = Math.round(origin.x + Math.cos(angle) * dist);
    const tileY = Math.round(origin.y + Math.sin(angle) * dist);
    const gold = 20 + Math.floor(hashToUnit(stringHash(entranceId, 3000 + i)) * 130);
    const hasItem = hashToUnit(stringHash(entranceId, 4000 + i)) < 0.5;
    const itemId =
      hasItem && items.length
        ? items[Math.floor(hashToUnit(stringHash(entranceId, 5000 + i)) * items.length) % items.length].id
        : undefined;
    loot.push({ id: `${entranceId}_loot_${i}`, tileX, tileY, gold, itemId });
  }
  return loot;
}

/**
 * Crea el sprite visual de un cofre de botín.
 * @param {Phaser.Scene} scene
 * @param {{id:string, tileX:number, tileY:number, gold:number, itemId?:string}} chestData
 * @returns {Phaser.GameObjects.Sprite}
 */
export function spawnCaveLootSprite(scene, chestData) {
  const x = chestData.tileX * TILE_SIZE + TILE_SIZE / 2;
  const y = chestData.tileY * TILE_SIZE + TILE_SIZE / 2;
  const sprite = scene.add.sprite(x, y, CAVE_TEX.CHEST);
  sprite.setDepth(y);
  sprite.chestData = chestData;
  return sprite;
}

// Prefijo propio de localStorage para el botín de cuevas (NO reutiliza
// STORAGE_KEYS de constants.js, según lo pedido).
const LOOT_STORAGE_PREFIX = 'alba_salvaje_cave_loot_';

function isChestOpened(id) {
  try {
    return localStorage.getItem(LOOT_STORAGE_PREFIX + id) === '1';
  } catch {
    return false;
  }
}
function markChestOpened(id) {
  try {
    localStorage.setItem(LOOT_STORAGE_PREFIX + id, '1');
  } catch {
    /* localStorage no disponible: se ignora, el cofre se podrá reabrir en la sesión */
  }
}

/**
 * Abre un cofre de botín de cueva (una sola vez, persistido en localStorage):
 * otorga oro y, si tiene, un ítem del catálogo.
 * @param {Phaser.Scene} scene
 * @param {Phaser.GameObjects.Sprite} chestSprite sprite devuelto por spawnCaveLootSprite
 */
export function openCaveLootChest(scene, chestSprite) {
  const data = chestSprite?.chestData;
  if (!data) return;
  if (isChestOpened(data.id)) {
    EventBus.emit('notify', 'El cofre ya está vacío');
    return;
  }

  markChestOpened(data.id);
  addGold(data.gold);
  if (data.itemId && !GameState.ownedItems.includes(data.itemId)) {
    GameState.ownedItems.push(data.itemId);
    saveState();
  }

  if (scene.tweens) {
    scene.tweens.add({
      targets: chestSprite,
      alpha: 0.5,
      scale: chestSprite.scale * 1.15,
      duration: 220,
      yoyo: true,
      onComplete: () => chestSprite.setTint(0x777777)
    });
  } else {
    chestSprite.setTint(0x777777);
  }

  EventBus.emit('notify', `+${data.gold} oro${data.itemId ? ' y un objeto' : ''}`);
}

/** true si `biome` corresponde al interior de una cueva. */
export function isCaveBiome(biome) {
  return biome === BIOME_TYPES.CAVE;
}

// ---------------------------------------------------------------------
// Texturas
// ---------------------------------------------------------------------

export const CAVE_TEX = {
  FLOOR: 'cave_floor',
  WALL: 'cave_wall',
  ENTRANCE: 'cave_entrance',
  EXIT: 'cave_exit',
  CHEST: 'cave_chest'
};

function drawFloor(g) {
  const s = TILE_SIZE;
  g.clear();
  g.fillStyle(0x2a2320, 1);
  g.fillRoundedRect(0, 0, s, s, 3);
  g.fillStyle(0x3a322c, 0.6);
  g.fillCircle(s * 0.3, s * 0.32, s * 0.09);
  g.fillCircle(s * 0.68, s * 0.62, s * 0.07);
  g.fillStyle(0x1b1613, 0.5);
  g.fillCircle(s * 0.62, s * 0.28, s * 0.06);
  g.lineStyle(1, 0x1b1613, 0.4);
  g.strokeRoundedRect(0.5, 0.5, s - 1, s - 1, 3);
  g.generateTexture(CAVE_TEX.FLOOR, s, s);
}

function drawWall(g) {
  const s = TILE_SIZE;
  g.clear();
  g.fillStyle(0x15110f, 1);
  g.fillRoundedRect(0, 0, s, s, 3);
  // relieve simulado: luz arriba-izquierda, sombra abajo-derecha
  g.fillStyle(0x362c26, 0.85);
  g.fillRoundedRect(2, 2, s * 0.4, s * 0.3, 2);
  g.fillStyle(0x000000, 0.35);
  g.fillRoundedRect(s * 0.4, s * 0.55, s * 0.55, s * 0.4, 2);
  g.generateTexture(CAVE_TEX.WALL, s, s);
}

function drawEntrance(g) {
  const s = 40;
  g.clear();
  g.fillStyle(0x6e5a3c, 1);
  g.fillRoundedRect(s * 0.1, s * 0.3, s * 0.8, s * 0.6, 6); // ladera
  g.fillStyle(0x0c0a09, 1);
  g.fillEllipse(s / 2, s * 0.66, s * 0.4, s * 0.42); // boca oscura
  g.fillStyle(0x3a2f22, 0.8);
  g.fillEllipse(s * 0.36, s * 0.42, s * 0.18, s * 0.12); // luz arriba-izq
  g.generateTexture(CAVE_TEX.ENTRANCE, s, s);
}

function drawExit(g) {
  const s = 40;
  g.clear();
  g.fillStyle(0x2a2320, 1);
  g.fillCircle(s / 2, s / 2, s * 0.4);
  g.fillStyle(0xbfe0ff, 0.85);
  g.fillCircle(s / 2, s / 2, s * 0.22);
  g.fillStyle(0xffffff, 0.9);
  g.fillCircle(s * 0.44, s * 0.42, s * 0.08);
  g.generateTexture(CAVE_TEX.EXIT, s, s);
}

function drawChest(g) {
  const s = 34;
  g.clear();
  g.fillStyle(0x3a2416, 1);
  g.fillRoundedRect(s * 0.12, s * 0.42, s * 0.76, s * 0.46, 4);
  g.fillStyle(0x6e4429, 1);
  g.fillRoundedRect(s * 0.14, s * 0.44, s * 0.72, s * 0.4, 3);
  g.fillStyle(0xffcc4d, 0.9);
  g.fillRoundedRect(s * 0.42, s * 0.4, s * 0.16, s * 0.3, 2);
  g.fillStyle(0xfff2c4, 0.9);
  g.fillCircle(s * 0.5, s * 0.5, s * 0.06);
  g.generateTexture(CAVE_TEX.CHEST, s, s);
}

/**
 * Genera todas las texturas de cuevas con `g.generateTexture`. Llamar una
 * vez desde BootScene con el mismo Graphics que genera el resto del juego.
 * @param {Phaser.GameObjects.Graphics} g
 */
export function registerCaveTextures(g) {
  drawFloor(g);
  drawWall(g);
  drawEntrance(g);
  drawExit(g);
  drawChest(g);
}
