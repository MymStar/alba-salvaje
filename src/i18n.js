// Sistema de idiomas (i18n) simple basado en diccionario.
//
// Alcance de esta primera pasada: menú principal, HUD (barras, botones,
// modal de muerte), menú de construcción, chat y los mensajes de aviso
// (toasts) más comunes — es decir, todo lo que el jugador ve constantemente.
// La ficha detallada de la tienda y los textos legales completos (EULA/
// Privacidad) siguen solo en español por ahora; son textos largos que
// conviene traducir con más cuidado (y en el caso legal, revisión humana)
// en una siguiente pasada — ver README.
//
// Cambiar de idioma persiste la elección y recarga la página: es la forma
// más simple de garantizar que TODO el texto (incluida la escena que esté
// activa en ese momento) se redibuje correctamente en el idioma nuevo.

import { EventBus } from './eventBus.js';

const STORAGE_KEY = 'alba_salvaje_lang_v1';

export const LANGUAGES = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' }
];

const DICTS = {
  es: {
    'menu.subtitle': 'Un mundo abierto por explorar, construir y sobrevivir',
    'menu.play': 'Jugar',
    'menu.footer.eula': 'EULA',
    'menu.footer.privacy': 'Privacidad',
    'menu.footer.credits': 'Créditos',
    'menu.language': 'Idioma',
    'char.guerrero': 'Guerrero',
    'char.exploradora': 'Exploradora',
    'char.mago': 'Mago',

    'hud.bar.hp': 'Vida {cur}/{max}',
    'hud.bar.energy': 'Energía {cur}/{max}',
    'hud.bar.hunger': 'Hambre {cur}/{max}',
    'hud.bar.level': 'Nivel {level} — XP {xp}/{xpNext}',
    'hud.btn.shop': '🏪 Tienda',
    'hud.btn.build': '🔨 Construir',
    'hud.btn.chat': '💬 Chat',
    'hud.btn.equip': '🎒 Equipo',
    'hud.btn.achievements': '🏆 Logros',
    'hud.levelup': '¡Nivel {level}!',
    'hud.death.title': 'Has muerto',
    'hud.death.cost': 'Costo de revivir: {gold} oro + {gems} diamantes',
    'hud.death.revive': 'Revivir',
    'hud.death.notEnough': 'No tienes suficiente oro/diamantes.',
    'hud.death.reset': 'Reiniciar desde cero',

    'build.title': 'Construir',
    'build.wall': 'Muro de madera',
    'build.wall.cost': 'Costo: 3 madera',
    'build.farm': 'Granja',
    'build.farm.cost': 'Costo: 2 madera + 1 fibra',
    'build.door': 'Puerta',
    'build.door.cost': 'Costo: 2 madera',

    'chat.title': 'Chat',
    'chat.placeholder': 'Escribe un mensaje…',
    'chat.send': 'Enviar',
    'chat.offline': '(local — activa Firebase para chat global)',
    'chat.online': '(en línea)',

    'notify.insufficientResources': 'Recursos insuficientes',
    'notify.built': '¡Construido!',
    'notify.noFood': 'No tienes esa comida',

    // ---- Fase 2: objetos equipables ----
    'item.sword_wood': 'Espada de madera',
    'item.bow_hunter': 'Arco de cazador',
    'item.staff_apprentice': 'Bastón de aprendiz',
    'item.sword_legend': 'Espada legendaria',
    'item.armor_leather': 'Armadura de cuero',
    'item.armor_heavy': 'Armadura pesada',
    'item.robe_mage': 'Túnica mágica',
    'item.armor_divine': 'Armadura divina',
    'item.ring_mana': 'Anillo de maná',
    'item.boots_swift': 'Botas veloces',
    'item.amulet_divine': 'Amuleto divino',

    // ---- Fase 2 ----
    'notify.levelTooLow': 'Necesitas más nivel para esto',
    'notify.wrongClass': 'Este objeto es de otra clase de personaje',
    'notify.spellUnlocked': '¡Hechizo desbloqueado!',
    'notify.godDefeated': '¡Has derrotado a un dios! Ya puedes superar el nivel 100',
    'notify.altarDestroyed': 'Altar destruido... algo se despertó',
    'notify.godSummoned': 'Un dios malvado ha despertado',
    'notify.achievementUnlocked': '¡Logro desbloqueado: {name}!',
    'notify.equipped': 'Equipado',
    'notify.notEnoughMana': 'No tienes suficiente maná',

    'equip.title': 'Equipo',
    'equip.weapon': 'Arma',
    'equip.armor': 'Armadura',
    'equip.accessory': 'Accesorio',
    'equip.empty': '(vacío)',
    'equip.buy': 'Comprar',
    'equip.equip': 'Equipar',
    'equip.unequip': 'Quitar',
    'equip.levelReq': 'Nivel {level}+',

    'spell.title': 'Hechizos',
    'spell.mana': 'Maná {cur}/{max}',
    'spell.fireball': 'Bola de fuego',
    'spell.heal': 'Curar',
    'spell.barrier': 'Barrera',
    'spell.summon': 'Invocar aliado',
    'spell.locked': 'Nivel {level}+',

    'achievements.title': 'Logros',
    'achievement.survive10nights': 'Sobrevive 10 noches',
    'achievement.kill50zombies': 'Derrota 50 zombis',
    'achievement.kill20plants': 'Derrota 20 plantas hostiles',
    'achievement.plantForest': 'Doma 5 plantas',
    'achievement.build10': 'Construye 10 estructuras',
    'achievement.level10': 'Alcanza nivel 10',
    'achievement.level50': 'Alcanza nivel 50',
    'achievement.destroyAltar': 'Destruye un altar',
    'achievement.defeatGod': 'Derrota a un dios',
    'achievement.exploreRareZone': 'Descubre una zona rara',

    'market.title': 'Mercado',
    'market.sell': 'Vender',
    'market.buy': 'Comprar',
    'market.offline': '(local — activa Firebase para mercado global)',
    'market.noListings': 'No hay ofertas todavía',
    'market.price': 'Precio'
  },
  en: {
    'menu.subtitle': 'An open world to explore, build in, and survive',
    'menu.play': 'Play',
    'menu.footer.eula': 'EULA',
    'menu.footer.privacy': 'Privacy',
    'menu.footer.credits': 'Credits',
    'menu.language': 'Language',
    'char.guerrero': 'Warrior',
    'char.exploradora': 'Explorer',
    'char.mago': 'Mage',

    'hud.bar.hp': 'Health {cur}/{max}',
    'hud.bar.energy': 'Energy {cur}/{max}',
    'hud.bar.hunger': 'Hunger {cur}/{max}',
    'hud.bar.level': 'Level {level} — XP {xp}/{xpNext}',
    'hud.btn.shop': '🏪 Shop',
    'hud.btn.build': '🔨 Build',
    'hud.btn.chat': '💬 Chat',
    'hud.btn.equip': '🎒 Gear',
    'hud.btn.achievements': '🏆 Achievements',
    'hud.levelup': 'Level {level}!',
    'hud.death.title': 'You died',
    'hud.death.cost': 'Revive cost: {gold} gold + {gems} gems',
    'hud.death.revive': 'Revive',
    'hud.death.notEnough': 'Not enough gold/gems.',
    'hud.death.reset': 'Restart from scratch',

    'build.title': 'Build',
    'build.wall': 'Wooden wall',
    'build.wall.cost': 'Cost: 3 wood',
    'build.farm': 'Farm',
    'build.farm.cost': 'Cost: 2 wood + 1 fiber',
    'build.door': 'Door',
    'build.door.cost': 'Cost: 2 wood',

    'chat.title': 'Chat',
    'chat.placeholder': 'Type a message…',
    'chat.send': 'Send',
    'chat.offline': '(local — enable Firebase for global chat)',
    'chat.online': '(online)',

    'notify.insufficientResources': 'Not enough resources',
    'notify.built': 'Built!',
    'notify.noFood': "You don't have that food",

    'item.sword_wood': 'Wooden sword',
    'item.bow_hunter': "Hunter's bow",
    'item.staff_apprentice': "Apprentice's staff",
    'item.sword_legend': 'Legendary sword',
    'item.armor_leather': 'Leather armor',
    'item.armor_heavy': 'Heavy armor',
    'item.robe_mage': 'Mage robe',
    'item.armor_divine': 'Divine armor',
    'item.ring_mana': 'Mana ring',
    'item.boots_swift': 'Swift boots',
    'item.amulet_divine': 'Divine amulet',

    'notify.levelTooLow': 'You need a higher level for this',
    'notify.wrongClass': 'This item is for another character class',
    'notify.spellUnlocked': 'Spell unlocked!',
    'notify.godDefeated': "You've defeated a god! You can now go past level 100",
    'notify.altarDestroyed': 'Altar destroyed... something awakened',
    'notify.godSummoned': 'An evil god has awakened',
    'notify.achievementUnlocked': 'Achievement unlocked: {name}!',
    'notify.equipped': 'Equipped',
    'notify.notEnoughMana': 'Not enough mana',

    'equip.title': 'Equipment',
    'equip.weapon': 'Weapon',
    'equip.armor': 'Armor',
    'equip.accessory': 'Accessory',
    'equip.empty': '(empty)',
    'equip.buy': 'Buy',
    'equip.equip': 'Equip',
    'equip.unequip': 'Unequip',
    'equip.levelReq': 'Level {level}+',

    'spell.title': 'Spells',
    'spell.mana': 'Mana {cur}/{max}',
    'spell.fireball': 'Fireball',
    'spell.heal': 'Heal',
    'spell.barrier': 'Barrier',
    'spell.summon': 'Summon ally',
    'spell.locked': 'Level {level}+',

    'achievements.title': 'Achievements',
    'achievement.survive10nights': 'Survive 10 nights',
    'achievement.kill50zombies': 'Defeat 50 zombies',
    'achievement.kill20plants': 'Defeat 20 hostile plants',
    'achievement.plantForest': 'Tame 5 plants',
    'achievement.build10': 'Build 10 structures',
    'achievement.level10': 'Reach level 10',
    'achievement.level50': 'Reach level 50',
    'achievement.destroyAltar': 'Destroy an altar',
    'achievement.defeatGod': 'Defeat a god',
    'achievement.exploreRareZone': 'Discover a rare zone',

    'market.title': 'Market',
    'market.sell': 'Sell',
    'market.buy': 'Buy',
    'market.offline': '(local — enable Firebase for a global market)',
    'market.noListings': 'No listings yet',
    'market.price': 'Price'
  },
  pt: {
    'menu.subtitle': 'Um mundo aberto para explorar, construir e sobreviver',
    'menu.play': 'Jogar',
    'menu.footer.eula': 'EULA',
    'menu.footer.privacy': 'Privacidade',
    'menu.footer.credits': 'Créditos',
    'menu.language': 'Idioma',
    'char.guerrero': 'Guerreiro',
    'char.exploradora': 'Exploradora',
    'char.mago': 'Mago',

    'hud.bar.hp': 'Vida {cur}/{max}',
    'hud.bar.energy': 'Energia {cur}/{max}',
    'hud.bar.hunger': 'Fome {cur}/{max}',
    'hud.bar.level': 'Nível {level} — XP {xp}/{xpNext}',
    'hud.btn.shop': '🏪 Loja',
    'hud.btn.build': '🔨 Construir',
    'hud.btn.chat': '💬 Chat',
    'hud.levelup': 'Nível {level}!',
    'hud.death.title': 'Você morreu',
    'hud.death.cost': 'Custo para reviver: {gold} ouro + {gems} diamantes',
    'hud.death.revive': 'Reviver',
    'hud.death.notEnough': 'Ouro/diamantes insuficientes.',
    'hud.death.reset': 'Recomeçar do zero',

    'build.title': 'Construir',
    'build.wall': 'Parede de madeira',
    'build.wall.cost': 'Custo: 3 madeira',
    'build.farm': 'Fazenda',
    'build.farm.cost': 'Custo: 2 madeira + 1 fibra',
    'build.door': 'Porta',
    'build.door.cost': 'Custo: 2 madeira',

    'chat.title': 'Chat',
    'chat.placeholder': 'Escreva uma mensagem…',
    'chat.send': 'Enviar',
    'chat.offline': '(local — ative o Firebase para chat global)',
    'chat.online': '(online)',

    'notify.insufficientResources': 'Recursos insuficientes',
    'notify.built': 'Construído!',
    'notify.noFood': 'Você não tem essa comida'
  },
  fr: {
    'menu.subtitle': 'Un monde ouvert à explorer, construire et survivre',
    'menu.play': 'Jouer',
    'menu.footer.eula': 'CLUF',
    'menu.footer.privacy': 'Confidentialité',
    'menu.footer.credits': 'Crédits',
    'menu.language': 'Langue',
    'char.guerrero': 'Guerrier',
    'char.exploradora': 'Exploratrice',
    'char.mago': 'Mage',

    'hud.bar.hp': 'Vie {cur}/{max}',
    'hud.bar.energy': 'Énergie {cur}/{max}',
    'hud.bar.hunger': 'Faim {cur}/{max}',
    'hud.bar.level': 'Niveau {level} — XP {xp}/{xpNext}',
    'hud.btn.shop': '🏪 Boutique',
    'hud.btn.build': '🔨 Construire',
    'hud.btn.chat': '💬 Chat',
    'hud.levelup': 'Niveau {level} !',
    'hud.death.title': 'Vous êtes mort',
    'hud.death.cost': 'Coût de résurrection : {gold} or + {gems} diamants',
    'hud.death.revive': 'Réanimer',
    'hud.death.notEnough': "Pas assez d'or/de diamants.",
    'hud.death.reset': 'Recommencer à zéro',

    'build.title': 'Construire',
    'build.wall': 'Mur en bois',
    'build.wall.cost': 'Coût : 3 bois',
    'build.farm': 'Ferme',
    'build.farm.cost': 'Coût : 2 bois + 1 fibre',
    'build.door': 'Porte',
    'build.door.cost': 'Coût : 2 bois',

    'chat.title': 'Chat',
    'chat.placeholder': 'Écrivez un message…',
    'chat.send': 'Envoyer',
    'chat.offline': '(local — activez Firebase pour le chat global)',
    'chat.online': '(en ligne)',

    'notify.insufficientResources': 'Ressources insuffisantes',
    'notify.built': 'Construit !',
    'notify.noFood': "Vous n'avez pas cette nourriture"
  }
};

function detectDefault() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && DICTS[saved]) return saved;
  } catch {
    /* localStorage no disponible: se ignora */
  }
  const nav = (navigator.language || 'es').slice(0, 2).toLowerCase();
  return DICTS[nav] ? nav : 'es';
}

let current = detectDefault();

/** Código del idioma activo ('es' | 'en' | 'pt' | 'fr'). */
export function getLanguage() {
  return current;
}

/** Lista de idiomas disponibles, para pintar el selector. */
export function getAvailableLanguages() {
  return LANGUAGES;
}

/**
 * Cambia el idioma, lo persiste y recarga la página (forma simple y
 * confiable de que todo el texto de la escena activa se redibuje bien).
 */
export function setLanguage(code) {
  if (!DICTS[code] || code === current) return;
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* se ignora */
  }
  EventBus.emit('language-changed', code);
  window.location.reload();
}

/** Traduce `key` al idioma activo, con reemplazo simple de {variables}. */
export function t(key, vars) {
  const dict = DICTS[current] || DICTS.es;
  let str = dict[key] ?? DICTS.es[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replaceAll(`{${k}}`, v);
    }
  }
  return str;
}
