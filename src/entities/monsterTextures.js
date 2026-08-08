// Generador procedural de texturas para todo entities/monsterCatalog.js.
// Mismo estilo que BootScene.js (`#drawZombie`/`#drawSpectre`/`#drawPlant`):
// óvalo de sombra + forma de cuerpo + ojos simples, parametrizado por
// `shape` y `palette` para conseguir 50+ resultados visualmente distintos
// sin dibujar una función por monstruo.
//
// No se toca BootScene.js: este módulo se ejecuta aparte (el integrador
// decide cuándo llamarlo, típicamente también en el `create()` de BootScene
// o en una escena de carga).

import { MONSTERS } from './monsterCatalog.js';

/**
 * Genera y registra en el motor de Phaser una textura por cada entrada de
 * MONSTERS, usando `def.id` como clave de textura.
 * @param {Phaser.GameObjects.Graphics} g Graphics temporal (no añadido a la escena), reutilizable entre llamadas.
 */
export function registerMonsterTextures(g) {
  for (const def of MONSTERS) {
    const draw = SHAPE_DRAWERS[def.shape] || drawBlob;
    draw(g, def.id, def.palette, def.hasWeapon);
  }
}

/** Dibuja un palo con punta triangular saliendo del costado del cuerpo (arma sostenida). */
function drawWeaponStick(g, cx, cy, len) {
  g.lineStyle(3, 0x8a5a3c, 1);
  g.beginPath();
  g.moveTo(cx, cy);
  g.lineTo(cx + len * 0.7, cy - len * 0.9);
  g.strokePath();
  g.fillStyle(0xc7c7d6, 1);
  g.fillTriangle(
    cx + len * 0.7 - 4, cy - len * 0.9 + 3,
    cx + len * 0.7 + 8, cy - len * 0.9 - 6,
    cx + len * 0.7 + 2, cy - len * 0.9 + 9
  );
}

/** Ojos simples (dos puntos oscuros), reutilizados por todas las formas. */
function drawEyes(g, cx, cy, gap, r, color = 0x1a1a1a) {
  g.fillStyle(color, 1);
  g.fillCircle(cx - gap, cy, r);
  g.fillCircle(cx + gap, cy, r);
}

// ---------------- blob: cuerpo ovalado simple (slimes, plantas, espectros pequeños) ----------------
function drawBlob(g, key, palette, hasWeapon) {
  const s = 40;
  g.clear();
  g.fillStyle(palette.shade, 1);
  g.fillEllipse(s / 2, s / 2 + 3, s * 0.58, s * 0.5);
  g.fillStyle(palette.body, 1);
  g.fillEllipse(s / 2, s / 2, s * 0.52, s * 0.46);
  drawEyes(g, s / 2, s * 0.46, 6, 2.2);
  if (hasWeapon) drawWeaponStick(g, s * 0.62, s * 0.5, 14);
  g.generateTexture(key, s, s);
}

// ---------------- tall: silueta alta y angosta (torretas, guardianes de un solo tronco) ----------------
function drawTall(g, key, palette, hasWeapon) {
  const s = 40;
  const h = 52;
  g.clear();
  g.fillStyle(palette.shade, 1);
  g.fillEllipse(s / 2, h - 8, s * 0.5, 10);
  g.fillStyle(palette.body, 1);
  g.fillRoundedRect(s * 0.28, h * 0.15, s * 0.44, h * 0.72, 6);
  g.fillStyle(palette.accent, 1);
  g.fillCircle(s / 2, h * 0.22, 4);
  drawEyes(g, s / 2, h * 0.32, 5, 2, 0xffffff);
  if (hasWeapon) drawWeaponStick(g, s * 0.72, h * 0.5, 16);
  g.generateTexture(key, s, h);
}

// ---------------- wide: cuerpo ancho y bajo, ideal para bestias cuadrúpedas ----------------
function drawWide(g, key, palette, hasWeapon) {
  const s = 46;
  const h = 34;
  g.clear();
  g.fillStyle(palette.shade, 1);
  g.fillEllipse(s / 2, h * 0.78, s * 0.62, h * 0.4);
  g.fillStyle(palette.body, 1);
  g.fillEllipse(s / 2, h * 0.5, s * 0.58, h * 0.5);
  // orejas/protuberancias simples
  g.fillStyle(palette.shade, 1);
  g.fillTriangle(s * 0.28, h * 0.28, s * 0.34, h * 0.05, s * 0.42, h * 0.3);
  g.fillTriangle(s * 0.72, h * 0.28, s * 0.66, h * 0.05, s * 0.58, h * 0.3);
  drawEyes(g, s / 2, h * 0.42, 7, 2.4);
  if (hasWeapon) drawWeaponStick(g, s * 0.74, h * 0.5, 14);
  g.generateTexture(key, s, h);
}

// ---------------- spiky: cuerpo con espinas/púas alrededor (cactus, elementales, zarzas) ----------------
function drawSpiky(g, key, palette, hasWeapon) {
  const s = 40;
  g.clear();
  g.fillStyle(palette.shade, 1);
  g.fillEllipse(s / 2, s / 2 + 3, s * 0.54, s * 0.48);
  g.fillStyle(palette.body, 1);
  g.fillCircle(s / 2, s / 2, s * 0.36);
  // púas
  g.fillStyle(palette.accent, 1);
  const spikes = 7;
  for (let i = 0; i < spikes; i++) {
    const ang = (Math.PI * 2 * i) / spikes;
    const bx = s / 2 + Math.cos(ang) * s * 0.34;
    const by = s / 2 + Math.sin(ang) * s * 0.34;
    const tx = s / 2 + Math.cos(ang) * s * 0.5;
    const ty = s / 2 + Math.sin(ang) * s * 0.5;
    g.fillTriangle(bx - 2, by - 2, bx + 2, by + 2, tx, ty);
  }
  drawEyes(g, s / 2, s * 0.46, 5, 2, 0x1a1a1a);
  if (hasWeapon) drawWeaponStick(g, s * 0.7, s * 0.5, 14);
  g.generateTexture(key, s, s);
}

// ---------------- winged: cuerpo + alas triangulares/ovaladas a los costados ----------------
function drawWinged(g, key, palette, hasWeapon) {
  const s = 44;
  g.clear();
  // alas (detrás del cuerpo)
  g.fillStyle(palette.shade, 0.85);
  g.fillTriangle(s * 0.1, s * 0.55, s * 0.32, s * 0.2, s * 0.4, s * 0.6);
  g.fillTriangle(s * 0.9, s * 0.55, s * 0.68, s * 0.2, s * 0.6, s * 0.6);
  g.fillStyle(palette.body, 0.95);
  g.fillEllipse(s / 2, s * 0.5, s * 0.34, s * 0.4);
  drawEyes(g, s / 2, s * 0.44, 4.5, 2, 0xffffff);
  if (hasWeapon) drawWeaponStick(g, s * 0.66, s * 0.5, 14);
  g.generateTexture(key, s, s);
}

// ---------------- serpentine: cuerpo alargado en curva (serpientes, gusanos, ciempiés) ----------------
function drawSerpentine(g, key, palette, hasWeapon) {
  const s = 48;
  const h = 28;
  g.clear();
  g.fillStyle(palette.shade, 1);
  g.fillEllipse(s * 0.3, h * 0.7, s * 0.26, h * 0.34);
  g.fillEllipse(s * 0.55, h * 0.55, s * 0.24, h * 0.32);
  g.fillEllipse(s * 0.78, h * 0.4, s * 0.2, h * 0.3);
  g.fillStyle(palette.body, 1);
  g.fillEllipse(s * 0.28, h * 0.68, s * 0.22, h * 0.28);
  g.fillEllipse(s * 0.52, h * 0.52, s * 0.2, h * 0.26);
  g.fillEllipse(s * 0.76, h * 0.36, s * 0.24, h * 0.3);
  drawEyes(g, s * 0.8, h * 0.3, 4, 1.8, 0x1a1a1a);
  if (hasWeapon) drawWeaponStick(g, s * 0.9, h * 0.4, 12);
  g.generateTexture(key, s, h);
}

// ---------------- humanoid: cabeza + torso + brazos/piernas simples (orcos, esqueletos, bandidos) ----------------
function drawHumanoid(g, key, palette, hasWeapon) {
  const s = 36;
  const h = 46;
  g.clear();
  g.fillStyle(palette.shade, 1);
  g.fillEllipse(s / 2, h - 6, s * 0.5, 8);
  // piernas
  g.fillStyle(palette.shade, 1);
  g.fillRoundedRect(s * 0.32, h * 0.62, s * 0.14, h * 0.3, 3);
  g.fillRoundedRect(s * 0.54, h * 0.62, s * 0.14, h * 0.3, 3);
  // torso
  g.fillStyle(palette.body, 1);
  g.fillRoundedRect(s * 0.24, h * 0.32, s * 0.52, h * 0.34, 6);
  // brazos
  g.fillStyle(palette.body, 1);
  g.fillRoundedRect(s * 0.08, h * 0.34, s * 0.16, h * 0.28, 4);
  g.fillRoundedRect(s * 0.76, h * 0.34, s * 0.16, h * 0.28, 4);
  // cabeza
  g.fillStyle(palette.accent, 1);
  g.fillCircle(s / 2, h * 0.2, s * 0.22);
  drawEyes(g, s / 2, h * 0.19, 4.5, 1.8, 0x1a1a1a);
  if (hasWeapon) drawWeaponStick(g, s * 0.86, h * 0.4, 18);
  g.generateTexture(key, s, h);
}

const SHAPE_DRAWERS = {
  blob: drawBlob,
  tall: drawTall,
  wide: drawWide,
  spiky: drawSpiky,
  winged: drawWinged,
  serpentine: drawSerpentine,
  humanoid: drawHumanoid
};
