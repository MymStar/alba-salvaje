// Catálogo de monstruos genéricos (Fase 3, partes 3 y 9 del pedido del
// usuario): más de 50 tipos distintos, agrupados en familias, para que
// aparezcan con más variedad y frecuencia que los antiguos Zombie/PlantEnemy
// fijos. Cada entrada es puro dato: la textura se genera en
// monsterTextures.js combinando `shape` x `palette`, y el comportamiento en
// combate lo interpreta entities/Monster.js combinando estos números con el
// nivel del monstruo.
//
// No se importa nada de aquí salvo BIOME_TYPES (constants.js), como pide el
// integrador.

import { BIOME_TYPES } from '../constants.js';

/**
 * @typedef {Object} MonsterDef
 * @property {string} id
 * @property {string} family
 * @property {'day'|'night'|'any'} dayPhase
 * @property {string[]} biomes
 * @property {boolean} caveOnly
 * @property {number} minLevel
 * @property {number} maxLevel
 * @property {number} baseHp
 * @property {number} hpPerLevel
 * @property {number} baseDmg
 * @property {number} dmgPerLevel
 * @property {number} speed
 * @property {number} aggroRange
 * @property {number} attackRange
 * @property {number} xpBase
 * @property {number} xpPerLevel
 * @property {boolean} tamable
 * @property {boolean} hasWeapon
 * @property {{body:number, shade:number, accent:number}} palette
 * @property {'blob'|'tall'|'wide'|'spiky'|'winged'|'serpentine'|'humanoid'} shape
 */

const ANY_BIOME = ['any'];
const B = BIOME_TYPES;

/** @type {MonsterDef[]} */
export const MONSTERS = [
  // ---------------- UNDEAD (8) ----------------
  {
    id: 'zombie_common', family: 'undead', dayPhase: 'night', biomes: ANY_BIOME, caveOnly: false,
    minLevel: 1, maxLevel: 15, baseHp: 40, hpPerLevel: 4, baseDmg: 8, dmgPerLevel: 0.6,
    speed: 95, aggroRange: 180, attackRange: 26, xpBase: 15, xpPerLevel: 1.5,
    tamable: false, hasWeapon: false,
    palette: { body: 0x6f8f4f, shade: 0x3f5a2f, accent: 0xffffff }, shape: 'blob'
  },
  {
    id: 'zombie_putrido', family: 'undead', dayPhase: 'night', biomes: [B.PLAINS, B.FOREST], caveOnly: false,
    minLevel: 5, maxLevel: 22, baseHp: 55, hpPerLevel: 5, baseDmg: 10, dmgPerLevel: 0.8,
    speed: 80, aggroRange: 190, attackRange: 26, xpBase: 20, xpPerLevel: 1.7,
    tamable: false, hasWeapon: false,
    palette: { body: 0x4f6f3f, shade: 0x2a3f1f, accent: 0x9fff9f }, shape: 'blob'
  },
  {
    id: 'esqueleto_guerrero', family: 'undead', dayPhase: 'night', biomes: ANY_BIOME, caveOnly: false,
    minLevel: 8, maxLevel: 30, baseHp: 45, hpPerLevel: 5, baseDmg: 11, dmgPerLevel: 1,
    speed: 100, aggroRange: 200, attackRange: 30, xpBase: 22, xpPerLevel: 2,
    tamable: false, hasWeapon: true,
    palette: { body: 0xe0dcc8, shade: 0x8f8a70, accent: 0x1a1a1a }, shape: 'humanoid'
  },
  {
    id: 'esqueleto_arquero', family: 'undead', dayPhase: 'any', biomes: [], caveOnly: true,
    minLevel: 10, maxLevel: 35, baseHp: 35, hpPerLevel: 4, baseDmg: 13, dmgPerLevel: 1.1,
    speed: 90, aggroRange: 220, attackRange: 30, xpBase: 24, xpPerLevel: 2.1,
    tamable: false, hasWeapon: true,
    palette: { body: 0xcfc9ae, shade: 0x76715a, accent: 0x2a2a2a }, shape: 'humanoid'
  },
  {
    id: 'espectro', family: 'undead', dayPhase: 'night', biomes: ANY_BIOME, caveOnly: false,
    minLevel: 6, maxLevel: 25, baseHp: 30, hpPerLevel: 3.5, baseDmg: 9, dmgPerLevel: 0.9,
    speed: 110, aggroRange: 210, attackRange: 24, xpBase: 18, xpPerLevel: 1.8,
    tamable: false, hasWeapon: false,
    palette: { body: 0x8a6fd9, shade: 0x4a3a8f, accent: 0xffffff }, shape: 'winged'
  },
  {
    id: 'alma_en_pena', family: 'undead', dayPhase: 'night', biomes: [B.HILLS, B.PLAINS], caveOnly: false,
    minLevel: 15, maxLevel: 40, baseHp: 38, hpPerLevel: 4.2, baseDmg: 12, dmgPerLevel: 1.1,
    speed: 105, aggroRange: 220, attackRange: 26, xpBase: 26, xpPerLevel: 2.2,
    tamable: false, hasWeapon: false,
    palette: { body: 0xa08fe0, shade: 0x554a8f, accent: 0xd9d9ff }, shape: 'winged'
  },
  {
    id: 'ghoul_cueva', family: 'undead', dayPhase: 'any', biomes: [], caveOnly: true,
    minLevel: 12, maxLevel: 38, baseHp: 60, hpPerLevel: 6, baseDmg: 14, dmgPerLevel: 1.3,
    speed: 100, aggroRange: 190, attackRange: 28, xpBase: 28, xpPerLevel: 2.3,
    tamable: false, hasWeapon: false,
    palette: { body: 0x5a6f4f, shade: 0x2f3f22, accent: 0xe0e070 }, shape: 'spiky'
  },
  {
    id: 'caballero_caido', family: 'undead', dayPhase: 'night', biomes: [B.HILLS, B.FOREST], caveOnly: false,
    minLevel: 25, maxLevel: 55, baseHp: 90, hpPerLevel: 8, baseDmg: 18, dmgPerLevel: 1.6,
    speed: 85, aggroRange: 200, attackRange: 32, xpBase: 40, xpPerLevel: 3,
    tamable: false, hasWeapon: true,
    palette: { body: 0x556070, shade: 0x2a3038, accent: 0x8fd9ff }, shape: 'humanoid'
  },

  // ---------------- PLANT (8) ----------------
  {
    id: 'planta_hostil_comun', family: 'plant', dayPhase: 'any', biomes: [B.FOREST, B.PLAINS, B.BUSHLAND], caveOnly: false,
    minLevel: 1, maxLevel: 12, baseHp: 20, hpPerLevel: 2.5, baseDmg: 4, dmgPerLevel: 0.4,
    speed: 55, aggroRange: 180, attackRange: 26, xpBase: 8, xpPerLevel: 1,
    tamable: false, hasWeapon: false,
    palette: { body: 0xb23a3a, shade: 0x6e1f1f, accent: 0x1a1a1a }, shape: 'blob'
  },
  {
    id: 'flor_amistosa', family: 'plant', dayPhase: 'day', biomes: [B.FLOWER_FIELD, B.PLAINS], caveOnly: false,
    minLevel: 1, maxLevel: 10, baseHp: 14, hpPerLevel: 1.5, baseDmg: 2, dmgPerLevel: 0.2,
    speed: 30, aggroRange: 90, attackRange: 20, xpBase: 5, xpPerLevel: 0.6,
    tamable: true, hasWeapon: false,
    palette: { body: 0xe07fbf, shade: 0x8f3f6a, accent: 0xffffff }, shape: 'blob'
  },
  {
    id: 'brote_dormido', family: 'plant', dayPhase: 'any', biomes: [B.FOREST, B.BUSHLAND], caveOnly: false,
    minLevel: 1, maxLevel: 8, baseHp: 16, hpPerLevel: 1.6, baseDmg: 3, dmgPerLevel: 0.3,
    speed: 25, aggroRange: 80, attackRange: 18, xpBase: 6, xpPerLevel: 0.7,
    tamable: true, hasWeapon: false,
    palette: { body: 0x6fd98a, shade: 0x2f7a45, accent: 0xffe27a }, shape: 'blob'
  },
  {
    id: 'planta_carnivora', family: 'plant', dayPhase: 'any', biomes: [B.FOREST, B.BUSHLAND], caveOnly: false,
    minLevel: 6, maxLevel: 24, baseHp: 42, hpPerLevel: 4.5, baseDmg: 10, dmgPerLevel: 1,
    speed: 40, aggroRange: 150, attackRange: 32, xpBase: 18, xpPerLevel: 1.9,
    tamable: false, hasWeapon: false,
    palette: { body: 0x8f2f5a, shade: 0x4a1530, accent: 0xffffff }, shape: 'spiky'
  },
  {
    id: 'zarza_furiosa', family: 'plant', dayPhase: 'any', biomes: [B.BUSHLAND, B.HILLS], caveOnly: false,
    minLevel: 10, maxLevel: 30, baseHp: 48, hpPerLevel: 5, baseDmg: 12, dmgPerLevel: 1.1,
    speed: 45, aggroRange: 160, attackRange: 30, xpBase: 20, xpPerLevel: 2,
    tamable: false, hasWeapon: false,
    palette: { body: 0x5a7a2f, shade: 0x2f4015, accent: 0x8a3a1f }, shape: 'spiky'
  },
  {
    id: 'cactus_furioso', family: 'plant', dayPhase: 'day', biomes: [B.DESERT], caveOnly: false,
    minLevel: 3, maxLevel: 18, baseHp: 34, hpPerLevel: 3.6, baseDmg: 9, dmgPerLevel: 0.9,
    speed: 35, aggroRange: 140, attackRange: 28, xpBase: 14, xpPerLevel: 1.4,
    tamable: false, hasWeapon: false,
    palette: { body: 0x4f9a5a, shade: 0x276030, accent: 0xe0c68a }, shape: 'spiky'
  },
  {
    id: 'lirio_susurrante', family: 'plant', dayPhase: 'night', biomes: [B.FLOWER_FIELD], caveOnly: false,
    minLevel: 8, maxLevel: 26, baseHp: 30, hpPerLevel: 3, baseDmg: 8, dmgPerLevel: 0.8,
    speed: 50, aggroRange: 170, attackRange: 26, xpBase: 16, xpPerLevel: 1.6,
    tamable: true, hasWeapon: false,
    palette: { body: 0xbfa0ff, shade: 0x6f4fae, accent: 0xffffff }, shape: 'blob'
  },
  {
    id: 'hongo_gigante', family: 'plant', dayPhase: 'any', biomes: [], caveOnly: true,
    minLevel: 10, maxLevel: 32, baseHp: 50, hpPerLevel: 5.2, baseDmg: 11, dmgPerLevel: 1.05,
    speed: 40, aggroRange: 150, attackRange: 30, xpBase: 22, xpPerLevel: 2.1,
    tamable: false, hasWeapon: false,
    palette: { body: 0xd97a4f, shade: 0x7a3f22, accent: 0xfff2c9 }, shape: 'wide'
  },

  // ---------------- BEAST (8) ----------------
  {
    id: 'lobo_gris', family: 'beast', dayPhase: 'night', biomes: [B.FOREST, B.HILLS], caveOnly: false,
    minLevel: 3, maxLevel: 20, baseHp: 32, hpPerLevel: 3.4, baseDmg: 9, dmgPerLevel: 0.9,
    speed: 130, aggroRange: 220, attackRange: 24, xpBase: 14, xpPerLevel: 1.4,
    tamable: false, hasWeapon: false,
    palette: { body: 0x8a8a8a, shade: 0x4a4a4a, accent: 0xffe27a }, shape: 'wide'
  },
  {
    id: 'jabali_salvaje', family: 'beast', dayPhase: 'day', biomes: [B.FOREST, B.PLAINS], caveOnly: false,
    minLevel: 2, maxLevel: 16, baseHp: 38, hpPerLevel: 3.8, baseDmg: 10, dmgPerLevel: 0.9,
    speed: 110, aggroRange: 160, attackRange: 26, xpBase: 12, xpPerLevel: 1.2,
    tamable: false, hasWeapon: false,
    palette: { body: 0x6a4a3a, shade: 0x3a2418, accent: 0xe0d8c0 }, shape: 'wide'
  },
  {
    id: 'oso_pardo', family: 'beast', dayPhase: 'any', biomes: [B.FOREST, B.HILLS], caveOnly: false,
    minLevel: 15, maxLevel: 40, baseHp: 100, hpPerLevel: 9, baseDmg: 16, dmgPerLevel: 1.5,
    speed: 90, aggroRange: 180, attackRange: 30, xpBase: 35, xpPerLevel: 3,
    tamable: false, hasWeapon: false,
    palette: { body: 0x7a5a3a, shade: 0x40301a, accent: 0x1a1a1a }, shape: 'wide'
  },
  {
    id: 'lince_montanes', family: 'beast', dayPhase: 'night', biomes: [B.HILLS], caveOnly: false,
    minLevel: 8, maxLevel: 28, baseHp: 40, hpPerLevel: 4.2, baseDmg: 12, dmgPerLevel: 1.1,
    speed: 140, aggroRange: 210, attackRange: 24, xpBase: 18, xpPerLevel: 1.8,
    tamable: false, hasWeapon: false,
    palette: { body: 0xc9a06a, shade: 0x7a5a30, accent: 0x1a1a1a }, shape: 'wide'
  },
  {
    id: 'zorro_arenoso', family: 'beast', dayPhase: 'day', biomes: [B.DESERT], caveOnly: false,
    minLevel: 1, maxLevel: 14, baseHp: 22, hpPerLevel: 2.2, baseDmg: 6, dmgPerLevel: 0.6,
    speed: 135, aggroRange: 160, attackRange: 22, xpBase: 9, xpPerLevel: 1,
    tamable: false, hasWeapon: false,
    palette: { body: 0xe0a05a, shade: 0x8a5a2a, accent: 0xffffff }, shape: 'blob'
  },
  {
    id: 'toro_de_llanura', family: 'beast', dayPhase: 'day', biomes: [B.PLAINS], caveOnly: false,
    minLevel: 12, maxLevel: 35, baseHp: 85, hpPerLevel: 7.5, baseDmg: 15, dmgPerLevel: 1.4,
    speed: 100, aggroRange: 170, attackRange: 30, xpBase: 30, xpPerLevel: 2.6,
    tamable: false, hasWeapon: false,
    palette: { body: 0x5a4a3a, shade: 0x2a2018, accent: 0xe0e0e0 }, shape: 'wide'
  },
  {
    id: 'murcielago_cueva', family: 'beast', dayPhase: 'any', biomes: [], caveOnly: true,
    minLevel: 1, maxLevel: 20, baseHp: 18, hpPerLevel: 2, baseDmg: 5, dmgPerLevel: 0.5,
    speed: 150, aggroRange: 180, attackRange: 20, xpBase: 10, xpPerLevel: 1.1,
    tamable: false, hasWeapon: false,
    palette: { body: 0x3a2f4a, shade: 0x1a1526, accent: 0xff5a5a }, shape: 'winged'
  },
  {
    id: 'oso_de_cueva', family: 'beast', dayPhase: 'any', biomes: [], caveOnly: true,
    minLevel: 20, maxLevel: 45, baseHp: 120, hpPerLevel: 10, baseDmg: 19, dmgPerLevel: 1.7,
    speed: 85, aggroRange: 170, attackRange: 32, xpBase: 42, xpPerLevel: 3.4,
    tamable: false, hasWeapon: false,
    palette: { body: 0x4a4038, shade: 0x241f1a, accent: 0xffffff }, shape: 'wide'
  },

  // ---------------- INSECT (8) ----------------
  {
    id: 'arana_comun', family: 'insect', dayPhase: 'any', biomes: [], caveOnly: true,
    minLevel: 1, maxLevel: 18, baseHp: 20, hpPerLevel: 2.1, baseDmg: 6, dmgPerLevel: 0.6,
    speed: 100, aggroRange: 160, attackRange: 22, xpBase: 10, xpPerLevel: 1.1,
    tamable: false, hasWeapon: false,
    palette: { body: 0x2a2a2a, shade: 0x0f0f0f, accent: 0xff2a2a }, shape: 'wide'
  },
  {
    id: 'arana_gigante', family: 'insect', dayPhase: 'any', biomes: [], caveOnly: true,
    minLevel: 15, maxLevel: 40, baseHp: 65, hpPerLevel: 6.4, baseDmg: 14, dmgPerLevel: 1.3,
    speed: 95, aggroRange: 190, attackRange: 28, xpBase: 28, xpPerLevel: 2.4,
    tamable: false, hasWeapon: false,
    palette: { body: 0x3a2a4a, shade: 0x180f22, accent: 0xd9ff5a }, shape: 'wide'
  },
  {
    id: 'escarabajo_acorazado', family: 'insect', dayPhase: 'day', biomes: [B.FOREST, B.BUSHLAND], caveOnly: false,
    minLevel: 5, maxLevel: 24, baseHp: 45, hpPerLevel: 4.6, baseDmg: 8, dmgPerLevel: 0.8,
    speed: 60, aggroRange: 130, attackRange: 24, xpBase: 16, xpPerLevel: 1.6,
    tamable: false, hasWeapon: false,
    palette: { body: 0x2f5f8a, shade: 0x162f45, accent: 0x8fd9ff }, shape: 'blob'
  },
  {
    id: 'escorpion_de_arena', family: 'insect', dayPhase: 'any', biomes: [B.DESERT], caveOnly: false,
    minLevel: 6, maxLevel: 26, baseHp: 36, hpPerLevel: 3.8, baseDmg: 11, dmgPerLevel: 1,
    speed: 90, aggroRange: 150, attackRange: 26, xpBase: 17, xpPerLevel: 1.7,
    tamable: false, hasWeapon: false,
    palette: { body: 0xc9a25a, shade: 0x7a5a2a, accent: 0x1a1a1a }, shape: 'serpentine'
  },
  {
    id: 'avispon_gigante', family: 'insect', dayPhase: 'day', biomes: [B.FOREST, B.FLOWER_FIELD], caveOnly: false,
    minLevel: 8, maxLevel: 28, baseHp: 30, hpPerLevel: 3.2, baseDmg: 13, dmgPerLevel: 1.2,
    speed: 150, aggroRange: 200, attackRange: 22, xpBase: 20, xpPerLevel: 2,
    tamable: false, hasWeapon: false,
    palette: { body: 0xe0c020, shade: 0x8a7010, accent: 0x1a1a1a }, shape: 'winged'
  },
  {
    id: 'ciempies_cueva', family: 'insect', dayPhase: 'any', biomes: [], caveOnly: true,
    minLevel: 10, maxLevel: 34, baseHp: 40, hpPerLevel: 4.2, baseDmg: 10, dmgPerLevel: 1,
    speed: 105, aggroRange: 150, attackRange: 24, xpBase: 20, xpPerLevel: 2,
    tamable: false, hasWeapon: false,
    palette: { body: 0x6a4a2a, shade: 0x352215, accent: 0xffcc4d }, shape: 'serpentine'
  },
  {
    id: 'luciernaga_furiosa', family: 'insect', dayPhase: 'night', biomes: [B.FOREST, B.FLOWER_FIELD], caveOnly: false,
    minLevel: 1, maxLevel: 12, baseHp: 14, hpPerLevel: 1.4, baseDmg: 4, dmgPerLevel: 0.4,
    speed: 120, aggroRange: 140, attackRange: 18, xpBase: 7, xpPerLevel: 0.8,
    tamable: false, hasWeapon: false,
    palette: { body: 0xfff29a, shade: 0x8a7a3a, accent: 0xffffff }, shape: 'winged'
  },
  {
    id: 'gusano_gigante', family: 'insect', dayPhase: 'any', biomes: [], caveOnly: true,
    minLevel: 4, maxLevel: 22, baseHp: 34, hpPerLevel: 3.5, baseDmg: 7, dmgPerLevel: 0.7,
    speed: 55, aggroRange: 120, attackRange: 24, xpBase: 13, xpPerLevel: 1.3,
    tamable: false, hasWeapon: false,
    palette: { body: 0xd97a9a, shade: 0x7a3a52, accent: 0xffffff }, shape: 'serpentine'
  },

  // ---------------- ELEMENTAL (8) ----------------
  {
    id: 'elemental_fuego_menor', family: 'elemental', dayPhase: 'any', biomes: [B.DESERT, B.HILLS], caveOnly: false,
    minLevel: 12, maxLevel: 35, baseHp: 50, hpPerLevel: 5, baseDmg: 14, dmgPerLevel: 1.3,
    speed: 90, aggroRange: 180, attackRange: 28, xpBase: 26, xpPerLevel: 2.3,
    tamable: false, hasWeapon: false,
    palette: { body: 0xff8a3f, shade: 0x9a3f10, accent: 0xffe27a }, shape: 'spiky'
  },
  {
    id: 'elemental_hielo_menor', family: 'elemental', dayPhase: 'night', biomes: [B.HILLS, B.PLAINS], caveOnly: false,
    minLevel: 14, maxLevel: 38, baseHp: 55, hpPerLevel: 5.4, baseDmg: 13, dmgPerLevel: 1.2,
    speed: 75, aggroRange: 170, attackRange: 28, xpBase: 27, xpPerLevel: 2.3,
    tamable: false, hasWeapon: false,
    palette: { body: 0x8fe0ff, shade: 0x3f7a9a, accent: 0xffffff }, shape: 'spiky'
  },
  {
    id: 'elemental_tierra_menor', family: 'elemental', dayPhase: 'any', biomes: [B.HILLS, B.DESERT], caveOnly: false,
    minLevel: 16, maxLevel: 40, baseHp: 80, hpPerLevel: 7.5, baseDmg: 15, dmgPerLevel: 1.4,
    speed: 55, aggroRange: 140, attackRange: 30, xpBase: 30, xpPerLevel: 2.6,
    tamable: false, hasWeapon: false,
    palette: { body: 0x9a6a3c, shade: 0x5a3a1f, accent: 0x6f7a8a }, shape: 'wide'
  },
  {
    id: 'elemental_aire_menor', family: 'elemental', dayPhase: 'day', biomes: [B.PLAINS, B.HILLS], caveOnly: false,
    minLevel: 14, maxLevel: 36, baseHp: 42, hpPerLevel: 4.4, baseDmg: 12, dmgPerLevel: 1.15,
    speed: 150, aggroRange: 220, attackRange: 26, xpBase: 26, xpPerLevel: 2.3,
    tamable: false, hasWeapon: false,
    palette: { body: 0xbfe0e8, shade: 0x6f9fae, accent: 0xffffff }, shape: 'winged'
  },
  {
    id: 'elemental_cristal', family: 'elemental', dayPhase: 'any', biomes: [], caveOnly: true,
    minLevel: 18, maxLevel: 42, baseHp: 70, hpPerLevel: 6.8, baseDmg: 16, dmgPerLevel: 1.5,
    speed: 65, aggroRange: 150, attackRange: 28, xpBase: 32, xpPerLevel: 2.8,
    tamable: false, hasWeapon: false,
    palette: { body: 0x6fd9d0, shade: 0x2f8a80, accent: 0xffffff }, shape: 'spiky'
  },
  {
    id: 'elemental_lava_menor', family: 'elemental', dayPhase: 'any', biomes: [], caveOnly: true,
    minLevel: 22, maxLevel: 48, baseHp: 90, hpPerLevel: 8.5, baseDmg: 18, dmgPerLevel: 1.6,
    speed: 60, aggroRange: 150, attackRange: 30, xpBase: 38, xpPerLevel: 3.2,
    tamable: false, hasWeapon: false,
    palette: { body: 0xd9603f, shade: 0x7a1f1f, accent: 0xffcc4d }, shape: 'blob'
  },
  {
    id: 'elemental_arena', family: 'elemental', dayPhase: 'day', biomes: [B.DESERT], caveOnly: false,
    minLevel: 10, maxLevel: 32, baseHp: 48, hpPerLevel: 4.8, baseDmg: 12, dmgPerLevel: 1.1,
    speed: 80, aggroRange: 160, attackRange: 26, xpBase: 24, xpPerLevel: 2.1,
    tamable: false, hasWeapon: false,
    palette: { body: 0xe0c68a, shade: 0x8a6a3a, accent: 0xffffff }, shape: 'blob'
  },
  {
    id: 'elemental_flora', family: 'elemental', dayPhase: 'day', biomes: [B.FLOWER_FIELD, B.FOREST], caveOnly: false,
    minLevel: 10, maxLevel: 30, baseHp: 52, hpPerLevel: 5, baseDmg: 10, dmgPerLevel: 1,
    speed: 70, aggroRange: 150, attackRange: 26, xpBase: 24, xpPerLevel: 2.1,
    tamable: false, hasWeapon: false,
    palette: { body: 0x6fd97a, shade: 0x2f7a3a, accent: 0xe07fbf }, shape: 'spiky'
  },

  // ---------------- SPIRIT (7) ----------------
  {
    id: 'espiritu_bosque', family: 'spirit', dayPhase: 'night', biomes: [B.FOREST], caveOnly: false,
    minLevel: 5, maxLevel: 22, baseHp: 28, hpPerLevel: 3, baseDmg: 8, dmgPerLevel: 0.8,
    speed: 100, aggroRange: 190, attackRange: 24, xpBase: 15, xpPerLevel: 1.5,
    tamable: false, hasWeapon: false,
    palette: { body: 0x7fd9a0, shade: 0x3a7a55, accent: 0xffffff }, shape: 'winged'
  },
  {
    id: 'sombra_errante', family: 'spirit', dayPhase: 'night', biomes: ANY_BIOME, caveOnly: false,
    minLevel: 8, maxLevel: 28, baseHp: 32, hpPerLevel: 3.4, baseDmg: 10, dmgPerLevel: 1,
    speed: 115, aggroRange: 210, attackRange: 24, xpBase: 18, xpPerLevel: 1.8,
    tamable: false, hasWeapon: false,
    palette: { body: 0x3a3a4a, shade: 0x18181f, accent: 0x9a9aff }, shape: 'winged'
  },
  {
    id: 'fuego_fatuo', family: 'spirit', dayPhase: 'night', biomes: [B.BUSHLAND, B.FOREST], caveOnly: false,
    minLevel: 3, maxLevel: 16, baseHp: 16, hpPerLevel: 1.7, baseDmg: 5, dmgPerLevel: 0.5,
    speed: 120, aggroRange: 160, attackRange: 20, xpBase: 9, xpPerLevel: 1,
    tamable: false, hasWeapon: false,
    palette: { body: 0x8fd9ff, shade: 0x3f7a9a, accent: 0xffffff }, shape: 'blob'
  },
  {
    id: 'guardian_ancestral', family: 'spirit', dayPhase: 'any', biomes: [B.HILLS], caveOnly: false,
    minLevel: 25, maxLevel: 55, baseHp: 95, hpPerLevel: 8.8, baseDmg: 17, dmgPerLevel: 1.55,
    speed: 80, aggroRange: 180, attackRange: 30, xpBase: 40, xpPerLevel: 3.2,
    tamable: false, hasWeapon: true,
    palette: { body: 0xffcc4d, shade: 0x8a6a10, accent: 0xffffff }, shape: 'humanoid'
  },
  {
    id: 'espiritu_cueva', family: 'spirit', dayPhase: 'any', biomes: [], caveOnly: true,
    minLevel: 12, maxLevel: 36, baseHp: 40, hpPerLevel: 4.1, baseDmg: 11, dmgPerLevel: 1.05,
    speed: 95, aggroRange: 180, attackRange: 24, xpBase: 22, xpPerLevel: 2,
    tamable: false, hasWeapon: false,
    palette: { body: 0x5a4a7a, shade: 0x28203f, accent: 0xd9c9ff }, shape: 'winged'
  },
  {
    id: 'poltergeist', family: 'spirit', dayPhase: 'night', biomes: [B.PLAINS, B.HILLS], caveOnly: false,
    minLevel: 15, maxLevel: 38, baseHp: 34, hpPerLevel: 3.6, baseDmg: 13, dmgPerLevel: 1.2,
    speed: 130, aggroRange: 220, attackRange: 22, xpBase: 24, xpPerLevel: 2.2,
    tamable: false, hasWeapon: false,
    palette: { body: 0xd9d9e0, shade: 0x7a7a8a, accent: 0xff5a5a }, shape: 'blob'
  },
  {
    id: 'centinela_luz', family: 'spirit', dayPhase: 'day', biomes: [B.FLOWER_FIELD], caveOnly: false,
    minLevel: 18, maxLevel: 45, baseHp: 60, hpPerLevel: 6, baseDmg: 15, dmgPerLevel: 1.35,
    speed: 100, aggroRange: 190, attackRange: 28, xpBase: 30, xpPerLevel: 2.6,
    tamable: false, hasWeapon: true,
    palette: { body: 0xfff2c9, shade: 0xc9a25a, accent: 0xffffff }, shape: 'humanoid'
  },

  // ---------------- SLIME (7) ----------------
  {
    id: 'slime_verde', family: 'slime', dayPhase: 'any', biomes: [B.FOREST, B.PLAINS], caveOnly: false,
    minLevel: 1, maxLevel: 10, baseHp: 18, hpPerLevel: 2, baseDmg: 4, dmgPerLevel: 0.4,
    speed: 50, aggroRange: 130, attackRange: 22, xpBase: 7, xpPerLevel: 0.8,
    tamable: false, hasWeapon: false,
    palette: { body: 0x5cd85c, shade: 0x2a7a2a, accent: 0xffffff }, shape: 'blob'
  },
  {
    id: 'slime_azul', family: 'slime', dayPhase: 'any', biomes: [B.PLAINS, B.HILLS], caveOnly: false,
    minLevel: 3, maxLevel: 15, baseHp: 24, hpPerLevel: 2.5, baseDmg: 5, dmgPerLevel: 0.5,
    speed: 55, aggroRange: 130, attackRange: 22, xpBase: 9, xpPerLevel: 1,
    tamable: false, hasWeapon: false,
    palette: { body: 0x4f9ad9, shade: 0x1f5a8a, accent: 0xffffff }, shape: 'blob'
  },
  {
    id: 'slime_rojo', family: 'slime', dayPhase: 'any', biomes: [B.DESERT, B.PLAINS], caveOnly: false,
    minLevel: 6, maxLevel: 22, baseHp: 32, hpPerLevel: 3.2, baseDmg: 8, dmgPerLevel: 0.8,
    speed: 60, aggroRange: 140, attackRange: 22, xpBase: 13, xpPerLevel: 1.3,
    tamable: false, hasWeapon: false,
    palette: { body: 0xe0473f, shade: 0x8a1f1a, accent: 0xffffff }, shape: 'blob'
  },
  {
    id: 'slime_dorado', family: 'slime', dayPhase: 'day', biomes: ANY_BIOME, caveOnly: false,
    minLevel: 10, maxLevel: 30, baseHp: 30, hpPerLevel: 3, baseDmg: 6, dmgPerLevel: 0.6,
    speed: 65, aggroRange: 120, attackRange: 22, xpBase: 20, xpPerLevel: 1.9,
    tamable: false, hasWeapon: false,
    palette: { body: 0xffcc4d, shade: 0x8a6a10, accent: 0xffffff }, shape: 'blob'
  },
  {
    id: 'slime_morado', family: 'slime', dayPhase: 'night', biomes: [B.FOREST, B.BUSHLAND], caveOnly: false,
    minLevel: 8, maxLevel: 26, baseHp: 28, hpPerLevel: 2.9, baseDmg: 9, dmgPerLevel: 0.85,
    speed: 58, aggroRange: 140, attackRange: 22, xpBase: 16, xpPerLevel: 1.6,
    tamable: false, hasWeapon: false,
    palette: { body: 0x9a4fd9, shade: 0x4a1f7a, accent: 0xffffff }, shape: 'blob'
  },
  {
    id: 'slime_cristalino', family: 'slime', dayPhase: 'any', biomes: [], caveOnly: true,
    minLevel: 14, maxLevel: 38, baseHp: 40, hpPerLevel: 4, baseDmg: 10, dmgPerLevel: 0.95,
    speed: 50, aggroRange: 130, attackRange: 24, xpBase: 22, xpPerLevel: 2,
    tamable: false, hasWeapon: false,
    palette: { body: 0x6fd9d0, shade: 0x2f7a75, accent: 0xffffff }, shape: 'blob'
  },
  {
    id: 'slime_negro', family: 'slime', dayPhase: 'night', biomes: [], caveOnly: true,
    minLevel: 20, maxLevel: 45, baseHp: 55, hpPerLevel: 5.4, baseDmg: 13, dmgPerLevel: 1.2,
    speed: 55, aggroRange: 140, attackRange: 24, xpBase: 28, xpPerLevel: 2.4,
    tamable: false, hasWeapon: false,
    palette: { body: 0x2a2a2a, shade: 0x0a0a0a, accent: 0xff2a2a }, shape: 'blob'
  },

  // ---------------- CONSTRUCT (5) ----------------
  {
    id: 'golem_piedra_pequeno', family: 'construct', dayPhase: 'any', biomes: [B.HILLS, B.DESERT], caveOnly: false,
    minLevel: 12, maxLevel: 34, baseHp: 100, hpPerLevel: 9, baseDmg: 15, dmgPerLevel: 1.4,
    speed: 45, aggroRange: 130, attackRange: 30, xpBase: 30, xpPerLevel: 2.6,
    tamable: false, hasWeapon: false,
    palette: { body: 0x9a9a9a, shade: 0x555555, accent: 0x6fd9d0 }, shape: 'wide'
  },
  {
    id: 'golem_arena', family: 'construct', dayPhase: 'day', biomes: [B.DESERT], caveOnly: false,
    minLevel: 15, maxLevel: 38, baseHp: 85, hpPerLevel: 7.8, baseDmg: 14, dmgPerLevel: 1.3,
    speed: 50, aggroRange: 140, attackRange: 28, xpBase: 28, xpPerLevel: 2.4,
    tamable: false, hasWeapon: false,
    palette: { body: 0xd8c98a, shade: 0x8a7a3a, accent: 0x5a4a1f }, shape: 'wide'
  },
  {
    id: 'centinela_oxidado', family: 'construct', dayPhase: 'any', biomes: [], caveOnly: true,
    minLevel: 18, maxLevel: 44, baseHp: 95, hpPerLevel: 8.6, baseDmg: 16, dmgPerLevel: 1.45,
    speed: 55, aggroRange: 150, attackRange: 30, xpBase: 34, xpPerLevel: 2.9,
    tamable: false, hasWeapon: true,
    palette: { body: 0x8a5a3a, shade: 0x3a2418, accent: 0xd97a4f }, shape: 'humanoid'
  },
  {
    id: 'automata_cristal', family: 'construct', dayPhase: 'any', biomes: [], caveOnly: true,
    minLevel: 25, maxLevel: 50, baseHp: 110, hpPerLevel: 10, baseDmg: 19, dmgPerLevel: 1.7,
    speed: 60, aggroRange: 160, attackRange: 30, xpBase: 42, xpPerLevel: 3.5,
    tamable: false, hasWeapon: true,
    palette: { body: 0x6fd9d0, shade: 0x2f7a75, accent: 0xffffff }, shape: 'humanoid'
  },
  {
    id: 'torreta_abandonada', family: 'construct', dayPhase: 'any', biomes: [B.PLAINS, B.HILLS], caveOnly: false,
    minLevel: 20, maxLevel: 46, baseHp: 130, hpPerLevel: 11, baseDmg: 20, dmgPerLevel: 1.8,
    speed: 20, aggroRange: 200, attackRange: 40, xpBase: 45, xpPerLevel: 3.6,
    tamable: false, hasWeapon: false,
    palette: { body: 0x6f7a8a, shade: 0x333a45, accent: 0xff5a5a }, shape: 'tall'
  },

  // ---------------- DEMON (5) ----------------
  {
    id: 'imp_menor', family: 'demon', dayPhase: 'night', biomes: ANY_BIOME, caveOnly: false,
    minLevel: 10, maxLevel: 30, baseHp: 34, hpPerLevel: 3.6, baseDmg: 12, dmgPerLevel: 1.1,
    speed: 120, aggroRange: 200, attackRange: 24, xpBase: 20, xpPerLevel: 1.9,
    tamable: false, hasWeapon: false,
    palette: { body: 0xd9473f, shade: 0x7a1f1a, accent: 0x1a1a1a }, shape: 'winged'
  },
  {
    id: 'demonio_menor', family: 'demon', dayPhase: 'night', biomes: [], caveOnly: true,
    minLevel: 20, maxLevel: 48, baseHp: 80, hpPerLevel: 7.6, baseDmg: 18, dmgPerLevel: 1.65,
    speed: 95, aggroRange: 190, attackRange: 30, xpBase: 38, xpPerLevel: 3.2,
    tamable: false, hasWeapon: true,
    palette: { body: 0x7a1f1a, shade: 0x3a0f0a, accent: 0xff8a3f }, shape: 'humanoid'
  },
  {
    id: 'gargola', family: 'demon', dayPhase: 'night', biomes: [B.HILLS], caveOnly: false,
    minLevel: 18, maxLevel: 42, baseHp: 75, hpPerLevel: 7, baseDmg: 16, dmgPerLevel: 1.5,
    speed: 100, aggroRange: 200, attackRange: 28, xpBase: 34, xpPerLevel: 2.9,
    tamable: false, hasWeapon: false,
    palette: { body: 0x5a5a6a, shade: 0x28283a, accent: 0xff5a5a }, shape: 'winged'
  },
  {
    id: 'succubo_sombra', family: 'demon', dayPhase: 'night', biomes: [B.FOREST, B.BUSHLAND], caveOnly: false,
    minLevel: 22, maxLevel: 46, baseHp: 65, hpPerLevel: 6.2, baseDmg: 17, dmgPerLevel: 1.55,
    speed: 110, aggroRange: 200, attackRange: 26, xpBase: 36, xpPerLevel: 3,
    tamable: false, hasWeapon: false,
    palette: { body: 0x7a3f6a, shade: 0x3a1a30, accent: 0xff8fd9 }, shape: 'winged'
  },
  {
    id: 'diablillo_arenoso', family: 'demon', dayPhase: 'day', biomes: [B.DESERT], caveOnly: false,
    minLevel: 12, maxLevel: 32, baseHp: 45, hpPerLevel: 4.6, baseDmg: 13, dmgPerLevel: 1.2,
    speed: 105, aggroRange: 180, attackRange: 26, xpBase: 22, xpPerLevel: 2.1,
    tamable: false, hasWeapon: true,
    palette: { body: 0xc98a3a, shade: 0x6a4515, accent: 0x1a1a1a }, shape: 'humanoid'
  },

  // ---------------- REPTILE (5) ----------------
  {
    id: 'serpiente_del_desierto', family: 'reptile', dayPhase: 'day', biomes: [B.DESERT], caveOnly: false,
    minLevel: 2, maxLevel: 18, baseHp: 26, hpPerLevel: 2.7, baseDmg: 8, dmgPerLevel: 0.8,
    speed: 100, aggroRange: 150, attackRange: 22, xpBase: 12, xpPerLevel: 1.2,
    tamable: false, hasWeapon: false,
    palette: { body: 0xd9c020, shade: 0x7a6a10, accent: 0x1a1a1a }, shape: 'serpentine'
  },
  {
    id: 'serpiente_venenosa', family: 'reptile', dayPhase: 'night', biomes: [B.FOREST, B.BUSHLAND], caveOnly: false,
    minLevel: 6, maxLevel: 24, baseHp: 30, hpPerLevel: 3.1, baseDmg: 11, dmgPerLevel: 1,
    speed: 95, aggroRange: 150, attackRange: 22, xpBase: 16, xpPerLevel: 1.6,
    tamable: false, hasWeapon: false,
    palette: { body: 0x4f9a3f, shade: 0x255a1f, accent: 0xd9ff5a }, shape: 'serpentine'
  },
  {
    id: 'cocodrilo_pantano', family: 'reptile', dayPhase: 'any', biomes: [B.FOREST, B.PLAINS], caveOnly: false,
    minLevel: 14, maxLevel: 36, baseHp: 75, hpPerLevel: 7, baseDmg: 15, dmgPerLevel: 1.4,
    speed: 75, aggroRange: 140, attackRange: 28, xpBase: 30, xpPerLevel: 2.6,
    tamable: false, hasWeapon: false,
    palette: { body: 0x4a6a3a, shade: 0x22351c, accent: 0xe0e0a0 }, shape: 'wide'
  },
  {
    id: 'lagarto_cueva', family: 'reptile', dayPhase: 'any', biomes: [], caveOnly: true,
    minLevel: 8, maxLevel: 28, baseHp: 42, hpPerLevel: 4.3, baseDmg: 12, dmgPerLevel: 1.1,
    speed: 90, aggroRange: 140, attackRange: 24, xpBase: 19, xpPerLevel: 1.9,
    tamable: false, hasWeapon: false,
    palette: { body: 0x5a5a7a, shade: 0x2a2a3f, accent: 0xffe27a }, shape: 'wide'
  },
  {
    id: 'viborrey', family: 'reptile', dayPhase: 'night', biomes: [B.DESERT, B.HILLS], caveOnly: false,
    minLevel: 20, maxLevel: 45, baseHp: 68, hpPerLevel: 6.4, baseDmg: 16, dmgPerLevel: 1.5,
    speed: 110, aggroRange: 180, attackRange: 26, xpBase: 32, xpPerLevel: 2.8,
    tamable: false, hasWeapon: false,
    palette: { body: 0x8a2fd9, shade: 0x4a1a7a, accent: 0xffe27a }, shape: 'serpentine'
  },

  // ---------------- HUMANOID variados (bandidos, orcos, duendes) (6) ----------------
  {
    id: 'duende_ladron', family: 'beast', dayPhase: 'any', biomes: [B.FOREST, B.BUSHLAND], caveOnly: false,
    minLevel: 3, maxLevel: 18, baseHp: 24, hpPerLevel: 2.5, baseDmg: 7, dmgPerLevel: 0.7,
    speed: 125, aggroRange: 170, attackRange: 24, xpBase: 12, xpPerLevel: 1.3,
    tamable: false, hasWeapon: true,
    palette: { body: 0x5a9a5a, shade: 0x2a5a2a, accent: 0x8a5a3c }, shape: 'humanoid'
  },
  {
    id: 'orco_guerrero', family: 'beast', dayPhase: 'any', biomes: [B.HILLS, B.PLAINS], caveOnly: false,
    minLevel: 12, maxLevel: 35, baseHp: 78, hpPerLevel: 7.2, baseDmg: 16, dmgPerLevel: 1.5,
    speed: 85, aggroRange: 180, attackRange: 30, xpBase: 32, xpPerLevel: 2.7,
    tamable: false, hasWeapon: true,
    palette: { body: 0x6f9a4f, shade: 0x3a5a25, accent: 0x8a5a3c }, shape: 'humanoid'
  },
  {
    id: 'bandido_forestal', family: 'beast', dayPhase: 'day', biomes: [B.FOREST, B.PLAINS], caveOnly: false,
    minLevel: 6, maxLevel: 24, baseHp: 44, hpPerLevel: 4.5, baseDmg: 11, dmgPerLevel: 1,
    speed: 105, aggroRange: 190, attackRange: 28, xpBase: 18, xpPerLevel: 1.8,
    tamable: false, hasWeapon: true,
    palette: { body: 0x8a6a4f, shade: 0x4a3520, accent: 0x2a2a2a }, shape: 'humanoid'
  },
  {
    id: 'bandido_del_desierto', family: 'beast', dayPhase: 'day', biomes: [B.DESERT], caveOnly: false,
    minLevel: 8, maxLevel: 28, baseHp: 48, hpPerLevel: 4.8, baseDmg: 12, dmgPerLevel: 1.1,
    speed: 100, aggroRange: 180, attackRange: 28, xpBase: 20, xpPerLevel: 2,
    tamable: false, hasWeapon: true,
    palette: { body: 0xd8c98a, shade: 0x8a7a4a, accent: 0x4a3a2a }, shape: 'humanoid'
  },
  {
    id: 'trol_de_colina', family: 'beast', dayPhase: 'any', biomes: [B.HILLS], caveOnly: false,
    minLevel: 20, maxLevel: 48, baseHp: 140, hpPerLevel: 12, baseDmg: 22, dmgPerLevel: 2,
    speed: 65, aggroRange: 160, attackRange: 34, xpBase: 48, xpPerLevel: 3.8,
    tamable: false, hasWeapon: true,
    palette: { body: 0x7a8a5a, shade: 0x3a4525, accent: 0x2a2a2a }, shape: 'humanoid'
  },
  {
    id: 'ogro_de_cueva', family: 'beast', dayPhase: 'any', biomes: [], caveOnly: true,
    minLevel: 25, maxLevel: 52, baseHp: 160, hpPerLevel: 14, baseDmg: 24, dmgPerLevel: 2.2,
    speed: 60, aggroRange: 150, attackRange: 34, xpBase: 52, xpPerLevel: 4,
    tamable: false, hasWeapon: true,
    palette: { body: 0x5a4a5a, shade: 0x281f28, accent: 0x8a5a3c }, shape: 'humanoid'
  },

  // ---------------- Variados adicionales (crustáceos/pequeños bichos) (4) ----------------
  {
    id: 'cangrejo_playero', family: 'insect', dayPhase: 'day', biomes: [B.PLAINS, B.DESERT], caveOnly: false,
    minLevel: 1, maxLevel: 12, baseHp: 22, hpPerLevel: 2.2, baseDmg: 5, dmgPerLevel: 0.5,
    speed: 60, aggroRange: 110, attackRange: 22, xpBase: 8, xpPerLevel: 0.9,
    tamable: false, hasWeapon: false,
    palette: { body: 0xd9603f, shade: 0x7a2f1f, accent: 0xffffff }, shape: 'wide'
  },
  {
    id: 'polilla_gigante', family: 'insect', dayPhase: 'night', biomes: [], caveOnly: true,
    minLevel: 5, maxLevel: 22, baseHp: 26, hpPerLevel: 2.7, baseDmg: 7, dmgPerLevel: 0.7,
    speed: 110, aggroRange: 160, attackRange: 20, xpBase: 14, xpPerLevel: 1.4,
    tamable: false, hasWeapon: false,
    palette: { body: 0xa0a0c0, shade: 0x555570, accent: 0xff5a5a }, shape: 'winged'
  },
  {
    id: 'topo_gigante', family: 'beast', dayPhase: 'any', biomes: [], caveOnly: true,
    minLevel: 3, maxLevel: 20, baseHp: 36, hpPerLevel: 3.7, baseDmg: 8, dmgPerLevel: 0.8,
    speed: 65, aggroRange: 120, attackRange: 24, xpBase: 14, xpPerLevel: 1.4,
    tamable: false, hasWeapon: false,
    palette: { body: 0x6a5a4a, shade: 0x352a20, accent: 0xffe27a }, shape: 'blob'
  },
  {
    id: 'hongo_luminoso_andante', family: 'plant', dayPhase: 'any', biomes: [], caveOnly: true,
    minLevel: 1, maxLevel: 15, baseHp: 20, hpPerLevel: 2, baseDmg: 5, dmgPerLevel: 0.5,
    speed: 40, aggroRange: 110, attackRange: 22, xpBase: 9, xpPerLevel: 1,
    tamable: true, hasWeapon: false,
    palette: { body: 0x8fe0ff, shade: 0x3f7a9a, accent: 0xffffff }, shape: 'blob'
  }
];

/**
 * Busca una definición de monstruo por su id único.
 * @param {string} id
 * @returns {MonsterDef|undefined}
 */
export function getMonsterDef(id) {
  return MONSTERS.find((m) => m.id === id);
}
