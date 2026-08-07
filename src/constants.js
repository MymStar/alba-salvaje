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

// ---- Fase 2: equipo, dioses/altares, rareza de ítems ----

export const EQUIP_SLOTS = {
  WEAPON: 'weapon',
  ARMOR: 'armor',
  ACCESSORY: 'accessory'
};

export const ITEM_RARITY = {
  BASIC: 'basic', // 1-50 oro
  INTERMEDIATE: 'intermediate', // 100-500 oro/diamantes
  LEGENDARY: 'legendary' // 1000 oro + 1000 diamantes
};

export const WEAPON_RANGE = {
  SHORT: 'short',
  MEDIUM: 'medium',
  LONG: 'long'
};

// Los 4 dioses malvados del documento de diseño (partes 169-235).
export const GOD_TYPES = {
  SEA: 'mares',
  WIND: 'vientos',
  QUAKE: 'terremotos',
  VOLCANO: 'volcanes'
};

export const LEVEL_CAP_NORMAL = 100;
export const LEVEL_CAP_GOD = 1000;

// Cuántos altares de un mismo dios hay que destruir para que aparezca el dios (parte 189).
export const ALTARS_TO_SUMMON_GOD = 10;
// Cuántos monstruos elementales hay que derrotar para que aparezca un nuevo altar (parte 198).
export const KILLS_TO_SPAWN_ALTAR = 100;

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
