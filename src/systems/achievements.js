// Sistema de logros: escucha eventos que YA emite el resto del juego y
// desbloquea recompensas la primera vez que se cumple cada condición.
// Centralizar todo aquí evita esparcir umbrales de logros por 5 archivos
// distintos — cada sistema (combate, construcción, día/noche...) solo
// tiene que emitir su evento, y este módulo decide qué significa.

import { EventBus } from '../eventBus.js';
import { bumpStat, unlockAchievement, hasAchievement } from '../state.js';
import { t } from '../i18n.js';
import { playSound } from './sound.js';

export const ACHIEVEMENTS = [
  { id: 'survive10nights', nameKey: 'achievement.survive10nights', reward: { gold: 200, gems: 5 } },
  { id: 'kill50zombies', nameKey: 'achievement.kill50zombies', reward: { gold: 150 } },
  { id: 'kill20plants', nameKey: 'achievement.kill20plants', reward: { gold: 100 } },
  { id: 'plantForest', nameKey: 'achievement.plantForest', reward: { gold: 120, gems: 2 } },
  { id: 'build10', nameKey: 'achievement.build10', reward: { gold: 150 } },
  { id: 'level10', nameKey: 'achievement.level10', reward: { gold: 80 } },
  { id: 'level50', nameKey: 'achievement.level50', reward: { gold: 400, gems: 10 } },
  { id: 'destroyAltar', nameKey: 'achievement.destroyAltar', reward: { gold: 60 } },
  { id: 'defeatGod', nameKey: 'achievement.defeatGod', reward: { gold: 500, gems: 50 } },
  { id: 'exploreRareZone', nameKey: 'achievement.exploreRareZone', reward: { gold: 100 } }
];

export function getAchievementDef(id) {
  return ACHIEVEMENTS.find((a) => a.id === id) || null;
}

export function getAllAchievements() {
  return ACHIEVEMENTS;
}

let wired = false;
let wasNight = false;

/** Conecta los listeners de logros al EventBus. Llamar UNA sola vez desde main.js. */
export function wireAchievements() {
  if (wired) return;
  wired = true;

  EventBus.on('day-night-changed', (phase) => {
    if (phase === 'night') {
      wasNight = true;
    } else if (phase === 'day' && wasNight) {
      // Volvió a ser de día tras una noche: esa noche se sobrevivió.
      wasNight = false;
      const n = bumpStat('nightsSurvived');
      if (n >= 10) unlock('survive10nights');
    }
  });

  // Fase 3: Monster.js emite la FAMILIA del catálogo (entities/monsterCatalog.js),
  // no solo 'zombie'/'plant' — 'undead' cuenta como zombi para este logro
  // viejo, y cualquier otra familia hostil también suma "zombiesKilled" como
  // contador general de monstruos derrotados (mantiene el logro alcanzable
  // con el catálogo de 50+ tipos nuevo).
  EventBus.on('enemy-killed', (kind) => {
    if (kind === 'plant') {
      const n = bumpStat('plantsKilled');
      if (n >= 20) unlock('kill20plants');
    } else {
      const n = bumpStat('zombiesKilled');
      if (n >= 50) unlock('kill50zombies');
    }
  });

  EventBus.on('plant-tamed', () => {
    const n = bumpStat('plantsTamed');
    if (n >= 5) unlock('plantForest');
  });

  EventBus.on('building-placed', () => {
    const n = bumpStat('buildingsBuilt');
    if (n >= 10) unlock('build10');
  });

  EventBus.on('levelup', (level) => {
    if (level >= 10) unlock('level10');
    if (level >= 50) unlock('level50');
  });

  EventBus.on('altar-destroyed', () => unlock('destroyAltar'));
  EventBus.on('god-defeated', () => unlock('defeatGod'));
  EventBus.on('rare-zone-found', () => unlock('exploreRareZone'));
}

function unlock(id) {
  if (hasAchievement(id)) return;
  const def = getAchievementDef(id);
  if (!def) return;
  const got = unlockAchievement(id, def.reward);
  if (got) {
    playSound('levelup');
    EventBus.emit('notify', t('notify.achievementUnlocked', { name: t(def.nameKey) }));
  }
}

/** true/false por cada logro, para pintar la lista en la UI. */
export function getAchievementStatus() {
  return ACHIEVEMENTS.map((a) => ({ ...a, unlocked: hasAchievement(a.id) }));
}
