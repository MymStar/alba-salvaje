import Phaser from 'phaser';
import { TEX } from '../textureKeys.js';
import { SCENES } from '../sceneKeys.js';
import { PALETTE, GAME_TITLE, GENDER } from '../constants.js';
import {
  GameState,
  listCharacters,
  createCharacter,
  selectCharacter,
  deleteCharacter,
  getMaxCharacterSlots
} from '../state.js';
import { initChat } from '../net/chat.js';
import { renderLegalOverlay } from '../ui/LegalPages.js';
import { t, getLanguage, getAvailableLanguages, setLanguage } from '../i18n.js';
import { unlockAudio, playSound } from '../systems/sound.js';
import { getGrowthTextureKey } from '../entities/growthTextures.js';

// Pantalla de título — Fase 3 (parte 1 y 2 del pedido, 2026-08-08): ahora es
// una pantalla de SELECCIÓN/CREACIÓN de personaje (varios personajes
// independientes, cada uno con su propio género + clase + progreso), en vez
// de solo elegir una clase y jugar siempre con el mismo guardado único.

const CLASSES = [
  { id: 'guerrero', nameKey: 'char.guerrero', tex: TEX.PLAYER_GUERRERO },
  { id: 'exploradora', nameKey: 'char.exploradora', tex: TEX.PLAYER_EXPLORADORA },
  { id: 'mago', nameKey: 'char.mago', tex: TEX.PLAYER_MAGO }
];

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super(SCENES.MENU);
  }

  create() {
    // Inicia el chat (fire-and-forget): así el historial ya está listo
    // cuando el jugador llegue al HUD.
    initChat();

    // El audio del navegador está bloqueado hasta el primer gesto del
    // usuario; el primer click/tecla en el menú lo desbloquea para todo el juego.
    this.input.once('pointerdown', unlockAudio);
    this.input.keyboard.once('keydown', unlockAudio);

    this._nameInputEl = null;
    this._deleteConfirmId = null;
    this._deleteConfirmTimer = null;

    const w = this.scale.width;
    const h = this.scale.height;
    this.add.rectangle(0, 0, w, h, 0x0b0f14, 1).setOrigin(0, 0);
    this.#buildLanguageSelector(w);

    this.add.text(w / 2, h * 0.1, GAME_TITLE, {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '46px',
      color: '#ffcc4d',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this._bodyContainer = this.add.container(0, 0);

    const characters = listCharacters();
    this.mode = characters.length === 0 ? 'create' : 'select';
    this.selectedId = characters[0]?.id ?? null;
    this.pendingGender = GENDER.MALE;
    this.pendingClass = 'guerrero';

    this.#render();

    this.events.once('shutdown', () => this.#destroyNameInput());
  }

  #render() {
    this._bodyContainer.removeAll(true);
    this.#destroyNameInput();
    if (this.mode === 'create') this.#renderCreate();
    else this.#renderSelect();
  }

  // ---------------- Selección de personaje existente ----------------

  #renderSelect() {
    const w = this.scale.width;
    const h = this.scale.height;
    const characters = listCharacters();

    this._bodyContainer.add(
      this.add.text(w / 2, h * 0.19, t('menu.chooseCharacter'), {
        fontFamily: 'Segoe UI, sans-serif', fontSize: '18px', color: '#cfd6e0'
      }).setOrigin(0.5)
    );

    const cardW = 148;
    const cardH = 196;
    const gap = 20;
    const totalSlots = characters.length + (characters.length < getMaxCharacterSlots() ? 1 : 0);
    const totalW = totalSlots * cardW + Math.max(0, totalSlots - 1) * gap;
    const startX = w / 2 - totalW / 2;
    const cardY = h * 0.28;

    characters.forEach((char, i) => {
      const x = startX + i * (cardW + gap);
      this.#buildCharacterCard(char, x, cardY, cardW, cardH);
    });

    if (characters.length < getMaxCharacterSlots()) {
      const x = startX + characters.length * (cardW + gap);
      this.#buildNewCharacterCard(x, cardY, cardW, cardH);
    }

    if (characters.length === 0) {
      this._bodyContainer.add(
        this.add.text(w / 2, cardY + cardH / 2, t('menu.noCharacters'), {
          fontFamily: 'Segoe UI, sans-serif', fontSize: '14px', color: '#8a93a3'
        }).setOrigin(0.5)
      );
    }

    // ---- Botón Jugar ----
    const playW = 240;
    const playH = 56;
    const playX = w / 2 - playW / 2;
    const playY = cardY + cardH + 36;

    const enabled = !!this.selectedId;
    const playBtn = this.add.rectangle(playX, playY, playW, playH, enabled ? PALETTE.uiAccent : 0x3a3f4a, 1)
      .setOrigin(0, 0);
    const playLabel = this.add.text(playX + playW / 2, playY + playH / 2, t('menu.play'), {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '24px',
      color: enabled ? '#14181f' : '#666c78',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this._bodyContainer.add([playBtn, playLabel]);

    if (enabled) {
      playBtn.setInteractive({ useHandCursor: true });
      playBtn.on('pointerover', () => playBtn.setScale(1.03));
      playBtn.on('pointerout', () => playBtn.setScale(1));
      playBtn.on('pointerup', () => {
        playSound('build');
        selectCharacter(this.selectedId);
        this.scene.start(SCENES.WORLD);
      });
    }

    this.#buildFooter();
  }

  #buildCharacterCard(char, x, y, cardW, cardH) {
    const container = this.add.container(x, y);
    this._bodyContainer.add(container);

    const isSelected = char.id === this.selectedId;
    const bg = this.add.rectangle(0, 0, cardW, cardH, PALETTE.uiBg, 1).setOrigin(0, 0);
    bg.setStrokeStyle(isSelected ? 4 : 2, isSelected ? PALETTE.uiAccent : 0x333944, 1);
    bg.setInteractive({ useHandCursor: true });

    const classDef = CLASSES.find((c) => c.id === char.classId) || CLASSES[0];
    const previewTex = getGrowthTextureKey(char.classId, char.gender, char.level) || classDef.tex;
    const sprite = this.add.image(cardW / 2, cardH * 0.38, previewTex).setScale(1.5);

    const genderIcon = this.add.text(cardW - 22, 14, char.gender === GENDER.FEMALE ? '♀' : '♂', {
      fontFamily: 'Segoe UI, sans-serif', fontSize: '16px',
      color: char.gender === GENDER.FEMALE ? '#ff9ad1' : '#6fc7ff', fontStyle: 'bold'
    }).setOrigin(0.5);

    const name = this.add.text(cardW / 2, cardH - 52, char.name, {
      fontFamily: 'Segoe UI, sans-serif', fontSize: '15px', color: '#e8e8e8', fontStyle: 'bold'
    }).setOrigin(0.5);

    const levelLabel = this.add.text(cardW / 2, cardH - 32, t('menu.level', { level: char.level }), {
      fontFamily: 'Segoe UI, sans-serif', fontSize: '12px', color: '#8a93a3'
    }).setOrigin(0.5);

    const deleteLabel = this.selectedId === `__confirm_${char.id}` ? t('menu.delete.confirm') : t('menu.delete');
    const deleteBtn = this.add.text(cardW / 2, cardH - 12, this._deleteConfirmId === char.id ? t('menu.delete.confirm') : t('menu.delete'), {
      fontFamily: 'Segoe UI, sans-serif', fontSize: '10px', color: '#e0473f'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    container.add([bg, sprite, genderIcon, name, levelLabel, deleteBtn]);

    bg.on('pointerup', () => {
      playSound('notify');
      this.selectedId = char.id;
      this.#render();
    });

    deleteBtn.on('pointerup', (pointer) => {
      pointer.event.stopPropagation();
      if (this._deleteConfirmId === char.id) {
        if (this._deleteConfirmTimer) clearTimeout(this._deleteConfirmTimer);
        deleteCharacter(char.id);
        this._deleteConfirmId = null;
        if (this.selectedId === char.id) this.selectedId = null;
        this.#render();
      } else {
        this._deleteConfirmId = char.id;
        if (this._deleteConfirmTimer) clearTimeout(this._deleteConfirmTimer);
        this._deleteConfirmTimer = setTimeout(() => {
          this._deleteConfirmId = null;
          this.#render();
        }, 3000);
        this.#render();
      }
    });
    void deleteLabel;
  }

  #buildNewCharacterCard(x, y, cardW, cardH) {
    const container = this.add.container(x, y);
    this._bodyContainer.add(container);

    const bg = this.add.rectangle(0, 0, cardW, cardH, 0x11151c, 1).setOrigin(0, 0);
    bg.setStrokeStyle(2, 0x333944, 1);
    bg.setInteractive({ useHandCursor: true });

    const plus = this.add.text(cardW / 2, cardH / 2, t('menu.newCharacter'), {
      fontFamily: 'Segoe UI, sans-serif', fontSize: '16px', color: '#8a93a3', fontStyle: 'bold'
    }).setOrigin(0.5);

    container.add([bg, plus]);
    bg.on('pointerover', () => plus.setColor('#ffcc4d'));
    bg.on('pointerout', () => plus.setColor('#8a93a3'));
    bg.on('pointerup', () => {
      playSound('notify');
      this.mode = 'create';
      this.pendingGender = GENDER.MALE;
      this.pendingClass = 'guerrero';
      this.#render();
    });
  }

  // ---------------- Crear personaje nuevo ----------------

  #renderCreate() {
    const w = this.scale.width;
    const h = this.scale.height;

    this._bodyContainer.add(
      this.add.text(w / 2, h * 0.19, t('menu.createTitle'), {
        fontFamily: 'Segoe UI, sans-serif', fontSize: '20px', color: '#ffcc4d', fontStyle: 'bold'
      }).setOrigin(0.5)
    );

    // ---- nombre (input HTML real sobre el canvas, mismo patrón que ChatUI) ----
    const nameY = h * 0.26;
    this.#createNameInput(w / 2 - 130, nameY, 260, 30);

    // ---- género ----
    const genderY = nameY + 56;
    const maleBtn = this.#buildToggleButton(w / 2 - 90, genderY, 80, t('menu.gender.male'), this.pendingGender === GENDER.MALE, () => {
      this.pendingGender = GENDER.MALE;
      this.#render();
    });
    const femaleBtn = this.#buildToggleButton(w / 2 + 10, genderY, 80, t('menu.gender.female'), this.pendingGender === GENDER.FEMALE, () => {
      this.pendingGender = GENDER.FEMALE;
      this.#render();
    });
    this._bodyContainer.add([maleBtn.bg, maleBtn.label, femaleBtn.bg, femaleBtn.label]);

    // ---- clase ----
    const cardW = 140;
    const cardH = 176;
    const gap = 20;
    const totalW = CLASSES.length * cardW + (CLASSES.length - 1) * gap;
    const startX = w / 2 - totalW / 2;
    const classY = genderY + 60;

    CLASSES.forEach((cls, i) => {
      const x = startX + i * (cardW + gap);
      this.#buildClassCard(cls, x, classY, cardW, cardH);
    });

    // ---- crear / cancelar ----
    const btnY = classY + cardH + 30;
    const createBtn = this.add.rectangle(w / 2 - 130, btnY, 120, 44, PALETTE.uiAccent, 1).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    const createLabel = this.add.text(w / 2 - 70, btnY + 22, t('menu.create'), {
      fontFamily: 'Segoe UI, sans-serif', fontSize: '15px', color: '#14181f', fontStyle: 'bold'
    }).setOrigin(0.5);
    createBtn.on('pointerup', () => this.#confirmCreate());

    const cancelBtn = this.add.rectangle(w / 2 + 10, btnY, 120, 44, 0x3a3f4a, 1).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    const cancelLabel = this.add.text(w / 2 + 70, btnY + 22, t('menu.cancel'), {
      fontFamily: 'Segoe UI, sans-serif', fontSize: '15px', color: '#e8e8e8'
    }).setOrigin(0.5);
    const hasExisting = listCharacters().length > 0;
    if (hasExisting) {
      cancelBtn.on('pointerup', () => {
        this.mode = 'select';
        this.#render();
      });
    } else {
      cancelBtn.setAlpha(0.4);
      cancelBtn.disableInteractive();
    }

    this._bodyContainer.add([createBtn, createLabel, cancelBtn, cancelLabel]);
    this.#buildFooter();
  }

  #buildToggleButton(x, y, w, label, active, onClick) {
    const bg = this.add.rectangle(x, y, w, 32, active ? PALETTE.uiAccent : 0x1c212b, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(1, active ? PALETTE.uiAccent : 0x333944, 1)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x + w / 2, y + 16, label, {
      fontFamily: 'Segoe UI, sans-serif', fontSize: '13px',
      color: active ? '#14181f' : '#e8e8e8', fontStyle: 'bold'
    }).setOrigin(0.5);
    bg.on('pointerup', onClick);
    return { bg, label: text };
  }

  #buildClassCard(cls, x, y, cardW, cardH) {
    const container = this.add.container(x, y);
    this._bodyContainer.add(container);

    const isSelected = cls.id === this.pendingClass;
    const bg = this.add.rectangle(0, 0, cardW, cardH, PALETTE.uiBg, 1).setOrigin(0, 0);
    bg.setStrokeStyle(isSelected ? 4 : 2, isSelected ? PALETTE.uiAccent : 0x333944, 1);
    bg.setInteractive({ useHandCursor: true });

    const previewTex = getGrowthTextureKey(cls.id, this.pendingGender, 1) || cls.tex;
    const sprite = this.add.image(cardW / 2, cardH * 0.42, previewTex).setScale(1.4);
    const label = this.add.text(cardW / 2, cardH - 26, t(cls.nameKey), {
      fontFamily: 'Segoe UI, sans-serif', fontSize: '14px', color: '#e8e8e8', fontStyle: 'bold'
    }).setOrigin(0.5);

    container.add([bg, sprite, label]);
    bg.on('pointerup', () => {
      playSound('notify');
      this.pendingClass = cls.id;
      this.#render();
    });
  }

  #confirmCreate() {
    const name = (this._nameInputEl?.value || '').trim() || t(`char.${this.pendingClass}`);
    const id = createCharacter(name, this.pendingGender, this.pendingClass);
    if (!id) {
      this.#showSlotsFullToast();
      return;
    }
    playSound('build');
    selectCharacter(id);
    this.scene.start(SCENES.WORLD);
  }

  #showSlotsFullToast() {
    const w = this.scale.width;
    const h = this.scale.height;
    const msg = this.add.text(w / 2, h - 60, t('menu.slotsFull', { max: getMaxCharacterSlots() }), {
      fontFamily: 'Segoe UI, sans-serif', fontSize: '13px', color: '#e0473f'
    }).setOrigin(0.5);
    this._bodyContainer.add(msg);
  }

  // ---------------- input HTML de nombre (mismo patrón que ChatUI.js) ----------------

  #createNameInput(gameX, gameY, gameW, gameH) {
    const inputEl = document.createElement('input');
    inputEl.type = 'text';
    inputEl.maxLength = 20;
    inputEl.placeholder = t('menu.namePlaceholder');
    inputEl.value = GameState.character?.name || '';
    inputEl.style.position = 'absolute';
    inputEl.style.boxSizing = 'border-box';
    inputEl.style.fontFamily = 'Segoe UI, sans-serif';
    inputEl.style.fontSize = '14px';
    inputEl.style.textAlign = 'center';
    inputEl.style.border = '1px solid #333944';
    inputEl.style.borderRadius = '4px';
    inputEl.style.padding = '4px 8px';
    inputEl.style.background = '#1c212b';
    inputEl.style.color = '#e8e8e8';
    inputEl.style.zIndex = '1000';
    document.body.appendChild(inputEl);
    this._nameInputEl = inputEl;

    const position = () => {
      const canvas = this.sys.game.canvas;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = rect.width / canvas.width;
      const scaleY = rect.height / canvas.height;
      inputEl.style.left = `${rect.left + window.scrollX + gameX * scaleX}px`;
      inputEl.style.top = `${rect.top + window.scrollY + gameY * scaleY}px`;
      inputEl.style.width = `${gameW * scaleX}px`;
      inputEl.style.height = `${gameH * scaleY}px`;
    };
    position();
    // Phaser's Scale.FIT puede reajustar el tamaño/posición real del canvas
    // después de este primer cálculo (sin disparar un 'resize' del navegador,
    // p.ej. al terminar de auto-centrar), así que también escuchamos el
    // evento de resize propio de Phaser y reintentamos una vez más al
    // siguiente frame para no quedarnos con una posición vieja.
    this._nameInputResize = position;
    window.addEventListener('resize', position);
    this.scale.on('resize', position);
    requestAnimationFrame(position);
    inputEl.focus();
  }

  #destroyNameInput() {
    if (this._nameInputResize) {
      window.removeEventListener('resize', this._nameInputResize);
      this.scale.off('resize', this._nameInputResize);
      this._nameInputResize = null;
    }
    if (this._nameInputEl) {
      if (this._nameInputEl.parentNode) this._nameInputEl.parentNode.removeChild(this._nameInputEl);
      this._nameInputEl = null;
    }
  }

  // ---------------- idioma / pie de página (sin cambios de Fase 1) ----------------

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

  #buildFooter() {
    const w = this.scale.width;
    const h = this.scale.height;
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
      this._bodyContainer.add(txt);
    });
  }
}
