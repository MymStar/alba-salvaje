// Sombras y volumen estilo Zelda 2D clásico, ligero (parte 11 del pedido).
// Sombra elíptica simple bajo los sprites + viñeta sutil de pantalla completa
// para dar sensación de profundidad, sin ningún sistema de luces real.

export const SHADE_TEX = {
  SHADOW: 'shade_shadow',
  VIGNETTE: 'shade_vignette'
};

/**
 * Crea una sombra elíptica bajo `sprite` y la mantiene sincronizada con su
 * posición automáticamente en cada frame (`scene.events.on('postupdate')`),
 * sin que quien llama tenga que actualizarla a mano.
 * @param {Phaser.Scene} scene
 * @param {Phaser.GameObjects.Sprite|Phaser.GameObjects.Image} sprite
 * @param {{offsetY?:number, scale?:number, alpha?:number}} [opts]
 * @returns {{shadow: Phaser.GameObjects.Image, destroy: () => void}}
 */
export function registerShadowFollower(scene, sprite, opts = {}) {
  const offsetY = opts.offsetY ?? 14;
  const scale = opts.scale ?? 1;
  const alpha = opts.alpha ?? 0.35;

  const shadow = scene.add.image(sprite.x, sprite.y + offsetY, SHADE_TEX.SHADOW);
  shadow.setScale(scale);
  shadow.setAlpha(alpha);
  shadow.setDepth((sprite.depth ?? sprite.y) - 1);

  const sync = () => {
    if (!sprite.active) return;
    shadow.setPosition(sprite.x, sprite.y + offsetY);
    shadow.setDepth((sprite.depth ?? sprite.y) - 1);
  };
  scene.events.on('postupdate', sync);

  return {
    shadow,
    destroy() {
      scene.events.off('postupdate', sync);
      shadow.destroy();
    }
  };
}

/** Óvalo con varias capas de alpha creciente hacia el centro (gradiente simple sin dependencias). */
function drawShadow(g) {
  const w = 40;
  const h = 18;
  g.clear();
  g.fillStyle(0x000000, 0.12);
  g.fillEllipse(w / 2, h / 2, w, h);
  g.fillStyle(0x000000, 0.18);
  g.fillEllipse(w / 2, h / 2, w * 0.75, h * 0.75);
  g.fillStyle(0x000000, 0.25);
  g.fillEllipse(w / 2, h / 2, w * 0.5, h * 0.5);
  g.generateTexture(SHADE_TEX.SHADOW, w, h);
}

/**
 * Viñeta suave de pantalla completa (gradiente radial real vía canvas 2D,
 * accesible a través de `g.scene`, para que quede realmente suave en vez de
 * un óvalo "a bloques"). Si por algo no hay `scene` disponible, cae a un
 * rectángulo translúcido plano como alternativa simple.
 */
function drawVignette(g) {
  const s = 720;
  const scene = g.scene;
  if (!scene || !scene.textures) {
    g.clear();
    g.fillStyle(0x000000, 0.15);
    g.fillRect(0, 0, s, s);
    g.generateTexture(SHADE_TEX.VIGNETTE, s, s);
    return;
  }
  const canvasTex = scene.textures.createCanvas(SHADE_TEX.VIGNETTE, s, s);
  const ctx = canvasTex.getContext();
  const grad = ctx.createRadialGradient(s / 2, s / 2, s * 0.28, s / 2, s / 2, s * 0.62);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, s, s);
  canvasTex.refresh();
}

/**
 * Genera la textura de sombra y la de viñeta con `g.generateTexture`. Llamar
 * una vez desde BootScene con el mismo Graphics que genera el resto del juego.
 * @param {Phaser.GameObjects.Graphics} g
 */
export function registerShadingTextures(g) {
  drawShadow(g);
  drawVignette(g);
}

/**
 * Añade una viñeta sutil de pantalla completa (profundidad ambiental barata:
 * una sola imagen, sin recalcular nada por frame). No-op si la textura de
 * viñeta no fue generada (registerShadingTextures no se llamó).
 * @param {Phaser.Scene} scene
 * @returns {Phaser.GameObjects.Image|null}
 */
export function addVignette(scene) {
  if (!scene.textures.exists(SHADE_TEX.VIGNETTE)) return null;

  const img = scene.add.image(scene.scale.width / 2, scene.scale.height / 2, SHADE_TEX.VIGNETTE);
  img.setScrollFactor(0);
  img.setDisplaySize(scene.scale.width, scene.scale.height);
  img.setAlpha(0.2);
  img.setDepth(999); // justo debajo del overlay de día/noche (depth 1000)

  scene.scale.on('resize', (size) => {
    img.setPosition(size.width / 2, size.height / 2);
    img.setDisplaySize(size.width, size.height);
  });

  return img;
}
