import Phaser from 'phaser';
import { TEX } from '../textureKeys.js';
import { SCENES } from '../sceneKeys.js';
import { PALETTE, GAME_TITLE } from '../constants.js';
import { GameState, saveState } from '../state.js';
import { initChat } from '../net/chat.js';
import { renderLegalOverlay } from '../ui/LegalPages.js';
import { t, getLanguage, getAvailableLanguages, setLanguage } from '../i18n.js';
import { unlockAudio, playSound } from '../systems/sound.js';

// Pantalla de título: elección de personaje + botón Jugar + pie de página legal.

const CHARACTERS = [
  { id: 'guerrero', nameKey: 'char.guerrero', tex: TEX.PLAYER_GUERRERO },
  { id: 'exploradora', nameKey: 'char.exploradora', tex: TEX.PLAYER_EXPLORADORA },
  { id: 'mago', nameKey: 'char.mago', tex: TEX.PLAYER_MAGO }
];

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super(SCENES.MENU);
    this.cardRefs = [];
  }

  create() {
    // Inicia el chat (fire-and-forget): así el historial ya está listo
    // cuando el jugador llegue al HUD.
    initChat();

    // El audio del navegador está bloqueado hasta el primer gesto del
    // usuario; el primer click/tecla en el menú lo desbloquea para todo el juego.
    this.input.once('pointerdown', unlockAudio);
    this.input.keyboard.once('keydown', unlockAudio);

    const w = this.scale.width;
    const h = this.scale.height;

    this.add.rectangle(0, 0, w, h, 0x0b0f14, 1).setOrigin(0, 0);

    this.#buildLanguageSelector(w);

    this.add.text(w / 2, h * 0.14, GAME_TITLE, {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '52px',
      color: '#ffcc4d',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(w / 2, h * 0.14 + 46, t('menu.subtitle'), {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '16px',
      color: '#cfd6e0'
    }).setOrigin(0.5);

    // ---- Tarjetas de personaje ----
    const cardW = 150;
    const cardH = 190;
    const gap = 24;
    const totalW = CHARACTERS.length * cardW + (CHARACTERS.length - 1) * gap;
    const startX = w / 2 - totalW / 2;
    const cardY = h * 0.32;

    this.cardRefs = CHARACTERS.map((char, i) => {
      const x = startX + i * (cardW + gap);
      return this.#buildCharacterCard(char, x, cardY, cardW, cardH);
    });

    this.#highlightSelected();

    // ---- Botón Jugar ----
    const playW = 240;
    const playH = 60;
    const playX = w / 2 - playW / 2;
    const playY = cardY + cardH + 50;

    const playBtn = this.add.rectangle(playX, playY, playW, playH, PALETTE.uiAccent, 1)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    this.add.text(playX + playW / 2, playY + playH / 2, t('menu.play'), {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '26px',
      color: '#14181f',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    playBtn.on('pointerover', () => playBtn.setScale(1.03));
    playBtn.on('pointerout', () => playBtn.setScale(1));
    playBtn.on('pointerup', () => {
      playSound('build');
      saveState();
      this.scene.start(SCENES.WORLD);
    });

    // ---- Pie de página: links legales ----
    const footerY = h - 24;
    const links = [
      { label: t('menu.footer.eula'), kind: 'eula' },
      { label: t('menu.footer.privacy'), kind: 'privacy' },
      { label: t('menu.footer.credits'), kind: 'credits' }
    ];
    const linkGap = 90;
    const linkStartX = w / 2 - ((links.length - 1) * linkGap) / 2;

    links.forEach((link, i) => {
      const txt = this.add.text(linkStartX + i * linkGap, footerY, link.label, {
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '13px',
        color: '#8a93a3'
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      txt.on('pointerover', () => txt.setColor('#ffcc4d'));
      txt.on('pointerout', () => txt.setColor('#8a93a3'));
      txt.on('pointerup', () => renderLegalOverlay(this, link.kind));
    });
  }

  /** Fila de banderas arriba a la derecha para elegir idioma (cambiarlo recarga la página). */
  #buildLanguageSelector(w) {
    const current = getLanguage();
    const langs = getAvailableLanguages();
    const size = 30;
    const gap = 6;
    const totalW = langs.length * size + (langs.length - 1) * gap;
    const startX = w - 16 - totalW;
    const y = 14;

    langs.forEach((lang, i) => {
      const x = startX + i * (size + gap);
      const selected = lang.code === current;
      const box = this.add.rectangle(x, y, size, size, PALETTE.uiBg, selected ? 1 : 0.5)
        .setOrigin(0, 0)
        .setStrokeStyle(selected ? 2 : 1, selected ? PALETTE.uiAccent : 0x333944, 1)
        .setInteractive({ useHandCursor: true });
      this.add.text(x + size / 2, y + size / 2, lang.flag, { fontSize: '16px' }).setOrigin(0.5);
      box.on('pointerup', () => {
        if (lang.code !== current) setLanguage(lang.code);
      });
    });
  }

  #buildCharacterCard(char, x, y, cardW, cardH) {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, cardW, cardH, PALETTE.uiBg, 1).setOrigin(0, 0);
    bg.setStrokeStyle(2, 0x333944, 1);
    bg.setInteractive({ useHandCursor: true });

    const sprite = this.add.image(cardW / 2, cardH * 0.42, char.tex).setScale(1.6);

    const label = this.add.text(cardW / 2, cardH - 30, t(char.nameKey), {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '16px',
      color: '#e8e8e8',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    container.add([bg, sprite, label]);

    bg.on('pointerup', () => {
      playSound('notify');
      GameState.character = { id: char.id, name: t(char.nameKey) };
      this.#highlightSelected();
    });

    return { char, container, bg };
  }

  #highlightSelected() {
    const selectedId = GameState.character?.id;
    this.cardRefs.forEach(({ char, container, bg }) => {
      const isSelected = char.id === selectedId;
      bg.setStrokeStyle(isSelected ? 4 : 2, isSelected ? PALETTE.uiAccent : 0x333944, 1);
      container.setScale(isSelected ? 1.06 : 1);
    });
  }
}
