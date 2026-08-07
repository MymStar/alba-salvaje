// Textos legales (EULA / Privacidad / Créditos) y overlay a pantalla completa
// para mostrarlos desde MenuScene (pie de página) u otras escenas.
//
// FASE 1 - MARCADOR DE POSICIÓN: estos textos (sobre todo Privacidad y EULA)
// son un resumen provisional para el prototipo. Antes de recolectar datos
// reales de usuarios en producción, un abogado debe revisar y redactar la
// política de privacidad y los términos definitivos.

import { PALETTE } from '../constants.js';

export function getCreditsText() {
  return (
    '© 2026 Mario López Valdés — Diseñador y Programador Experto. ' +
    'Nacido en Cuba en 1988. Creador y propietario intelectual del proyecto. ' +
    'Registro de autor: Carne 88121617542. Todos los derechos reservados.'
  );
}

export function getEulaText() {
  return [
    'ACUERDO DE LICENCIA DE USUARIO FINAL (EULA) — Resumen',
    '',
    '1. Propiedad intelectual: todo el contenido de "Alba Salvaje" (código, arte, ' +
      'textos, sonidos y diseño) está protegido por derechos de autor y pertenece ' +
      'a su creador. Se concede una licencia personal, no exclusiva e intransferible ' +
      'para jugar, únicamente para uso personal y no comercial.',
    '',
    '2. Prohibiciones: queda prohibido copiar, distribuir, modificar, realizar ' +
      'ingeniería inversa o explotar comercialmente el juego o sus contenidos sin ' +
      'autorización expresa y por escrito del propietario.',
    '',
    '3. Registro de cuenta: el registro (cuando esté disponible) requerirá un ' +
      'correo electrónico válido y verificación de identidad básica antes de ' +
      'habilitar funciones en línea.',
    '',
    '4. Anti-trampas: el juego incorpora (o incorporará) sistemas anti-trampas y ' +
      'anti-bots. El uso de trampas, bots o exploits puede resultar en la ' +
      'suspensión o cancelación permanente de la cuenta, sin previo aviso.',
    '',
    '5. Monedas e ítems virtuales: el oro, los diamantes y los demás ítems del ' +
      'juego son bienes virtuales sin valor monetario fuera del juego, salvo los ' +
      'paquetes oficiales adquiridos a través de los canales de pago autorizados.',
    '',
    '6. Revivir personajes: revivir a un personaje caído tiene un costo progresivo ' +
      'en oro y/o diamantes, que aumenta con cada muerte del mismo personaje.',
    '',
    '7. Uso responsable: el jugador se compromete a un uso responsable y respetuoso ' +
      '(incluido el chat). El incumplimiento de estas condiciones puede derivar en ' +
      'sanciones dentro del juego, incluida la suspensión de la cuenta.',
    '',
    '8. Ley aplicable: este acuerdo se rige por los principios generales del ' +
      'derecho internacional de propiedad intelectual y protección al consumidor, ' +
      'sin perjuicio de las leyes locales que puedan aplicar al jugador.',
    '',
    '(Documento resumido, versión de prototipo — sujeto a revisión legal antes del ' +
      'lanzamiento definitivo.)'
  ].join('\n');
}

export function getPrivacyText() {
  return [
    'POLÍTICA DE PRIVACIDAD — Resumen (Fase 1, prototipo)',
    '',
    'Datos que se podrían solicitar en el futuro: correo electrónico (para crear ' +
      'una cuenta) y, de forma opcional, un número de teléfono.',
    '',
    'Para qué se usarían: autenticación de la cuenta, recuperación de acceso y ' +
      'medidas de seguridad anti-fraude / anti-trampas.',
    '',
    'No se venden datos personales a terceros.',
    '',
    'Para solicitar la eliminación de tus datos, contacta al propietario del ' +
      'proyecto por los canales indicados en el juego o su sitio oficial.',
    '',
    '(Esta versión es un marcador de posición de Fase 1: todavía no se recolectan ' +
      'datos reales de usuarios. Antes de habilitar registro/login en producción, ' +
      'esta política debe ser redactada y revisada por un abogado.)'
  ].join('\n');
}

const CONTENT_BY_KIND = {
  eula: { title: 'EULA', getText: getEulaText },
  privacy: { title: 'Privacidad', getText: getPrivacyText },
  credits: { title: 'Créditos', getText: getCreditsText }
};

/**
 * Muestra un overlay a pantalla completa con el texto legal indicado.
 * @param {Phaser.Scene} scene
 * @param {'eula'|'privacy'|'credits'} kind
 */
export function renderLegalOverlay(scene, kind) {
  closeLegalOverlay(scene);

  const entry = CONTENT_BY_KIND[kind] || CONTENT_BY_KIND.credits;
  const w = scene.scale.width;
  const h = scene.scale.height;

  const container = scene.add.container(0, 0).setDepth(10000);
  scene._legalOverlay = container;

  const bg = scene.add.rectangle(0, 0, w, h, 0x000000, 0.75).setOrigin(0, 0).setInteractive();
  container.add(bg);

  const panelW = Math.min(560, w - 40);
  const panelH = Math.min(440, h - 40);
  const panelX = w / 2 - panelW / 2;
  const panelY = h / 2 - panelH / 2;

  const panel = scene.add.rectangle(panelX, panelY, panelW, panelH, PALETTE.uiBg, 0.97).setOrigin(0, 0);
  panel.setStrokeStyle(2, PALETTE.uiAccent, 1);
  container.add(panel);

  const title = scene.add.text(panelX + 16, panelY + 12, entry.title, {
    fontFamily: 'Segoe UI, sans-serif',
    fontSize: '22px',
    color: '#ffcc4d',
    fontStyle: 'bold'
  });
  container.add(title);

  const body = scene.add.text(panelX + 16, panelY + 48, entry.getText(), {
    fontFamily: 'Segoe UI, sans-serif',
    fontSize: '13px',
    color: '#e8e8e8',
    wordWrap: { width: panelW - 32 },
    lineSpacing: 4
  });
  container.add(body);

  // Recorte simple: si el texto es más alto que el panel, lo dejamos visible
  // igual (scroll no crítico para este prototipo) pero acotamos el panel a un
  // tamaño razonable y priorizamos que el botón "Cerrar" quede siempre visible.
  const maxBodyHeight = panelH - 100;
  if (body.height > maxBodyHeight) {
    const mask = scene.make.graphics({ x: 0, y: 0, add: false });
    mask.fillRect(panelX + 16, panelY + 48, panelW - 32, maxBodyHeight);
    body.setMask(mask.createGeometryMask());
  }

  const closeBtnW = 120;
  const closeBtnH = 36;
  const closeBtnX = panelX + panelW / 2 - closeBtnW / 2;
  const closeBtnY = panelY + panelH - closeBtnH - 14;

  const closeBtn = scene.add.rectangle(closeBtnX, closeBtnY, closeBtnW, closeBtnH, PALETTE.uiAccent, 1)
    .setOrigin(0, 0)
    .setInteractive({ useHandCursor: true });
  const closeLabel = scene.add.text(closeBtnX + closeBtnW / 2, closeBtnY + closeBtnH / 2, 'Cerrar', {
    fontFamily: 'Segoe UI, sans-serif',
    fontSize: '15px',
    color: '#14181f',
    fontStyle: 'bold'
  }).setOrigin(0.5);

  closeBtn.on('pointerup', () => closeLegalOverlay(scene));
  bg.on('pointerup', () => closeLegalOverlay(scene));

  container.add(closeBtn);
  container.add(closeLabel);
}

/**
 * Cierra (destruye) el overlay legal actualmente abierto en la escena, si existe.
 * @param {Phaser.Scene} scene
 */
export function closeLegalOverlay(scene) {
  if (scene._legalOverlay) {
    scene._legalOverlay.destroy(true);
    scene._legalOverlay = null;
  }
}
