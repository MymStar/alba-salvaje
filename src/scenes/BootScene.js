import Phaser from 'phaser';
import { TEX } from '../textureKeys.js';
import { SCENES } from '../sceneKeys.js';
import { PALETTE, TILE_SIZE } from '../constants.js';

// BootScene genera TODAS las texturas del juego mediante Graphics->generateTexture.
// No se cargan imágenes externas: esto mantiene el juego ligero (parte del
// documento de diseño) y evita depender de assets con licencia.
//
// Estilo: formas redondeadas/orgánicas (inspirado en Warcraft) con colores
// vivos y simples (inspirado en Mario), en vez de bloques totalmente cuadrados.

export default class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.BOOT);
  }

  create() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    this.#drawTile(g, TEX.TILE_GRASS, PALETTE.grass, PALETTE.grassAlt);
    this.#drawTile(g, TEX.TILE_GRASS_ALT, PALETTE.grassAlt, PALETTE.grass);
    this.#drawTile(g, TEX.TILE_SAND, PALETTE.sand, 0xcbb06a);
    this.#drawTile(g, TEX.TILE_WATER, PALETTE.water, 0x2f6fae);
    this.#drawTile(g, TEX.TILE_DIRT, PALETTE.dirt, 0x6e4429);
    this.#drawTile(g, TEX.TILE_STONE, PALETTE.stone, 0x777777);

    this.#drawCharacter(g, TEX.PLAYER_GUERRERO, 0xd94f4f, 0x8a2f2f);
    this.#drawCharacter(g, TEX.PLAYER_EXPLORADORA, 0x4fae6a, 0x2f7a45);
    this.#drawCharacter(g, TEX.PLAYER_MAGO, 0x5d5fd9, 0x38399e);

    this.#drawPlant(g, TEX.PLANT_HOSTILE, 0xb23a3a, 0x6e1f1f, true);
    this.#drawPlant(g, TEX.PLANT_ALLY, 0x4fae6a, 0x2f7a45, false);
    this.#drawZombie(g, TEX.ZOMBIE, 0x6f8f4f, 0x3f5a2f);
    this.#drawSpectre(g, TEX.SPECTRE, 0x8a6fd9, 0x4a3a8f);

    this.#drawBuildable(g, TEX.BUILD_WALL_WOOD, 0x9a6a3c, 0x6e4429);
    this.#drawBuildable(g, TEX.BUILD_FARM_PLOT, 0x8a5a3c, 0x4fae6a);
    this.#drawBuildable(g, TEX.BUILD_DOOR, 0x7a5030, 0x3a2416);

    this.#drawIcon(g, TEX.ICON_WOOD, 0x9a6a3c);
    this.#drawIcon(g, TEX.ICON_STONE, 0x9a9a9a);
    this.#drawIcon(g, TEX.ICON_FIBER, 0xd8c98a);
    this.#drawIcon(g, TEX.ICON_FOOD_FRUIT, 0xe0473f);
    this.#drawIcon(g, TEX.ICON_FOOD_MEAT, 0xc97a5a);
    this.#drawIcon(g, TEX.ICON_CRYSTAL, 0x6fd9d0);
    this.#drawIcon(g, TEX.ICON_GOLD, PALETTE.uiAccent);
    this.#drawIcon(g, TEX.ICON_GEM, 0x6fd9ff);

    g.destroy();

    this.scene.start(SCENES.MENU);
  }

  #drawTile(g, key, base, edge) {
    g.clear();
    g.fillStyle(base, 1);
    g.fillRoundedRect(0, 0, TILE_SIZE, TILE_SIZE, 4);
    g.lineStyle(1, edge, 0.5);
    g.strokeRoundedRect(0.5, 0.5, TILE_SIZE - 1, TILE_SIZE - 1, 4);
    g.generateTexture(key, TILE_SIZE, TILE_SIZE);
  }

  #drawCharacter(g, key, body, shade) {
    const s = 40;
    g.clear();
    // cuerpo ovalado orgánico
    g.fillStyle(shade, 1);
    g.fillEllipse(s / 2, s / 2 + 2, s * 0.62, s * 0.7);
    g.fillStyle(body, 1);
    g.fillEllipse(s / 2, s / 2, s * 0.58, s * 0.66);
    // cabeza
    g.fillStyle(0xf2c79a, 1);
    g.fillCircle(s / 2, s * 0.32, s * 0.22);
    // ojos simples
    g.fillStyle(0x1a1a1a, 1);
    g.fillCircle(s / 2 - 5, s * 0.3, 2.2);
    g.fillCircle(s / 2 + 5, s * 0.3, 2.2);
    g.generateTexture(key, s, s);
  }

  #drawPlant(g, key, body, shade, angry) {
    const s = 36;
    g.clear();
    g.fillStyle(shade, 1);
    g.fillEllipse(s / 2, s * 0.62, s * 0.5, s * 0.32); // maceta/base
    g.fillStyle(body, 1);
    g.fillCircle(s / 2, s * 0.4, s * 0.32); // "cabeza" caricaturesca
    g.fillStyle(0x1a1a1a, 1);
    if (angry) {
      g.fillTriangle(s / 2 - 9, s * 0.35, s / 2 - 3, s * 0.3, s / 2 - 3, s * 0.4);
      g.fillTriangle(s / 2 + 9, s * 0.35, s / 2 + 3, s * 0.3, s / 2 + 3, s * 0.4);
      g.fillRect(s / 2 - 7, s * 0.5, 14, 3);
    } else {
      g.fillCircle(s / 2 - 5, s * 0.38, 2);
      g.fillCircle(s / 2 + 5, s * 0.38, 2);
      g.fillRect(s / 2 - 5, s * 0.48, 10, 2);
    }
    g.generateTexture(key, s, s);
  }

  #drawZombie(g, key, body, shade) {
    const s = 40;
    g.clear();
    g.fillStyle(shade, 1);
    g.fillEllipse(s / 2, s / 2 + 2, s * 0.6, s * 0.72);
    g.fillStyle(body, 1);
    g.fillEllipse(s / 2, s / 2, s * 0.56, s * 0.68);
    g.fillStyle(0x1a1a1a, 1);
    g.fillRect(s / 2 - 8, s * 0.3, 5, 5);
    g.fillRect(s / 2 + 3, s * 0.3, 5, 5);
    g.fillRect(s / 2 - 6, s * 0.48, 12, 2);
    g.generateTexture(key, s, s);
  }

  #drawSpectre(g, key, body, shade) {
    const s = 40;
    g.clear();
    g.fillStyle(body, 0.85);
    g.fillEllipse(s / 2, s / 2, s * 0.5, s * 0.6);
    g.fillStyle(shade, 0.6);
    g.fillTriangle(s * 0.2, s * 0.7, s * 0.5, s * 0.95, s * 0.8, s * 0.7);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(s / 2 - 5, s * 0.42, 2.2);
    g.fillCircle(s / 2 + 5, s * 0.42, 2.2);
    g.generateTexture(key, s, s);
  }

  #drawBuildable(g, key, body, roof) {
    const s = TILE_SIZE;
    g.clear();
    g.fillStyle(body, 1);
    g.fillRoundedRect(2, 6, s - 4, s - 8, 6);
    g.fillStyle(roof, 1);
    g.fillTriangle(1, 8, s / 2, -2, s - 1, 8);
    g.generateTexture(key, s, s);
  }

  #drawIcon(g, key, color) {
    const s = 20;
    g.clear();
    g.fillStyle(0x000000, 0.25);
    g.fillRoundedRect(1, 1, s - 2, s - 2, 5);
    g.fillStyle(color, 1);
    g.fillRoundedRect(0, 0, s - 2, s - 2, 5);
    g.generateTexture(key, s, s);
  }
}
