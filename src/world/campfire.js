// Fogatas (parte 13 del pedido). El integrador conecta BUILDABLE_TYPES.CAMPFIRE
// al sistema de construcción existente (world/chunkStore.js); este módulo solo
// provee la textura y el efecto de luz cálida, barato y sin sistema de luces
// real: un sprite circular con blendMode ADD que "brilla" incluso encima del
// overlay oscuro de noche/cueva.

import Phaser from 'phaser';
import { TILE_SIZE } from '../constants.js';

export const CAMPFIRE_TEX = 'build_campfire';
// Textura de brillo aditivo usada internamente por attachCampfireLight().
export const CAMPFIRE_GLOW_TEX = 'build_campfire_glow';

function drawCampfire(g) {
  const s = TILE_SIZE;
  g.clear();
  // base de leña (sombra oscura debajo para dar volumen)
  g.fillStyle(0x3a2416, 1);
  g.fillEllipse(s / 2, s * 0.82, s * 0.5, s * 0.18);
  g.fillStyle(0x6e4429, 1);
  g.fillRoundedRect(s * 0.18, s * 0.72, s * 0.64, s * 0.14, 3);
  g.fillStyle(0x8a5a3c, 1);
  g.fillRoundedRect(s * 0.22, s * 0.64, s * 0.56, s * 0.12, 3);
  // llama exterior (naranja)
  g.fillStyle(0xff8a3f, 0.95);
  g.fillTriangle(s * 0.5, s * 0.12, s * 0.32, s * 0.62, s * 0.68, s * 0.62);
  g.fillEllipse(s / 2, s * 0.5, s * 0.3, s * 0.42);
  // llama interior (amarilla, desplazada arriba-izquierda para dar volumen)
  g.fillStyle(0xffd24f, 0.95);
  g.fillTriangle(s * 0.46, s * 0.24, s * 0.36, s * 0.58, s * 0.56, s * 0.58);
  g.fillEllipse(s * 0.46, s * 0.52, s * 0.14, s * 0.24);
  g.generateTexture(CAMPFIRE_TEX, s, s);
}

function drawGlow(g) {
  const s = 128;
  g.clear();
  g.fillStyle(0xffcc66, 0.5);
  g.fillCircle(s / 2, s / 2, s * 0.5);
  g.fillStyle(0xffe6a3, 0.7);
  g.fillCircle(s / 2, s / 2, s * 0.32);
  g.fillStyle(0xfff5d9, 0.9);
  g.fillCircle(s / 2, s / 2, s * 0.16);
  g.generateTexture(CAMPFIRE_GLOW_TEX, s, s);
}

/**
 * Genera la textura de fogata y su glow aditivo con `g.generateTexture`.
 * Llamar una vez desde BootScene con el mismo Graphics que genera el resto
 * del juego.
 * @param {Phaser.GameObjects.Graphics} g
 */
export function registerCampfireTextures(g) {
  drawCampfire(g);
  drawGlow(g);
}

// Registro interno (por escena) de luces de fogata activas, para
// getActiveCampfireLightsNear(). No es crítico para el efecto visual en sí.
const activeLights = new Map(); // Phaser.Scene -> [{x, y, glow}]

function registerActiveLight(scene, x, y, glow) {
  if (!activeLights.has(scene)) activeLights.set(scene, []);
  activeLights.get(scene).push({ x, y, glow });
}
function unregisterActiveLight(scene, glow) {
  const list = activeLights.get(scene);
  if (!list) return;
  const idx = list.findIndex((l) => l.glow === glow);
  if (idx >= 0) list.splice(idx, 1);
}

/**
 * Agrega un efecto de luz cálida alrededor de una fogata: sprite circular
 * grande con blendMode ADD (glow aditivo) y una animación sutil de
 * parpadeo (tween alpha/scale en loop).
 * @param {Phaser.Scene} scene
 * @param {Phaser.GameObjects.Sprite|Phaser.GameObjects.Image} campfireSprite
 * @returns {{destroy: () => void}}
 */
export function attachCampfireLight(scene, campfireSprite) {
  const glow = scene.add.image(campfireSprite.x, campfireSprite.y, CAMPFIRE_GLOW_TEX);
  glow.setBlendMode(Phaser.BlendModes.ADD);
  glow.setDepth((campfireSprite.depth || campfireSprite.y || 0) - 1);
  glow.setScale(1.1);
  glow.setAlpha(0.75);

  registerActiveLight(scene, campfireSprite.x, campfireSprite.y, glow);

  // Variación pequeña de duración por instancia (Math.random es válido aquí:
  // es puramente visual, no afecta a la generación determinista del mundo).
  const tween = scene.tweens.add({
    targets: glow,
    alpha: { from: 0.6, to: 0.95 },
    scale: { from: 1.0, to: 1.18 },
    duration: 900 + Math.random() * 400,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });

  return {
    destroy() {
      tween.stop();
      glow.destroy();
      unregisterActiveLight(scene, glow);
    }
  };
}

/**
 * Fogatas activas cerca de un punto (placeholder útil para sistemas
 * futuros, p.ej. iluminar la visibilidad de noche). No es crítico: el
 * efecto visual de attachCampfireLight funciona igual sin usar esto.
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {number} maxDist
 * @returns {{x:number, y:number, glow:Phaser.GameObjects.Image}[]}
 */
export function getActiveCampfireLightsNear(scene, x, y, maxDist) {
  const list = activeLights.get(scene) || [];
  return list.filter((l) => Phaser.Math.Distance.Between(x, y, l.x, l.y) <= maxDist);
}
