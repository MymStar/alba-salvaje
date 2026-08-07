// Generación procedural DETERMINISTA del terreno.
// No usa Math.random(): cada tile se deriva de un hash puro de sus
// coordenadas, así el mundo "recordado" (construcciones guardadas, posición
// del jugador) siempre encaja con el mismo paisaje al volver a cargar.
//
// Técnica: "value noise" casero (sin dependencias externas) — interpolamos
// entre valores pseudoaleatorios anclados a una grilla entera usando una
// función hash trigonométrica clásica (sin(x*p1 + y*p2) * cte, fract).
// Se combinan varias capas (frecuencias distintas) para dar variedad:
//   - una capa de baja frecuencia para "vetas" serpenteantes de agua
//   - una capa de frecuencia media para clusters de piedra/tierra
//   - un umbral de distancia al agua para bordear con arena

import { TILE_TYPES } from '../constants.js';

const SEED = 1337; // semilla fija: cambia el "aspecto" del mundo si se ajusta

/** Hash 2D determinista -> pseudoaleatorio en [0, 1). */
function hash2D(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7 + SEED * 0.017) * 43758.5453123;
  return s - Math.floor(s);
}

/** Interpolación suave (smoothstep) para que el ruido no se vea "a bloques". */
function smooth(t) {
  return t * t * (3 - 2 * t);
}

/** Value noise: interpola hash2D entre las 4 esquinas de la celda que contiene (x, y). */
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

// Umbral de "cauce de río/lago": la capa de baja frecuencia crea vetas
// serpenteantes cuando el valor cae cerca de 0.5 (una especie de "curva de
// nivel" del ruido, que da forma alargada en vez de manchas redondas).
const WATER_BAND = 0.045;
const WATER_FREQ = 0.02;
const SAND_MARGIN = 0.03; // qué tan ancha es la franja de arena junto al agua

const STONE_DIRT_FREQ = 0.05;

/**
 * Devuelve el TILE_TYPES correspondiente a una coordenada de tile absoluta
 * del mundo. Pura y determinista: misma entrada -> misma salida siempre.
 */
export function getTileTypeAt(worldTileX, worldTileY) {
  const waterNoise = valueNoise(worldTileX, worldTileY, WATER_FREQ);
  const distToWaterBand = Math.abs(waterNoise - 0.5);

  if (distToWaterBand < WATER_BAND) {
    return TILE_TYPES.WATER;
  }
  if (distToWaterBand < WATER_BAND + SAND_MARGIN) {
    return TILE_TYPES.SAND;
  }

  // Fuera del agua/arena: mayormente pradera, con clusters ocasionales de
  // piedra y tierra usando una segunda capa de ruido a otra frecuencia.
  const featureNoise = valueNoise(worldTileX + 500, worldTileY - 500, STONE_DIRT_FREQ);
  if (featureNoise > 0.82) {
    return TILE_TYPES.STONE;
  }
  if (featureNoise > 0.7) {
    return TILE_TYPES.DIRT;
  }

  return TILE_TYPES.GRASS;
}
