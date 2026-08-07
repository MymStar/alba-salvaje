// Constantes compartidas por todo el juego.
// Cualquier módulo puede importar de aquí; evita duplicar "números mágicos".

export const TILE_SIZE = 32;
export const CHUNK_SIZE = 16; // tiles por lado de cada "chunk" del mundo
export const RENDER_CHUNK_RADIUS = 2; // cuántos chunks alrededor del jugador se mantienen cargados

export const DAY_LENGTH_MS = 3 * 60 * 1000; // 3 min de día
export const NIGHT_LENGTH_MS = 2 * 60 * 1000; // 2 min de noche

export const PLAYER_SPEED = 160;

export const TILE_TYPES = {
  GRASS: 'grass',
  SAND: 'sand',
  WATER: 'water',
  STONE: 'stone',
  DIRT: 'dirt'
};

export const RESOURCE_TYPES = {
  WOOD: 'wood',
  STONE: 'stone',
  FIBER: 'fiber',
  FOOD_FRUIT: 'food_fruit',
  FOOD_MEAT: 'food_meat',
  CRYSTAL: 'crystal'
};

export const BUILDABLE_TYPES = {
  WALL_WOOD: 'wall_wood',
  FARM_PLOT: 'farm_plot',
  DOOR: 'door'
};

export const CURRENCY = {
  GOLD: 'gold',
  GEMS: 'gems'
};

// Paleta de colores (día vivo / noche fría), usada por el mundo y la UI.
export const PALETTE = {
  dayTint: 0xffffff,
  nightTint: 0x2a3a66,
  grass: 0x5cb85c,
  grassAlt: 0x4ea34e,
  sand: 0xe0c68a,
  water: 0x3f8fd6,
  stone: 0x9a9a9a,
  dirt: 0x8a5a3c,
  uiBg: 0x14181f,
  uiAccent: 0xffcc4d,
  hp: 0xe0473f,
  energy: 0x4fc3f7,
  hunger: 0xf2a93b,
  xp: 0x8bd450
};

export const STORAGE_KEYS = {
  SAVE: 'alba_salvaje_save_v1',
  WORLD_PREFIX: 'alba_salvaje_chunk_'
};

export const GAME_TITLE = 'Alba Salvaje';
