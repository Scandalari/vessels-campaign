// ==================== DICE UTILITIES ====================
var rollDice = (notation) => {
  const match = notation.match(/(\d+)d(\d+)(?:\*(\d+))?/);
  if (!match) return parseInt(notation) || 0;
  const [, count, sides, multiplier] = match;
  let total = 0;
  for (let i = 0; i < parseInt(count); i++) {
    total += Math.floor(Math.random() * parseInt(sides)) + 1;
  }
  return total * (parseInt(multiplier) || 1);
};

var rollD100 = () => Math.floor(Math.random() * 100) + 1;

// ==================== ARRAY UTILITIES ====================
var shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ==================== WEIGHTED RANDOM ====================
var weightedRandomRarity = (weights) => {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (const [rarity, weight] of Object.entries(weights)) {
    roll -= weight;
    if (roll <= 0) return rarity;
  }
  return 'common';
};

// ==================== ENCOUNTER HELPERS ====================
var getEncounterMultiplier = (count) => {
  if (count <= 1) return 1;
  if (count === 2) return 1.5;
  if (count <= 6) return 2;
  if (count <= 10) return 2.5;
  if (count <= 14) return 3;
  return 4;
};

// ==================== SESSION HELPERS ====================
var getSessionWord = (n) => sessionWords[n] || String(n);
