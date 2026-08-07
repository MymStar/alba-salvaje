import Phaser from 'phaser';
import { SCENES } from '../sceneKeys.js';
import { TEX } from '../textureKeys.js';
import { TILE_SIZE, CHUNK_SIZE, RENDER_CHUNK_RADIUS, TILE_TYPES } from '../constants.js';
import { EventBus } from '../eventBus.js';
import { GameState, saveState } from '../state.js';
import { getSelectedBuildType, isBuildModeActive } from '../buildSelection.js';
import { getTileTypeAt } from '../world/terrain.js';
import { createDayNightCycle, isDaytime } from '../world/dayNight.js';
import { getChunkKey, loadChunkBuildings, spawnExistingBuilding, placeBuilding } from '../world/chunkStore.js';
import { startSurvivalTicker } from '../systems/hunger.js';
import Player from '../entities/Player.js';
import PlantEnemy from '../entities/PlantEnemy.js';
import Zombie from '../entities/Zombie.js';

const CHUNK_PX = CHUNK_SIZE * TILE_SIZE;

// Cada cuánto se revisa si hay que spawnear enemigos, y el rango (en px)
// alrededor del jugador donde pueden aparecer (nunca encima suyo).
const SPAWN_CHECK_MS = 4000;
const SPAWN_MIN_DIST = 200;
const SPAWN_MAX_DIST = 450;
const MAX_PLANTS = 6;
const MAX_ZOMBIES = 6;

const AUTOSAVE_MS = 2000;

/** Mapea un tipo de tile del terreno a su textura, con variación visual en pradera. */
function tileTypeToTexture(type, worldTileX, worldTileY) {
  switch (type) {
    case TILE_TYPES.WATER:
      return TEX.TILE_WATER;
    case TILE_TYPES.SAND:
      return TEX.TILE_SAND;
    case TILE_TYPES.STONE:
      return TEX.TILE_STONE;
    case TILE_TYPES.DIRT:
      return TEX.TILE_DIRT;
    case TILE_TYPES.GRASS:
    default:
      // Alternancia determinista (no aleatoria) para dar variedad sin romper
      // la propiedad de que el mundo se vea igual siempre que se recarga.
      return (worldTileX * 3 + worldTileY * 7) % 9 === 0 ? TEX.TILE_GRASS_ALT : TEX.TILE_GRASS;
  }
}

export default class WorldScene extends Phaser.Scene {
  constructor() {
    super(SCENES.WORLD);
  }

  create() {
    // chunkKey -> { tileImages: Image[], buildingSprites: Sprite[] }
    this.loadedChunks = new Map();
    this.lastChunkX = null;
    this.lastChunkY = null;
    this.buildingsColliderAdded = false;
    this.spawningPaused = false;

    const spawnX = GameState.world.lastX ?? GameState.world.spawnX ?? 0;
    const spawnY = GameState.world.lastY ?? GameState.world.spawnY ?? 0;

    // Carga inicial de chunks alrededor del punto de aparición, ANTES de
    // crear al jugador, para que no aparezca sobre un mundo vacío.
    this.#updateStreaming(spawnX, spawnY, true);

    this.player = new Player(this, spawnX, spawnY);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Grupos de física de enemigos (contrato compartido con Agente B: sus
    // clases se auto-registran en scene.plantsGroup / scene.zombiesGroup).
    this.plantsGroup = this.physics.add.group();
    this.zombiesGroup = this.physics.add.group();

    // Input: flechas + WASD combinadas en un único objeto "cursors" con la
    // forma estándar de Phaser (up/down/left/right/space), para que Player
    // no tenga que preocuparse de leer dos esquemas de teclas distintas.
    const keyboard = this.input.keyboard;
    const arrows = keyboard.createCursorKeys();
    const wasd = keyboard.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D' });
    this.cursors = {
      up: { get isDown() { return arrows.up.isDown || wasd.up.isDown; } },
      down: { get isDown() { return arrows.down.isDown || wasd.down.isDown; } },
      left: { get isDown() { return arrows.left.isDown || wasd.left.isDown; } },
      right: { get isDown() { return arrows.right.isDown || wasd.right.isDown; } },
      space: arrows.space
    };

    keyboard.on('keydown-SPACE', () => {
      this.player?.attack?.();
    });

    this.input.on('pointerdown', (pointer) => {
      if (!pointer.leftButtonDown()) return;
      if (isBuildModeActive()) {
        const tileX = Math.floor(pointer.worldX / TILE_SIZE);
        const tileY = Math.floor(pointer.worldY / TILE_SIZE);
        const sprite = placeBuilding(this, tileX, tileY, getSelectedBuildType());
        // Registra la construcción nueva en el chunk cargado en memoria para
        // que el streaming pueda destruirla si luego sale del radio de carga.
        if (sprite) {
          const cx = Math.floor(tileX / CHUNK_SIZE);
          const cy = Math.floor(tileY / CHUNK_SIZE);
          const chunk = this.loadedChunks.get(getChunkKey(cx, cy));
          chunk?.buildingSprites.push(sprite);
        }
      } else {
        this.player?.attack?.();
      }
    });

    createDayNightCycle(this);
    startSurvivalTicker(this);

    // Temporizador de aparición de enemigos: plantas de día, zombis de noche.
    this.time.addEvent({
      delay: SPAWN_CHECK_MS,
      loop: true,
      callback: () => this.#trySpawnEnemies()
    });

    const onPlayerDied = () => {
      this.spawningPaused = true;
    };
    const onStatsChanged = () => {
      if (GameState.player.alive) this.spawningPaused = false;
    };
    EventBus.on('player-died', onPlayerDied);
    EventBus.on('stats-changed', onStatsChanged);
    // WorldScene puede reiniciarse (stop/start) al "reiniciar desde cero" tras
    // morir; sin este cleanup, cada reinicio dejaría un listener duplicado
    // colgado en el EventBus global (que no se destruye con la escena).
    this.events.once('shutdown', () => {
      EventBus.off('player-died', onPlayerDied);
      EventBus.off('stats-changed', onStatsChanged);
    });

    // Autoguardado periódico de la última posición conocida del jugador.
    this.time.addEvent({
      delay: AUTOSAVE_MS,
      loop: true,
      callback: () => {
        if (!this.player) return;
        GameState.world.lastX = this.player.x;
        GameState.world.lastY = this.player.y;
        saveState();
      }
    });

    // Guard: si WorldScene se reinicia (stop/start) tras un "reiniciar desde
    // cero" en el modal de muerte, HUDScene sigue viva — evita relanzarla.
    if (!this.scene.isActive(SCENES.HUD)) {
      this.scene.launch(SCENES.HUD);
    }
  }

  update(time, delta) {
    if (this.player) {
      this.player.update(this.cursors, delta);
      this.#updateStreaming(this.player.x, this.player.y, false);
    }

    this.plantsGroup?.children.iterate((p) => p?.update?.(time, delta, this.player));
    this.zombiesGroup?.children.iterate((z) => z?.update?.(time, delta, this.player));

    // Guard: el grupo de construcciones lo crea chunkStore.js "perezosamente"
    // (solo cuando aparece la primera construcción), así que la colisión se
    // añade en cuanto detectamos que ya existe, y solo una vez.
    if (this.buildingsGroup && !this.buildingsColliderAdded && this.player) {
      this.physics.add.collider(this.player, this.buildingsGroup);
      this.buildingsColliderAdded = true;
    }
  }

  /** Aparición periódica de enemigos según la fase del día, con cupo máximo. */
  #trySpawnEnemies() {
    if (this.spawningPaused || !this.player) return;

    if (isDaytime()) {
      if ((this.plantsGroup?.getLength() ?? 0) < MAX_PLANTS) {
        const pos = this.#randomSpawnPosition();
        if (pos) PlantEnemy.spawn(this, pos.x, pos.y);
      }
    } else if ((this.zombiesGroup?.getLength() ?? 0) < MAX_ZOMBIES) {
      const pos = this.#randomSpawnPosition();
      if (pos) Zombie.spawn(this, pos.x, pos.y);
    }
  }

  /** Punto aleatorio a 200-450px del jugador, evitando aparecer en el agua. */
  #randomSpawnPosition() {
    const angle = Math.random() * Math.PI * 2;
    const dist = Phaser.Math.Between(SPAWN_MIN_DIST, SPAWN_MAX_DIST);
    const x = this.player.x + Math.cos(angle) * dist;
    const y = this.player.y + Math.sin(angle) * dist;
    const tileType = getTileTypeAt(Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE));
    if (tileType === TILE_TYPES.WATER) return null; // se reintenta en el próximo tick
    return { x, y };
  }

  /**
   * Streaming de chunks: carga los que entran en RENDER_CHUNK_RADIUS y
   * destruye (tiles + construcciones) los que quedan fuera. Solo recalcula
   * cuando el jugador cambió de chunk, para no repetir trabajo cada frame.
   */
  #updateStreaming(worldX, worldY, force) {
    const cx = Math.floor(worldX / CHUNK_PX);
    const cy = Math.floor(worldY / CHUNK_PX);
    if (!force && cx === this.lastChunkX && cy === this.lastChunkY) return;
    this.lastChunkX = cx;
    this.lastChunkY = cy;

    const wanted = new Set();
    for (let dx = -RENDER_CHUNK_RADIUS; dx <= RENDER_CHUNK_RADIUS; dx++) {
      for (let dy = -RENDER_CHUNK_RADIUS; dy <= RENDER_CHUNK_RADIUS; dy++) {
        const ccx = cx + dx;
        const ccy = cy + dy;
        wanted.add(getChunkKey(ccx, ccy));
        this.#loadChunk(ccx, ccy);
      }
    }

    for (const key of [...this.loadedChunks.keys()]) {
      if (!wanted.has(key)) {
        this.#unloadChunk(key);
      }
    }
  }

  #loadChunk(cx, cy) {
    const key = getChunkKey(cx, cy);
    if (this.loadedChunks.has(key)) return;

    const tileImages = [];
    for (let ty = 0; ty < CHUNK_SIZE; ty++) {
      for (let tx = 0; tx < CHUNK_SIZE; tx++) {
        const worldTileX = cx * CHUNK_SIZE + tx;
        const worldTileY = cy * CHUNK_SIZE + ty;
        const type = getTileTypeAt(worldTileX, worldTileY);
        const texture = tileTypeToTexture(type, worldTileX, worldTileY);
        const img = this.add.image(
          worldTileX * TILE_SIZE + TILE_SIZE / 2,
          worldTileY * TILE_SIZE + TILE_SIZE / 2,
          texture
        );
        img.setDepth(-1000); // los tiles siempre van al fondo
        tileImages.push(img);
      }
    }

    const buildingSprites = loadChunkBuildings(cx, cy).map((data) => spawnExistingBuilding(this, data));

    this.loadedChunks.set(key, { tileImages, buildingSprites });
  }

  #unloadChunk(key) {
    const chunk = this.loadedChunks.get(key);
    if (!chunk) return;
    chunk.tileImages.forEach((img) => img.destroy());
    chunk.buildingSprites.forEach((sprite) => sprite?.destroy());
    this.loadedChunks.delete(key);
  }
}
