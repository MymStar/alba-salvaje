// Constantes compartidas por todo el juego.
// Cualquier módulo puede importar de aquí; evita duplicar "números mágicos".

export const TILE_SIZE = 32;
export const CHUNK_SIZE = 16; // tiles por lado de cada "chunk" del mundo
export const RENDER_CHUNK_RADIUS = 2; // cuántos chunks alrededor del jugador se mantienen cargados

// Fase 3 (parte 12 del pedido del usuario, 2026-08-08): día y noche duran
// 10 minutos cada uno.
export const DAY_LENGTH_MS = 10 * 60 * 1000;
export const NIGHT_LENGTH_MS = 10 * 60 * 1000;
// Cuántas fases lunares distintas se ven de noche (como en Terraria), en ciclo.
export const MOON_PHASES = 8;

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
  CRYSTAL: 'crystal',
  ORE: 'ore' // Fase 3 (parte 10): minerales recogidos con pico en rocas/cuevas
};

export const BUILDABLE_TYPES = {
  WALL_WOOD: 'wall_wood',
  FARM_PLOT: 'farm_plot',
  DOOR: 'door',
  CAMPFIRE: 'campfire' // Fase 3 (parte 13): ilumina de noche/cuevas
};

export const CURRENCY = {
  GOLD: 'gold',
  GEMS: 'gems'
};

// ---- Fase 2: equipo, dioses/altares, rareza de ítems ----

export const EQUIP_SLOTS = {
  WEAPON: 'weapon',
  ARMOR: 'armor',
  ACCESSORY: 'accessory',
  TOOL: 'tool' // Fase 3: pico/hacha/martillo (ver TOOL_TYPES)
};

// Fase 3: herramientas para recolectar recursos golpeando árboles/rocas/minerales.
export const TOOL_TYPES = {
  PICKAXE: 'pickaxe', // roca/minerales
  AXE: 'axe', // árboles/madera
  HAMMER: 'hammer' // demoler estructuras propias
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

// Fase 3 (parte 4 del pedido): alcance real en píxeles según el tipo de
// arma equipada, usado tanto por el ataque del jugador como por el sprite
// del arma visible/animada (ver entities/weaponVisual.js).
export const WEAPON_RANGE_PX = {
  [WEAPON_RANGE.SHORT]: 34,
  [WEAPON_RANGE.MEDIUM]: 72,
  [WEAPON_RANGE.LONG]: 130
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
  SAVE: 'alba_salvaje_save_v1', // ya no se usa directo (ver STORAGE_KEYS.SLOTS), se conserva por migración
  WORLD_PREFIX: 'alba_salvaje_chunk_',
  // Fase 3 (parte 1 del pedido): varios personajes independientes. `SLOTS`
  // guarda el índice { ids:[...], activeId }, y cada personaje se guarda
  // aparte bajo `SLOT_PREFIX + id` (mismo shape que el guardado viejo).
  SLOTS: 'alba_salvaje_slots_v1',
  SLOT_PREFIX: 'alba_salvaje_char_'
};

export const GAME_TITLE = 'Alba Salvaje';

// ---- Fase 3 (2026-08-08): personajes, crecimiento, mundo vivo ----
// Ver pron de juego.rtf y la conversación del 2026-08-08 para el pedido
// completo (14 puntos). Todo lo de aquí abajo es contrato compartido para
// los módulos nuevos de world/entities/systems.

export const GENDER = {
  MALE: 'male',
  FEMALE: 'female'
};

export const MAX_CHARACTER_SLOTS = 6;

// Etapas visuales del personaje (parte 8): empieza "bebé" (sin brazos/piernas
// visibles) y va ganando extremidades hasta volverse adulto. El nivel exacto
// de corte está en GROWTH_LEVEL_THRESHOLDS (recorrer de mayor a menor nivel).
export const GROWTH_STAGES = {
  BABY: 'baby',
  CHILD: 'child',
  TEEN: 'teen',
  ADULT: 'adult'
};

export const GROWTH_LEVEL_THRESHOLDS = [
  { stage: GROWTH_STAGES.ADULT, minLevel: 50 },
  { stage: GROWTH_STAGES.TEEN, minLevel: 25 },
  { stage: GROWTH_STAGES.CHILD, minLevel: 10 },
  { stage: GROWTH_STAGES.BABY, minLevel: 1 }
];

/** Etapa visual que corresponde a un nivel dado (parte 8). */
export function getGrowthStageForLevel(level) {
  const found = GROWTH_LEVEL_THRESHOLDS.find((t) => level >= t.minLevel);
  return found ? found.stage : GROWTH_STAGES.BABY;
}

// Biomas del mundo (parte 14): capa determinista de MUY baja frecuencia,
// independiente del terreno tile-a-tile de world/terrain.js. Decide
// decoración (árboles/arbustos/flores), densidad de monstruos y dónde
// pueden aparecer entradas de cueva.
export const BIOME_TYPES = {
  PLAINS: 'plains',
  FOREST: 'forest',
  DESERT: 'desert',
  HILLS: 'hills',
  FLOWER_FIELD: 'flower_field',
  BUSHLAND: 'bushland',
  CAVE: 'cave' // interior de cueva (ver world/caves.js)
};

// Fase 3 (parte 14): el interior de las cuevas se genera en una región del
// mundo MUY alejada de la superficie (mismo sistema de chunks/streaming,
// reutilizado), para no tener que mantener una escena separada. Cada
// entrada de cueva en superficie tiene asignada una región única empezando
// en (CAVE_WORLD_OFFSET + hash, CAVE_WORLD_OFFSET + hash) en tiles.
export const CAVE_WORLD_OFFSET = 2_000_000;
