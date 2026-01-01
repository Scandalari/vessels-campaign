// ==================== ABILITIES ====================
var ABILITIES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
var ABILITY_NAMES = { STR: 'Strength', DEX: 'Dexterity', CON: 'Constitution', INT: 'Intelligence', WIS: 'Wisdom', CHA: 'Charisma' };

// ==================== SPELL SLOTS BY CASTER LEVEL ====================
// Index 0 = level 1, etc. Each array is [1st, 2nd, 3rd, 4th, 5th, 6th, 7th, 8th, 9th]
var FULL_CASTER_SLOTS = [
  [2,0,0,0,0,0,0,0,0], [3,0,0,0,0,0,0,0,0], [4,2,0,0,0,0,0,0,0], [4,3,0,0,0,0,0,0,0],
  [4,3,2,0,0,0,0,0,0], [4,3,3,0,0,0,0,0,0], [4,3,3,1,0,0,0,0,0], [4,3,3,2,0,0,0,0,0],
  [4,3,3,3,1,0,0,0,0], [4,3,3,3,2,0,0,0,0], [4,3,3,3,2,1,0,0,0], [4,3,3,3,2,1,0,0,0],
  [4,3,3,3,2,1,1,0,0], [4,3,3,3,2,1,1,0,0], [4,3,3,3,2,1,1,1,0], [4,3,3,3,2,1,1,1,0],
  [4,3,3,3,2,1,1,1,1], [4,3,3,3,3,1,1,1,1], [4,3,3,3,3,2,1,1,1], [4,3,3,3,3,2,2,1,1]
];

var HALF_CASTER_SLOTS = [
  [0,0,0,0,0,0,0,0,0], [2,0,0,0,0,0,0,0,0], [3,0,0,0,0,0,0,0,0], [3,0,0,0,0,0,0,0,0],
  [4,2,0,0,0,0,0,0,0], [4,2,0,0,0,0,0,0,0], [4,3,0,0,0,0,0,0,0], [4,3,0,0,0,0,0,0,0],
  [4,3,2,0,0,0,0,0,0], [4,3,2,0,0,0,0,0,0], [4,3,3,0,0,0,0,0,0], [4,3,3,0,0,0,0,0,0],
  [4,3,3,1,0,0,0,0,0], [4,3,3,1,0,0,0,0,0], [4,3,3,2,0,0,0,0,0], [4,3,3,2,0,0,0,0,0],
  [4,3,3,3,1,0,0,0,0], [4,3,3,3,1,0,0,0,0], [4,3,3,3,2,0,0,0,0], [4,3,3,3,2,0,0,0,0]
];

var WARLOCK_SLOTS = [
  [1,1], [2,1], [2,2], [2,2], [2,3], [2,3], [2,4], [2,4], [2,5], [2,5],
  [3,5], [3,5], [3,5], [3,5], [3,5], [3,5], [4,5], [4,5], [4,5], [4,5]
]; // [slots, slot level]

var CASTER_TYPES = {
  'Bard': 'full', 'Cleric': 'full', 'Druid': 'full', 'Sorcerer': 'full', 'Wizard': 'full',
  'Artificer': 'half', 'Paladin': 'half', 'Ranger': 'half',
  'Warlock': 'warlock',
  'Fighter': 'third', 'Rogue': 'third', // Only certain subclasses
  'Barbarian': 'none', 'Monk': 'none'
};

// ==================== CLASS RESOURCE TEMPLATES ====================
// Ability colors: STR=red, DEX=green, CON=orange, INT=blue, WIS=white, CHA=yellow
var ABILITY_COLORS = {
  STR: { bg: 'bg-red-500', border: 'border-red-400', text: 'text-red-300', bgUsed: 'bg-red-900/50' },
  DEX: { bg: 'bg-green-500', border: 'border-green-400', text: 'text-green-300', bgUsed: 'bg-green-900/50' },
  CON: { bg: 'bg-orange-500', border: 'border-orange-400', text: 'text-orange-300', bgUsed: 'bg-orange-900/50' },
  INT: { bg: 'bg-blue-500', border: 'border-blue-400', text: 'text-blue-300', bgUsed: 'bg-blue-900/50' },
  WIS: { bg: 'bg-gray-200', border: 'border-gray-300', text: 'text-gray-200', bgUsed: 'bg-gray-700/50' },
  CHA: { bg: 'bg-yellow-500', border: 'border-yellow-400', text: 'text-yellow-300', bgUsed: 'bg-yellow-900/50' }
};

var CLASS_RESOURCE_TEMPLATES = {
  'Barbarian': [{ name: 'Rage', ability: 'STR', getMax: (level) => level < 3 ? 2 : level < 6 ? 3 : level < 12 ? 4 : level < 17 ? 5 : 6, shortRest: false }],
  'Bard': [{ name: 'Inspiration', ability: 'CHA', getMax: (level, mods) => Math.max(1, mods.CHA), shortRest: (level) => level >= 5 }],
  'Cleric': [{ name: 'Channel Divinity', ability: 'WIS', getMax: (level) => level < 6 ? 1 : level < 18 ? 2 : 3, shortRest: true }],
  'Druid': [{ name: 'Wild Shape', ability: 'WIS', getMax: () => 2, shortRest: true }],
  'Fighter': [
    { name: 'Second Wind', ability: 'CON', getMax: () => 1, shortRest: true },
    { name: 'Action Surge', ability: 'STR', getMax: (level) => level < 17 ? 1 : 2, shortRest: true, minLevel: 2 }
  ],
  'Monk': [{ name: 'Ki', ability: 'WIS', getMax: (level) => level, shortRest: true, minLevel: 2 }],
  'Paladin': [
    { name: 'Lay on Hands', ability: 'CHA', getMax: (level) => level * 5, shortRest: false, isPool: true },
    { name: 'Channel Divinity', ability: 'CHA', getMax: () => 1, shortRest: true, minLevel: 3 }
  ],
  'Ranger': [{ name: 'Favored Foe', ability: 'WIS', getMax: (level) => level < 6 ? 2 : level < 14 ? 3 : 4, shortRest: false, minLevel: 1 }],
  'Rogue': [],
  'Sorcerer': [{ name: 'Sorcery Points', ability: 'CHA', getMax: (level) => level, shortRest: false, minLevel: 2 }],
  'Warlock': [],
  'Wizard': [{ name: 'Arcane Recovery', ability: 'INT', getMax: (level) => Math.ceil(level / 2), shortRest: false, isPool: true }],
  'Artificer': [{ name: 'Flash of Genius', ability: 'INT', getMax: (level, mods) => Math.max(1, mods.INT), shortRest: true, minLevel: 7 }]
};

// ==================== ACTION ECONOMY ====================
var ACTION_TYPES = ['Action', 'Bonus', 'Reaction', 'Movement', 'Object'];

// ==================== CHARACTER OPTIONS ====================
var ORIGINS = ['Replicant', 'Offering', 'Hiver', 'Proctor', 'Traveller', 'Lifer', 'Zealot', 'Modder'];
var CLASSES = ['Artificer', 'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard'];

var SUBCLASSES = {
  'Artificer': ['Alchemist', 'Armorer', 'Artillerist', 'Battle Smith'],
  'Barbarian': ['Ancestral Guardian', 'Beast', 'Berserker', 'Storm Herald', 'Totem Warrior', 'Wild Magic', 'Zealot'],
  'Bard': ['Creation', 'Eloquence', 'Glamour', 'Lore', 'Swords', 'Valor', 'Whispers'],
  'Cleric': ['Forge', 'Grave', 'Knowledge', 'Life', 'Light', 'Nature', 'Order', 'Peace', 'Tempest', 'Trickery', 'Twilight', 'War'],
  'Druid': ['Dreams', 'Land', 'Moon', 'Shepherd', 'Spores', 'Stars', 'Wildfire'],
  'Fighter': ['Arcane Archer', 'Battle Master', 'Cavalier', 'Champion', 'Eldritch Knight', 'Psi Warrior', 'Rune Knight', 'Samurai'],
  'Monk': ['Astral Self', 'Drunken Master', 'Four Elements', 'Kensei', 'Mercy', 'Open Hand', 'Shadow', 'Sun Soul'],
  'Paladin': ['Ancients', 'Conquest', 'Devotion', 'Glory', 'Redemption', 'Vengeance', 'Watchers'],
  'Ranger': ['Beast Master', 'Fey Wanderer', 'Gloom Stalker', 'Horizon Walker', 'Hunter', 'Monster Slayer', 'Swarmkeeper'],
  'Rogue': ['Arcane Trickster', 'Assassin', 'Inquisitive', 'Mastermind', 'Phantom', 'Scout', 'Soulknife', 'Swashbuckler', 'Thief'],
  'Sorcerer': ['Aberrant Mind', 'Clockwork Soul', 'Divine Soul', 'Draconic', 'Shadow', 'Storm', 'Wild'],
  'Warlock': ['Archfey', 'Celestial', 'Fathomless', 'Fiend', 'Genie', 'Great Old One', 'Hexblade'],
  'Wizard': ['Abjuration', 'Bladesinging', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Necromancy', 'Scribes', 'Transmutation', 'War']
};

// ==================== COMBAT ====================
var CONDITIONS = ['Blinded', 'Charmed', 'Concentration', 'Deafened', 'Exhaustion', 'Frightened', 'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious'];
var MINION_TYPES = ['Drone', 'Pet', 'Ally'];

var crToXp = {
  '0': 10, '1/8': 25, '1/4': 50, '1/2': 100,
  '1': 200, '2': 450, '3': 700, '4': 1100, '5': 1800,
  '6': 2300, '7': 2900, '8': 3900, '9': 5000, '10': 5900,
  '11': 7200, '12': 8400, '13': 10000, '14': 11500, '15': 13000,
  '16': 15000, '17': 18000, '18': 20000, '19': 22000, '20': 25000,
  '21': 33000, '22': 41000, '23': 50000, '24': 62000, '25': 75000,
  '26': 90000, '27': 105000, '28': 120000, '29': 135000, '30': 155000
};

var difficultyThresholds = {
  easy:   [25,50,75,125,250,300,350,450,550,600,800,1000,1100,1250,1400,1600,2000,2100,2400,2800],
  medium: [50,100,150,250,500,600,750,900,1100,1200,1600,2000,2200,2500,2800,3200,3900,4200,4900,5700],
  hard:   [75,150,225,375,750,900,1100,1400,1600,1900,2400,3000,3400,3800,4300,4800,5900,6300,7300,8500],
  deadly: [100,200,400,500,1100,1400,1700,2100,2400,2800,3600,4500,5100,5700,6400,7200,8800,9500,10900,12700]
};

// ==================== XP & LEVELING ====================
var levelThresholds = [0,300,900,2700,6500,14000,23000,34000,48000,64000,85000,100000,120000,140000,165000,195000,225000,265000,305000,355000];

var xpCategories = {
  'Story': [
    { name: 'Campaign', xp: 2500 },
    { name: 'Major', xp: 250 },
    { name: 'Minor', xp: 125 },
    { name: 'Progression', xp: 250 },
  ],
  'Problem Solving': [
    { name: 'Puzzle', xp: 150 },
    { name: 'Secret', xp: 100 },
    { name: 'Creative', xp: 100 },
    { name: 'Memory', xp: 50 },
  ],
  'Roleplay': [
    { name: 'Major RP', xp: 250 },
    { name: 'Minor RP', xp: 75 },
    { name: 'Bonding', xp: 100 },
    { name: 'Backstory', xp: 150 },
  ],
  'Side Quests': [
    { name: 'Short', xp: 100 },
    { name: 'Medium', xp: 150 },
    { name: 'Long', xp: 200 },
    { name: 'LONG', xp: 500 },
  ],
};

var sessionWords = ['ZERO','ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE','TEN',
  'ELEVEN','TWELVE','THIRTEEN','FOURTEEN','FIFTEEN','SIXTEEN','SEVENTEEN','EIGHTEEN','NINETEEN','TWENTY',
  'TWENTY-ONE','TWENTY-TWO','TWENTY-THREE','TWENTY-FOUR','TWENTY-FIVE','TWENTY-SIX','TWENTY-SEVEN','TWENTY-EIGHT','TWENTY-NINE','THIRTY',
  'THIRTY-ONE','THIRTY-TWO','THIRTY-THREE','THIRTY-FOUR','THIRTY-FIVE','THIRTY-SIX','THIRTY-SEVEN','THIRTY-EIGHT','THIRTY-NINE','FORTY',
  'FORTY-ONE','FORTY-TWO','FORTY-THREE','FORTY-FOUR','FORTY-FIVE','FORTY-SIX','FORTY-SEVEN','FORTY-EIGHT','FORTY-NINE','FIFTY'];

// ==================== SHOPS & LOOT ====================
var SHOP_TYPES = [
  { id: 'general', name: 'General Store', color: 'cyan' },
  { id: 'firearms', name: 'Firearms', color: 'red' },
  { id: 'pharmacist', name: 'Pharmacist', color: 'green' },
  { id: 'cybernetics', name: 'Cybernetics', color: 'fuchsia' },
];

var SHOP_ITEM_COUNT = 15;

var LOOT_TYPES = [
  { id: 'civilian', name: 'Civilian', color: 'gray' },
  { id: 'guard', name: 'Guard', color: 'yellow' },
  { id: 'military', name: 'Military', color: 'orange' },
  { id: 'space', name: 'Space', color: 'purple' },
];

var CR_BRACKETS = [
  { id: '0-4', name: 'CR 0-4' },
  { id: '5-10', name: 'CR 5-10' },
  { id: '11-16', name: 'CR 11-16' },
  { id: '17+', name: 'CR 17+' },
];

var individualTreasure = {
  '0-4': [
    { range: [1, 30], coins: { cp: '5d6' } },
    { range: [31, 60], coins: { sp: '4d6' } },
    { range: [61, 70], coins: { ep: '3d6' } },
    { range: [71, 95], coins: { gp: '3d6' } },
    { range: [96, 100], coins: { pp: '1d6' } },
  ],
  '5-10': [
    { range: [1, 30], coins: { cp: '4d6*100', ep: '1d6*10' } },
    { range: [31, 60], coins: { sp: '6d6*10', gp: '2d6*10' } },
    { range: [61, 70], coins: { ep: '3d6*10', gp: '2d6*10' } },
    { range: [71, 95], coins: { gp: '4d6*10' } },
    { range: [96, 100], coins: { gp: '2d6*10', pp: '3d6' } },
  ],
  '11-16': [
    { range: [1, 20], coins: { sp: '4d6*100', gp: '1d6*100' } },
    { range: [21, 35], coins: { ep: '1d6*100', gp: '1d6*100' } },
    { range: [36, 75], coins: { gp: '2d6*100', pp: '1d6*10' } },
    { range: [76, 100], coins: { gp: '2d6*100', pp: '2d6*10' } },
  ],
  '17+': [
    { range: [1, 15], coins: { ep: '2d6*1000', gp: '8d6*100' } },
    { range: [16, 55], coins: { gp: '1d6*1000', pp: '1d6*100' } },
    { range: [56, 100], coins: { gp: '1d6*1000', pp: '2d6*100' } },
  ],
};

var rarityWeights = {
  civilian: { common: 85, uncommon: 14, rare: 1, veryRare: 0, legendary: 0 },
  guard: { common: 60, uncommon: 30, rare: 9, veryRare: 1, legendary: 0 },
  military: { common: 30, uncommon: 35, rare: 25, veryRare: 9, legendary: 1 },
  space: { common: 15, uncommon: 25, rare: 35, veryRare: 20, legendary: 5 },
};

var lootItemCounts = {
  civilian: { min: 2, max: 5 },
  guard: { min: 3, max: 6 },
  military: { min: 4, max: 7 },
  space: { min: 5, max: 8 },
};
