// Panel de equipo (Fase 2) para HUDScene: ver qué hay puesto en cada slot,
// quitarlo, y comprar/equipar cualquier ítem del catálogo. Mismo estilo
// visual que BuildingUI.js / ShopUI.js (panel modal centrado sobre el HUD).

import { PALETTE, EQUIP_SLOTS } from '../constants.js';
import { TEX } from '../textureKeys.js';
import { getItem, getItemsBySlot } from '../itemCatalog.js';
import { GameState, ownsItem, buyEquipItem, equipItem, unequipItem } from '../state.js';
import { EventBus } from '../eventBus.js';
import { t } from '../i18n.js';
import { playSound } from '../systems/sound.js';

const SLOT_LABEL_KEY = {
  [EQUIP_SLOTS.WEAPON]: 'equip.weapon',
  [EQUIP_SLOTS.ARMOR]: 'equip.armor',
  [EQUIP_SLOTS.ACCESSORY]: 'equip.accessory',
  [EQUIP_SLOTS.TOOL]: 'equip.tool' // Fase 3 (parte 10): pico/hacha/martillo
};

const SLOT_ORDER = [EQUIP_SLOTS.WEAPON, EQUIP_SLOTS.ARMOR, EQUIP_SLOTS.ACCESSORY, EQUIP_SLOTS.TOOL];

/**
 * Abre el panel de equipo sobre el HUD.
 * @param {Phaser.Scene} hudScene
 */
export function openEquipment(hudScene) {
  closeEquipment(hudScene);

  const w = hudScene.scale.width;
  const h = hudScene.scale.height;

  const container = hudScene.add.container(0, 0).setDepth(9000).setScrollFactor(0);
  hudScene._equipmentOverlay = container;

  const bg = hudScene.add.rectangle(0, 0, w, h, 0x000000, 0.7).setOrigin(0, 0).setInteractive();
  container.add(bg);
  bg.on('pointerup', () => closeEquipment(hudScene));

  const panelW = Math.min(560, w - 40);
  const panelH = Math.min(520, h - 40);
  const panelX = w / 2 - panelW / 2;
  const panelY = h / 2 - panelH / 2;

  const panel = hudScene.add.rectangle(panelX, panelY, panelW, panelH, PALETTE.uiBg, 0.98).setOrigin(0, 0);
  panel.setStrokeStyle(2, PALETTE.uiAccent, 1);
  container.add(panel);

  const title = hudScene.add.text(panelX + 16, panelY + 12, t('equip.title'), {
    fontFamily: 'Segoe UI, sans-serif',
    fontSize: '18px',
    color: '#ffcc4d',
    fontStyle: 'bold'
  });
  container.add(title);

  const closeBtn = hudScene.add.text(panelX + panelW - 14, panelY + 12, '✕', {
    fontFamily: 'Segoe UI, sans-serif',
    fontSize: '16px',
    color: '#e8e8e8'
  }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
  closeBtn.on('pointerup', () => closeEquipment(hudScene));
  container.add(closeBtn);

  // ---- Filas de equipo actualmente puesto ----
  let y = panelY + 46;
  const rowGap = 46;
  SLOT_ORDER.forEach((slot) => {
    const rowBg = hudScene.add.rectangle(panelX + 16, y, panelW - 32, 40, 0x1c212b, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x333944, 1);
    container.add(rowBg);

    const slotLabel = hudScene.add.text(panelX + 26, y + 20, t(SLOT_LABEL_KEY[slot]), {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '12px',
      color: '#8a93a3'
    }).setOrigin(0, 0.5);
    container.add(slotLabel);

    const equippedId = GameState.equipment[slot];
    const item = equippedId ? getItem(equippedId) : null;

    if (item) {
      const icon = hudScene.add.image(panelX + 120, y + 20, item.tex);
      container.add(icon);

      const name = hudScene.add.text(panelX + 138, y + 20, t(item.nameKey), {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '13px',
        color: '#e8e8e8',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);
      container.add(name);

      const unequipBtn = hudScene.add.text(panelX + panelW - 26, y + 20, t('equip.unequip'), {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '11px',
        color: '#14181f',
        backgroundColor: '#e0473f',
        padding: { x: 8, y: 4 }
      }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
      unequipBtn.on('pointerup', () => {
        playSound('notify');
        unequipItem(slot);
      });
      container.add(unequipBtn);
    } else {
      const empty = hudScene.add.text(panelX + 120, y + 20, t('equip.empty'), {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '13px',
        color: '#666c78'
      }).setOrigin(0, 0.5);
      container.add(empty);
    }

    y += rowGap;
  });

  // ---- Lista de todos los ítems disponibles, agrupada por slot (scrolleable) ----
  const listY = y + 6;
  const listH = Math.max(60, panelY + panelH - 16 - listY);

  const maskShape = hudScene.make.graphics();
  maskShape.fillStyle(0xffffff);
  maskShape.fillRect(panelX + 16, listY, panelW - 32, listH);
  const mask = maskShape.createGeometryMask();
  hudScene._equipmentMaskShape = maskShape;

  const listContainer = hudScene.add.container(0, 0);
  listContainer.setMask(mask);
  container.add(listContainer);

  const rowH = 34;
  let ly = listY;

  SLOT_ORDER.forEach((slot) => {
    const sectionLabel = hudScene.add.text(panelX + 16, ly, t(SLOT_LABEL_KEY[slot]), {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '12px',
      color: '#ffcc4d',
      fontStyle: 'bold'
    });
    listContainer.add(sectionLabel);
    ly += 20;

    getItemsBySlot(slot).forEach((it) => {
      const rowBg = hudScene.add.rectangle(panelX + 16, ly, panelW - 32, rowH - 4, 0x161a22, 1).setOrigin(0, 0);
      listContainer.add(rowBg);

      const icon = hudScene.add.image(panelX + 32, ly + (rowH - 4) / 2, it.tex).setScale(0.85);
      listContainer.add(icon);

      const name = hudScene.add.text(panelX + 50, ly + 3, t(it.nameKey), {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '11px',
        color: '#e8e8e8'
      });
      listContainer.add(name);

      let px = panelX + 50;
      const priceY = ly + 17;
      if (it.price.gold) {
        const gi = hudScene.add.image(px + 6, priceY + 6, TEX.ICON_GOLD).setScale(0.5);
        listContainer.add(gi);
        const gt = hudScene.add.text(px + 14, priceY, String(it.price.gold), {
          fontFamily: 'Segoe UI, sans-serif', fontSize: '10px', color: '#ffcc4d'
        });
        listContainer.add(gt);
        px += 14 + gt.width + 8;
      }
      if (it.price.gems) {
        const gi2 = hudScene.add.image(px + 6, priceY + 6, TEX.ICON_GEM).setScale(0.5);
        listContainer.add(gi2);
        const gt2 = hudScene.add.text(px + 14, priceY, String(it.price.gems), {
          fontFamily: 'Segoe UI, sans-serif', fontSize: '10px', color: '#6fd9ff'
        });
        listContainer.add(gt2);
        px += 14 + gt2.width + 8;
      }
      const reqText = hudScene.add.text(px, priceY, t('equip.levelReq', { level: it.levelReq }), {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '10px',
        color: '#8a93a3'
      });
      listContainer.add(reqText);

      const owned = ownsItem(it.id);
      const isEquipped = GameState.equipment[it.slot] === it.id;
      const label = isEquipped ? t('equip.equip') : (owned ? t('equip.equip') : t('equip.buy'));
      const actionBtn = hudScene.add.text(panelX + panelW - 26, ly + (rowH - 4) / 2, label, {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '10px',
        color: '#14181f',
        backgroundColor: isEquipped ? '#555b66' : (owned ? '#8bd450' : '#ffcc4d'),
        padding: { x: 6, y: 4 }
      }).setOrigin(1, 0.5);

      if (!isEquipped) {
        actionBtn.setInteractive({ useHandCursor: true });
        actionBtn.on('pointerup', () => {
          playSound('notify');
          if (owned) {
            equipItem(it.id);
          } else {
            buyEquipItem(it.id);
          }
        });
      }
      listContainer.add(actionBtn);

      ly += rowH;
    });

    ly += 6;
  });

  const totalContentH = ly - listY;
  const minY = Math.min(0, listH - totalContentH);

  const onWheel = (_pointer, _gameObjects, _dx, dy) => {
    listContainer.y = Math.max(minY, Math.min(0, listContainer.y - dy * 0.5));
  };
  hudScene.input.on('wheel', onWheel);
  hudScene._equipmentWheelHandler = onWheel;

  // Refresca el panel completo cada vez que cambie el equipo (compra/equipar/quitar).
  const changeHandler = () => openEquipment(hudScene);
  EventBus.on('equipment-changed', changeHandler);
  hudScene._equipmentChangeHandler = changeHandler;
}

/**
 * Cierra el panel de equipo si está abierto.
 * @param {Phaser.Scene} hudScene
 */
export function closeEquipment(hudScene) {
  if (hudScene._equipmentChangeHandler) {
    EventBus.off('equipment-changed', hudScene._equipmentChangeHandler);
    hudScene._equipmentChangeHandler = null;
  }
  if (hudScene._equipmentWheelHandler) {
    hudScene.input.off('wheel', hudScene._equipmentWheelHandler);
    hudScene._equipmentWheelHandler = null;
  }
  if (hudScene._equipmentMaskShape) {
    hudScene._equipmentMaskShape.destroy();
    hudScene._equipmentMaskShape = null;
  }
  if (hudScene._equipmentOverlay) {
    hudScene._equipmentOverlay.destroy(true);
    hudScene._equipmentOverlay = null;
  }
}
