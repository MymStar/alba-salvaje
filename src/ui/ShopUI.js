// Tienda del HUD: pestaña de compras con monedas virtuales (oro/diamantes) y
// pestaña de solo lectura con los paquetes premium (dinero real) del
// documento de diseño. NINGÚN pago real se procesa aquí.

import { PALETTE } from '../constants.js';
import { TEX } from '../textureKeys.js';
import { spendCurrency, addItem, changeEnergy, healPlayer } from '../state.js';
import { EventBus } from '../eventBus.js';

// ---- Ítems comprables con monedas virtuales ----
const SHOP_ITEMS = [
  { id: 'wood10', name: 'Madera x10', icon: TEX.ICON_WOOD, cost: { gold: 10 }, buy: () => addItem('wood', 10) },
  { id: 'stone10', name: 'Piedra x10', icon: TEX.ICON_STONE, cost: { gold: 15 }, buy: () => addItem('stone', 10) },
  { id: 'fiber10', name: 'Fibra x10', icon: TEX.ICON_FIBER, cost: { gold: 8 }, buy: () => addItem('fiber', 10) },
  { id: 'fruit5', name: 'Fruta x5', icon: TEX.ICON_FOOD_FRUIT, cost: { gold: 12 }, buy: () => addItem('food_fruit', 5) },
  { id: 'meat5', name: 'Carne x5', icon: TEX.ICON_FOOD_MEAT, cost: { gold: 20 }, buy: () => addItem('food_meat', 5) },
  { id: 'potion', name: 'Poción de energía', icon: TEX.ICON_CRYSTAL, cost: { gold: 50 }, buy: () => changeEnergy(40) },
  { id: 'heal', name: 'Botiquín', icon: TEX.ICON_FOOD_MEAT, cost: { gold: 120 }, buy: () => healPlayer(50) },
  { id: 'crystal3', name: 'Cristales x3', icon: TEX.ICON_CRYSTAL, cost: { gold: 250 }, buy: () => addItem('crystal', 3) },
  { id: 'crystalGem', name: 'Cristales raros x5', icon: TEX.ICON_CRYSTAL, cost: { gems: 20 }, buy: () => addItem('crystal', 5) },
  {
    id: 'legendaryChest',
    name: 'Cofre legendario',
    icon: TEX.ICON_GEM,
    cost: { gold: 1000, gems: 1000 },
    buy: () => {
      addItem('crystal', 20);
      addItem('food_meat', 20);
      addItem('wood', 50);
    }
  }
];

// ---- Paquetes premium (dinero real) — solo lectura, "Próximamente" ----
const GOLD_PACKAGES = [
  { qty: 100, price: '$1' },
  { qty: 200, price: '$5' },
  { qty: 300, price: '$15' },
  { qty: 400, price: '$40' },
  { qty: 500, price: '$100' }
];

const GEM_PACKAGES = [
  { qty: 100, price: '$2' },
  { qty: 200, price: '$10' },
  { qty: 300, price: '$50' },
  { qty: 400, price: '$200' },
  { qty: 500, price: '$1000' }
];

const SPECIAL_PACKAGES = [
  { name: 'Épico', gold: 5000, gems: 5000, price: '$1500' },
  { name: 'Legendario', gold: 10000, gems: 10000, price: '$2000' },
  { name: 'Único', gold: 100000, gems: 100000, price: '$3000' }
];

/**
 * Abre el panel de la tienda sobre el HUD.
 * @param {Phaser.Scene} hudScene
 */
export function openShop(hudScene) {
  closeShop(hudScene);

  const w = hudScene.scale.width;
  const h = hudScene.scale.height;

  const container = hudScene.add.container(0, 0).setDepth(9000).setScrollFactor(0);
  hudScene._shopOverlay = container;

  const bg = hudScene.add.rectangle(0, 0, w, h, 0x000000, 0.7).setOrigin(0, 0).setInteractive();
  container.add(bg);

  const panelW = Math.min(560, w - 40);
  const panelH = Math.min(460, h - 40);
  const panelX = w / 2 - panelW / 2;
  const panelY = h / 2 - panelH / 2;

  const panel = hudScene.add.rectangle(panelX, panelY, panelW, panelH, PALETTE.uiBg, 0.98).setOrigin(0, 0);
  panel.setStrokeStyle(2, PALETTE.uiAccent, 1);
  container.add(panel);

  hudScene._shopState = { tab: 'gold', panelX, panelY, panelW, panelH, container };

  const closeBtn = hudScene.add.text(panelX + panelW - 14, panelY + 10, '✕', {
    fontFamily: 'Segoe UI, sans-serif',
    fontSize: '18px',
    color: '#e8e8e8'
  }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
  closeBtn.on('pointerup', () => closeShop(hudScene));
  container.add(closeBtn);

  // Pestañas
  const tabShop = hudScene.add.text(panelX + 20, panelY + 14, 'Tienda (oro/diamantes)', {
    fontFamily: 'Segoe UI, sans-serif',
    fontSize: '14px',
    color: '#ffcc4d',
    fontStyle: 'bold'
  }).setInteractive({ useHandCursor: true });

  const tabPremium = hudScene.add.text(panelX + 20, panelY + 36, 'Paquetes premium (dinero real)', {
    fontFamily: 'Segoe UI, sans-serif',
    fontSize: '14px',
    color: '#8a93a3'
  }).setInteractive({ useHandCursor: true });

  container.add([tabShop, tabPremium]);

  const bodyContainer = hudScene.add.container(0, 0);
  container.add(bodyContainer);
  hudScene._shopState.bodyContainer = bodyContainer;
  hudScene._shopState.tabShop = tabShop;
  hudScene._shopState.tabPremium = tabPremium;

  tabShop.on('pointerup', () => setTab(hudScene, 'gold'));
  tabPremium.on('pointerup', () => setTab(hudScene, 'premium'));

  bg.on('pointerup', () => closeShop(hudScene));

  renderTab(hudScene);
}

function setTab(hudScene, tab) {
  if (!hudScene._shopState) return;
  hudScene._shopState.tab = tab;
  hudScene._shopState.tabShop.setColor(tab === 'gold' ? '#ffcc4d' : '#8a93a3');
  hudScene._shopState.tabPremium.setColor(tab === 'premium' ? '#ffcc4d' : '#8a93a3');
  renderTab(hudScene);
}

function renderTab(hudScene) {
  const st = hudScene._shopState;
  if (!st) return;
  st.bodyContainer.removeAll(true);

  if (st.tab === 'gold') {
    renderShopItems(hudScene, st);
  } else {
    renderPremiumPackages(hudScene, st);
  }
}

function renderShopItems(hudScene, st) {
  const { panelX, panelY, panelW, bodyContainer } = st;
  const cols = 2;
  const cellW = (panelW - 40) / cols;
  const cellH = 66;
  const startY = panelY + 70;

  SHOP_ITEMS.forEach((item, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = panelX + 20 + col * cellW;
    const y = startY + row * cellH;

    const rowBg = hudScene.add.rectangle(x, y, cellW - 8, cellH - 8, 0x1c212b, 1).setOrigin(0, 0);
    rowBg.setStrokeStyle(1, 0x333944, 1);
    const icon = hudScene.add.image(x + 22, y + (cellH - 8) / 2, item.icon).setScale(1.1);
    const label = hudScene.add.text(x + 44, y + 8, item.name, {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '12px',
      color: '#e8e8e8'
    });
    const costText = formatCost(item.cost);
    const priceLabel = hudScene.add.text(x + 44, y + 26, costText, {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '11px',
      color: '#ffcc4d'
    });

    const buyBtn = hudScene.add.text(x + cellW - 44, y + (cellH - 8) / 2, 'Comprar', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '11px',
      color: '#14181f',
      backgroundColor: '#8bd450',
      padding: { x: 6, y: 4 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    buyBtn.on('pointerup', () => {
      const ok = spendCurrency(item.cost.gold || 0, item.cost.gems || 0);
      if (ok) {
        item.buy();
        EventBus.emit('notify', `Compraste: ${item.name}`);
      } else {
        EventBus.emit('notify', 'No tienes suficiente oro/diamantes');
      }
    });

    bodyContainer.add([rowBg, icon, label, priceLabel, buyBtn]);
  });
}

function formatCost(cost) {
  const parts = [];
  if (cost.gold) parts.push(`${cost.gold} oro`);
  if (cost.gems) parts.push(`${cost.gems} diamantes`);
  return parts.join(' + ');
}

function renderPremiumPackages(hudScene, st) {
  const { panelX, panelY, panelW, bodyContainer } = st;
  let y = panelY + 68;

  const note = hudScene.add.text(
    panelX + 20,
    y,
    'Los pagos con dinero real requieren integrar un procesador de pagos seguro ' +
      '(ej. Stripe), configurado por el propietario del juego. Esta versión no ' +
      'procesa pagos reales.',
    {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '11px',
      color: '#8a93a3',
      wordWrap: { width: panelW - 40 }
    }
  );
  bodyContainer.add(note);
  y += note.height + 10;

  const colW = (panelW - 50) / 2;

  const goldTitle = hudScene.add.text(panelX + 20, y, 'Oro', {
    fontFamily: 'Segoe UI, sans-serif', fontSize: '13px', color: '#ffcc4d', fontStyle: 'bold'
  });
  const gemTitle = hudScene.add.text(panelX + 30 + colW, y, 'Diamantes', {
    fontFamily: 'Segoe UI, sans-serif', fontSize: '13px', color: '#6fd9ff', fontStyle: 'bold'
  });
  bodyContainer.add([goldTitle, gemTitle]);
  y += 20;

  const rows = Math.max(GOLD_PACKAGES.length, GEM_PACKAGES.length);
  for (let i = 0; i < rows; i++) {
    const g = GOLD_PACKAGES[i];
    const d = GEM_PACKAGES[i];
    if (g) {
      bodyContainer.add(hudScene.add.text(panelX + 20, y, `${g.qty} oro — ${g.price}`, {
        fontFamily: 'Segoe UI, sans-serif', fontSize: '12px', color: '#cfd6e0'
      }));
    }
    if (d) {
      bodyContainer.add(hudScene.add.text(panelX + 30 + colW, y, `${d.qty} diamantes — ${d.price}`, {
        fontFamily: 'Segoe UI, sans-serif', fontSize: '12px', color: '#cfd6e0'
      }));
    }
    y += 18;
  }

  y += 8;
  const specialTitle = hudScene.add.text(panelX + 20, y, 'Paquetes especiales', {
    fontFamily: 'Segoe UI, sans-serif', fontSize: '13px', color: '#ffcc4d', fontStyle: 'bold'
  });
  bodyContainer.add(specialTitle);
  y += 20;

  SPECIAL_PACKAGES.forEach((pkg) => {
    const line = hudScene.add.text(
      panelX + 20,
      y,
      `${pkg.name}: ${pkg.gold} oro + ${pkg.gems} diamantes — ${pkg.price}`,
      { fontFamily: 'Segoe UI, sans-serif', fontSize: '12px', color: '#cfd6e0' }
    );
    bodyContainer.add(line);
    y += 18;
  });

  y += 6;
  const soonBtn = hudScene.add.text(panelX + panelW / 2, y + 10, 'Próximamente', {
    fontFamily: 'Segoe UI, sans-serif',
    fontSize: '13px',
    color: '#666c78',
    backgroundColor: '#20242c',
    padding: { x: 14, y: 8 }
  }).setOrigin(0.5);
  bodyContainer.add(soonBtn);
}

/**
 * Cierra el panel de la tienda si está abierto.
 * @param {Phaser.Scene} hudScene
 */
export function closeShop(hudScene) {
  if (hudScene._shopOverlay) {
    hudScene._shopOverlay.destroy(true);
    hudScene._shopOverlay = null;
  }
  hudScene._shopState = null;
}
