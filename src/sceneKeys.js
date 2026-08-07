// Claves de escenas Phaser (contrato compartido).
export const SCENES = {
  BOOT: 'Boot',
  MENU: 'Menu', // dueño: Agente C (UI) -> src/scenes/MenuScene.js
  WORLD: 'World', // dueño: Agente A (mundo) -> src/scenes/WorldScene.js
  HUD: 'HUD' // dueño: Agente C (UI), escena superpuesta -> src/scenes/HUDScene.js
};
