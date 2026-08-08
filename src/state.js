// Estado central del jugador (vida, energía, hambre, nivel, inventario, monedas).
// Módulo con estado mutable + funciones puras de acceso, para que World/Entities/UI
// lean y escriban desde el mismo lugar sin duplicar lógica.
//
// IMPORTANTE: 'gold' y 'gems' son monedas VIRTUALES que se ganan jugando.
// No hay ninguna integración de pago con dinero real en este prototipo (ver src/ui/ShopUI.js).
//
// ---- Fase 3 (2026-08-08, parte 1 del pedido): varios personajes independientes ----
// Antes había UN solo guardado plano (STORAGE_KEYS.SAVE). Ahora hay una lista de
// "slots" de personaje (STORAGE_KEYS.SLOTS = {ids, activeId}) y cada personaje se
// guarda aparte bajo STORAGE_KEYS.SLOT_PREFIX + id, con la MISMA forma de datos
// que el guardado viejo. `GameState` sigue siendo el MISMO objeto singleton que
// todo el resto del juego importa y muta directamente (Player, WorldScene, UI...);
// lo que cambia es que ahora se "recarga" con Object.assign cada vez que se activa
// un personaje distinto (ver selectCharacter). Así ningún otro módulo tuvo que
// cambiar cómo lee/escribe GameState.

import { EventBus } from './eventBus.js';
import { STORAGE_KEYS, LEVEL_CAP_NORMAL, LEVEL_CAP_GOD, GENDER, MAX_CHARACTER_SLOTS } from './constants.js';
import { getItem } from './itemCatalog.js';
import { t } from './i18n.js';

function genId() {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Estado por defecto de UN personaje nuevo.
 * `classId` es 'guerrero'|'exploradora'|'mago' (se guarda en character.id por
 * compatibilidad: Player.js/itemCatalog.js ya comprueban GameState.character.id
 * para elegir textura/requisitos de clase, y así no tuvieron que cambiar).
 */
function defaultCharacterState(slotId, name, gender, classId) {
  return {
    character: {
      slotId,
      id: classId || 'guerrero',
      name: name || 'Guerrero',
      gender: gender || GENDER.MALE
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
      accessory: null,
      tool: null
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

/** Fusiona un guardado parcial (de una versión anterior del juego) con los defaults, por-objeto. */
function mergeWithDefaults(base, parsed) {
  return {
    ...base,
    ...parsed,
    character: { ...base.character, ...parsed.character },
    player: { ...base.player, ...parsed.player },
    equipment: { ...base.equipment, ...parsed.equipment },
    world: { ...base.world, ...parsed.world },
    stats: { ...base.stats, ...parsed.stats },
    currency: { ...base.currency, ...parsed.currency }
  };
}

// ---------- Índice de slots ----------

function loadSlotsIndex() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SLOTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.ids)) return parsed;
    }
  } catch (e) {
    console.warn('No se pudo leer el índice de personajes.', e);
  }
  return { ids: [], activeId: null };
}

function saveSlotsIndex(index) {
  try {
    localStorage.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(index));
  } catch (e) {
    console.warn('No se pudo guardar el índice de personajes.', e);
  }
}

function loadCharacterRaw(id) {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SLOT_PREFIX + id);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`No se pudo leer el personaje ${id}.`, e);
    return null;
  }
}

function saveCharacterRaw(id, data) {
  try {
    localStorage.setItem(STORAGE_KEYS.SLOT_PREFIX + id, JSON.stringify(data));
  } catch (e) {
    console.warn(`No se pudo guardar el personaje ${id}.`, e);
  }
}

/**
 * Migración de partidas viejas (Fase 1/2, guardado único en STORAGE_KEYS.SAVE):
 * si existe y todavía no hay ningún slot, se convierte en el primer personaje.
 * Corre una sola vez, la primera vez que se carga el juego tras esta actualización.
 */
function migrateLegacySaveIfNeeded(index) {
  if (index.ids.length > 0) return index;
  let legacy = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SAVE);
    if (raw) legacy = JSON.parse(raw);
  } catch (e) {
    legacy = null;
  }
  if (!legacy) return index;

  const id = genId();
  const base = defaultCharacterState(id, legacy.character?.name || 'Guerrero', GENDER.MALE, legacy.character?.id);
  const merged = mergeWithDefaults(base, legacy);
  merged.character.slotId = id;
  saveCharacterRaw(id, merged);
  const next = { ids: [id], activeId: id };
  saveSlotsIndex(next);
  return next;
}

// ---------- Estado activo (singleton compartido por todo el juego) ----------

export const GameState = loadActive();

function loadActive() {
  let index = migrateLegacySaveIfNeeded(loadSlotsIndex());

  if (index.activeId) {
    const raw = loadCharacterRaw(index.activeId);
    if (raw) {
      const base = defaultCharacterState(index.activeId, raw.character?.name, raw.character?.gender, raw.character?.id);
      return mergeWithDefaults(base, raw);
    }
  }

  // Sin personaje activo (primera vez que se juega, o el activo se borró):
  // devuelve un estado "vacío" de cortesía; MenuScene detecta esto con
  // hasActiveCharacter()===false y muestra la pantalla de crear personaje
  // antes de dejar entrar al mundo.
  return defaultCharacterState(null, '', GENDER.MALE, 'guerrero');
}

/** true si hay un personaje activo de verdad (no el placeholder vacío). */
export function hasActiveCharacter() {
  return !!GameState.character.slotId;
}

/** Resumen de todos los personajes guardados, para la pantalla de selección. */
export function listCharacters() {
  const index = loadSlotsIndex();
  return index.ids
    .map((id) => {
      const raw = loadCharacterRaw(id);
      if (!raw) return null;
      return {
        id,
        name: raw.character?.name || '???',
        gender: raw.character?.gender || GENDER.MALE,
        classId: raw.character?.id || 'guerrero',
        level: raw.player?.level || 1,
        alive: raw.player?.alive !== false
      };
    })
    .filter(Boolean);
}

export function getMaxCharacterSlots() {
  return MAX_CHARACTER_SLOTS;
}

/** Guarda el personaje ACTUALMENTE activo en su propio slot (no toca a los demás). */
export function saveState() {
  if (!GameState.character.slotId) return;
  saveCharacterRaw(GameState.character.slotId, GameState);
}

/**
 * Crea un personaje nuevo (parte 2: género + clase) y lo deja guardado, pero
 * NO lo activa automáticamente — llamar a selectCharacter(id) después si se
 * quiere jugar con él de inmediato. Devuelve el id nuevo, o null si ya se
 * llegó al máximo de slots.
 */
export function createCharacter(name, gender, classId) {
  const index = loadSlotsIndex();
  if (index.ids.length >= MAX_CHARACTER_SLOTS) return null;

  const id = genId();
  const data = defaultCharacterState(id, name, gender, classId);
  saveCharacterRaw(id, data);
  index.ids.push(id);
  saveSlotsIndex(index);
  return id;
}

/**
 * Activa un personaje: guarda el que estaba activo (si había uno) y carga el
 * elegido dentro del MISMO objeto GameState (así todo el resto del juego,
 * que ya tiene una referencia a GameState, ve los datos nuevos sin tener que
 * reimportar nada). Emite los eventos de refresco de UI relevantes.
 */
export function selectCharacter(id) {
  if (GameState.character.slotId) saveState();

  const raw = loadCharacterRaw(id);
  if (!raw) return false;

  const base = defaultCharacterState(id, raw.character?.name, raw.character?.gender, raw.character?.id);
  const merged = mergeWithDefaults(base, raw);
  Object.assign(GameState, merged);

  const index = loadSlotsIndex();
  index.activeId = id;
  if (!index.ids.includes(id)) index.ids.push(id);
  saveSlotsIndex(index);

  EventBus.emit('character-changed');
  EventBus.emit('stats-changed');
  EventBus.emit('currency-changed');
  EventBus.emit('inventory-changed');
  EventBus.emit('equipment-changed');
  return true;
}

/** Borra un personaje por completo (guardado + su slot). No se puede deshacer. */
export function deleteCharacter(id) {
  const index = loadSlotsIndex();
  index.ids = index.ids.filter((i) => i !== id);
  if (index.activeId === id) index.activeId = null;
  saveSlotsIndex(index);
  try {
    localStorage.removeItem(STORAGE_KEYS.SLOT_PREFIX + id);
  } catch (e) {
    // no-op
  }
}

/**
 * Parte 1 del pedido: al morir, el jugador puede "empezar de cero" — reinicia
 * SOLO el personaje activo a nivel 1 (conserva su nombre/género/clase/id de
 * slot, así sigue siendo "el mismo personaje" pero recomienza su progreso).
 * Los demás personajes guardados no se tocan para nada.
 */
export function restartCurrentCharacter() {
  const { slotId, name, gender, id: classId } = GameState.character;
  const fresh = defaultCharacterState(slotId, name, gender, classId);
  Object.assign(GameState, fresh);
  saveState();
  EventBus.emit('stats-changed');
  EventBus.emit('currency-changed');
  EventBus.emit('inventory-changed');
  EventBus.emit('equipment-changed');
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
    // Fase 3 (parte 7): vida Y maná crecen con el nivel, y se rellenan del
    // todo cada vez que se sube (antes solo la vida crecía/se rellenaba).
    p.maxHp += 10;
    p.hp = p.maxHp;
    p.maxMana += 5;
    p.mana = p.maxMana;
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

/**
 * Fase 3 (parte 14): otorga un ítem del catálogo SIN cobrar nada (botín de
 * cofres de cueva, recompensas de monstruos, etc.). No lo equipa solo.
 */
export function grantOwnedItem(itemId) {
  if (!getItem(itemId)) return false;
  if (!ownsItem(itemId)) GameState.ownedItems.push(itemId);
  EventBus.emit('inventory-changed');
  saveState();
  return true;
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
