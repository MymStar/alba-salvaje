import { GENDER, GROWTH_STAGES, getGrowthStageForLevel } from '../constants.js';

// Texturas de personaje con crecimiento progresivo (parte 8 del pedido del
// usuario, 2026-08-08): el personaje arranca como bebé envuelto (sin brazos
// ni piernas visibles) y va ganando extremidades hasta volverse adulto,
// con una silueta ligeramente distinta según el género.
//
// Mismo lenguaje visual que BootScene#drawCharacter (líneas ~87-103): cuerpo
// ovalado con una sombra ovalada más oscura debajo (simula volumen), cabeza
// circular con piel 0xf2c79a, ojos simples (2 círculos oscuros).
//
// Esquema de claves (documentado aquí, usado igual en ambas funciones):
//   `growth_${characterId}_${gender}_${stage}`
//   ej. "growth_guerrero_male_child", "growth_maga_female_adult"... etc.
//   (characterId siempre uno de CHARACTER_IDS, gender uno de GENDER.*,
//   stage uno de GROWTH_STAGES.*)

// Paletas por clase, calcadas de BootScene.js (líneas 28-30) para que estas
// texturas combinen con el resto del arte generado del juego.
const CLASS_PALETTES = {
  guerrero: { body: 0xd94f4f, shade: 0x8a2f2f },
  exploradora: { body: 0x4fae6a, shade: 0x2f7a45 },
  mago: { body: 0x5d5fd9, shade: 0x38399e }
};

const CHARACTER_IDS = Object.keys(CLASS_PALETTES); // ['guerrero', 'exploradora', 'mago']
const GENDERS = [GENDER.MALE, GENDER.FEMALE];
const STAGES_ORDER = [
  GROWTH_STAGES.BABY,
  GROWTH_STAGES.CHILD,
  GROWTH_STAGES.TEEN,
  GROWTH_STAGES.ADULT
];

const SKIN = 0xf2c79a;
const EYE = 0x1a1a1a;

// Lienzo por etapa: un poco más alto en TEEN/ADULT para que el crecimiento
// se note, sin salirse demasiado de TILE_SIZE=32 (BABY/CHILD igualan el
// tamaño original de #drawCharacter en BootScene: 40px).
const STAGE_CANVAS = {
  [GROWTH_STAGES.BABY]: 40,
  [GROWTH_STAGES.CHILD]: 40,
  [GROWTH_STAGES.TEEN]: 44,
  [GROWTH_STAGES.ADULT]: 46
};

// Proporciones de cabeza/torso por etapa (fracciones del lienzo `s`), estilo
// "chibi" de cabeza grande en CHILD que se va equilibrando hacia ADULT.
const BODY_SHAPE = {
  [GROWTH_STAGES.BABY]: { headR: 0.24, headCy: 0.32, bodyCy: 0.52, bodyH: 0.66, bodyW: 0.58 },
  [GROWTH_STAGES.CHILD]: { headR: 0.21, headCy: 0.27, bodyCy: 0.49, bodyH: 0.57, bodyW: 0.52 },
  [GROWTH_STAGES.TEEN]: { headR: 0.16, headCy: 0.2, bodyCy: 0.46, bodyH: 0.56, bodyW: 0.42 },
  [GROWTH_STAGES.ADULT]: { headR: 0.14, headCy: 0.17, bodyCy: 0.44, bodyH: 0.58, bodyW: 0.4 }
};

// Extremidades por etapa. CHILD usa óvalos cortos/gorditos; TEEN/ADULT usan
// rectángulos redondeados más largos y definidos. Todos los factores están
// verificados para que las extremidades queden dentro del lienzo `s`.
const LIMB_SHAPE = {
  [GROWTH_STAGES.CHILD]: {
    type: 'oval',
    leg: { cy: 0.74, h: 0.2, w: 0.15, xOffsetOfBodyW: 0.24 },
    arm: { cy: 0.46, h: 0.16, w: 0.12, xOffsetOfBodyW: 0.56 }
  },
  [GROWTH_STAGES.TEEN]: {
    type: 'rect',
    leg: { top: 0.68, h: 0.25, w: 0.1, xOffsetOfBodyW: 0.25 },
    arm: { top: 0.37, h: 0.3, w: 0.09, xOffsetOfBodyW: 0.62 }
  },
  [GROWTH_STAGES.ADULT]: {
    type: 'rect',
    leg: { top: 0.67, h: 0.28, w: 0.09, xOffsetOfBodyW: 0.25 },
    arm: { top: 0.34, h: 0.34, w: 0.085, xOffsetOfBodyW: 0.64 }
  }
};

/** Construye la clave de textura exacta para una combinación clase/género/etapa. */
function growthKey(characterId, gender, stage) {
  return `growth_${characterId}_${gender}_${stage}`;
}

/** Brazos y piernas: forma/longitud según la etapa (BABY no llama a esto). */
function drawLimbs(g, s, stage, bodyCx, bodyCy, bodyW, bodyH, body, shade) {
  const cfg = LIMB_SHAPE[stage];
  if (!cfg) return;

  if (cfg.type === 'oval') {
    // piernitas y brazos cortos, gorditos (óvalos), estilo "chibi"
    const legCy = s * cfg.leg.cy;
    const legH = s * cfg.leg.h;
    const legW = s * cfg.leg.w;
    const legDx = bodyW * cfg.leg.xOffsetOfBodyW;
    g.fillStyle(shade, 1);
    g.fillEllipse(bodyCx - legDx, legCy + 1, legW, legH);
    g.fillEllipse(bodyCx + legDx, legCy + 1, legW, legH);
    g.fillStyle(body, 1);
    g.fillEllipse(bodyCx - legDx, legCy, legW * 0.9, legH * 0.9);
    g.fillEllipse(bodyCx + legDx, legCy, legW * 0.9, legH * 0.9);

    const armCy = s * cfg.arm.cy;
    const armH = s * cfg.arm.h;
    const armW = s * cfg.arm.w;
    const armDx = bodyW * cfg.arm.xOffsetOfBodyW;
    g.fillStyle(body, 1);
    g.fillEllipse(bodyCx - armDx, armCy, armW, armH);
    g.fillEllipse(bodyCx + armDx, armCy, armW, armH);
  } else {
    // brazos/piernas más largos y rectangulares (TEEN/ADULT)
    const legTop = s * cfg.leg.top;
    const legH = s * cfg.leg.h;
    const legW = s * cfg.leg.w;
    const legDx = bodyW * cfg.leg.xOffsetOfBodyW;
    g.fillStyle(shade, 1);
    g.fillRoundedRect(bodyCx - legDx - legW / 2, legTop, legW, legH, 2);
    g.fillRoundedRect(bodyCx + legDx - legW / 2, legTop, legW, legH, 2);
    g.fillStyle(body, 1);
    g.fillRoundedRect(bodyCx - legDx - legW / 2, legTop - 1, legW * 0.85, legH * 0.92, 2);
    g.fillRoundedRect(bodyCx + legDx - legW / 2, legTop - 1, legW * 0.85, legH * 0.92, 2);

    const armTop = s * cfg.arm.top;
    const armH = s * cfg.arm.h;
    const armW = s * cfg.arm.w;
    const armDx = bodyW * cfg.arm.xOffsetOfBodyW;
    g.fillStyle(body, 1);
    g.fillRoundedRect(bodyCx - armDx - armW / 2, armTop, armW, armH, 2);
    g.fillRoundedRect(bodyCx + armDx - armW / 2, armTop, armW, armH, 2);
  }
}

/**
 * Dibuja un personaje en una etapa de crecimiento dada dentro de `g` y
 * genera su textura bajo `key`. Reutiliza el truco de sombra ovalada de
 * BootScene#drawCharacter y agrega extremidades + variación de silueta por
 * género según la etapa.
 */
function drawGrowthCharacter(g, key, body, shade, gender, stage) {
  const s = STAGE_CANVAS[stage];
  const shape = BODY_SHAPE[stage];
  const isFemale = gender === GENDER.FEMALE;
  g.clear();

  const bodyCx = s / 2;
  const headR = s * shape.headR;
  const headCy = s * shape.headCy;
  const bodyCy = s * shape.bodyCy;
  const bodyH = s * shape.bodyH;
  // Silueta por género: femenina un poco más afinada (angosta), masculina
  // un poco más ancha de hombros (torso ligeramente más ancho).
  const bodyW = s * shape.bodyW * (isFemale ? 0.88 : 1.06);

  const hasLimbs = stage !== GROWTH_STAGES.BABY;
  if (hasLimbs) {
    drawLimbs(g, s, stage, bodyCx, bodyCy, bodyW, bodyH, body, shade);
  }

  // sombra del torso (simula volumen, mismo truco que BootScene#drawCharacter)
  g.fillStyle(shade, 1);
  g.fillEllipse(bodyCx, bodyCy + 2, bodyW, bodyH);
  // hombros más anchos: pequeño refuerzo arriba del torso (silueta masculina)
  if (!isFemale && hasLimbs) {
    g.fillEllipse(bodyCx, bodyCy - bodyH * 0.32, bodyW * 0.62, bodyH * 0.22);
  }

  // torso
  g.fillStyle(body, 1);
  g.fillEllipse(bodyCx, bodyCy - 2, bodyW * 0.94, bodyH * 0.94);
  if (!isFemale && hasLimbs) {
    g.fillEllipse(bodyCx, bodyCy - bodyH * 0.32 - 2, bodyW * 0.58, bodyH * 0.2);
  }

  // cabeza
  g.fillStyle(SKIN, 1);
  g.fillCircle(bodyCx, headCy, headR);

  // silueta femenina: dos pequeños mechones/coletas a los lados de la cabeza
  if (isFemale) {
    g.fillStyle(shade, 1);
    g.fillCircle(bodyCx - headR * 0.95, headCy + headR * 0.35, headR * 0.32);
    g.fillCircle(bodyCx + headR * 0.95, headCy + headR * 0.35, headR * 0.32);
  }

  // ojos simples
  g.fillStyle(EYE, 1);
  const eyeDx = headR * 0.42;
  const eyeR = Math.max(1.6, headR * 0.14);
  g.fillCircle(bodyCx - eyeDx, headCy - headR * 0.05, eyeR);
  g.fillCircle(bodyCx + eyeDx, headCy - headR * 0.05, eyeR);

  g.generateTexture(key, s, s);
}

/**
 * Genera las 24 texturas (3 clases x 2 géneros x 4 etapas de crecimiento).
 * `g` es el mismo Graphics reutilizable que usa BootScene (this.make.graphics).
 */
export function registerGrowthTextures(g) {
  for (const characterId of CHARACTER_IDS) {
    const { body, shade } = CLASS_PALETTES[characterId];
    for (const gender of GENDERS) {
      for (const stage of STAGES_ORDER) {
        const key = growthKey(characterId, gender, stage);
        drawGrowthCharacter(g, key, body, shade, gender, stage);
      }
    }
  }
}

/**
 * Devuelve la clave de textura exacta para un personaje/género/nivel dado.
 * `characterId`: 'guerrero'|'exploradora'|'mago' (GameState.character.id).
 * `gender`: GENDER.MALE|GENDER.FEMALE (GameState.character.gender).
 * `level`: GameState.player.level (número).
 * Si `characterId` no es uno de los 3 conocidos, cae a 'guerrero' (nunca
 * rompe ni devuelve undefined).
 */
export function getGrowthTextureKey(characterId, gender, level) {
  const id = CLASS_PALETTES[characterId] ? characterId : 'guerrero';
  const stage = getGrowthStageForLevel(level);
  return growthKey(id, gender, stage);
}
