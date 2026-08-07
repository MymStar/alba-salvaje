// Barra de hechizos (Fase 2) para HUDScene: fila fija de 4 iconos, siempre
// visible (no es un modal). Se posiciona en la esquina superior derecha,
// debajo de los contadores de oro/diamantes (que HUDScene dibuja en
// y=16..~40), para no superponerse con el resto del HUD.

import { SPELLS, castSpell } from '../systems/magic.js';
import { GameState, hasSpell } from '../state.js';
import { EventBus } from '../eventBus.js';
import { SCENES } from '../sceneKeys.js';
import { t } from '../i18n.js';

const BAR_Y = 60; // debajo de los contadores de oro/diamantes (y=16..~40)
const ICON_SPACING = 36;
const RIGHT_MARGIN = 30;

/**
 * Crea la barra fija de hechizos en el HUD. Se llama una sola vez.
 * @param {Phaser.Scene} hudScene
 * @returns {Phaser.GameObjects.Container}
 */
export function createSpellBar(hudScene) {
  const w = hudScene.scale.width;
  const startX = w - RIGHT_MARGIN - ICON_SPACING * (SPELLS.length - 1);

  const container = hudScene.add.container(0, 0).setScrollFactor(0).setDepth(400);
  hudScene._spellBarContainer = container;

  const entries = [];
  let tooltip = null;

  SPELLS.forEach((spell, i) => {
    const x = startX + i * ICON_SPACING;

    const icon = hudScene.add.image(x, BAR_Y, spell.tex).setScrollFactor(0).setInteractive({ useHandCursor: true });
    container.add(icon);
    entries.push({ icon, spell, x });

    icon.on('pointerover', () => {
      if (hasSpell(spell.id)) return;
      if (tooltip) {
        tooltip.destroy();
        tooltip = null;
      }
      tooltip = hudScene.add.text(x, BAR_Y + 38, t('spell.locked', { level: spell.levelReq }), {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '10px',
        color: '#ffffff',
        backgroundColor: '#14181f',
        padding: { x: 4, y: 2 }
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(401);
      container.add(tooltip);
    });

    icon.on('pointerout', () => {
      if (tooltip) {
        tooltip.destroy();
        tooltip = null;
      }
    });

    icon.on('pointerup', () => {
      if (!hasSpell(spell.id)) return;
      const worldScene = hudScene.scene.get(SCENES.WORLD);
      const player = worldScene?.player;
      if (worldScene && player) {
        castSpell(worldScene, spell.id, player);
      }
    });
  });

  const manaText = hudScene.add.text(startX + (ICON_SPACING * (SPELLS.length - 1)) / 2, BAR_Y + 20, '', {
    fontFamily: 'Segoe UI, sans-serif',
    fontSize: '11px',
    color: '#b58cff',
    fontStyle: 'bold'
  }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(400);
  container.add(manaText);

  function refreshUnlocked() {
    entries.forEach(({ icon, spell }) => {
      icon.setAlpha(hasSpell(spell.id) ? 1 : 0.35);
    });
  }

  function refreshMana() {
    const p = GameState.player;
    manaText.setText(t('spell.mana', { cur: Math.round(p.mana), max: p.maxMana }));
  }

  refreshUnlocked();
  refreshMana();

  EventBus.on('spell-unlocked', refreshUnlocked);
  EventBus.on('stats-changed', refreshMana);

  return container;
}
