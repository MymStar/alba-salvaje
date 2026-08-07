import Phaser from 'phaser';
import { SCENES } from '../sceneKeys.js';
import { TEX } from '../textureKeys.js';
import { PALETTE } from '../constants.js';
import { EventBus } from '../eventBus.js';
import { GameState, spendCurrency, revivePlayer, resetState, getReviveCost } from '../state.js';
import { setBuildModeActive, isBuildModeActive } from '../buildSelection.js';
import { createInventoryBar } from '../ui/InventoryUI.js';
import { openShop } from '../ui/ShopUI.js';
import { openBuildMenu } from '../ui/BuildingUI.js';
import { createChatPanel } from '../ui/ChatUI.js';

// HUDScene corre en paralelo a WorldScene (lanzada por WorldScene con
// this.scene.launch). Solo dibuja UI encima del mundo: no toca la lógica
// de juego directamente, todo pasa por EventBus / GameState / módulos
// compartidos (buildSelection, state).

const BAR_W = 200;
const BAR_H = 14;
const BAR_GAP = 6;

export default class HUDScene extends Phaser.Scene {
  constructor() {
    super(SCENES.HUD);
  }

  create() {
    this._chatApi = null;

    this.#buildStatBars();
    this.#buildCurrencyCounters();
    createInventoryBar(this);
    this.#buildActionButtons();
    this.#buildToast();
    this.#buildLevelUpPopup();
    this.#buildDeathModal();

    this._chatApi = createChatPanel(this);

    EventBus.on('stats-changed', this.#refreshStats, this);
    EventBus.on('currency-changed', this.#refreshCurrency, this);
    EventBus.on('levelup', this.#showLevelUp, this);
    EventBus.on('notify', this.#showToast, this);
    EventBus.on('player-died', this.#showDeathModal, this);

    this.events.once('shutdown', () => {
      EventBus.off('stats-changed', this.#refreshStats, this);
      EventBus.off('currency-changed', this.#refreshCurrency, this);
      EventBus.off('levelup', this.#showLevelUp, this);
      EventBus.off('notify', this.#showToast, this);
      EventBus.off('player-died', this.#showDeathModal, this);
    });

    this.#refreshStats();
    this.#refreshCurrency();
  }

  // ---------------- Barras de vida/energía/hambre/xp ----------------

  #buildStatBars() {
    const x = 16;
    let y = 16;

    this._hpBar = this.#createBar(x, y, PALETTE.hp, 'Vida');
    y += BAR_H + BAR_GAP;
    this._energyBar = this.#createBar(x, y, PALETTE.energy, 'Energía');
    y += BAR_H + BAR_GAP;
    this._hungerBar = this.#createBar(x, y, PALETTE.hunger, 'Hambre');
    y += BAR_H + BAR_GAP;
    this._xpBar = this.#createBar(x, y, PALETTE.xp, 'Nivel 1');
  }

  #createBar(x, y, color, label) {
    const bg = this.add.rectangle(x, y, BAR_W, BAR_H, 0x000000, 0.5).setOrigin(0, 0).setScrollFactor(0).setDepth(400);
    bg.setStrokeStyle(1, 0x333944, 1);
    const fill = this.add.rectangle(x + 1, y + 1, BAR_W - 2, BAR_H - 2, color, 1).setOrigin(0, 0).setScrollFactor(0).setDepth(401);
    const text = this.add.text(x + BAR_W / 2, y + BAR_H / 2, label, {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '10px',
      color: '#ffffff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(402);
    return { bg, fill, text, x, y };
  }

  #setBarValue(bar, value, max, label) {
    const ratio = max > 0 ? Phaser.Math.Clamp(value / max, 0, 1) : 0;
    bar.fill.width = Math.max(0, (BAR_W - 2) * ratio);
    bar.text.setText(label);
  }

  #refreshStats() {
    const p = GameState.player;
    this.#setBarValue(this._hpBar, p.hp, p.maxHp, `Vida ${Math.round(p.hp)}/${p.maxHp}`);
    this.#setBarValue(this._energyBar, p.energy, p.maxEnergy, `Energía ${Math.round(p.energy)}/${p.maxEnergy}`);
    this.#setBarValue(this._hungerBar, p.hunger, p.maxHunger, `Hambre ${Math.round(p.hunger)}/${p.maxHunger}`);
    this.#setBarValue(this._xpBar, p.xp, p.xpToNext, `Nivel ${p.level} — XP ${p.xp}/${p.xpToNext}`);
  }

  // ---------------- Oro / diamantes ----------------

  #buildCurrencyCounters() {
    const w = this.scale.width;
    const y = 16;

    this._goldIcon = this.add.image(w - 130, y + 8, TEX.ICON_GOLD).setScrollFactor(0).setDepth(400);
    this._goldText = this.add.text(w - 116, y, '0', {
      fontFamily: 'Segoe UI, sans-serif', fontSize: '14px', color: '#ffcc4d', fontStyle: 'bold'
    }).setOrigin(0, 0).setScrollFactor(0).setDepth(400);

    this._gemIcon = this.add.image(w - 60, y + 8, TEX.ICON_GEM).setScrollFactor(0).setDepth(400);
    this._gemText = this.add.text(w - 46, y, '0', {
      fontFamily: 'Segoe UI, sans-serif', fontSize: '14px', color: '#6fd9ff', fontStyle: 'bold'
    }).setOrigin(0, 0).setScrollFactor(0).setDepth(400);
  }

  #refreshCurrency() {
    this._goldText.setText(String(GameState.currency.gold));
    this._gemText.setText(String(GameState.currency.gems));
  }

  // ---------------- Botones de acción ----------------

  #buildActionButtons() {
    const h = this.scale.height;
    const buttons = [
      { label: '🏪 Tienda', onClick: () => openShop(this) },
      {
        label: '🔨 Construir',
        onClick: () => {
          const active = !isBuildModeActive();
          setBuildModeActive(active);
          EventBus.emit('build-mode-changed', active);
          openBuildMenu(this);
        }
      },
      { label: '💬 Chat', onClick: () => this._chatApi && this._chatApi.toggle() }
    ];

    let x = 16;
    const y = h - 44 - 60;
    buttons.forEach((btnDef) => {
      const btn = this.add.text(x, y, btnDef.label, {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '14px',
        color: '#14181f',
        backgroundColor: '#ffcc4d',
        padding: { x: 10, y: 6 }
      }).setScrollFactor(0).setDepth(400).setInteractive({ useHandCursor: true });
      btn.on('pointerup', btnDef.onClick);
      x += btn.width + 10;
    });
  }

  // ---------------- Toast de notificaciones ----------------

  #buildToast() {
    const w = this.scale.width;
    const h = this.scale.height;
    this._toastText = this.add.text(w / 2, h - 90, '', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#14181f',
      padding: { x: 12, y: 6 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(9500).setAlpha(0);
  }

  #showToast(message) {
    this._toastText.setText(message).setAlpha(1);
    if (this._toastTween) this._toastTween.stop();
    if (this._toastTimer) this._toastTimer.remove();
    this._toastTimer = this.time.delayedCall(1400, () => {
      this._toastTween = this.tweens.add({
        targets: this._toastText,
        alpha: 0,
        duration: 600
      });
    });
  }

  // ---------------- Popup de subida de nivel ----------------

  #buildLevelUpPopup() {
    const w = this.scale.width;
    const h = this.scale.height;
    this._levelUpText = this.add.text(w / 2, h / 2 - 80, '', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '32px',
      color: '#8bd450',
      fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(9500).setAlpha(0).setScale(0.6);
  }

  #showLevelUp(level) {
    this._levelUpText.setText(`¡Nivel ${level}!`).setAlpha(1).setScale(0.6);
    this.tweens.add({
      targets: this._levelUpText,
      scale: 1.15,
      alpha: 1,
      duration: 300,
      ease: 'Back.Out',
      yoyo: false,
      onComplete: () => {
        this.tweens.add({
          targets: this._levelUpText,
          alpha: 0,
          delay: 700,
          duration: 500
        });
      }
    });
  }

  // ---------------- Modal de muerte ----------------

  #buildDeathModal() {
    const w = this.scale.width;
    const h = this.scale.height;

    this._deathContainer = this.add.container(0, 0).setDepth(9800).setScrollFactor(0).setVisible(false);

    const bg = this.add.rectangle(0, 0, w, h, 0x000000, 0.8).setOrigin(0, 0);
    const panelW = Math.min(380, w - 40);
    const panelH = 220;
    const panelX = w / 2 - panelW / 2;
    const panelY = h / 2 - panelH / 2;
    const panel = this.add.rectangle(panelX, panelY, panelW, panelH, PALETTE.uiBg, 0.98).setOrigin(0, 0);
    panel.setStrokeStyle(2, PALETTE.hp, 1);

    const title = this.add.text(w / 2, panelY + 24, 'Has muerto', {
      fontFamily: 'Segoe UI, sans-serif', fontSize: '24px', color: '#e0473f', fontStyle: 'bold'
    }).setOrigin(0.5);

    const costText = this.add.text(w / 2, panelY + 66, '', {
      fontFamily: 'Segoe UI, sans-serif', fontSize: '14px', color: '#cfd6e0'
    }).setOrigin(0.5);

    const messageText = this.add.text(w / 2, panelY + 96, '', {
      fontFamily: 'Segoe UI, sans-serif', fontSize: '12px', color: '#ffcc4d', wordWrap: { width: panelW - 40 }
    }).setOrigin(0.5, 0);

    const reviveBtn = this.add.text(w / 2, panelY + panelH - 60, 'Revivir', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '16px',
      color: '#14181f',
      backgroundColor: '#8bd450',
      padding: { x: 16, y: 8 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const resetBtn = this.add.text(w / 2, panelY + panelH - 24, 'Reiniciar desde cero', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '12px',
      color: '#e8e8e8',
      backgroundColor: '#3a3f4a',
      padding: { x: 10, y: 6 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setVisible(false);

    reviveBtn.on('pointerup', () => {
      const cost = getReviveCost();
      const ok = spendCurrency(cost.gold, cost.gems);
      if (ok) {
        revivePlayer();
        this._deathContainer.setVisible(false);
      } else {
        messageText.setText('No tienes suficiente oro/diamantes.');
        resetBtn.setVisible(true);
      }
    });

    resetBtn.on('pointerup', () => {
      resetState();
      this._deathContainer.setVisible(false);
      this.scene.stop(SCENES.WORLD);
      this.scene.start(SCENES.WORLD);
    });

    this._deathContainer.add([bg, panel, title, costText, messageText, reviveBtn, resetBtn]);
    this._deathCostText = costText;
    this._deathMessageText = messageText;
    this._deathResetBtn = resetBtn;
  }

  #showDeathModal() {
    const cost = getReviveCost();
    this._deathCostText.setText(`Costo de revivir: ${cost.gold} oro + ${cost.gems} diamantes`);
    this._deathMessageText.setText('');
    this._deathResetBtn.setVisible(false);
    this._deathContainer.setVisible(true);
  }
}
