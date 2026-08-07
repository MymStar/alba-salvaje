// Estado central del jugador (vida, energía, hambre, nivel, inventario, monedas).
// Módulo con estado mutable + funciones puras de acceso, para que World/Entities/UI
// lean y escriban desde el mismo lugar sin duplicar lógica.
//
// IMPORTANTE: 'gold' y 'gems' son monedas VIRTUALES que se ganan jugando.
// No hay ninguna integración de pago con dinero real en este prototipo (ver src/ui/ShopUI.js).

import { EventBus } from './eventBus.js';
import { STORAGE_KEYS, LEVEL_CAP_NORMAL, LEVEL_CAP_GOD } from './constants.js';
import { getItem } from './itemCatalog.js';
import { t } from './i18n.js';

function defaultState() {
  return {
    character: {
      id: 'guerrero',
      name: 'Guerrero'
    },
    currency: {
      gold: 50,
      gems: 0
    },
    player: {
      level: 1,
      xp: 0,
      xpToNext: 100,
      hp: 100,
      maxHp: 100,
      energy: 100,
      maxEnergy: 100,
      hunger: 100,
      maxHunger: 100,
      strength: 5,
      speed: 1,
      defense: 0,
      mana: 50,
      maxMana: 50,
      unlockedSpells: [],
      godsDefeated: [],
      alive: true,
      deathCount: 0
    },
    equipment: {
      weapon: null,
      armor: null,
      accessory: null
    },
    achievements: [],
    ownedItems: [],
    inventory: [
      { type: 'wood', qty: 5 },
      { type: 'food_fruit', qty: 3 }
    ],
    world: {
      spawnX: 0,
      spawnY: 0,
      lastX: 0,
      lastY: 0,
      altarsDestroyed: {},
      elementalKills: {},
      godsSummoned: [],
      rareZonesFound: []
    },
    stats: {
      nightsSurvived: 0,
      zombiesKilled: 0,
      plantsKilled: 0,
      plantsTamed: 0,
      buildingsBuilt: 0
    }
  };
}

export const GameState = load();

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SAVE);
    if (raw) {
      const parsed = JSON.parse(raw);
      const base = defaultState();
      // Merge por-objeto (no superficial-total): así una partida guardada
      // ANTES de que existieran campos nuevos (equipo, maná, logros...) los
      // recibe con su valor por defecto en vez de quedar `undefined` y
      // romper el juego. Si se agregan más objetos anidados en el futuro,
      // hay que sumarlos aquí también.
      return {
        ...base,
        ...parsed,
        player: { ...base.player, ...parsed.player },
        equipment: { ...base.equipment, ...parsed.equipment },
        world: { ...base.world, ...parsed.world },
        stats: { ...base.stats, ...parsed.stats },
        currency: { ...base.currency, ...parsed.currency }
      };
    }
  } catch (e) {
    console.warn('No se pudo cargar la partida guardada, se usa una nueva.', e);
  }
  return defaultState();
}

export function saveState() {
  try {
    localStorage.setItem(STORAGE_KEYS.SAVE, JSON.stringify(GameState));
  } catch (e) {
    console.warn('No se pudo guardar la partida.', e);
  }
}

export function resetState() {
  Object.assign(GameState, defaultState());
  saveState();
  EventBus.emit('stats-changed');
  EventBus.emit('currency-changed');
  EventBus.emit('inventory-changed');
}

// ---------- Monedas ----------

export function addGold(amount) {
  GameState.currency.gold = Math.max(0, GameState.currency.gold + amount);
  EventBus.emit('currency-changed');
  saveState();
}

export function addGems(amount) {
  GameState.currency.gems = Math.max(0, GameState.currency.gems + amount);
  EventBus.emit('currency-changed');
  saveState();
}

export function spendCurrency(gold = 0, gems = 0) {
  if (GameState.currency.gold < gold || GameState.currency.gems < gems) return false;
  GameState.currency.gold -= gold;
  GameState.currency.gems -= gems;
  EventBus.emit('currency-changed');
  saveState();
  return true;
}

// ---------- Inventario ----------

export function addItem(type, qty = 1) {
  const slot = GameState.inventory.find((i) => i.type === type);
  if (slot) slot.qty += qty;
  else GameState.inventory.push({ type, qty });
  EventBus.emit('inventory-changed');
  saveState();
}

export function hasItem(type, qty = 1) {
  const slot = GameState.inventory.find((i) => i.type === type);
  return !!slot && slot.qty >= qty;
}

export function removeItem(type, qty = 1) {
  const slot = GameState.inventory.find((i) => i.type === type);
  if (!slot || slot.qty < qty) return false;
  slot.qty -= qty;
  if (slot.qty <= 0) {
    GameState.inventory = GameState.inventory.filter((i) => i.type !== type);
  }
  EventBus.emit('inventory-changed');
  saveState();
  return true;
}

// ---------- Progresión ----------

export function addXP(amount) {
  const p = GameState.player;
  p.xp += amount;
  let leveled = false;
  // Tope normal de nivel 100 (parte 62); derrotar un dios lo eleva a 1000
  // (partes 176/230). El XP de más queda "guardado" en p.xp hasta que el
  // tope suba: no se pierde, solo espera.
  const cap = p.godsDefeated.length > 0 ? LEVEL_CAP_GOD : LEVEL_CAP_NORMAL;
  while (p.xp >= p.xpToNext && p.level < cap) {
    p.xp -= p.xpToNext;
    p.level += 1;
    p.maxHp += 10;
    p.hp = p.maxHp;
    p.strength += 1;
    p.xpToNext = Math.round(p.xpToNext * 1.12);
    leveled = true;
  }
  EventBus.emit('stats-changed');
  if (leveled) EventBus.emit('levelup', p.level);
  saveState();
}

// ---------- Vida / energía / hambre ----------

export function damagePlayer(amount) {
  const p = GameState.player;
  if (!p.alive) return;
  // La defensa (armadura equipada) reduce el daño de forma plana, pero
  // siempre se recibe al menos 1 de daño para que la defensa nunca vuelva
  // al jugador invencible.
  const reduced = Math.max(1, Math.round(amount - (p.defense || 0)));
  p.hp = Math.max(0, p.hp - reduced);
  if (p.hp === 0) {
    p.alive = false;
    p.deathCount += 1;
    EventBus.emit('player-died');
  }
  EventBus.emit('stats-changed');
  saveState();
}

export function healPlayer(amount) {
  const p = GameState.player;
  p.hp = Math.min(p.maxHp, p.hp + amount);
  EventBus.emit('stats-changed');
  saveState();
}

export function changeEnergy(delta) {
  const p = GameState.player;
  p.energy = Phaser_clamp(p.energy + delta, 0, p.maxEnergy);
  EventBus.emit('stats-changed');
}

export function changeHunger(delta) {
  const p = GameState.player;
  p.hunger = Phaser_clamp(p.hunger + delta, 0, p.maxHunger);
  EventBus.emit('stats-changed');
}

function Phaser_clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

export function revivePlayer() {
  const p = GameState.player;
  p.alive = true;
  p.hp = p.maxHp;
  p.energy = p.maxEnergy;
  p.hunger = p.maxHunger;
  EventBus.emit('stats-changed');
  saveState();
}

// Costo progresivo de revivir, según el documento de diseño (partes 273-278).
export function getReviveCost() {
  const n = GameState.player.deathCount;
  if (n <= 1) return { gold: 100, gems: 5 };
  if (n === 2) return { gold: 500, gems: 100 };
  return { gold: 1000, gems: 1000 };
}

// ---------- Fase 2: equipo ----------

function applyBonuses(bonuses, sign) {
  if (!bonuses) return;
  const p = GameState.player;
  if (bonuses.strength) p.strength = Math.max(0, p.strength + sign * bonuses.strength);
  if (bonuses.speed) p.speed = Math.max(0.1, p.speed + sign * bonuses.speed);
  if (bonuses.defense) p.defense = Math.max(0, p.defense + sign * bonuses.defense);
  if (bonuses.maxHp) {
    p.maxHp = Math.max(1, p.maxHp + sign * bonuses.maxHp);
    p.hp = sign > 0 ? Math.min(p.maxHp, p.hp + bonuses.maxHp) : Math.min(p.hp, p.maxHp);
  }
  if (bonuses.maxMana) {
    p.maxMana = Math.max(0, p.maxMana + sign * bonuses.maxMana);
    p.mana = sign > 0 ? Math.min(p.maxMana, p.mana + bonuses.maxMana) : Math.min(p.mana, p.maxMana);
  }
}

export function ownsItem(itemId) {
  return GameState.ownedItems.includes(itemId);
}

/** Compra un ítem del catálogo (si no se tiene ya) y lo equipa de una vez. */
export function buyEquipItem(itemId) {
  const item = getItem(itemId);
  if (!item) return false;
  if (ownsItem(itemId)) return equipItem(itemId);
  const gold = item.price?.gold || 0;
  const gems = item.price?.gems || 0;
  if (!spendCurrency(gold, gems)) {
    EventBus.emit('notify', t('notify.insufficientResources'));
    return false;
  }
  GameState.ownedItems.push(itemId);
  saveState();
  return equipItem(itemId);
}

/** Equipa un ítem del catálogo (itemCatalog.js) en su slot, si se cumplen los requisitos. */
export function equipItem(itemId) {
  const item = getItem(itemId);
  if (!item) return false;
  if (GameState.player.level < item.levelReq) {
    EventBus.emit('notify', t('notify.levelTooLow'));
    return false;
  }
  if (item.classReq && GameState.character?.id !== item.classReq) {
    EventBus.emit('notify', t('notify.wrongClass'));
    return false;
  }
  const prevId = GameState.equipment[item.slot];
  if (prevId) {
    const prev = getItem(prevId);
    if (prev) applyBonuses(prev.bonuses, -1);
  }
  GameState.equipment[item.slot] = itemId;
  applyBonuses(item.bonuses, 1);
  EventBus.emit('notify', t('notify.equipped'));
  EventBus.emit('stats-changed');
  EventBus.emit('equipment-changed');
  saveState();
  return true;
}

/** Quita el ítem equipado en `slot` (si hay uno) y revierte sus bonos. */
export function unequipItem(slot) {
  const itemId = GameState.equipment[slot];
  if (!itemId) return;
  const item = getItem(itemId);
  if (item) applyBonuses(item.bonuses, -1);
  GameState.equipment[slot] = null;
  EventBus.emit('stats-changed');
  EventBus.emit('equipment-changed');
  saveState();
}

// ---------- Fase 2: magia ----------

export function changeMana(delta) {
  const p = GameState.player;
  p.mana = Math.min(p.maxMana, Math.max(0, p.mana + delta));
  EventBus.emit('stats-changed');
}

export function hasSpell(spellId) {
  return GameState.player.unlockedSpells.includes(spellId);
}

export function unlockSpell(spellId) {
  if (hasSpell(spellId)) return;
  GameState.player.unlockedSpells.push(spellId);
  EventBus.emit('notify', t('notify.spellUnlocked'));
  EventBus.emit('spell-unlocked', spellId);
  saveState();
}

// ---------- Fase 2: dioses y altares ----------

/** Cuenta un monstruo elemental derrotado; puede hacer aparecer un nuevo altar (parte 198). */
export function incrementElementalKills(godId) {
  GameState.world.elementalKills[godId] = (GameState.world.elementalKills[godId] || 0) + 1;
  saveState();
  return GameState.world.elementalKills[godId];
}

/** Cuenta un altar destruido de un dios; a los 10 (ALTARS_TO_SUMMON_GOD) el dios despierta (parte 189). */
export function incrementAltarsDestroyed(godId) {
  GameState.world.altarsDestroyed[godId] = (GameState.world.altarsDestroyed[godId] || 0) + 1;
  EventBus.emit('notify', t('notify.altarDestroyed'));
  EventBus.emit('altar-destroyed', godId);
  saveState();
  return GameState.world.altarsDestroyed[godId];
}

export function markGodSummoned(godId) {
  if (!GameState.world.godsSummoned.includes(godId)) {
    GameState.world.godsSummoned.push(godId);
    saveState();
  }
}

/** Marca un dios como derrotado: desbloquea progresión hasta nivel 1000 (partes 176/230). */
export function recordGodDefeat(godId) {
  if (GameState.player.godsDefeated.includes(godId)) return;
  GameState.player.godsDefeated.push(godId);
  EventBus.emit('notify', t('notify.godDefeated'));
  EventBus.emit('god-defeated', godId);
  saveState();
}

// ---------- Fase 2: logros ----------

export function hasAchievement(id) {
  return GameState.achievements.includes(id);
}

/** Desbloquea un logro una sola vez y entrega su recompensa. */
export function unlockAchievement(id, reward = {}) {
  if (hasAchievement(id)) return false;
  GameState.achievements.push(id);
  if (reward.gold) GameState.currency.gold += reward.gold;
  if (reward.gems) GameState.currency.gems += reward.gems;
  EventBus.emit('currency-changed');
  EventBus.emit('achievement-unlocked', id);
  saveState();
  return true;
}

// ---------- Fase 2: estadísticas para logros ----------

/** Suma 1 (o `n`) a un contador de src/state.js `stats` y devuelve el nuevo valor. */
export function bumpStat(key, n = 1) {
  GameState.stats[key] = (GameState.stats[key] || 0) + n;
  saveState();
  return GameState.stats[key];
}
