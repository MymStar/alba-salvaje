// Punto de entrada del juego. Ensambla el Phaser.Game con las 4 escenas
// (Boot -> Menu -> World + HUD en paralelo). Cada escena fue escrita por un
// módulo distinto (ver README) siguiendo el contrato compartido en
// constants.js / textureKeys.js / sceneKeys.js / eventBus.js / state.js.

import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import WorldScene from './scenes/WorldScene.js';
import HUDScene from './scenes/HUDScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 960,
  height: 600,
  backgroundColor: '#0b0f14',
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BootScene, MenuScene, WorldScene, HUDScene]
};

// eslint-disable-next-line no-new
new Phaser.Game(config);
