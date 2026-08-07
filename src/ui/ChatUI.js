// Panel de chat colapsable (abajo-derecha) para HUDScene.
// Usa un <input> HTML real posicionado sobre el canvas (Phaser no tiene
// campos de texto nativos) porque este es el patrón estándar en juegos Phaser.

import { PALETTE } from '../constants.js';
import { EventBus } from '../eventBus.js';
import { sendChatMessage } from '../net/chat.js';
import { t } from '../i18n.js';

const PANEL_W = 300;
const PANEL_H = 260;
const MAX_VISIBLE_MESSAGES = 30;
const INPUT_HEIGHT = 26;

/**
 * Crea (una sola vez) el panel de chat colapsable de la escena HUD.
 * @param {Phaser.Scene} hudScene
 * @returns {{ toggle: Function, open: Function, close: Function, isOpen: () => boolean }}
 */
export function createChatPanel(hudScene) {
  const w = hudScene.scale.width;
  const h = hudScene.scale.height;

  const panelX = w - PANEL_W - 12;
  const panelY = h - PANEL_H - 60;

  const container = hudScene.add.container(0, 0).setDepth(8000).setScrollFactor(0).setVisible(false);

  const bg = hudScene.add.rectangle(panelX, panelY, PANEL_W, PANEL_H, PALETTE.uiBg, 0.92)
    .setOrigin(0, 0)
    .setStrokeStyle(2, PALETTE.uiAccent, 1);
  container.add(bg);

  const title = hudScene.add.text(panelX + 10, panelY + 6, t('chat.title'), {
    fontFamily: 'Segoe UI, sans-serif',
    fontSize: '13px',
    color: '#ffcc4d',
    fontStyle: 'bold'
  });
  container.add(title);

  const modeNote = hudScene.add.text(panelX + 50, panelY + 7, '', {
    fontFamily: 'Segoe UI, sans-serif',
    fontSize: '10px',
    color: '#8a93a3',
    wordWrap: { width: PANEL_W - 60 }
  });
  container.add(modeNote);

  const messagesAreaY = panelY + 28;
  const messagesAreaH = PANEL_H - 28 - INPUT_HEIGHT - 16;

  const messagesText = hudScene.add.text(panelX + 8, messagesAreaY + messagesAreaH - 4, '', {
    fontFamily: 'Segoe UI, sans-serif',
    fontSize: '11px',
    color: '#e8e8e8',
    wordWrap: { width: PANEL_W - 16 },
    lineSpacing: 2
  }).setOrigin(0, 1);
  container.add(messagesText);

  const maskShape = hudScene.make.graphics({ x: 0, y: 0, add: false });
  maskShape.fillRect(panelX, messagesAreaY, PANEL_W, messagesAreaH);
  messagesText.setMask(maskShape.createGeometryMask());

  const sendBtnW = 56;
  const inputAreaY = panelY + PANEL_H - INPUT_HEIGHT - 8;

  const sendBtn = hudScene.add.text(
    panelX + PANEL_W - sendBtnW - 4,
    inputAreaY,
    t('chat.send'),
    {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '11px',
      color: '#14181f',
      backgroundColor: '#8bd450',
      padding: { x: 6, y: 6 }
    }
  ).setInteractive({ useHandCursor: true });
  container.add(sendBtn);

  // ---- input HTML real sobre el canvas ----
  const inputEl = document.createElement('input');
  inputEl.type = 'text';
  inputEl.maxLength = 200;
  inputEl.placeholder = t('chat.placeholder');
  inputEl.style.position = 'absolute';
  inputEl.style.boxSizing = 'border-box';
  inputEl.style.fontFamily = 'Segoe UI, sans-serif';
  inputEl.style.fontSize = '12px';
  inputEl.style.border = '1px solid #333944';
  inputEl.style.borderRadius = '3px';
  inputEl.style.padding = '2px 6px';
  inputEl.style.background = '#1c212b';
  inputEl.style.color = '#e8e8e8';
  inputEl.style.display = 'none';
  inputEl.style.zIndex = '1000';
  document.body.appendChild(inputEl);

  const messages = [];

  function formatLine(msg) {
    return `[${msg.name}] ${msg.text}`;
  }

  function refreshMessagesText() {
    const visible = messages.slice(-MAX_VISIBLE_MESSAGES);
    messagesText.setText(visible.map(formatLine).join('\n'));
  }

  function positionInputEl() {
    const canvas = hudScene.sys.game.canvas;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;

    const gameX = panelX + 8;
    const gameY = inputAreaY;
    const gameW = PANEL_W - sendBtnW - 20;

    inputEl.style.left = `${rect.left + window.scrollX + gameX * scaleX}px`;
    inputEl.style.top = `${rect.top + window.scrollY + gameY * scaleY}px`;
    inputEl.style.width = `${gameW * scaleX}px`;
    inputEl.style.height = `${INPUT_HEIGHT * scaleY}px`;
  }

  function doSend() {
    const text = inputEl.value.trim();
    if (!text) return;
    sendChatMessage(text);
    inputEl.value = '';
  }

  sendBtn.on('pointerup', doSend);
  inputEl.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') doSend();
  });

  const onHistory = (arr) => {
    messages.length = 0;
    (arr || []).forEach((m) => messages.push(m));
    refreshMessagesText();
  };
  const onMessage = (msg) => {
    messages.push(msg);
    refreshMessagesText();
  };
  const onMode = (mode) => {
    modeNote.setText(mode === 'offline' ? t('chat.offline') : t('chat.online'));
  };

  EventBus.on('chat-history', onHistory);
  EventBus.on('chat-message', onMessage);
  EventBus.on('chat-mode', onMode);

  let open = false;

  function show() {
    open = true;
    container.setVisible(true);
    inputEl.style.display = 'block';
    positionInputEl();
  }

  function hide() {
    open = false;
    container.setVisible(false);
    inputEl.style.display = 'none';
  }

  function toggle() {
    if (open) hide();
    else show();
  }

  const onResize = () => {
    if (open) positionInputEl();
  };
  window.addEventListener('resize', onResize);

  hudScene.events.once('shutdown', () => {
    EventBus.off('chat-history', onHistory);
    EventBus.off('chat-message', onMessage);
    EventBus.off('chat-mode', onMode);
    window.removeEventListener('resize', onResize);
    if (inputEl.parentNode) inputEl.parentNode.removeChild(inputEl);
  });

  return {
    toggle,
    open: show,
    close: hide,
    isOpen: () => open
  };
}
