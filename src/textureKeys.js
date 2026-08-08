// Claves de texturas generadas proceduralmente en BootScene.js (sin assets
// externos: mantiene el juego ligero, tal como pide el documento de diseño).
// World/Entities/UI importan de aquí para no usar strings sueltos.

export const TEX = {
  TILE_GRASS: 'tile_grass',
  TILE_GRASS_ALT: 'tile_grass_alt',
  TILE_SAND: 'tile_sand',
  TILE_WATER: 'tile_water',
  TILE_DIRT: 'tile_dirt',
  TILE_STONE: 'tile_stone',

  PLAYER_GUERRERO: 'player_guerrero',
  PLAYER_EXPLORADORA: 'player_exploradora',
  PLAYER_MAGO: 'player_mago',

  PLANT_HOSTILE: 'enemy_plant_hostile',
  PLANT_ALLY: 'enemy_plant_ally',
  ZOMBIE: 'enemy_zombie',
  SPECTRE: 'enemy_spectre',

  BUILD_WALL_WOOD: 'build_wall_wood',
  BUILD_FARM_PLOT: 'build_farm_plot',
  BUILD_DOOR: 'build_door',
  BUILD_CAMPFIRE_ICON: 'build_campfire_icon', // icono para el menú de construcción (la fogata real la dibuja world/campfire.js)

  ICON_WOOD: 'icon_wood',
  ICON_STONE: 'icon_stone',
  ICON_FIBER: 'icon_fiber',
  ICON_FOOD_FRUIT: 'icon_food_fruit',
  ICON_FOOD_MEAT: 'icon_food_meat',
  ICON_CRYSTAL: 'icon_crystal',
  ICON_GOLD: 'icon_gold',
  ICON_GEM: 'icon_gem',

  // ---- Fase 2: equipo ----
  ICON_SWORD: 'icon_sword',
  ICON_BOW: 'icon_bow',
  ICON_STAFF: 'icon_staff',
  ICON_ARMOR_LIGHT: 'icon_armor_light',
  ICON_ARMOR_HEAVY: 'icon_armor_heavy',
  ICON_ROBE: 'icon_robe',
  ICON_RING: 'icon_ring',
  ICON_BOOTS: 'icon_boots',
  ICON_AMULET: 'icon_amulet',
  ICON_PICKAXE: 'icon_pickaxe',
  ICON_AXE: 'icon_axe',
  ICON_HAMMER: 'icon_hammer',

  // ---- Fase 2: dioses, altares, jefes ----
  ALTAR: 'altar',
  GOD_SEA: 'god_sea',
  GOD_WIND: 'god_wind',
  GOD_QUAKE: 'god_quake',
  GOD_VOLCANO: 'god_volcano',
  CRYSTAL_NODE: 'crystal_node',

  // ---- Fase 2: hechizos (efectos visuales simples) ----
  FX_FIREBALL: 'fx_fireball',
  FX_HEAL: 'fx_heal',
  FX_SHIELD: 'fx_shield'
};
