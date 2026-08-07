// Barra de inventario inferior para HUDScene.
// Muestra hasta 8 slots con el ícono del recurso + cantidad. Click en comida
// (fruta/carne) la consume vía systems/hunger.js (propiedad de Agente B).

import { EventBus } from '../eventBus.js';
import { GameState } from '../state.js';
import { PALETTE } from '../constants.js';
import { TEX } from '../textureKeys.js';
import { eatFood } from '../systems/hunger.js';

const SLOT_COUNT = 8;
const SLOT_SIZE = 44;
const SLOT_GAP = 6;

const ICON_BY_TYPE = {
  wood: TEX.ICON_WOOD,
  stone: TEX.ICON_STONE,
  fiber: TEX.ICON_FIBER,
  food_fruit: TEX.ICON_FOOD_FRUIT,
  food_meat: TEX.ICON_FOOD_MEAT,
  crystal: TEX.ICON_CRYSTAL,
  gold: TEX.ICON_GOLD,
  gem: TEX.ICON_GEM
};

const EDIBLE_TYPES = new Set(['food_fruit', 'food_meat']);

/**
 * Crea la barra de inventario en la parte inferior de la pantalla.
 * @param {Phaser.Scene} hudScene
 */
export function createInventoryBar(hudScene) {
  const w = hudScene.scale.width;
  const h = hudScene.scale.height;

  const totalW = SLOT_COUNT * SLOT_SIZE + (SLOT_COUNT - 1) * SLOT_GAP;
  const startX = w / 2 - totalW / 2;
  const y = h - SLOT_SIZE - 12;

  const container = hudScene.add.container(0, 0).setDepth(500).setScrollFactor(0);

  const slots = [];
  for (let i = 0; i < SLOT_COUNT; i++) {
    const x = startX + i * (SLOT_SIZE + SLOT_GAP);
    const bg = hudScene.add.rectangle(x, y, SLOT_SIZE, SLOT_SIZE, PALETTE.uiBg, 0.85)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x333944, 1)
      .setInteractive({ useHandCursor: true });
    const icon = hudScene.add.image(x + SLOT_SIZE / 2, y + SLOT_SIZE / 2 - 4, TEX.ICON_WOOD)
      .setVisible(false);
    const qtyText = hudScene.add.text(x + SLOT_SIZE - 4, y + SLOT_SIZE - 4, '', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '11px',
      color: '#ffffff'
    }).setOrigin(1, 1);

    container.add([bg, icon, qtyText]);
    slots.push({ bg, icon, qtyText, type: null });
  }

  function refresh() {
    const items = GameState.inventory || [];
    for (let i = 0; i < SLOT_COUNT; i++) {
      const slot = slots[i];
      const item = items[i];
      if (item && ICON_BY_TYPE[item.type]) {
        slot.type = item.type;
        slot.icon.setTexture(ICON_BY_TYPE[item.type]).setVisible(true);
        slot.qtyText.setText(String(item.qty));
      } else {
        slot.type = null;
        slot.icon.setVisible(false);
        slot.qtyText.setText('');
      }
    }
  }

  slots.forEach((slot) => {
    slot.bg.on('pointerup', () => {
      if (slot.type && EDIBLE_TYPES.has(slot.type)) {
        eatFood(slot.type);
      }
    });
  });

  EventBus.on('inventory-changed', refresh);
  hudScene.events.once('shutdown', () => EventBus.off('inventory-changed', refresh));

  refresh();

  return container;
}
