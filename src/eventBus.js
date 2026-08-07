// Bus de eventos global. Todas las escenas/UI/sistemas se comunican a través
// de esto en vez de acoplarse directamente unas a otras.
//
// Eventos usados en el proyecto (contrato compartido entre los 3 módulos):
//   'stats-changed'      -> UI refresca barras de vida/energía/hambre
//   'currency-changed'   -> UI refresca oro/diamantes
//   'inventory-changed'  -> UI refresca inventario
//   'levelup'            -> (level:number) UI muestra aviso de subida de nivel
//   'player-died'        -> UI muestra pantalla de muerte / revivir
//   'day-night-changed'  -> ('day'|'night') mundo y UI reaccionan
//   'build-mode-changed' -> (boolean) UI resalta modo construcción
//   'shop-open' / 'shop-close'
//   'notify'             -> (message:string) toast simple en HUD

import Phaser from 'phaser';

export const EventBus = new Phaser.Events.EventEmitter();
