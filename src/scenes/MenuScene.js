import Phaser from 'phaser';
import { TEX } from '../textureKeys.js';
import { SCENES } from '../sceneKeys.js';
import { PALETTE, GAME_TITLE } from '../constants.js';
import { GameState, saveState } from '../state.js';
import { initChat } from '../net/chat.js';
import { renderLegalOverlay } from '../ui/LegalPages.js';

// Pantalla de título: elección de personaje + botón Jugar + pie de página legal.

const CHARACTERS = [
  { id: 'guerrero', name: 'Guerrero', tex: TEX.PLAYER_GUERRERO },
  { id: 'exploradora', name: 'Exploradora', tex: TEX.PLAYER_EXPLORADORA },
  { id: 'mago', name: 'Mago', tex: TEX.PLAYER_MAGO }
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

    const w = this.scale.width;
    const h = this.scale.height;

    this.add.rectangle(0, 0, w, h, 0x0b0f14, 1).setOrigin(0, 0);

    this.add.text(w / 2, h * 0.14, GAME_TITLE, {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '52px',
      color: '#ffcc4d',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(w / 2, h * 0.14 + 46, 'Un mundo abierto por explorar, construir y sobrevivir', {
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
    this.add.text(playX + playW / 2, playY + playH / 2, 'Jugar', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '26px',
      color: '#14181f',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    playBtn.on('pointerover', () => playBtn.setScale(1.03));
    playBtn.on('pointerout', () => playBtn.setScale(1));
    playBtn.on('pointerup', () => {
      saveState();
      this.scene.start(SCENES.WORLD);
    });

    // ---- Pie de página: links legales ----
    const footerY = h - 24;
    const links = [
      { label: 'EULA', kind: 'eula' },
      { label: 'Privacidad', kind: 'privacy' },
      { label: 'Créditos', kind: 'credits' }
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

  #buildCharacterCard(char, x, y, cardW, cardH) {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, cardW, cardH, PALETTE.uiBg, 1).setOrigin(0, 0);
    bg.setStrokeStyle(2, 0x333944, 1);
    bg.setInteractive({ useHandCursor: true });

    const sprite = this.add.image(cardW / 2, cardH * 0.42, char.tex).setScale(1.6);

    const label = this.add.text(cardW / 2, cardH - 30, char.name, {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '16px',
      color: '#e8e8e8',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    container.add([bg, sprite, label]);

    bg.on('pointerup', () => {
      GameState.character = { id: char.id, name: char.name };
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
