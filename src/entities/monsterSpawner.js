// Conveniencia para aparición en vivo: elige un monstruo al azar de
// monsterCatalog.js que tenga sentido para el contexto actual (bioma, fase
// día/noche, si es cueva, nivel del jugador) y lo hace aparecer con
// Monster.spawn(...). Usa Math.random/Phaser.Math.Between libremente: esto
// es aparición en vivo, no generación determinista de mundo.

import Phaser from 'phaser';
import { MONSTERS } from './monsterCatalog.js';
import Monster from './Monster.js';

const LEVEL_MARGIN_STEP = 3; // cuánto se relaja el rango de nivel en cada intento si no hay candidatos

/**
 * @param {{minLevel:number, maxLevel:number}} def
 * @param {number} playerLevel
 * @param {number} margin
 */
function levelMatches(def, playerLevel, margin) {
  return def.minLevel - margin <= playerLevel && def.maxLevel + margin >= playerLevel;
}

/**
 * Filtra MONSTERS según el contexto de aparición, relajando primero el
 * margen de nivel antes que el filtro de bioma/fase si no hay candidatos.
 * @param {{dayPhase:'day'|'night', biome:string, isCave:boolean, playerLevel:number}} ctx
 */
function filterCandidates(ctx) {
  const { dayPhase, biome, isCave, playerLevel } = ctx;

  const baseFilter = (def) => {
    if (isCave) return def.caveOnly === true;
    if (def.caveOnly) return false;
    const biomeOk = def.biomes.includes('any') || def.biomes.includes(biome);
    const phaseOk = def.dayPhase === 'any' || def.dayPhase === dayPhase;
    return biomeOk && phaseOk;
  };

  const base = MONSTERS.filter(baseFilter);

  for (let margin = 0; margin <= 60; margin += LEVEL_MARGIN_STEP) {
    const candidates = base.filter((def) => levelMatches(def, playerLevel, margin));
    if (candidates.length > 0) return candidates;
  }

  // Último recurso: ignorar también el filtro de nivel (no debería llegar
  // aquí salvo catálogos muy pequeños o mal configurados).
  return base;
}

/**
 * Elige y hace aparecer un monstruo aleatorio adecuado al contexto dado.
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {{dayPhase:'day'|'night', biome:string, isCave:boolean, playerLevel:number}} ctx
 * @returns {Monster|null} el monstruo creado, o null si no hay candidatos
 */
export function spawnRandomMonster(scene, x, y, ctx) {
  const candidates = filterCandidates(ctx);
  if (candidates.length === 0) return null;

  const def = candidates[Math.floor(Math.random() * candidates.length)];
  const level = Phaser.Math.Between(Math.max(1, ctx.playerLevel - 3), ctx.playerLevel + 2);

  return Monster.spawn(scene, x, y, def.id, level);
}
