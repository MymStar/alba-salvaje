// Recolección de recursos (árboles/rocas/vetas de mineral) y demolición de
// construcciones propias (Fase 3, partes 5 y 10 del pedido).
//
// Los nodos de recolección son DETERMINISTAS por chunk, mismo patrón que
// world/altars.js (hash2D propio, sin Math.random, semilla distinta a la de
// altars.js/terrain.js) para que el streaming de chunks pueda preguntar
// "¿qué hay en este chunk?" en cualquier momento y siempre obtener el mismo
// resultado. El feedback visual (parpadeos, variación de recompensa) sí usa
// Math.random, porque no necesita ser reproducible.
//
// Import restringido: solo constants.js, state.js, eventBus.js,
// itemCatalog.js y systems/sound.js (más Phaser). No se toca textureKeys.js:
// las texturas nuevas se generan y registran aquí mismo (ver
// registerGatherTextures), con sus propias claves de string.

import Phaser from 'phaser';
import {
  TILE_SIZE,
  CHUNK_SIZE,
  RESOURCE_TYPES,
  TOOL_TYPES,
  STORAGE_KEYS
} from '../constants.js';
import { GameState, addItem, addGold } from '../state.js';
import { getItem } from '../itemCatalog.js';
import { EventBus } from '../eventBus.js';
import { playSound } from './sound.js';
import { t } from '../i18n.js';

// ---------------------------------------------------------------------
// Texturas propias (generadas por código, sin assets externos). No viven en
// textureKeys.js porque ese archivo no se puede tocar; el integrador puede
// reexportarlas desde ahí más adelante si quiere unificar.
// ---------------------------------------------------------------------

export const GATHER_TEX = {
  TREE: 'gather_tree',
  ROCK: 'gather_rock',
  MINERAL_IRON: 'gather_mineral_iron',
  MINERAL_SILVER: 'gather_mineral_silver',
  MINERAL_GOLD: 'gather_mineral_gold'
};

/**
 * Genera las texturas de árbol/roca/vetas de mineral con Graphics->generateTexture,
 * mismo estilo que BootScene.js. `g` debe ser un Graphics ya creado por quien
 * llama (ej. `scene.make.graphics({ x: 0, y: 0, add: false })`); esta función
 * NO lo destruye, eso es responsabilidad de quien lo creó (para poder seguir
 * dibujando otras texturas con el mismo Graphics).
 * @param {Phaser.GameObjects.Graphics} g
 */
export function registerGatherTextures(g) {
  drawTree(g, GATHER_TEX.TREE);
  drawRock(g, GATHER_TEX.ROCK, 0x9a9a9a, 0x6f6f6f);
  drawMineralRock(g, GATHER_TEX.MINERAL_IRON, 0xb5651d);
  drawMineralRock(g, GATHER_TEX.MINERAL_SILVER, 0xd8d8e0);
  drawMineralRock(g, GATHER_TEX.MINERAL_GOLD, 0xffcc4d);
}

function drawTree(g, key) {
  const s = 40;
  g.clear();
  // tronco
  g.fillStyle(0x6e4429, 1);
  g.fillRoundedRect(s / 2 - 4, s * 0.55, 8, s * 0.4, 2);
  // copa (dos círculos superpuestos para que se vea orgánica, no un círculo perfecto)
  g.fillStyle(0x2f7a45, 1);
  g.fillCircle(s / 2, s * 0.4, s * 0.34);
  g.fillStyle(0x4fae6a, 1);
  g.fillCircle(s / 2 - 6, s * 0.32, s * 0.24);
  g.fillCircle(s / 2 + 7, s * 0.36, s * 0.2);
  g.generateTexture(key, s, s);
}

function drawRock(g, key, body, shade) {
  const s = 32;
  g.clear();
  g.fillStyle(shade, 1);
  g.fillEllipse(s / 2, s * 0.62, s * 0.62, s * 0.4);
  g.fillStyle(body, 1);
  g.fillEllipse(s / 2, s * 0.5, s * 0.56, s * 0.42);
  g.fillStyle(0xffffff, 0.25);
  g.fillEllipse(s * 0.38, s * 0.42, s * 0.18, s * 0.1); // brillo/faceta clara
  g.generateTexture(key, s, s);
}

/** Roca con vetas de mineral (brillo de color) incrustadas. */
function drawMineralRock(g, key, veinColor) {
  const s = 32;
  g.clear();
  g.fillStyle(0x6f6f6f, 1);
  g.fillEllipse(s / 2, s * 0.62, s * 0.62, s * 0.4);
  g.fillStyle(0x8a8a8a, 1);
  g.fillEllipse(s / 2, s * 0.5, s * 0.56, s * 0.42);
  // vetas: un par de trazos + un brillo, en el color del mineral
  g.fillStyle(veinColor, 0.95);
  g.fillCircle(s * 0.38, s * 0.46, 3.2);
  g.fillCircle(s * 0.6, s * 0.56, 2.4);
  g.fillCircle(s * 0.52, s * 0.4, 2);
  g.generateTexture(key, s, s);
}

// ---------------------------------------------------------------------
// Generación determinista de nodos por chunk (mismo patrón que altars.js)
// ---------------------------------------------------------------------

const SEED = 9137; // semilla propia de gathering.js, distinta a la de altars.js (4242)

/** Hash 2D determinista -> pseudoaleatorio en [0, 1). Mismo truco que altars.js. */
function hash2D(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7 + SEED * 0.019) * 43758.5453;
  return s - Math.floor(s);
}

// Hasta 3 "huecos" candidatos a nodo por chunk; cada uno se resuelve a
// árbol/roca/mineral/nada de forma independiente y determinista. Con estas
// probabilidades el promedio ronda ~2 nodos por chunk (mucho más frecuente
// que los altares, que son ~1 cada 12 chunks) para que siempre haya algo
// cerca que recolectar.
const SLOTS_PER_CHUNK = 3;
const TREE_CHANCE = 0.35;
const ROCK_CHANCE = 0.22;
const MINERAL_CHANCE = 0.1;

const TREE_MAX_HITS = 3;
const ROCK_MAX_HITS = 4;
const MINERAL_MAX_HITS = 5;

/**
 * Nodos de recolección (0 a 3) que le corresponden a un chunk, de forma
 * determinista. tileX/tileY son coordenadas de tile ABSOLUTAS del mundo.
 * @param {number} cx
 * @param {number} cy
 * @returns {{id:string, kind:'tree'|'rock'|'mineral', tool:string, tileX:number, tileY:number, maxHits:number, mineralType?:string}[]}
 */
export function getResourceNodesForChunk(cx, cy) {
  const nodes = [];

  for (let i = 0; i < SLOTS_PER_CHUNK; i++) {
    const base = i * 7; // separa los hashes de cada slot para que no queden correlacionados
    const kindRoll = hash2D(cx * 31 + base, cy * 17 - base);

    let kind = null;
    if (kindRoll < TREE_CHANCE) kind = 'tree';
    else if (kindRoll < TREE_CHANCE + ROCK_CHANCE) kind = 'rock';
    else if (kindRoll < TREE_CHANCE + ROCK_CHANCE + MINERAL_CHANCE) kind = 'mineral';
    if (!kind) continue;

    const xRoll = hash2D(cx + 500 + base, cy - 500 - base);
    const yRoll = hash2D(cx - 500 - base, cy + 500 + base);
    const localX = Math.floor(xRoll * CHUNK_SIZE);
    const localY = Math.floor(yRoll * CHUNK_SIZE);
    const tileX = cx * CHUNK_SIZE + localX;
    const tileY = cy * CHUNK_SIZE + localY;

    const hitsRoll = hash2D(cx + 900 + base, cy - 900 - base);

    if (kind === 'tree') {
      nodes.push({
        id: `tree_${cx}_${cy}_${i}`,
        kind,
        tool: TOOL_TYPES.AXE,
        tileX,
        tileY,
        maxHits: TREE_MAX_HITS + Math.floor(hitsRoll * 2)
      });
    } else if (kind === 'rock') {
      nodes.push({
        id: `rock_${cx}_${cy}_${i}`,
        kind,
        tool: TOOL_TYPES.PICKAXE,
        tileX,
        tileY,
        maxHits: ROCK_MAX_HITS + Math.floor(hitsRoll * 2)
      });
    } else {
      const mineralRoll = hash2D(cx + 1300 + base, cy - 1300 - base);
      const mineralType = mineralRoll < 0.55 ? 'iron' : mineralRoll < 0.85 ? 'silver' : 'gold';
      nodes.push({
        id: `mineral_${cx}_${cy}_${i}`,
        kind,
        tool: TOOL_TYPES.PICKAXE,
        tileX,
        tileY,
        maxHits: MINERAL_MAX_HITS + Math.floor(hitsRoll * 2),
        mineralType
      });
    }
  }

  return nodes;
}

const MINERAL_TEX_BY_TYPE = {
  iron: GATHER_TEX.MINERAL_IRON,
  silver: GATHER_TEX.MINERAL_SILVER,
  gold: GATHER_TEX.MINERAL_GOLD
};

function textureForNode(nodeData) {
  if (nodeData.kind === 'tree') return GATHER_TEX.TREE;
  if (nodeData.kind === 'rock') return GATHER_TEX.ROCK;
  return MINERAL_TEX_BY_TYPE[nodeData.mineralType] ?? GATHER_TEX.MINERAL_IRON;
}

/**
 * Crea el sprite visual de un nodo de recolección ya existente/generado.
 * Decisión: se crea como cuerpo físico ESTÁTICO (bloquea un poco el paso,
 * como un árbol o una roca real), igual que las construcciones en
 * world/chunkStore.js. Guarda los datos del nodo en `sprite.nodeData`
 * (con `hitsLeft` inicializado a `maxHits`) para que tryGather() los use.
 * @param {Phaser.Scene} scene
 * @param {{id:string, kind:string, tool:string, tileX:number, tileY:number, maxHits:number, mineralType?:string}} nodeData
 * @returns {Phaser.GameObjects.Sprite}
 */
export function spawnResourceNodeSprite(scene, nodeData) {
  const x = nodeData.tileX * TILE_SIZE + TILE_SIZE / 2;
  const y = nodeData.tileY * TILE_SIZE + TILE_SIZE / 2;

  scene.resourceNodesGroup ??= scene.physics.add.staticGroup();
  const sprite = scene.resourceNodesGroup.create(x, y, textureForNode(nodeData));
  sprite.setDepth(y);
  sprite.refreshBody();

  sprite.nodeData = { ...nodeData, hitsLeft: nodeData.maxHits };
  return sprite;
}

// ---------------------------------------------------------------------
// Recolección (tecla F, la conecta el integrador en WorldScene)
// ---------------------------------------------------------------------

const GATHER_RANGE = 40;

/** Busca en scene.loadedChunks el nodo activo más cercano dentro de `range` px. */
function findNearestNode(scene, player, range) {
  if (!scene.loadedChunks) return null;
  let nearest = null;
  let nearestDist = range;
  for (const chunk of scene.loadedChunks.values()) {
    const sprites = chunk?.resourceNodeSprites;
    if (!sprites) continue;
    for (const sprite of sprites) {
      if (!sprite?.active || !sprite.nodeData || sprite.nodeData.hitsLeft <= 0) continue;
      const d = Phaser.Math.Distance.Between(player.x, player.y, sprite.x, sprite.y);
      if (d <= nearestDist) {
        nearest = sprite;
        nearestDist = d;
      }
    }
  }
  return nearest;
}

/** Otorga los recursos correspondientes cuando un nodo se agota. */
function grantNodeRewards(nodeData) {
  if (nodeData.kind === 'tree') {
    addItem(RESOURCE_TYPES.WOOD, Phaser.Math.Between(2, 4));
    if (Math.random() < 0.4) addItem(RESOURCE_TYPES.FIBER, 1);
  } else if (nodeData.kind === 'rock') {
    addItem(RESOURCE_TYPES.STONE, Phaser.Math.Between(2, 4));
  } else if (nodeData.kind === 'mineral') {
    addItem(RESOURCE_TYPES.ORE, Phaser.Math.Between(1, 3));
    if (nodeData.mineralType === 'gold') addGold(Phaser.Math.Between(15, 40));
    else if (Math.random() < 0.3) addGold(Phaser.Math.Between(3, 10));
  }
}

/** Golpe breve de feedback visual (flash blanco) sin alterar el tinte final del nodo. */
function flashHit(scene, sprite) {
  if (!sprite.active) return;
  sprite.setTintFill(0xffffff);
  scene.time.delayedCall(80, () => {
    if (sprite.active) sprite.clearTint();
  });
}

/**
 * Intenta recolectar del nodo más cercano (árbol/roca/mineral) con la
 * herramienta equipada. Llamar desde el integrador con una tecla nueva (ej. F).
 * @param {Phaser.Scene} scene WorldScene activa (debe tener `loadedChunks`)
 * @param {Phaser.GameObjects.Sprite} player
 * @returns {boolean} true si golpeó un nodo con la herramienta correcta
 */
export function tryGather(scene, player) {
  const nodeSprite = findNearestNode(scene, player, GATHER_RANGE);
  if (!nodeSprite) return false;

  const nodeData = nodeSprite.nodeData;
  const toolId = GameState.equipment.tool;
  const toolItem = toolId ? getItem(toolId) : null;
  const toolType = toolItem?.toolType;

  if (!toolType || toolType !== nodeData.tool) {
    EventBus.emit('notify', t('notify.needTool'));
    return false;
  }

  nodeData.hitsLeft -= 1;
  playSound('hit');
  flashHit(scene, nodeSprite);

  if (nodeData.hitsLeft <= 0) {
    grantNodeRewards(nodeData);
    EventBus.emit('notify', t('notify.gathered'));
    if (scene.tweens) {
      scene.tweens.add({
        targets: nodeSprite,
        alpha: 0,
        scale: 0.3,
        duration: 300,
        onComplete: () => nodeSprite.destroy()
      });
    } else {
      nodeSprite.destroy();
    }
  }

  return true;
}

// ---------------------------------------------------------------------
// Demolición de construcciones propias (tecla X, la conecta el integrador)
// ---------------------------------------------------------------------

const DESTROY_RANGE = 40;

/** A qué chunk pertenece una coordenada de tile absoluta (igual que chunkStore.js). */
function tileToChunk(tileCoord) {
  return Math.floor(tileCoord / CHUNK_SIZE);
}

/** Lee el array de construcciones guardadas de un chunk directo de localStorage. */
function readChunkBuildingsRaw(cx, cy) {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WORLD_PREFIX + cx + '_' + cy);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('No se pudo leer el chunk para demoler, se asume vacío.', e);
    return [];
  }
}

function writeChunkBuildingsRaw(cx, cy, list) {
  try {
    localStorage.setItem(STORAGE_KEYS.WORLD_PREFIX + cx + '_' + cy, JSON.stringify(list));
  } catch (e) {
    console.warn('No se pudo guardar el chunk tras demoler.', e);
  }
}

/**
 * Intenta demoler la construcción propia más cercana (requiere martillo
 * equipado). Reescribe a mano la MISMA clave de localStorage que usa
 * world/chunkStore.js (STORAGE_KEYS.WORLD_PREFIX + "cx_cy" -> array JSON
 * [{x,y,type}, ...]), sin importar nada de ese módulo. Llamar desde el
 * integrador con una tecla nueva (ej. X).
 * @param {Phaser.Scene} scene WorldScene activa (debe tener `buildingsGroup`)
 * @param {Phaser.GameObjects.Sprite} player
 * @returns {boolean} true si demolió una construcción
 */
export function tryDestroyStructure(scene, player) {
  const toolId = GameState.equipment.tool;
  const toolItem = toolId ? getItem(toolId) : null;
  if (toolItem?.toolType !== TOOL_TYPES.HAMMER) {
    EventBus.emit('notify', t('notify.needTool'));
    return false;
  }

  const group = scene.buildingsGroup;
  if (!group) {
    EventBus.emit('notify', t('notify.structureDestroyed'));
    return false;
  }

  let nearest = null;
  let nearestDist = DESTROY_RANGE;
  group.getChildren().slice().forEach((sprite) => {
    if (!sprite.active) return;
    const d = Phaser.Math.Distance.Between(player.x, player.y, sprite.x, sprite.y);
    if (d <= nearestDist) {
      nearest = sprite;
      nearestDist = d;
    }
  });

  if (!nearest) {
    EventBus.emit('notify', t('notify.structureDestroyed'));
    return false;
  }

  const tileX = Math.floor(nearest.x / TILE_SIZE);
  const tileY = Math.floor(nearest.y / TILE_SIZE);
  const cx = tileToChunk(tileX);
  const cy = tileToChunk(tileY);

  const list = readChunkBuildingsRaw(cx, cy);
  const idx = list.findIndex((b) => b.x === tileX && b.y === tileY);
  if (idx !== -1) list.splice(idx, 1);
  writeChunkBuildingsRaw(cx, cy, list); // si queda vacío igual se guarda '[]', no se borra la clave

  // Reembolso simplificado (parte 10 del pedido: "aceptable simplificar"):
  // ~50% de un costo típico de 2-3 madera -> 1 madera siempre, 2ª con 50% de chance.
  addItem(RESOURCE_TYPES.WOOD, 1);
  if (Math.random() < 0.5) addItem(RESOURCE_TYPES.WOOD, 1);

  playSound('build');
  if (scene.tweens) {
    scene.tweens.add({
      targets: nearest,
      alpha: 0,
      scale: 0.3,
      angle: 45,
      duration: 300,
      onComplete: () => nearest.destroy()
    });
  } else {
    nearest.destroy();
  }

  EventBus.emit('notify', t('notify.structureDestroyed'));
  return true;
}
