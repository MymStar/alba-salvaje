// Persistencia de construcciones colocadas, por chunk.
// El terreno NO se guarda (es determinista, ver world/terrain.js); solo lo
// que el jugador construye encima necesita sobrevivir a un recargue.

import { STORAGE_KEYS, TILE_SIZE, CHUNK_SIZE, BUILDABLE_TYPES, RESOURCE_TYPES } from '../constants.js';
import { TEX } from '../textureKeys.js';
import { EventBus } from '../eventBus.js';
import { hasItem, removeItem } from '../state.js';
import { t } from '../i18n.js';
import { playSound } from '../systems/sound.js';

/** Clave de texto única para un chunk, usada como sufijo de localStorage y como id en memoria. */
export function getChunkKey(cx, cy) {
  return `${cx}_${cy}`;
}

/** Costo en recursos de cada tipo de construcción (tabla propia de este módulo). */
const BUILD_COSTS = {
  [BUILDABLE_TYPES.WALL_WOOD]: [{ type: RESOURCE_TYPES.WOOD, qty: 3 }],
  [BUILDABLE_TYPES.FARM_PLOT]: [
    { type: RESOURCE_TYPES.WOOD, qty: 2 },
    { type: RESOURCE_TYPES.FIBER, qty: 1 }
  ],
  [BUILDABLE_TYPES.DOOR]: [{ type: RESOURCE_TYPES.WOOD, qty: 2 }]
};

// Textura a usar por cada tipo de construcción.
const BUILD_TEXTURES = {
  [BUILDABLE_TYPES.WALL_WOOD]: TEX.BUILD_WALL_WOOD,
  [BUILDABLE_TYPES.FARM_PLOT]: TEX.BUILD_FARM_PLOT,
  [BUILDABLE_TYPES.DOOR]: TEX.BUILD_DOOR
};

/** Lee del localStorage las construcciones guardadas de un chunk. [] si no hay nada. */
export function loadChunkBuildings(cx, cy) {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WORLD_PREFIX + getChunkKey(cx, cy));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('No se pudo leer el chunk guardado, se asume vacío.', e);
    return [];
  }
}

/** Escribe en localStorage el array de construcciones de un chunk. */
export function saveChunkBuildings(cx, cy, buildingsArray) {
  try {
    localStorage.setItem(
      STORAGE_KEYS.WORLD_PREFIX + getChunkKey(cx, cy),
      JSON.stringify(buildingsArray)
    );
  } catch (e) {
    console.warn('No se pudo guardar el chunk.', e);
  }
}

/** A qué chunk pertenece una coordenada de tile absoluta. */
function tileToChunk(tileCoord) {
  return Math.floor(tileCoord / CHUNK_SIZE);
}

/** Crea el sprite físico estático de una construcción y lo añade al grupo del mundo. */
function spawnBuildingSprite(scene, worldTileX, worldTileY, buildType) {
  scene.buildingsGroup ??= scene.physics.add.staticGroup();

  const texture = BUILD_TEXTURES[buildType] ?? TEX.BUILD_WALL_WOOD;
  const x = worldTileX * TILE_SIZE + TILE_SIZE / 2;
  const y = worldTileY * TILE_SIZE + TILE_SIZE / 2;

  const sprite = scene.buildingsGroup.create(x, y, texture);
  sprite.setDepth(y); // pseudo-profundidad: lo de más abajo se dibuja encima
  sprite.refreshBody();

  return sprite;
}

/**
 * Intenta construir en (worldTileX, worldTileY): cobra recursos, crea el
 * sprite, persiste el cambio en el chunk correspondiente y notifica al HUD.
 * Si faltan recursos, solo notifica y no hace nada más.
 */
export function placeBuilding(scene, worldTileX, worldTileY, buildType) {
  const cost = BUILD_COSTS[buildType];
  if (!cost) {
    console.warn(`Tipo de construcción desconocido: ${buildType}`);
    return null;
  }

  const canAfford = cost.every((c) => hasItem(c.type, c.qty));
  if (!canAfford) {
    EventBus.emit('notify', t('notify.insufficientResources'));
    return null;
  }

  cost.forEach((c) => removeItem(c.type, c.qty));

  const sprite = spawnBuildingSprite(scene, worldTileX, worldTileY, buildType);

  const cx = tileToChunk(worldTileX);
  const cy = tileToChunk(worldTileY);
  const buildings = loadChunkBuildings(cx, cy);
  buildings.push({ x: worldTileX, y: worldTileY, type: buildType });
  saveChunkBuildings(cx, cy, buildings);

  playSound('build');
  EventBus.emit('notify', t('notify.built'));
  return sprite;
}

/**
 * Recrea visualmente una construcción ya guardada (al cargar un chunk que
 * entra en pantalla). No cobra recursos ni vuelve a guardar: el dato ya
 * existía en localStorage. Devuelve el sprite creado para que quien la
 * invoque (streaming de chunks en WorldScene) pueda destruirlo si el chunk
 * vuelve a salir del radio de carga.
 */
export function spawnExistingBuilding(scene, buildingData) {
  return spawnBuildingSprite(scene, buildingData.x, buildingData.y, buildingData.type);
}
