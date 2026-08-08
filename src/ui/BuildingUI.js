// Panel de selección de construcción para HUDScene.
// Elegir una opción fija el tipo seleccionado (buildSelection.js) para que
// WorldScene lo use al colocar la construcción en modo construcción.

import { PALETTE, BUILDABLE_TYPES } from '../constants.js';
import { TEX } from '../textureKeys.js';
import { setSelectedBuildType } from '../buildSelection.js';
import { t } from '../i18n.js';
import { playSound } from '../systems/sound.js';

function buildOptions() {
  return [
    { type: BUILDABLE_TYPES.WALL_WOOD, name: t('build.wall'), icon: TEX.BUILD_WALL_WOOD, costLabel: t('build.wall.cost') },
    { type: BUILDABLE_TYPES.FARM_PLOT, name: t('build.farm'), icon: TEX.BUILD_FARM_PLOT, costLabel: t('build.farm.cost') },
    { type: BUILDABLE_TYPES.DOOR, name: t('build.door'), icon: TEX.BUILD_DOOR, costLabel: t('build.door.cost') },
    // Fase 3 (parte 13): fogata, para ver de noche/en cuevas.
    { type: BUILDABLE_TYPES.CAMPFIRE, name: t('build.campfire'), icon: TEX.BUILD_CAMPFIRE_ICON, costLabel: t('build.campfire.cost') }
  ];
}

/**
 * Abre el menú de construcción sobre el HUD.
 * @param {Phaser.Scene} hudScene
 */
export function openBuildMenu(hudScene) {
  closeBuildMenu(hudScene);

  const w = hudScene.scale.width;
  const h = hudScene.scale.height;

  const container = hudScene.add.container(0, 0).setDepth(9000).setScrollFactor(0);
  hudScene._buildMenuOverlay = container;

  const bg = hudScene.add.rectangle(0, 0, w, h, 0x000000, 0.6).setOrigin(0, 0).setInteractive();
  container.add(bg);

  const panelW = Math.min(360, w - 40);
  const panelH = buildOptions().length * 76 + 70;
  const panelX = w / 2 - panelW / 2;
  const panelY = h / 2 - panelH / 2;

  const panel = hudScene.add.rectangle(panelX, panelY, panelW, panelH, PALETTE.uiBg, 0.98).setOrigin(0, 0);
  panel.setStrokeStyle(2, PALETTE.uiAccent, 1);
  container.add(panel);

  const title = hudScene.add.text(panelX + 16, panelY + 12, t('build.title'), {
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
  closeBtn.on('pointerup', () => closeBuildMenu(hudScene));
  container.add(closeBtn);

  let y = panelY + 50;
  buildOptions().forEach((opt) => {
    const rowBg = hudScene.add.rectangle(panelX + 16, y, panelW - 32, 64, 0x1c212b, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x333944, 1)
      .setInteractive({ useHandCursor: true });
    const icon = hudScene.add.image(panelX + 44, y + 32, opt.icon).setScale(1.4);
    const name = hudScene.add.text(panelX + 76, y + 14, opt.name, {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '15px',
      color: '#e8e8e8',
      fontStyle: 'bold'
    });
    const cost = hudScene.add.text(panelX + 76, y + 36, opt.costLabel, {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '12px',
      color: '#8a93a3'
    });

    rowBg.on('pointerup', () => {
      playSound('notify');
      setSelectedBuildType(opt.type);
      closeBuildMenu(hudScene);
    });

    container.add([rowBg, icon, name, cost]);
    y += 76;
  });

  bg.on('pointerup', () => closeBuildMenu(hudScene));
}

/**
 * Cierra el menú de construcción si está abierto.
 * @param {Phaser.Scene} hudScene
 */
export function closeBuildMenu(hudScene) {
  if (hudScene._buildMenuOverlay) {
    hudScene._buildMenuOverlay.destroy(true);
    hudScene._buildMenuOverlay = null;
  }
}
