// Catálogo de objetos equipables (armas, armaduras, accesorios).
// Precios siguen la escala del documento de diseño (parte 238): básicos
// 1-50 oro, intermedios 100-500 oro/diamantes, legendarios 1000+1000.
//
// `bonuses` se suman/restan directamente a GameState.player al
// equipar/desequipar (ver equipItem/unequipItem en state.js).
// `classReq` (opcional) limita el ítem a un personaje concreto.
// `range` (solo armas) determina el alcance de ataque del jugador.

import { EQUIP_SLOTS, ITEM_RARITY, WEAPON_RANGE, TOOL_TYPES } from './constants.js';
import { TEX } from './textureKeys.js';

export const ITEMS = [
  // ---- Armas ----
  {
    id: 'sword_wood',
    slot: EQUIP_SLOTS.WEAPON,
    nameKey: 'item.sword_wood',
    tex: TEX.ICON_SWORD,
    rarity: ITEM_RARITY.BASIC,
    price: { gold: 40 },
    levelReq: 1,
    range: WEAPON_RANGE.SHORT,
    bonuses: { strength: 2 }
  },
  {
    id: 'bow_hunter',
    slot: EQUIP_SLOTS.WEAPON,
    nameKey: 'item.bow_hunter',
    tex: TEX.ICON_BOW,
    rarity: ITEM_RARITY.INTERMEDIATE,
    price: { gold: 220 },
    levelReq: 5,
    range: WEAPON_RANGE.MEDIUM,
    bonuses: { strength: 4 }
  },
  {
    id: 'staff_apprentice',
    slot: EQUIP_SLOTS.WEAPON,
    nameKey: 'item.staff_apprentice',
    tex: TEX.ICON_STAFF,
    rarity: ITEM_RARITY.INTERMEDIATE,
    price: { gold: 260, gems: 20 },
    levelReq: 5,
    range: WEAPON_RANGE.LONG,
    bonuses: { strength: 1, maxMana: 20 }
  },
  {
    id: 'sword_legend',
    slot: EQUIP_SLOTS.WEAPON,
    nameKey: 'item.sword_legend',
    tex: TEX.ICON_SWORD,
    rarity: ITEM_RARITY.LEGENDARY,
    price: { gold: 1000, gems: 1000 },
    levelReq: 500,
    range: WEAPON_RANGE.SHORT,
    bonuses: { strength: 15 }
  },

  // ---- Armaduras ----
  {
    id: 'armor_leather',
    slot: EQUIP_SLOTS.ARMOR,
    nameKey: 'item.armor_leather',
    tex: TEX.ICON_ARMOR_LIGHT,
    rarity: ITEM_RARITY.BASIC,
    price: { gold: 35 },
    levelReq: 1,
    bonuses: { defense: 2, maxHp: 10 }
  },
  {
    id: 'armor_heavy',
    slot: EQUIP_SLOTS.ARMOR,
    nameKey: 'item.armor_heavy',
    tex: TEX.ICON_ARMOR_HEAVY,
    rarity: ITEM_RARITY.INTERMEDIATE,
    price: { gold: 300 },
    levelReq: 10,
    classReq: 'guerrero',
    bonuses: { defense: 6, maxHp: 30 }
  },
  {
    id: 'robe_mage',
    slot: EQUIP_SLOTS.ARMOR,
    nameKey: 'item.robe_mage',
    tex: TEX.ICON_ROBE,
    rarity: ITEM_RARITY.INTERMEDIATE,
    price: { gold: 280, gems: 10 },
    levelReq: 10,
    classReq: 'mago',
    bonuses: { defense: 2, maxMana: 30 }
  },
  {
    id: 'armor_divine',
    slot: EQUIP_SLOTS.ARMOR,
    nameKey: 'item.armor_divine',
    tex: TEX.ICON_ARMOR_HEAVY,
    rarity: ITEM_RARITY.LEGENDARY,
    price: { gold: 1000, gems: 1000 },
    levelReq: 500,
    bonuses: { defense: 20, maxHp: 100 }
  },

  // ---- Accesorios ----
  {
    id: 'ring_mana',
    slot: EQUIP_SLOTS.ACCESSORY,
    nameKey: 'item.ring_mana',
    tex: TEX.ICON_RING,
    rarity: ITEM_RARITY.BASIC,
    price: { gold: 45 },
    levelReq: 1,
    bonuses: { maxMana: 10 }
  },
  {
    id: 'boots_swift',
    slot: EQUIP_SLOTS.ACCESSORY,
    nameKey: 'item.boots_swift',
    tex: TEX.ICON_BOOTS,
    rarity: ITEM_RARITY.INTERMEDIATE,
    price: { gold: 240 },
    levelReq: 8,
    bonuses: { speed: 0.25 }
  },
  {
    id: 'amulet_divine',
    slot: EQUIP_SLOTS.ACCESSORY,
    nameKey: 'item.amulet_divine',
    tex: TEX.ICON_AMULET,
    rarity: ITEM_RARITY.LEGENDARY,
    price: { gold: 1000, gems: 1000 },
    levelReq: 500,
    bonuses: { strength: 10, defense: 10, speed: 0.3 }
  },

  // ---- Fase 3 (parte 10 del pedido): herramientas para recolectar recursos
  // (pico/hacha/martillo) y romper estructuras. Sin bono de stats: son
  // utilitarias, no ofensivas — ver systems/gathering.js. `toolType` es el
  // campo que gathering.js lee para saber si la herramienta equipada sirve
  // para el nodo que se está golpeando.
  {
    id: 'pickaxe_basic',
    slot: EQUIP_SLOTS.TOOL,
    nameKey: 'item.pickaxe_basic',
    tex: TEX.ICON_PICKAXE,
    rarity: ITEM_RARITY.BASIC,
    price: { gold: 25 },
    levelReq: 1,
    toolType: TOOL_TYPES.PICKAXE
  },
  {
    id: 'axe_basic',
    slot: EQUIP_SLOTS.TOOL,
    nameKey: 'item.axe_basic',
    tex: TEX.ICON_AXE,
    rarity: ITEM_RARITY.BASIC,
    price: { gold: 25 },
    levelReq: 1,
    toolType: TOOL_TYPES.AXE
  },
  {
    id: 'hammer_basic',
    slot: EQUIP_SLOTS.TOOL,
    nameKey: 'item.hammer_basic',
    tex: TEX.ICON_HAMMER,
    rarity: ITEM_RARITY.BASIC,
    price: { gold: 30 },
    levelReq: 1,
    toolType: TOOL_TYPES.HAMMER
  },
  {
    id: 'pickaxe_iron',
    slot: EQUIP_SLOTS.TOOL,
    nameKey: 'item.pickaxe_iron',
    tex: TEX.ICON_PICKAXE,
    rarity: ITEM_RARITY.INTERMEDIATE,
    price: { gold: 180 },
    levelReq: 8,
    toolType: TOOL_TYPES.PICKAXE
  },
  {
    id: 'axe_iron',
    slot: EQUIP_SLOTS.TOOL,
    nameKey: 'item.axe_iron',
    tex: TEX.ICON_AXE,
    rarity: ITEM_RARITY.INTERMEDIATE,
    price: { gold: 180 },
    levelReq: 8,
    toolType: TOOL_TYPES.AXE
  }
];

export function getItem(id) {
  return ITEMS.find((i) => i.id === id) || null;
}

export function getItemsBySlot(slot) {
  return ITEMS.filter((i) => i.slot === slot);
}

export function getAllItems() {
  return ITEMS;
}
