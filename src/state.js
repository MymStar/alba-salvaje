// Estado central del jugador (vida, energía, hambre, nivel, inventario, monedas).
// Módulo con estado mutable + funciones puras de acceso, para que World/Entities/UI
// lean y escriban desde el mismo lugar sin duplicar lógica.
//
// IMPORTANTE: 'gold' y 'gems' son monedas VIRTUALES que se ganan jugando.
// No hay ninguna integración de pago con dinero real en este prototipo (ver src/ui/ShopUI.js).

import { EventBus } from './eventBus.js';
import { STORAGE_KEYS } from './constants.js';

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
      alive: true,
      deathCount: 0
    },
    inventory: [
      { type: 'wood', qty: 5 },
      { type: 'food_fruit', qty: 3 }
    ],
    world: {
      spawnX: 0,
      spawnY: 0,
      lastX: 0,
      lastY: 0
    }
  };
}

export const GameState = load();

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SAVE);
    if (raw) {
      const parsed = JSON.parse(raw);
      // merge superficial para tolerar versiones futuras con más campos
      return { ...defaultState(), ...parsed };
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
  while (p.xp >= p.xpToNext && p.level < 1000) {
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
  p.hp = Math.max(0, p.hp - amount);
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
