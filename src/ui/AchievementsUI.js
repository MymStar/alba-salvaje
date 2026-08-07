// Panel de logros (Fase 2) para HUDScene. Mismo estilo modal que
// BuildingUI.js / EquipmentUI.js. Lista compacta (10 logros) con check
// visual de desbloqueados.

import { PALETTE } from '../constants.js';
import { getAchievementStatus } from '../systems/achievements.js';
import { EventBus } from '../eventBus.js';
import { t } from '../i18n.js';

const ROW_H = 30;

/**
 * Abre el panel de logros sobre el HUD.
 * @param {Phaser.Scene} hudScene
 */
export function openAchievements(hudScene) {
  closeAchievements(hudScene);

  const w = hudScene.scale.width;
  const h = hudScene.scale.height;

  const container = hudScene.add.container(0, 0).setDepth(9000).setScrollFactor(0);
  hudScene._achievementsOverlay = container;

  const bg = hudScene.add.rectangle(0, 0, w, h, 0x000000, 0.7).setOrigin(0, 0).setInteractive();
  container.add(bg);
  bg.on('pointerup', () => closeAchievements(hudScene));

  const list = getAchievementStatus();

  const panelW = Math.min(420, w - 40);
  const panelH = Math.min(60 + list.length * ROW_H + 16, h - 40);
  const panelX = w / 2 - panelW / 2;
  const panelY = h / 2 - panelH / 2;

  const panel = hudScene.add.rectangle(panelX, panelY, panelW, panelH, PALETTE.uiBg, 0.98).setOrigin(0, 0);
  panel.setStrokeStyle(2, PALETTE.uiAccent, 1);
  container.add(panel);

  const title = hudScene.add.text(panelX + 16, panelY + 12, t('achievements.title'), {
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
  closeBtn.on('pointerup', () => closeAchievements(hudScene));
  container.add(closeBtn);

  let y = panelY + 48;
  list.forEach((a) => {
    const rowBg = hudScene.add.rectangle(panelX + 16, y, panelW - 32, ROW_H - 4, a.unlocked ? 0x1e2b1c : 0x1c212b, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(1, a.unlocked ? 0x3f6b35 : 0x333944, 1);
    container.add(rowBg);

    const check = hudScene.add.text(panelX + 24, y + (ROW_H - 4) / 2, a.unlocked ? '✅' : '⬜', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '13px'
    }).setOrigin(0, 0.5);
    container.add(check);

    const name = hudScene.add.text(panelX + 48, y + (ROW_H - 4) / 2, t(a.nameKey), {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '12px',
      color: a.unlocked ? '#8bd450' : '#8a93a3'
    }).setOrigin(0, 0.5);
    container.add(name);

    y += ROW_H;
  });

  // Refresca la lista completa (re-dibuja) cada vez que se desbloquea un logro.
  const changeHandler = () => openAchievements(hudScene);
  EventBus.on('achievement-unlocked', changeHandler);
  hudScene._achievementsChangeHandler = changeHandler;
}

/**
 * Cierra el panel de logros si está abierto.
 * @param {Phaser.Scene} hudScene
 */
export function closeAchievements(hudScene) {
  if (hudScene._achievementsChangeHandler) {
    EventBus.off('achievement-unlocked', hudScene._achievementsChangeHandler);
    hudScene._achievementsChangeHandler = null;
  }
  if (hudScene._achievementsOverlay) {
    hudScene._achievementsOverlay.destroy(true);
    hudScene._achievementsOverlay = null;
  }
}
