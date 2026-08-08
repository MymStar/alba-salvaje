// Capa de bioma determinista de MUY baja frecuencia (parte 14 del pedido).
// Independiente del terreno tile-a-tile de world/terrain.js: mientras
// terrain.js decide si UN tile es agua/arena/piedra, biomes.js decide en qué
// "región" grande del mundo está el jugador (bosque/desierto/colinas/...),
// para que entrar a un bioma se sienta como cruzar a una zona distinta.
//
// Misma técnica que terrain.js ("value noise" casero, hash trigonométrico
// determinista sin Math.random), pero con SEED propia y frecuencias mucho
// más bajas (regiones de cientos de tiles en vez de unos pocos).

import { BIOME_TYPES } from '../constants.js';

const SEED = 7919; // semilla propia de biomas (distinta a terrain.js/altars.js)

/** Hash 2D determinista -> pseudoaleatorio en [0, 1). Mismo truco que terrain.js. */
function hash2D(x, y) {
  const s = Math.sin(x * 149.7 + y * 233.1 + SEED * 0.023) * 38471.2371;
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

// Frecuencia MUY baja: cada "celda" de ruido cubre cientos de tiles.
const BIOME_FREQ = 0.0045;

/**
 * Bioma de una coordenada de tile absoluta. Combina 3 capas de ruido de
 * baja frecuencia (temperatura, humedad, "relieve") en una grilla simple de
 * decisión, igual de espíritu a los biomas clásicos de mundo abierto.
 * Nunca devuelve BIOME_TYPES.CAVE (eso lo decide world/caves.js aparte).
 * @param {number} worldTileX
 * @param {number} worldTileY
 * @returns {string} uno de BIOME_TYPES (excepto CAVE)
 */
export function getBiomeAt(worldTileX, worldTileY) {
  const temp = valueNoise(worldTileX, worldTileY, BIOME_FREQ);
  const moist = valueNoise(worldTileX + 4000, worldTileY - 4000, BIOME_FREQ * 1.15);
  const relief = valueNoise(worldTileX - 4000, worldTileY + 4000, BIOME_FREQ * 0.85);

  // Las colinas dominan donde el relieve es alto, sin importar temp/humedad,
  // formando parches recortados a través de los demás biomas.
  if (relief > 0.7) return BIOME_TYPES.HILLS;

  if (temp > 0.62 && moist < 0.42) return BIOME_TYPES.DESERT;
  if (moist > 0.66 && temp < 0.55) return BIOME_TYPES.FOREST;
  if (moist > 0.55 && temp >= 0.55) return BIOME_TYPES.FLOWER_FIELD;
  if (moist > 0.4 && moist <= 0.55) return BIOME_TYPES.BUSHLAND;

  return BIOME_TYPES.PLAINS;
}

// Claves de textura de decoración generadas en registerBiomeTextures().
export const DECOR_TEX = {
  TREE: 'decor_tree',
  BUSH: 'decor_bush',
  FLOWER_A: 'decor_flower_a',
  FLOWER_B: 'decor_flower_b',
  ROCK: 'decor_rock'
};

// Hash independiente para decoración (no correlacionado con el bioma en sí,
// así los árboles no quedan siempre en el mismo patrón que el ruido de bioma).
const DECOR_SEED = 5303;
function decorHash2D(x, y) {
  const s = Math.sin(x * 157.31 + y * 113.73 + DECOR_SEED * 0.031) * 21453.6789;
  return s - Math.floor(s);
}

/**
 * Decoración (si la hay) de un tile: dispersa dentro de su bioma
 * correspondiente, 100% determinista (sin Math.random).
 * @param {number} worldTileX
 * @param {number} worldTileY
 * @returns {null|{kind:'tree'|'bush'|'flower'|'rock', tex:string, solid:boolean}}
 */
export function getDecorationAt(worldTileX, worldTileY) {
  const biome = getBiomeAt(worldTileX, worldTileY);
  const roll = decorHash2D(worldTileX, worldTileY);

  switch (biome) {
    case BIOME_TYPES.FOREST:
      if (roll < 0.1) return { kind: 'tree', tex: DECOR_TEX.TREE, solid: true };
      return null;

    case BIOME_TYPES.BUSHLAND:
      if (roll < 0.09) return { kind: 'bush', tex: DECOR_TEX.BUSH, solid: false };
      return null;

    case BIOME_TYPES.FLOWER_FIELD:
      if (roll < 0.12) {
        const variantRoll = decorHash2D(worldTileX * 7 + 3, worldTileY * 13 + 5);
        const tex = variantRoll < 0.5 ? DECOR_TEX.FLOWER_A : DECOR_TEX.FLOWER_B;
        return { kind: 'flower', tex, solid: false };
      }
      return null;

    case BIOME_TYPES.HILLS:
      if (roll < 0.06) return { kind: 'rock', tex: DECOR_TEX.ROCK, solid: true };
      return null;

    case BIOME_TYPES.DESERT:
      if (roll < 0.03) return { kind: 'rock', tex: DECOR_TEX.ROCK, solid: true };
      return null;

    default:
      return null; // PLAINS se mantiene despejada
  }
}

/** Árbol: tronco + copa, sombra de copa oscura y luz arriba-izquierda. */
function drawTree(g) {
  const w = 34;
  const h = 44;
  g.clear();
  g.fillStyle(0x2f5a2f, 1);
  g.fillEllipse(w * 0.54, h * 0.42, w * 0.6, h * 0.5);
  g.fillStyle(0x6e4429, 1);
  g.fillRoundedRect(w / 2 - 4, h * 0.62, 8, h * 0.36, 3);
  g.fillStyle(0x3f8f4f, 1);
  g.fillCircle(w / 2, h * 0.4, w * 0.42);
  g.fillStyle(0x6fce7f, 1);
  g.fillCircle(w * 0.36, h * 0.28, w * 0.2);
  g.generateTexture(DECOR_TEX.TREE, w, h);
}

/** Arbusto: óvalo doble simple, no bloquea el paso. */
function drawBush(g) {
  const s = 26;
  g.clear();
  g.fillStyle(0x2f6a3a, 1);
  g.fillEllipse(s * 0.54, s * 0.58, s * 0.62, s * 0.42);
  g.fillStyle(0x4fae6a, 1);
  g.fillEllipse(s * 0.48, s * 0.5, s * 0.56, s * 0.4);
  g.fillStyle(0x7fd996, 1);
  g.fillCircle(s * 0.36, s * 0.42, s * 0.14);
  g.generateTexture(DECOR_TEX.BUSH, s, s);
}

/** Flor: tallo + pétalo + centro dorado, dos variantes de color. */
function drawFlower(g, key, petalColor) {
  const s = 18;
  g.clear();
  g.fillStyle(0x2f7a45, 1);
  g.fillRect(s / 2 - 1, s * 0.45, 2, s * 0.5);
  g.fillStyle(0x3f5a2f, 0.5);
  g.fillEllipse(s / 2, s * 0.42, s * 0.36, s * 0.16);
  g.fillStyle(petalColor, 1);
  g.fillCircle(s * 0.5, s * 0.32, s * 0.22);
  g.fillStyle(0xffffff, 0.85);
  g.fillCircle(s * 0.44, s * 0.26, s * 0.07);
  g.fillStyle(0xffcc4d, 1);
  g.fillCircle(s * 0.5, s * 0.32, s * 0.07);
  g.generateTexture(key, s, s);
}

/** Roca: óvalo con sombra abajo-derecha y luz arriba-izquierda. */
function drawRock(g) {
  const s = 24;
  g.clear();
  g.fillStyle(0x5a5a5a, 1);
  g.fillEllipse(s * 0.54, s * 0.6, s * 0.7, s * 0.42);
  g.fillStyle(0x9a9a9a, 1);
  g.fillEllipse(s * 0.46, s * 0.5, s * 0.62, s * 0.4);
  g.fillStyle(0xc4c4c4, 1);
  g.fillEllipse(s * 0.36, s * 0.4, s * 0.26, s * 0.16);
  g.generateTexture(DECOR_TEX.ROCK, s, s);
}

/**
 * Genera todas las texturas de decoración de biomas con `g.generateTexture`.
 * Debe llamarse una vez desde BootScene con el mismo Graphics que genera el
 * resto de texturas del juego.
 * @param {Phaser.GameObjects.Graphics} g
 */
export function registerBiomeTextures(g) {
  drawTree(g);
  drawBush(g);
  drawFlower(g, DECOR_TEX.FLOWER_A, 0xe0473f);
  drawFlower(g, DECOR_TEX.FLOWER_B, 0xd94fae);
  drawRock(g);
}
