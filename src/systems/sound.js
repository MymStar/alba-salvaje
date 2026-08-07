// Efectos de sonido SINTETIZADOS por código (Web Audio API: osciladores +
// ruido blanco), sin archivos .mp3/.wav externos — mantiene el juego ligero
// y evita cualquier problema de licencia de audio, igual que las texturas
// procedurales de BootScene.js.

import { EventBus } from '../eventBus.js';

const STORAGE_KEY = 'alba_salvaje_sound_muted_v1';

let ctx = null;
let muted = loadMuted();
let wired = false;

function loadMuted() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function isMuted() {
  return muted;
}

export function setMuted(value) {
  muted = Boolean(value);
  try {
    localStorage.setItem(STORAGE_KEY, muted ? '1' : '0');
  } catch {
    /* localStorage no disponible: se ignora, el mute solo dura la sesión */
  }
}

export function toggleMuted() {
  setMuted(!muted);
  return muted;
}

function ensureContext() {
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null; // navegador sin soporte de Web Audio: falla en silencio
    ctx = new AudioCtx();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/**
 * Los navegadores bloquean el audio hasta el primer gesto del usuario
 * (click/tecla). Llamar una vez ante el primer input (MenuScene lo hace).
 */
export function unlockAudio() {
  ensureContext();
}

/** Tono simple (oscilador) con envolvente de volumen exponencial. */
function tone({ freq = 440, duration = 0.12, type = 'sine', gain = 0.15, sweep = 0, delay = 0 }) {
  if (muted) return;
  const c = ensureContext();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const gainNode = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (sweep) osc.frequency.linearRampToValueAtTime(Math.max(20, freq + sweep), t0 + duration);
  gainNode.gain.setValueAtTime(gain, t0);
  gainNode.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.connect(gainNode).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

/** Ráfaga de ruido blanco (golpes, pasos) con caída lineal de volumen. */
function noiseBurst({ duration = 0.15, gain = 0.12, delay = 0 }) {
  if (muted) return;
  const c = ensureContext();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const size = Math.max(1, Math.floor(c.sampleRate * duration));
  const buffer = c.createBuffer(1, size, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / size);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const gainNode = c.createGain();
  gainNode.gain.setValueAtTime(gain, t0);
  src.connect(gainNode).connect(c.destination);
  src.start(t0);
}

// Catálogo de efectos. Cada uno es una combinación corta de tonos/ruido.
const SOUNDS = {
  attack: () => tone({ freq: 520, duration: 0.08, type: 'square', gain: 0.12, sweep: -180 }),
  hit: () => noiseBurst({ duration: 0.09, gain: 0.16 }),
  step: () => tone({ freq: 160, duration: 0.045, type: 'triangle', gain: 0.035 }),
  build: () => {
    tone({ freq: 300, duration: 0.07, type: 'square', gain: 0.1 });
    tone({ freq: 440, duration: 0.09, type: 'square', gain: 0.1, delay: 0.07 });
  },
  coin: () => {
    tone({ freq: 880, duration: 0.055, type: 'square', gain: 0.09 });
    tone({ freq: 1180, duration: 0.07, type: 'square', gain: 0.09, delay: 0.05 });
  },
  levelup: () => {
    [523, 659, 784, 1046].forEach((f, i) =>
      tone({ freq: f, duration: 0.18, type: 'triangle', gain: 0.13, delay: i * 0.09 })
    );
  },
  death: () => tone({ freq: 240, duration: 0.6, type: 'sawtooth', gain: 0.12, sweep: -200 }),
  notify: () => tone({ freq: 700, duration: 0.06, type: 'sine', gain: 0.07 }),
  chatMessage: () => tone({ freq: 950, duration: 0.05, type: 'sine', gain: 0.05 }),
  dayStart: () => tone({ freq: 440, duration: 0.5, type: 'sine', gain: 0.05, sweep: 200 }),
  nightStart: () => tone({ freq: 300, duration: 0.6, type: 'sine', gain: 0.06, sweep: -140 }),

  // ---- Fase 2 ----
  spell: () => {
    tone({ freq: 660, duration: 0.1, type: 'sine', gain: 0.1, sweep: 260 });
    tone({ freq: 990, duration: 0.12, type: 'sine', gain: 0.08, delay: 0.06 });
  },
  bossRoar: () => tone({ freq: 90, duration: 0.9, type: 'sawtooth', gain: 0.16, sweep: -30 }),
  thunder: () => noiseBurst({ duration: 0.5, gain: 0.18 })
};

/** Reproduce un efecto por nombre (ver SOUNDS arriba). No-op si no existe o está muteado. */
export function playSound(name) {
  const fn = SOUNDS[name];
  if (fn) fn();
}

/**
 * Conecta automáticamente algunos efectos a eventos que YA emite el resto
 * del juego (EventBus), para no tener que tocar cada archivo que los dispara.
 * Llamar una sola vez desde main.js.
 */
export function wireAutoSounds() {
  if (wired) return;
  wired = true;
  EventBus.on('levelup', () => playSound('levelup'));
  EventBus.on('player-died', () => playSound('death'));
  EventBus.on('notify', () => playSound('notify'));
  EventBus.on('chat-message', () => playSound('chatMessage'));
  EventBus.on('day-night-changed', (phase) => playSound(phase === 'day' ? 'dayStart' : 'nightStart'));
}
