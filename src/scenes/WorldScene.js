import Phaser from 'phaser';
import { SCENES } from '../sceneKeys.js';
import { TEX } from '../textureKeys.js';
import { TILE_SIZE, CHUNK_SIZE, RENDER_CHUNK_RADIUS, TILE_TYPES, BUILDABLE_TYPES } from '../constants.js';
import { EventBus } from '../eventBus.js';
import { GameState, saveState } from '../state.js';
import { getSelectedBuildType, isBuildModeActive } from '../buildSelection.js';
import { getTileTypeAt } from '../world/terrain.js';
import { createDayNightCycle, isDaytime, setForcedDarkness } from '../world/dayNight.js';
import { getChunkKey, loadChunkBuildings, spawnExistingBuilding, placeBuilding } from '../world/chunkStore.js';
import { startSurvivalTicker } from '../systems/hunger.js';
import Player from '../entities/Player.js';
import { castSpell, SPELLS } from '../systems/magic.js';
import { getAltarsForChunk, spawnAltarSprite, destroyAltar } from '../world/altars.js';
import { checkRareZoneUnlocks, getZoneAt, getTileOverrideAt, spawnCrystalNodes } from '../world/rareZones.js';
import ZoneGuardian from '../entities/ZoneGuardian.js';
import { spawnRandomMonster } from '../entities/monsterSpawner.js';
import { getResourceNodesForChunk, spawnResourceNodeSprite, tryGather, tryDestroyStructure } from '../systems/gathering.js';
import { getBiomeAt, getDecorationAt } from '../world/biomes.js';
import {
  getCaveEntranceForChunk,
  spawnCaveEntranceSprite,
  isInsideCave,
  getCaveTileTypeAt,
  getCaveRegionOrigin,
  getCaveExitPoint,
  getCaveLootForRegion,
  spawnCaveLootSprite,
  openCaveLootChest,
  CAVE_TEX
} from '../world/caves.js';
import { attachCampfireLight } from '../world/campfire.js';
import { registerShadowFollower, addVignette } from '../world/shading.js';
import { t } from '../i18n.js';

const CHUNK_PX = CHUNK_SIZE * TILE_SIZE;

// Cada cuánto se revisa si hay que spawnear enemigos, y el rango (en px)
// alrededor del jugador donde pueden aparecer (nunca encima suyo).
// Fase 3 (partes 3 y 9 del pedido): bichos/plantas/monstruos con MÁS
// frecuencia que en la Fase 1/2, para subir la dificultad.
const SPAWN_CHECK_MS = 2200;
const SPAWN_MIN_DIST = 200;
const SPAWN_MAX_DIST = 450;
const MAX_MONSTERS = 16;
const MAX_GUARDIANS = 3;
const INTERACT_RANGE = 50; // altares / entrada-salida de cueva / cofres

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
    // chunkKey -> { tileImages, buildingSprites, altarSprites, decorSprites,
    //               resourceNodeSprites, caveEntranceSprites, campfireLights }
    this.loadedChunks = new Map();
    this.lastChunkX = null;
    this.lastChunkY = null;
    this.buildingsColliderAdded = false;
    this.resourceNodesColliderAdded = false;
    this.decorColliderAdded = false;
    this.caveWallsColliderAdded = false;
    this.spawningPaused = false;

    // Fase 3 (parte 14): estado de "estoy dentro de una cueva ahora mismo".
    this.inCave = false;
    this.currentCaveEntranceId = null;
    this.caveReturnPos = null;
    this.caveExitSprite = null;
    this.caveLootSprites = [];

    const spawnX = GameState.world.lastX ?? GameState.world.spawnX ?? 0;
    const spawnY = GameState.world.lastY ?? GameState.world.spawnY ?? 0;
    this.inCave = isInsideCave(Math.floor(spawnX / TILE_SIZE), Math.floor(spawnY / TILE_SIZE));

    // Carga inicial de chunks alrededor del punto de aparición, ANTES de
    // crear al jugador, para que no aparezca sobre un mundo vacío.
    this.#updateStreaming(spawnX, spawnY, true);

    this.player = new Player(this, spawnX, spawnY);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    // Fase 3 (parte 11): sombra bajo el jugador (mismo tratamiento que los monstruos).
    this.playerShadow = registerShadowFollower(this, this.player, { offsetY: 16, scale: 1.1 });
    // Viñeta sutil de pantalla completa, profundidad ambiental barata (parte 11).
    addVignette(this);

    // Grupo de física de monstruos (Fase 3: catálogo de 50+ tipos, ver
    // entities/monsterCatalog.js / Monster.js — sustituye a los antiguos
    // plantsGroup/zombiesGroup, todo pasa por scene.monstersGroup ahora).
    this.monstersGroup = this.physics.add.group();
    // Fase 2: jefes (dioses) y guardianes de zona se auto-registran igual
    // (scene.bossGroup / scene.guardiansGroup), creados perezosamente por
    // GodBoss.spawn/ZoneGuardian.spawn — los inicializamos ya aquí para que
    // existan desde el primer frame (evita el "??=" perezoso en dos lugares).
    this.bossGroup = this.physics.add.group();
    this.guardiansGroup = this.physics.add.group();
    // Fase 3: paredes de cueva sólidas (static group, poblado en #loadChunk).
    this.caveWallsGroup = this.physics.add.staticGroup();

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

    // Tecla E: interactuar — entrar/salir de cueva, abrir cofre, o destruir
    // el altar más cercano, lo que esté más a mano (partes 6, 14 y 169-201).
    keyboard.on('keydown-E', () => this.#tryInteract());

    // Fase 3 (partes 5 y 10): F recolecta (pico/hacha en árboles/rocas/
    // minerales), X demuele una construcción propia (requiere martillo).
    keyboard.on('keydown-F', () => {
      if (this.player) tryGather(this, this.player);
    });
    keyboard.on('keydown-X', () => {
      if (this.player) tryDestroyStructure(this, this.player);
    });

    // Teclas 1-4: lanzar los 4 hechizos (en el orden de systems/magic.js#SPELLS).
    SPELLS.forEach((spell, i) => {
      keyboard.on(`keydown-${['ONE', 'TWO', 'THREE', 'FOUR'][i]}`, () => {
        if (this.player) castSpell(this, spell.id, this.player);
      });
    });

    this.input.on('pointerdown', (pointer) => {
      if (!pointer.leftButtonDown()) return;
      if (isBuildModeActive()) {
        const tileX = Math.floor(pointer.worldX / TILE_SIZE);
        const tileY = Math.floor(pointer.worldY / TILE_SIZE);
        const buildType = getSelectedBuildType();
        const sprite = placeBuilding(this, tileX, tileY, buildType);
        // Registra la construcción nueva en el chunk cargado en memoria para
        // que el streaming pueda destruirla si luego sale del radio de carga.
        if (sprite) {
          const cx = Math.floor(tileX / CHUNK_SIZE);
          const cy = Math.floor(tileY / CHUNK_SIZE);
          const chunk = this.loadedChunks.get(getChunkKey(cx, cy));
          chunk?.buildingSprites.push(sprite);
          // Fase 3 (parte 13): la fogata recién construida ilumina de inmediato.
          if (buildType === BUILDABLE_TYPES.CAMPFIRE) {
            chunk?.campfireLights.push(attachCampfireLight(this, sprite));
          }
        }
      } else {
        this.player?.attack?.();
      }
    });

    createDayNightCycle(this);
    setForcedDarkness(this.inCave);
    startSurvivalTicker(this);

    // Fase 2: territorios raros. Revisa condiciones ya cumplidas de partidas
    // guardadas, y de nuevo cada vez que algo relevante pasa (domesticar
    // planta, derrotar un dios). spawnCrystalNodes coloca los nodos de las
    // zonas YA desbloqueadas en este momento (ver TODO en rareZones.js).
    checkRareZoneUnlocks();
    spawnCrystalNodes(this);
    const onPlantTamed = () => checkRareZoneUnlocks();
    const onGodDefeatedZones = () => checkRareZoneUnlocks();
    EventBus.on('plant-tamed', onPlantTamed);
    EventBus.on('god-defeated', onGodDefeatedZones);

    // Temporizador de aparición de monstruos.
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
      EventBus.off('plant-tamed', onPlantTamed);
      EventBus.off('god-defeated', onGodDefeatedZones);
      this.playerShadow?.destroy();
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

    this.monstersGroup?.children.iterate((m) => m?.update?.(time, delta, this.player));
    this.bossGroup?.children.iterate((b) => b?.update?.(time, delta, this.player));
    this.guardiansGroup?.children.iterate((g) => g?.update?.(time, delta, this.player));

    // Guard: el grupo de construcciones lo crea chunkStore.js "perezosamente"
    // (solo cuando aparece la primera construcción), así que la colisión se
    // añade en cuanto detectamos que ya existe, y solo una vez.
    if (this.buildingsGroup && !this.buildingsColliderAdded && this.player) {
      this.physics.add.collider(this.player, this.buildingsGroup);
      this.buildingsColliderAdded = true;
    }
    // Fase 3 (parte 10): los nodos de recolección (árboles/rocas/minerales)
    // también bloquean un poco el paso, igual que las construcciones.
    if (this.resourceNodesGroup && !this.resourceNodesColliderAdded && this.player) {
      this.physics.add.collider(this.player, this.resourceNodesGroup);
      this.resourceNodesColliderAdded = true;
    }
    // Fase 3 (parte 14): árboles/rocas de decoración de bioma sólidos.
    if (this.decorGroup && !this.decorColliderAdded && this.player) {
      this.physics.add.collider(this.player, this.decorGroup);
      this.decorColliderAdded = true;
    }
    // Fase 3 (parte 14): paredes de cueva.
    if (!this.caveWallsColliderAdded && this.player && this.caveWallsGroup) {
      this.physics.add.collider(this.player, this.caveWallsGroup);
      this.caveWallsColliderAdded = true;
    }
  }

  /** Aparición periódica de monstruos según la fase del día/bioma, con cupo máximo (partes 3 y 9). */
  #trySpawnEnemies() {
    if (this.spawningPaused || !this.player) return;

    if ((this.monstersGroup?.getLength() ?? 0) < MAX_MONSTERS) {
      const pos = this.#randomSpawnPosition();
      if (pos) {
        const tileX = Math.floor(pos.x / TILE_SIZE);
        const tileY = Math.floor(pos.y / TILE_SIZE);
        spawnRandomMonster(this, pos.x, pos.y, {
          dayPhase: isDaytime() ? 'day' : 'night',
          biome: getBiomeAt(tileX, tileY),
          isCave: this.inCave,
          playerLevel: GameState.player.level
        });
      }
    }

    // Fase 2: guardianes de territorio rara (parte 149) — solo aparecen si
    // el jugador está parado dentro de una zona rara ya desbloqueada.
    const playerTileX = Math.floor(this.player.x / TILE_SIZE);
    const playerTileY = Math.floor(this.player.y / TILE_SIZE);
    if (getZoneAt(playerTileX, playerTileY) && (this.guardiansGroup?.getLength() ?? 0) < MAX_GUARDIANS) {
      const pos = this.#randomSpawnPosition();
      if (pos) ZoneGuardian.spawn(this, pos.x, pos.y);
    }
  }

  /**
   * Tecla E: hace la acción más cercana disponible, en este orden — entrar a
   * una cueva / salir de ella / abrir un cofre de botín / destruir un altar
   * (partes 6, 14 y 169-201 del pedido).
   */
  #tryInteract() {
    if (!this.player) return;

    if (this.inCave) {
      if (this.caveExitSprite) {
        const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.caveExitSprite.x, this.caveExitSprite.y);
        if (d <= INTERACT_RANGE) {
          this.#exitCave();
          return;
        }
      }
      let nearestChest = null;
      let nearestDist = INTERACT_RANGE;
      for (const chest of this.caveLootSprites) {
        if (!chest?.active) continue;
        const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, chest.x, chest.y);
        if (d < nearestDist) {
          nearestChest = chest;
          nearestDist = d;
        }
      }
      if (nearestChest) {
        openCaveLootChest(this, nearestChest);
        return;
      }
      return;
    }

    // En superficie: entrada de cueva cercana antes que un altar.
    for (const chunk of this.loadedChunks.values()) {
      for (const sprite of chunk.caveEntranceSprites || []) {
        if (!sprite?.active) continue;
        const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, sprite.x, sprite.y);
        if (d <= INTERACT_RANGE) {
          this.#enterCave(sprite.caveEntranceData);
          return;
        }
      }
    }

    this.#tryDestroyNearbyAltar();
  }

  /** Teletransporta al jugador al interior de la cueva de `entranceData` (parte 14). */
  #enterCave(entranceData) {
    if (!entranceData) return;
    this.inCave = true;
    this.currentCaveEntranceId = entranceData.id;
    this.caveReturnPos = { x: this.player.x, y: this.player.y };

    const origin = getCaveRegionOrigin(entranceData.id);
    const px = origin.x * TILE_SIZE + TILE_SIZE / 2;
    const py = origin.y * TILE_SIZE + TILE_SIZE / 2;
    this.player.setPosition(px, py);
    setForcedDarkness(true);
    this.#updateStreaming(px, py, true);

    const exitPt = getCaveExitPoint(entranceData.id);
    this.caveExitSprite = this.add
      .sprite(exitPt.x * TILE_SIZE + TILE_SIZE / 2, exitPt.y * TILE_SIZE + TILE_SIZE / 2, CAVE_TEX.EXIT)
      .setDepth(999999);
    this.caveLootSprites = getCaveLootForRegion(entranceData.id).map((chest) => spawnCaveLootSprite(this, chest));

    EventBus.emit('notify', t('notify.caveEnter'));
  }

  /** Vuelve a la superficie, al punto exacto donde se entró (parte 14). */
  #exitCave() {
    if (!this.caveReturnPos) return;
    this.inCave = false;
    this.currentCaveEntranceId = null;
    setForcedDarkness(false);

    this.player.setPosition(this.caveReturnPos.x, this.caveReturnPos.y);
    this.#updateStreaming(this.caveReturnPos.x, this.caveReturnPos.y, true);

    this.caveExitSprite?.destroy();
    this.caveExitSprite = null;
    this.caveLootSprites.forEach((s) => s?.destroy());
    this.caveLootSprites = [];
    this.caveReturnPos = null;

    EventBus.emit('notify', t('notify.caveExit'));
  }

  /** Busca un altar cargado en memoria a menos de INTERACT_RANGE px del jugador y lo destruye. */
  #tryDestroyNearbyAltar() {
    if (!this.player) return;
    for (const chunk of this.loadedChunks.values()) {
      for (const sprite of chunk.altarSprites) {
        if (!sprite?.active) continue;
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, sprite.x, sprite.y);
        if (dist <= INTERACT_RANGE) {
          destroyAltar(this, sprite);
          return;
        }
      }
    }
  }

  /** Punto aleatorio a 200-450px del jugador, evitando aparecer en el agua o dentro de una pared de cueva. */
  #randomSpawnPosition() {
    const angle = Math.random() * Math.PI * 2;
    const dist = Phaser.Math.Between(SPAWN_MIN_DIST, SPAWN_MAX_DIST);
    const x = this.player.x + Math.cos(angle) * dist;
    const y = this.player.y + Math.sin(angle) * dist;
    const tileX = Math.floor(x / TILE_SIZE);
    const tileY = Math.floor(y / TILE_SIZE);

    if (this.inCave) {
      if (getCaveTileTypeAt(tileX, tileY) === 'wall') return null;
      return { x, y };
    }
    const tileType = getTileTypeAt(tileX, tileY);
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

    const chunkIsCave = isInsideCave(cx * CHUNK_SIZE, cy * CHUNK_SIZE);
    const tileImages = [];
    const decorSprites = [];

    for (let ty = 0; ty < CHUNK_SIZE; ty++) {
      for (let tx = 0; tx < CHUNK_SIZE; tx++) {
        const worldTileX = cx * CHUNK_SIZE + tx;
        const worldTileY = cy * CHUNK_SIZE + ty;
        const px = worldTileX * TILE_SIZE + TILE_SIZE / 2;
        const py = worldTileY * TILE_SIZE + TILE_SIZE / 2;

        if (chunkIsCave) {
          // Fase 3 (parte 14): interior de cueva — piso decorativo, pared sólida.
          const caveType = getCaveTileTypeAt(worldTileX, worldTileY);
          if (caveType === 'wall') {
            const wallSprite = this.caveWallsGroup.create(px, py, CAVE_TEX.WALL);
            wallSprite.setDepth(py);
            wallSprite.refreshBody();
            tileImages.push(wallSprite);
          } else {
            const img = this.add.image(px, py, CAVE_TEX.FLOOR);
            img.setDepth(-1000);
            tileImages.push(img);
          }
          continue;
        }

        // Fase 2: si estas coordenadas caen dentro de una zona rara ya
        // desbloqueada, "pintamos" la textura especial por encima del
        // terreno normal (ver world/rareZones.js).
        const override = getTileOverrideAt(worldTileX, worldTileY);
        const type = getTileTypeAt(worldTileX, worldTileY);
        const texture = override ?? tileTypeToTexture(type, worldTileX, worldTileY);
        const img = this.add.image(px, py, texture);
        img.setDepth(-1000); // los tiles siempre van al fondo
        tileImages.push(img);

        // Fase 3 (parte 14): decoración de bioma (árboles/arbustos/flores/rocas).
        const decor = getDecorationAt(worldTileX, worldTileY);
        if (decor) {
          if (decor.solid) {
            this.decorGroup ??= this.physics.add.staticGroup();
            const sprite = this.decorGroup.create(px, py, decor.tex);
            sprite.setDepth(py);
            sprite.refreshBody();
            decorSprites.push(sprite);
          } else {
            const sprite = this.add.image(px, py, decor.tex);
            sprite.setDepth(py);
            decorSprites.push(sprite);
          }
        }
      }
    }

    let buildingSprites = [];
    let altarSprites = [];
    let resourceNodeSprites = [];
    let caveEntranceSprites = [];
    const campfireLights = [];

    if (!chunkIsCave) {
      const buildingDataList = loadChunkBuildings(cx, cy);
      buildingSprites = buildingDataList.map((data) => spawnExistingBuilding(this, data));
      buildingDataList.forEach((data, i) => {
        if (data.type === BUILDABLE_TYPES.CAMPFIRE) {
          campfireLights.push(attachCampfireLight(this, buildingSprites[i]));
        }
      });

      // Fase 2: altares (0 o 1 por chunk, deterministas — ver world/altars.js).
      altarSprites = getAltarsForChunk(cx, cy).map((data) => spawnAltarSprite(this, data));

      // Fase 3 (parte 10): nodos de recolección (árboles/rocas/minerales).
      resourceNodeSprites = getResourceNodesForChunk(cx, cy).map((data) => spawnResourceNodeSprite(this, data));

      // Fase 3 (parte 14): entrada de cueva (0 o 1 por chunk, solo en HILLS).
      const entranceData = getCaveEntranceForChunk(cx, cy);
      if (entranceData) caveEntranceSprites = [spawnCaveEntranceSprite(this, entranceData)];
    }

    this.loadedChunks.set(key, {
      tileImages,
      buildingSprites,
      altarSprites,
      decorSprites,
      resourceNodeSprites,
      caveEntranceSprites,
      campfireLights
    });
  }

  #unloadChunk(key) {
    const chunk = this.loadedChunks.get(key);
    if (!chunk) return;
    chunk.tileImages.forEach((img) => img.destroy());
    chunk.buildingSprites.forEach((sprite) => sprite?.destroy());
    chunk.altarSprites.forEach((sprite) => sprite?.destroy());
    chunk.decorSprites.forEach((sprite) => sprite?.destroy());
    chunk.resourceNodeSprites.forEach((sprite) => sprite?.destroy());
    chunk.caveEntranceSprites.forEach((sprite) => sprite?.destroy());
    chunk.campfireLights.forEach((light) => light?.destroy());
    this.loadedChunks.delete(key);
  }
}
