// Pequeño módulo compartido: qué pieza de construcción está seleccionada
// ahora mismo. La UI (BuildingUI) lo escribe; el mundo (WorldScene) lo lee
// al recibir un click en modo construcción. Evita que WorldScene y la UI
// dependan directamente una de la otra.

import { BUILDABLE_TYPES } from './constants.js';

let selected = BUILDABLE_TYPES.WALL_WOOD;
let buildModeActive = false;

export function getSelectedBuildType() {
  return selected;
}

export function setSelectedBuildType(type) {
  selected = type;
}

export function isBuildModeActive() {
  return buildModeActive;
}

export function setBuildModeActive(active) {
  buildModeActive = active;
}
