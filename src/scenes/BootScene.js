import Phaser from 'phaser';
import { TEX } from '../textureKeys.js';
import { SCENES } from '../sceneKeys.js';
import { PALETTE, TILE_SIZE } from '../constants.js';
import { registerGrowthTextures } from '../entities/growthTextures.js';
import { registerMonsterTextures } from '../entities/monsterTextures.js';
import { registerGatherTextures } from '../systems/gathering.js';
import { registerBiomeTextures } from '../world/biomes.js';
import { registerCaveTextures } from '../world/caves.js';
import { registerDayNightTextures } from '../world/dayNight.js';
import { registerCampfireTextures } from '../world/campfire.js';
import { registerShadingTextures } from '../world/shading.js';

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

    // ---- Fase 2: iconos de equipo (mismo estilo simple que los recursos) ----
    this.#drawIcon(g, TEX.ICON_SWORD, 0xc7c7d6);
    this.#drawIcon(g, TEX.ICON_BOW, 0x9a6a3c);
    this.#drawIcon(g, TEX.ICON_STAFF, 0x8a6fd9);
    this.#drawIcon(g, TEX.ICON_ARMOR_LIGHT, 0xa87c4f);
    this.#drawIcon(g, TEX.ICON_ARMOR_HEAVY, 0x6f7a8a);
    this.#drawIcon(g, TEX.ICON_ROBE, 0x6f5fd9);
    this.#drawIcon(g, TEX.ICON_RING, 0xffcc4d);
    this.#drawIcon(g, TEX.ICON_BOOTS, 0x5a4a3a);
    this.#drawIcon(g, TEX.ICON_AMULET, 0xd94fae);

    // ---- Fase 3: iconos de herramientas y fogata ----
    this.#drawIcon(g, TEX.ICON_PICKAXE, 0xb0b6c2);
    this.#drawIcon(g, TEX.ICON_AXE, 0x9a6a3c);
    this.#drawIcon(g, TEX.ICON_HAMMER, 0x7a7a7a);
    this.#drawIcon(g, TEX.BUILD_CAMPFIRE_ICON, 0xff8a3f);

    // ---- Fase 2: altares, dioses, cristales ----
    this.#drawAltar(g, TEX.ALTAR);
    this.#drawGod(g, TEX.GOD_SEA, 0x3f8fd6, 0x1f4f8f);
    this.#drawGod(g, TEX.GOD_WIND, 0xbfe0e8, 0x6f9fae);
    this.#drawGod(g, TEX.GOD_QUAKE, 0x9a6a3c, 0x5a3a1f);
    this.#drawGod(g, TEX.GOD_VOLCANO, 0xd9603f, 0x7a1f1f);
    this.#drawIcon(g, TEX.CRYSTAL_NODE, 0x6fd9d0);

    this.#drawFx(g, TEX.FX_FIREBALL, 0xff8a3f);
    this.#drawFx(g, TEX.FX_HEAL, 0x8bd450);
    this.#drawFx(g, TEX.FX_SHIELD, 0x4fc3f7);

    // ---- Fase 3 (2026-08-08): crecimiento por género/nivel, 50+ monstruos,
    // nodos de recolección. Cada módulo genera sus propias texturas con el
    // mismo Graphics reusable (ver README de cada uno para el detalle). ----
    registerGrowthTextures(g);
    registerMonsterTextures(g);
    registerGatherTextures(g);
    registerBiomeTextures(g);
    registerCaveTextures(g);
    registerDayNightTextures(g);
    registerCampfireTextures(g);
    registerShadingTextures(g);

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

  /** Altar de piedra: base ancha + pilar, con un brillo tentador en la punta. */
  #drawAltar(g, key) {
    const s = 40;
    g.clear();
    g.fillStyle(0x555f6e, 1);
    g.fillRoundedRect(s * 0.15, s * 0.6, s * 0.7, s * 0.3, 3);
    g.fillStyle(0x6f7a8a, 1);
    g.fillRoundedRect(s * 0.35, s * 0.25, s * 0.3, s * 0.4, 3);
    g.fillStyle(0xffcc4d, 0.9);
    g.fillCircle(s / 2, s * 0.22, 5);
    g.generateTexture(key, s, s);
  }

  /** Dios elemental: silueta grande y amenazante con "ojos" brillantes. */
  #drawGod(g, key, body, shade) {
    const s = 96;
    g.clear();
    g.fillStyle(shade, 1);
    g.fillEllipse(s / 2, s * 0.55, s * 0.62, s * 0.7);
    g.fillStyle(body, 1);
    g.fillEllipse(s / 2, s * 0.5, s * 0.56, s * 0.64);
    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(s / 2 - 14, s * 0.42, 5);
    g.fillCircle(s / 2 + 14, s * 0.42, 5);
    g.fillStyle(0x1a1a1a, 1);
    g.fillCircle(s / 2 - 14, s * 0.42, 2.4);
    g.fillCircle(s / 2 + 14, s * 0.42, 2.4);
    g.generateTexture(key, s, s);
  }

  /** Efecto visual simple (destello circular) para hechizos. */
  #drawFx(g, key, color) {
    const s = 28;
    g.clear();
    g.fillStyle(color, 0.35);
    g.fillCircle(s / 2, s / 2, s / 2);
    g.fillStyle(color, 0.9);
    g.fillCircle(s / 2, s / 2, s / 3.2);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(s / 2, s / 2, s / 7);
    g.generateTexture(key, s, s);
  }
}
