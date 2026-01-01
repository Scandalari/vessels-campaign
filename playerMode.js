// ==================== PLAYER MODE COMPONENT ====================
// Extracted from main XPTracker for modularity

function PlayerMode({ party, partyLevel, onExit, savedCharacter, onSaveCharacter }) {
  const { useState, useEffect } = React;

  // ==================== STATE ====================
  const [playerCharacter, setPlayerCharacter] = useState(savedCharacter);
  const [playerSetupStep, setPlayerSetupStep] = useState(savedCharacter ? null : 'select');
  const [currentView, setCurrentView] = useState('main'); // 'main', 'combat', 'config'
  const [editingAbility, setEditingAbility] = useState(null);
  const [addingFeature, setAddingFeature] = useState(false);
  const [addingResource, setAddingResource] = useState(false);
  const [newResource, setNewResource] = useState({ name: '', max: 1, color: 'cyan', shortRest: false, isPool: false });
  const [addingSkill, setAddingSkill] = useState(false);
  const [newSkill, setNewSkill] = useState({ name: '', linkedResource: '', cost: 1 });
  const [actionEconomy, setActionEconomy] = useState({ Action: true, Bonus: true, Reaction: true, Movement: true, Object: true });
  const [playerConcentration, setPlayerConcentration] = useState(null);
  const [damageInput, setDamageInput] = useState('');

  // ==================== SAVE CHARACTER CHANGES ====================
  useEffect(() => {
    if (playerCharacter) {
      onSaveCharacter(playerCharacter);
    }
  }, [playerCharacter]);

  // ==================== COLOR OPTIONS ====================
  const RESOURCE_COLORS = [
    { id: 'red', bg: 'bg-red-500', border: 'border-red-400', text: 'text-red-300', bgUsed: 'bg-red-900/50' },
    { id: 'orange', bg: 'bg-orange-500', border: 'border-orange-400', text: 'text-orange-300', bgUsed: 'bg-orange-900/50' },
    { id: 'yellow', bg: 'bg-yellow-500', border: 'border-yellow-400', text: 'text-yellow-300', bgUsed: 'bg-yellow-900/50' },
    { id: 'green', bg: 'bg-green-500', border: 'border-green-400', text: 'text-green-300', bgUsed: 'bg-green-900/50' },
    { id: 'cyan', bg: 'bg-cyan-500', border: 'border-cyan-400', text: 'text-cyan-300', bgUsed: 'bg-cyan-900/50' },
    { id: 'blue', bg: 'bg-blue-500', border: 'border-blue-400', text: 'text-blue-300', bgUsed: 'bg-blue-900/50' },
    { id: 'purple', bg: 'bg-purple-500', border: 'border-purple-400', text: 'text-purple-300', bgUsed: 'bg-purple-900/50' },
    { id: 'fuchsia', bg: 'bg-fuchsia-500', border: 'border-fuchsia-400', text: 'text-fuchsia-300', bgUsed: 'bg-fuchsia-900/50' },
    { id: 'pink', bg: 'bg-pink-500', border: 'border-pink-400', text: 'text-pink-300', bgUsed: 'bg-pink-900/50' },
    { id: 'gray', bg: 'bg-gray-400', border: 'border-gray-300', text: 'text-gray-300', bgUsed: 'bg-gray-700/50' },
  ];

  const getColorById = (colorId) => RESOURCE_COLORS.find(c => c.id === colorId) || RESOURCE_COLORS[4];

  // ==================== HELPERS ====================
  const getAbilityMod = (score) => Math.floor((score - 10) / 2);
  const formatMod = (mod) => mod >= 0 ? `+${mod}` : `${mod}`;

  const getPlayerLevel = () => {
    if (!playerCharacter) return 1;
    return playerCharacter.classes.reduce((sum, c) => sum + c.level, 0);
  };

  const getPlayerSpellSlots = (char) => {
    const character = char || playerCharacter;
    if (!character) return [];
    let casterLevel = 0;
    let isWarlock = false;
    let warlockLevel = 0;

    character.classes.forEach(c => {
      // Check subclass first (e.g. Eldritch Knight), then fall back to class
      const type = (c.subclass && SUBCLASS_CASTER_TYPES[c.subclass]) || CASTER_TYPES[c.name];
      if (type === 'full') casterLevel += c.level;
      else if (type === 'half' && c.level >= 2) casterLevel += Math.floor(c.level / 2);
      else if (type === 'third' && c.level >= 3) casterLevel += Math.floor(c.level / 3);
      else if (type === 'warlock') { isWarlock = true; warlockLevel = c.level; }
    });

    const result = [];

    if (casterLevel > 0) {
      const slots = FULL_CASTER_SLOTS[Math.min(casterLevel - 1, 19)];
      slots.forEach((max, i) => {
        if (max > 0) result.push({ level: i + 1, max, type: 'standard' });
      });
    }

    if (isWarlock) {
      const [pactSlots, pactLevel] = WARLOCK_SLOTS[Math.min(warlockLevel - 1, 19)];
      result.push({ level: pactLevel, max: pactSlots, type: 'pact', isPact: true });
    }

    return result;
  };

  // Class resources are now managed manually via Custom Resources

  const createDefaultPlayerCharacter = (partyMember) => ({
    id: partyMember?.id || Date.now(),
    linkedToParty: !!partyMember,
    name: partyMember?.name || 'New Operative',
    origin: partyMember?.origin || 'Lifer',
    classes: partyMember?.classes || [{ name: 'Fighter', level: 1, subclass: null }],
    level: partyMember?.classes?.reduce((sum, c) => sum + c.level, 0) || 1,
    abilities: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
    savingThrows: { STR: false, DEX: false, CON: false, INT: false, WIS: false, CHA: false },
    hp: { current: 10, max: 10, temp: 0 },
    ac: 10,
    initiative: 0,
    speed: 30,
    proficiencyBonus: 2,
    // Manual spell slots: { 1: { max: 4, used: 0 }, 2: { max: 3, used: 0 }, pact: { max: 2, used: 0, level: 5 } }
    spellSlots: {},
    // Custom resources: { name, max, used, color, shortRest, isPool }
    customResources: [],
    classResources: [],
    features: [],
    skills: [],
    proficiencies: '',
    languages: 'Common',
    notes: '',
    deathSaves: { successes: 0, failures: 0 }
  });

  const initializeCharacterResources = (character) => {
    const slots = getPlayerSpellSlots(character);
    const spellSlots = {};
    slots.forEach(s => {
      const key = s.isPact ? `pact-${s.level}` : s.level;
      spellSlots[key] = { used: 0, max: s.max, level: s.level, isPact: s.isPact || false };
    });

    return { ...character, spellSlots, classResources: [] };
  };

  // ==================== CHARACTER SELECTION ====================
  const selectPartyMember = (member) => {
    const char = createDefaultPlayerCharacter(member);
    const initialized = initializeCharacterResources(char);
    setPlayerCharacter(initialized);
    setPlayerSetupStep(null);
  };

  const createStandaloneCharacter = () => {
    setPlayerSetupStep('create');
  };

  // ==================== ABILITY / HP UPDATES ====================
  const updatePlayerAbility = (ability, value) => {
    setPlayerCharacter(p => ({ ...p, abilities: { ...p.abilities, [ability]: parseInt(value) || 10 } }));
  };

  const updatePlayerHP = (field, value) => {
    setPlayerCharacter(p => ({ ...p, hp: { ...p.hp, [field]: parseInt(value) || 0 } }));
  };

  const applyDamage = (amount) => {
    if (!amount) return;
    const dmg = parseInt(amount);
    setPlayerCharacter(p => {
      let remaining = dmg;
      let newTemp = p.hp.temp;
      let newCurrent = p.hp.current;

      if (newTemp > 0) {
        if (remaining <= newTemp) {
          newTemp -= remaining;
          remaining = 0;
        } else {
          remaining -= newTemp;
          newTemp = 0;
        }
      }
      newCurrent = Math.max(0, newCurrent - remaining);
      return { ...p, hp: { ...p.hp, current: newCurrent, temp: newTemp } };
    });
    setDamageInput('');
  };

  const applyHealing = (amount) => {
    if (!amount) return;
    const heal = parseInt(amount);
    setPlayerCharacter(p => ({
      ...p,
      hp: { ...p.hp, current: Math.min(p.hp.max, p.hp.current + heal) }
    }));
    setDamageInput('');
  };

  // ==================== SPELL SLOTS ====================
  const useSpellSlot = (level) => {
    setPlayerCharacter(p => {
      const slot = p.spellSlots[level];
      if (!slot || slot.used >= slot.max) return p;
      return { ...p, spellSlots: { ...p.spellSlots, [level]: { ...slot, used: slot.used + 1 } } };
    });
  };

  const restoreSpellSlot = (level) => {
    setPlayerCharacter(p => {
      const slot = p.spellSlots[level];
      if (!slot || slot.used <= 0) return p;
      return { ...p, spellSlots: { ...p.spellSlots, [level]: { ...slot, used: slot.used - 1 } } };
    });
  };

  // ==================== CLASS RESOURCES ====================
  const useClassResource = (index) => {
    setPlayerCharacter(p => {
      const res = p.classResources?.[index];
      if (!res || res.used >= res.max) return p;
      const newResources = [...p.classResources];
      newResources[index] = { ...res, used: res.used + 1 };
      return { ...p, classResources: newResources };
    });
  };

  const restoreClassResource = (index) => {
    setPlayerCharacter(p => {
      const res = p.classResources?.[index];
      if (!res || res.used <= 0) return p;
      const newResources = [...p.classResources];
      newResources[index] = { ...res, used: res.used - 1 };
      return { ...p, classResources: newResources };
    });
  };

  const setClassResourcePool = (index, value) => {
    setPlayerCharacter(p => {
      const res = p.classResources?.[index];
      if (!res) return p;
      const newResources = [...p.classResources];
      newResources[index] = { ...res, used: Math.max(0, Math.min(res.max, res.max - parseInt(value) || 0)) };
      return { ...p, classResources: newResources };
    });
  };

  // ==================== FEATURES ====================
  const addFeature = (name, description) => {
    setPlayerCharacter(p => ({
      ...p,
      features: [...p.features, { name, description }]
    }));
    setAddingFeature(false);
  };

  const removeFeature = (index) => {
    setPlayerCharacter(p => ({
      ...p,
      features: p.features.filter((_, i) => i !== index)
    }));
  };

  // ==================== CONFIG: CLASS MANAGEMENT ====================
  const updateClass = (index, field, value) => {
    setPlayerCharacter(p => {
      const newClasses = [...p.classes];
      newClasses[index] = { ...newClasses[index], [field]: value };
      
      // Reset subclass if class name changes
      if (field === 'name') {
        newClasses[index].subclass = null;
      }
      
      // Calculate new total level
      const newLevel = newClasses.reduce((sum, c) => sum + c.level, 0);
      
      // Calculate new proficiency bonus
      const newProfBonus = Math.floor((newLevel - 1) / 4) + 2;
      
      // Build updated character with new classes
      const updated = { ...p, classes: newClasses, level: newLevel, proficiencyBonus: newProfBonus };
      
      // Recalculate spell slots
      const slots = getPlayerSpellSlots(updated);
      const spellSlots = {};
      slots.forEach(s => {
        const key = s.isPact ? `pact-${s.level}` : s.level;
        // Preserve used count if slot existed, otherwise start fresh
        const existingUsed = p.spellSlots?.[key]?.used || 0;
        spellSlots[key] = { used: Math.min(existingUsed, s.max), max: s.max, level: s.level, isPact: s.isPact || false };
      });
      updated.spellSlots = spellSlots;
      
      return updated;
    });
  };

  const addClass = () => {
    if (playerCharacter.classes.length >= 2) return;
    setPlayerCharacter(p => {
      const newClasses = [...p.classes, { name: 'Fighter', level: 1, subclass: null }];
      const newLevel = newClasses.reduce((sum, c) => sum + c.level, 0);
      const newProfBonus = Math.floor((newLevel - 1) / 4) + 2;
      
      const updated = { ...p, classes: newClasses, level: newLevel, proficiencyBonus: newProfBonus };
      
      // Recalculate spell slots
      const slots = getPlayerSpellSlots(updated);
      const spellSlots = {};
      slots.forEach(s => {
        const key = s.isPact ? `pact-${s.level}` : s.level;
        const existingUsed = p.spellSlots?.[key]?.used || 0;
        spellSlots[key] = { used: Math.min(existingUsed, s.max), max: s.max, level: s.level, isPact: s.isPact || false };
      });
      updated.spellSlots = spellSlots;
      
      return updated;
    });
  };

  const removeClass = (index) => {
    if (playerCharacter.classes.length <= 1) return;
    setPlayerCharacter(p => {
      const newClasses = p.classes.filter((_, i) => i !== index);
      const newLevel = newClasses.reduce((sum, c) => sum + c.level, 0);
      const newProfBonus = Math.floor((newLevel - 1) / 4) + 2;
      
      const updated = { ...p, classes: newClasses, level: newLevel, proficiencyBonus: newProfBonus };
      
      // Recalculate spell slots
      const slots = getPlayerSpellSlots(updated);
      const spellSlots = {};
      slots.forEach(s => {
        const key = s.isPact ? `pact-${s.level}` : s.level;
        const existingUsed = p.spellSlots?.[key]?.used || 0;
        spellSlots[key] = { used: Math.min(existingUsed, s.max), max: s.max, level: s.level, isPact: s.isPact || false };
      });
      updated.spellSlots = spellSlots;
      
      return updated;
    });
  };

  // ==================== CONFIG: SAVING THROWS ====================
  const toggleSavingThrow = (ability) => {
    setPlayerCharacter(p => ({
      ...p,
      savingThrows: { ...p.savingThrows, [ability]: !p.savingThrows?.[ability] }
    }));
  };

  // ==================== CONFIG: SPELL SLOTS ====================
  const setSpellSlotMax = (level, max) => {
    setPlayerCharacter(p => {
      const newSlots = { ...p.spellSlots };
      if (max <= 0) {
        delete newSlots[level];
      } else {
        newSlots[level] = { ...newSlots[level], max: parseInt(max) || 0, used: newSlots[level]?.used || 0 };
        if (level === 'pact') newSlots[level].level = newSlots[level].level || 1;
      }
      return { ...p, spellSlots: newSlots };
    });
  };

  const setPactSlotLevel = (level) => {
    setPlayerCharacter(p => ({
      ...p,
      spellSlots: {
        ...p.spellSlots,
        pact: { ...p.spellSlots.pact, level: parseInt(level) || 1 }
      }
    }));
  };

  // ==================== CONFIG: CUSTOM RESOURCES ====================
  const addCustomResource = () => {
    if (!newResource.name.trim()) return;
    setPlayerCharacter(p => ({
      ...p,
      customResources: [...(p.customResources || []), { ...newResource, used: 0 }]
    }));
    setNewResource({ name: '', max: 1, color: 'cyan', shortRest: false, isPool: false });
    setAddingResource(false);
  };

  const removeCustomResource = (index) => {
    setPlayerCharacter(p => ({
      ...p,
      customResources: p.customResources.filter((_, i) => i !== index)
    }));
  };

  const updateCustomResource = (index, field, value) => {
    setPlayerCharacter(p => {
      const newResources = [...(p.customResources || [])];
      newResources[index] = { ...newResources[index], [field]: value };
      return { ...p, customResources: newResources };
    });
  };

  // ==================== SKILLS ====================
  const getAvailableResources = () => {
    const resources = [];
    
    // Add spell slots that have max > 0
    Object.entries(playerCharacter.spellSlots || {}).forEach(([key, slot]) => {
      if (slot.max > 0) {
        if (slot.isPact) {
          resources.push({ key: `pact-${slot.level}`, label: `Pact Slot (Lvl ${slot.level})`, type: 'pact' });
        } else {
          resources.push({ key: `spell-${key}`, label: `Spell Slot (Lvl ${key})`, type: 'spell' });
        }
      }
    });
    
    // Add custom resources
    (playerCharacter.customResources || []).forEach((res, i) => {
      resources.push({ key: `custom-${i}`, label: res.name, type: 'custom', color: res.color });
    });
    
    // Add class resources
    (playerCharacter.classResources || []).forEach((res, i) => {
      resources.push({ key: `class-${i}`, label: res.name, type: 'class' });
    });
    
    return resources;
  };

  const addSkill = () => {
    if (!newSkill.name.trim() || !newSkill.linkedResource) return;
    setPlayerCharacter(p => ({
      ...p,
      skills: [...(p.skills || []), { ...newSkill, cost: parseInt(newSkill.cost) || 1 }]
    }));
    setNewSkill({ name: '', linkedResource: '', cost: 1 });
    setAddingSkill(false);
  };

  const removeSkill = (index) => {
    setPlayerCharacter(p => ({
      ...p,
      skills: (p.skills || []).filter((_, i) => i !== index)
    }));
  };

  const useSkill = (index) => {
    const skill = playerCharacter.skills?.[index];
    if (!skill) return;
    
    const [type, id] = skill.linkedResource.split('-');
    const cost = skill.cost || 1;
    
    setPlayerCharacter(p => {
      if (type === 'spell') {
        const slot = p.spellSlots?.[id];
        if (!slot || slot.used + cost > slot.max) return p;
        return { ...p, spellSlots: { ...p.spellSlots, [id]: { ...slot, used: slot.used + cost } } };
      } else if (type === 'pact') {
        // Find the pact slot key
        const pactKey = Object.keys(p.spellSlots || {}).find(k => k.startsWith('pact'));
        if (!pactKey) return p;
        const slot = p.spellSlots[pactKey];
        if (!slot || slot.used + cost > slot.max) return p;
        return { ...p, spellSlots: { ...p.spellSlots, [pactKey]: { ...slot, used: slot.used + cost } } };
      } else if (type === 'custom') {
        const idx = parseInt(id);
        const res = p.customResources?.[idx];
        if (!res || res.used + cost > res.max) return p;
        const newResources = [...p.customResources];
        newResources[idx] = { ...res, used: res.used + cost };
        return { ...p, customResources: newResources };
      } else if (type === 'class') {
        const idx = parseInt(id);
        const res = p.classResources?.[idx];
        if (!res || res.used + cost > res.max) return p;
        const newResources = [...p.classResources];
        newResources[idx] = { ...res, used: res.used + cost };
        return { ...p, classResources: newResources };
      }
      return p;
    });
  };

  const getSkillAvailable = (skill) => {
    if (!skill?.linkedResource) return false;
    const [type, id] = skill.linkedResource.split('-');
    const cost = skill.cost || 1;
    
    if (type === 'spell') {
      const slot = playerCharacter.spellSlots?.[id];
      return slot && (slot.max - slot.used) >= cost;
    } else if (type === 'pact') {
      const pactKey = Object.keys(playerCharacter.spellSlots || {}).find(k => k.startsWith('pact'));
      const slot = playerCharacter.spellSlots?.[pactKey];
      return slot && (slot.max - slot.used) >= cost;
    } else if (type === 'custom') {
      const res = playerCharacter.customResources?.[parseInt(id)];
      return res && (res.max - res.used) >= cost;
    } else if (type === 'class') {
      const res = playerCharacter.classResources?.[parseInt(id)];
      return res && (res.max - res.used) >= cost;
    }
    return false;
  };

  const getSkillResourceLabel = (linkedResource) => {
    if (!linkedResource) return '';
    const resources = getAvailableResources();
    const found = resources.find(r => r.key === linkedResource);
    return found?.label || linkedResource;
  };

  // ==================== RESTING ====================
  const shortRest = () => {
    setPlayerCharacter(p => {
      const restoredSlots = { ...p.spellSlots };
      // Restore pact slots on short rest
      if (restoredSlots.pact) {
        restoredSlots.pact = { ...restoredSlots.pact, used: 0 };
      }
      return {
        ...p,
        spellSlots: restoredSlots,
        classResources: (p.classResources || []).map(r => r.shortRest ? { ...r, used: 0 } : r),
        customResources: (p.customResources || []).map(r => r.shortRest ? { ...r, used: 0 } : r)
      };
    });
    resetActionEconomy();
  };

  const longRest = () => {
    setPlayerCharacter(p => {
      const restoredSlots = {};
      Object.keys(p.spellSlots || {}).forEach(key => {
        restoredSlots[key] = { ...p.spellSlots[key], used: 0 };
      });
      return {
        ...p,
        hp: { ...p.hp, current: p.hp.max, temp: 0 },
        spellSlots: restoredSlots,
        classResources: (p.classResources || []).map(r => ({ ...r, used: 0 })),
        customResources: (p.customResources || []).map(r => ({ ...r, used: 0 })),
        deathSaves: { successes: 0, failures: 0 }
      };
    });
    resetActionEconomy();
    setPlayerConcentration(null);
  };

  // ==================== ACTION ECONOMY ====================
  const resetActionEconomy = () => {
    setActionEconomy({ Action: true, Bonus: true, Reaction: true, Movement: true, Object: true });
  };

  const toggleAction = (action) => {
    setActionEconomy(p => ({ ...p, [action]: !p[action] }));
  };

  // ==================== DEATH SAVES ====================
  const updatePlayerDeathSave = (type, delta) => {
    setPlayerCharacter(p => {
      const newSaves = { ...p.deathSaves };
      newSaves[type] = Math.max(0, Math.min(3, newSaves[type] + delta));
      return { ...p, deathSaves: newSaves };
    });
  };

  const resetPlayerDeathSaves = () => {
    setPlayerCharacter(p => ({ ...p, deathSaves: { successes: 0, failures: 0 } }));
  };

  // ==================== EXIT ====================
  const exitPlayerMode = () => {
    setCurrentView('main');
    onExit();
  };

  // ==================== RENDER ====================
  return (
    <div className="flex-1 overflow-auto flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-cyan-500/30 pb-1 mb-2">
        <button onClick={exitPlayerMode} className="px-2 py-1 text-xs font-mono border transition-all bg-gray-800/50 border-gray-600 text-gray-400 hover:border-cyan-500/50">◀ DM MODE</button>
        <div className="text-center">
          {playerSetupStep ? (
            <span className="text-xl font-bold tracking-widest" style={{textShadow: '0 0 20px rgba(255,0,255,0.5)', color: '#ff00ff'}}>SETUP</span>
          ) : currentView === 'combat' ? (
            <span className="text-xl font-bold tracking-widest" style={{textShadow: '0 0 20px rgba(255,0,255,0.5)', color: '#ff00ff'}}>COMBAT OPS</span>
          ) : currentView === 'config' ? (
            <span className="text-xl font-bold tracking-widest" style={{textShadow: '0 0 20px rgba(0,255,255,0.5)', color: '#00ffff'}}>CONFIG</span>
          ) : playerCharacter ? (
            <div>
              <span className="text-gray-400 font-mono text-sm">Lvl {playerCharacter.level || getPlayerLevel()} {playerCharacter.origin} </span>
              <span className="text-xl font-bold" style={{textShadow: '0 0 20px rgba(255,0,255,0.5)', color: '#ff00ff'}}>{playerCharacter.name}</span>
              <span className="text-gray-400 font-mono text-sm"> {playerCharacter.classes.map(c => `${c.name} ${c.level}${c.subclass ? ` (${c.subclass})` : ''}`).join(' / ')}</span>
            </div>
          ) : (
            <span className="text-xl font-bold tracking-widest" style={{textShadow: '0 0 20px rgba(255,0,255,0.5)', color: '#ff00ff'}}>OPERATIVE</span>
          )}
        </div>
        <div className="flex gap-1">
          {!playerSetupStep && <button onClick={() => setPlayerSetupStep('select')} className="px-2 py-1 text-xs font-mono border transition-all bg-gray-800/50 border-gray-600 text-gray-400 hover:border-cyan-500/50" title="Switch Character">↔</button>}
          {!playerSetupStep && currentView === 'main' && <button onClick={() => setCurrentView('config')} className="px-2 py-1 text-xs font-mono border transition-all bg-gray-800/50 border-gray-600 text-gray-400 hover:border-cyan-500/50">SHEET</button>}
        </div>
      </div>

      {playerSetupStep ? (
        /* ==================== SETUP FLOW ==================== */
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          {playerSetupStep === 'select' && (
            <>
              <span className="text-fuchsia-400 font-mono text-lg">SELECT YOUR OPERATIVE</span>
              {party.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
                  {party.filter(c => !c.kia).map(member => (
                    <button key={member.id} onClick={() => selectPartyMember(member)} className="py-4 px-4 bg-gray-800/50 border-2 border-fuchsia-500/30 text-fuchsia-300 font-mono text-lg hover:bg-fuchsia-500/20 hover:border-fuchsia-400 transition-all text-left">
                      <div className="text-lg">{member.name}</div>
                      <div className="text-sm text-gray-500">{member.origin} · {member.classes.map(c => `${c.name} ${c.level}`).join('/')}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 font-mono">No party members registered in DM Mode</div>
              )}
              <div className="flex items-center gap-4 text-gray-500 font-mono text-sm mt-4">
                <div className="h-px w-16 bg-gray-700" />
                <span>OR</span>
                <div className="h-px w-16 bg-gray-700" />
              </div>
              <button onClick={createStandaloneCharacter} className="px-6 py-3 bg-cyan-900/30 border-2 border-cyan-500/50 text-cyan-300 font-mono hover:bg-cyan-500/20 hover:border-cyan-400 transition-all">CREATE NEW OPERATIVE</button>
              <button onClick={exitPlayerMode} className="px-4 py-2 bg-gray-800/50 border border-gray-600 text-gray-400 font-mono text-sm mt-4">◀ BACK TO DM MODE</button>
            </>
          )}
          {playerSetupStep === 'create' && (
            <>
              <span className="text-cyan-400 font-mono text-lg">CREATE OPERATIVE</span>
              <input type="text" placeholder="Name..." className="bg-gray-900 border border-cyan-500/50 text-cyan-100 px-4 py-2 font-mono text-center text-lg focus:outline-none focus:border-cyan-400 w-64" onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  const char = createDefaultPlayerCharacter();
                  char.name = e.target.value.trim();
                  const initialized = initializeCharacterResources(char);
                  setPlayerCharacter(initialized);
                  setPlayerSetupStep(null);
                }
              }} autoFocus />
              <button onClick={() => setPlayerSetupStep('select')} className="px-4 py-2 bg-gray-800/50 border border-gray-600 text-gray-400 font-mono text-sm">◀ BACK</button>
            </>
          )}
        </div>
      ) : currentView === 'combat' ? (
        /* ==================== COMBAT VIEW ==================== */
        <div className="flex-1 flex flex-col gap-2">
          {/* Combat Header */}
          <div className="flex gap-2 mb-1">
            <button onClick={() => setCurrentView('main')} className="px-3 py-1 bg-gray-800/50 border border-gray-600 text-gray-400 font-mono text-sm hover:border-fuchsia-500/50">◀ BACK</button>
            <div className="flex-1" />
            <button onClick={resetActionEconomy} className="px-3 py-1 bg-gray-800/50 border border-orange-500/30 text-orange-300 font-mono text-sm hover:border-orange-400">NEW ROUND</button>
          </div>

          {/* Action Economy */}
          <div className="bg-gray-900/50 border border-red-500/30 p-2 rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="text-red-400 font-mono text-sm">ACTION ECONOMY</span>
              <button onClick={resetActionEconomy} className="px-2 py-0.5 bg-gray-800/50 border border-gray-600 text-gray-400 font-mono text-xs hover:border-red-500/50">RESET</button>
            </div>
            <div className="flex gap-2">
              {ACTION_TYPES.map(action => (
                <button key={action} onClick={() => toggleAction(action)} className={`flex-1 py-2 border font-mono text-sm transition-all ${actionEconomy[action] ? 'bg-red-900/30 border-red-500/50 text-red-300' : 'bg-gray-900/50 border-gray-700 text-gray-600 line-through'}`}>{action}</button>
              ))}
            </div>
          </div>

          {/* HP & Damage */}
          <div className="bg-gray-900/50 border border-green-500/30 p-2 rounded">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-green-400 font-mono text-sm">HP</span>
                  <span className="text-2xl font-mono font-bold" style={{color: playerCharacter.hp.current <= playerCharacter.hp.max * 0.25 ? '#f87171' : playerCharacter.hp.current <= playerCharacter.hp.max * 0.5 ? '#facc15' : '#4ade80'}}>{playerCharacter.hp.current}</span>
                  <span className="text-gray-500 font-mono">/ {playerCharacter.hp.max}</span>
                  {playerCharacter.hp.temp > 0 && <span className="text-cyan-400 font-mono text-sm">+{playerCharacter.hp.temp} temp</span>}
                </div>
                <div className="h-2 bg-gray-800 rounded overflow-hidden">
                  <div className="h-full transition-all duration-300" style={{width: `${(playerCharacter.hp.current / playerCharacter.hp.max) * 100}%`, background: playerCharacter.hp.current <= playerCharacter.hp.max * 0.25 ? '#f87171' : playerCharacter.hp.current <= playerCharacter.hp.max * 0.5 ? '#facc15' : '#4ade80'}} />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex gap-1">
                  <input type="number" value={damageInput} onChange={(e) => setDamageInput(e.target.value)} placeholder="#" className="w-16 bg-gray-800 border border-gray-600 text-gray-300 px-2 py-1 text-center font-mono text-sm" />
                  <button onClick={() => applyDamage(damageInput)} className="px-3 py-1 bg-red-900/30 border border-red-500/50 text-red-300 font-mono text-sm">DMG</button>
                  <button onClick={() => applyHealing(damageInput)} className="px-3 py-1 bg-green-900/30 border border-green-500/50 text-green-300 font-mono text-sm">HEAL</button>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => updatePlayerHP('temp', (parseInt(damageInput) || 0))} className="flex-1 px-2 py-1 bg-cyan-900/30 border border-cyan-500/50 text-cyan-300 font-mono text-xs">+ TEMP</button>
                  <button onClick={() => updatePlayerHP('temp', 0)} className="px-2 py-1 bg-gray-800/50 border border-gray-600 text-gray-400 font-mono text-xs">CLR</button>
                </div>
              </div>
            </div>
          </div>

          {/* Death Saves (if at 0 HP) */}
          {playerCharacter.hp.current === 0 && (
            <div className="bg-gray-900/50 border border-red-500/50 p-3 rounded">
              <div className="flex justify-between items-center mb-2">
                <span className="text-red-400 font-mono">DEATH SAVES</span>
                <button onClick={resetPlayerDeathSaves} className="px-2 py-0.5 bg-gray-800/50 border border-gray-600 text-gray-400 font-mono text-xs">RESET</button>
              </div>
              <div className="flex gap-8 justify-center">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-green-400 font-mono text-xs">SUCCESSES</span>
                  <div className="flex gap-1">
                    {[0,1,2].map(i => (<button key={i} onClick={() => updatePlayerDeathSave('successes', playerCharacter.deathSaves.successes > i ? -1 : 1)} className={`w-8 h-8 rounded-full border-2 transition-all ${playerCharacter.deathSaves.successes > i ? 'bg-green-500 border-green-400' : 'bg-gray-800 border-gray-600'}`} />))}
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <span className="text-red-400 font-mono text-xs">FAILURES</span>
                  <div className="flex gap-1">
                    {[0,1,2].map(i => (<button key={i} onClick={() => updatePlayerDeathSave('failures', playerCharacter.deathSaves.failures > i ? -1 : 1)} className={`w-8 h-8 rounded-full border-2 transition-all ${playerCharacter.deathSaves.failures > i ? 'bg-red-500 border-red-400' : 'bg-gray-800 border-gray-600'}`} />))}
                  </div>
                </div>
              </div>
              {playerCharacter.deathSaves.successes >= 3 && <div className="text-center text-green-400 font-mono mt-2 animate-pulse">STABILIZED</div>}
              {playerCharacter.deathSaves.failures >= 3 && <div className="text-center text-red-400 font-mono mt-2 animate-pulse">FLATLINED</div>}
            </div>
          )}

          {/* Concentration */}
          <div className="bg-gray-900/50 border border-yellow-500/30 p-2 rounded">
            <div className="flex items-center justify-between">
              <span className="text-yellow-400 font-mono text-sm">CONCENTRATION</span>
              {playerConcentration ? (
                <div className="flex items-center gap-2">
                  <span className="text-yellow-300 font-mono">{playerConcentration}</span>
                  <button onClick={() => setPlayerConcentration(null)} className="px-2 py-0.5 bg-red-900/30 border border-red-500/50 text-red-300 font-mono text-xs">DROP</button>
                </div>
              ) : (
                <input type="text" placeholder="Spell name..." className="bg-gray-800 border border-yellow-500/30 text-yellow-300 px-2 py-1 font-mono text-sm w-48" onKeyDown={(e) => { if (e.key === 'Enter' && e.target.value.trim()) { setPlayerConcentration(e.target.value.trim()); e.target.value = ''; } }} />
              )}
            </div>
          </div>

          {/* Spell Slots */}
          {Object.keys(playerCharacter.spellSlots).length > 0 && (
            <div className="bg-gray-900/50 border border-purple-500/30 p-2 rounded">
              <span className="text-purple-400 font-mono text-sm block mb-2">SPELL SLOTS</span>
              <div className="flex flex-wrap gap-2">
                {Object.entries(playerCharacter.spellSlots).map(([level, slot]) => (
                  <div key={level} className="flex items-center gap-1 bg-gray-800/50 px-2 py-1 rounded">
                    <span className="text-purple-300 font-mono text-sm">{slot.isPact ? 'P' : ''}{slot.level}:</span>
                    <div className="flex gap-0.5">
                      {Array.from({ length: slot.max }).map((_, i) => (
                        <button key={i} onClick={() => i < slot.max - slot.used ? useSpellSlot(level) : restoreSpellSlot(level)} className={`w-4 h-4 rounded-sm border transition-all ${i < slot.max - slot.used ? (slot.isPact ? 'bg-fuchsia-500 border-fuchsia-400' : 'bg-purple-500 border-purple-400') : 'bg-gray-700 border-gray-600'}`} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Class Resources */}
          {(playerCharacter.classResources || []).length > 0 && (
            <div className="bg-gray-900/50 border border-orange-500/30 p-2 rounded">
              <span className="text-orange-400 font-mono text-sm block mb-2">RESOURCES</span>
              <div className="flex flex-wrap gap-2">
                {(playerCharacter.classResources || []).map((res, i) => {
                  const colors = ABILITY_COLORS[res.ability] || ABILITY_COLORS.STR;
                  return (
                    <div key={i} className="flex items-center gap-1 bg-gray-800/50 px-2 py-1 rounded">
                      <span className={`${colors.text} font-mono text-sm`}>{res.name}:</span>
                      {res.isPool ? (
                        <input type="number" value={res.max - res.used} onChange={(e) => setClassResourcePool(i, e.target.value)} className={`w-12 bg-gray-800 border ${colors.border}/30 ${colors.text} px-1 py-0.5 text-center font-mono text-sm`} max={res.max} min={0} />
                      ) : (
                        <div className="flex gap-0.5">
                          {Array.from({ length: res.max }).map((_, j) => (
                            <button key={j} onClick={() => j < res.max - res.used ? useClassResource(i) : restoreClassResource(i)} className={`w-4 h-4 rounded-sm border transition-all ${j < res.max - res.used ? `${colors.bg} ${colors.border}` : 'bg-gray-700 border-gray-600'}`} />
                          ))}
                        </div>
                      )}
                      {res.shortRest && <span className="text-gray-500 text-xs ml-1">(SR)</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Skills */}
          {(playerCharacter.skills || []).length > 0 && (
            <div className="bg-gray-900/50 border border-green-500/30 p-2 rounded">
              <span className="text-green-400 font-mono text-sm block mb-2">SKILLS</span>
              <div className="flex flex-wrap gap-2">
                {(playerCharacter.skills || []).map((skill, i) => {
                  const available = getSkillAvailable(skill);
                  return (
                    <button
                      key={i}
                      onClick={() => available && useSkill(i)}
                      disabled={!available}
                      className={`px-3 py-2 border font-mono text-sm transition-all ${available ? 'bg-green-900/30 border-green-500/50 text-green-300 hover:bg-green-500/30 hover:border-green-400' : 'bg-gray-900/50 border-gray-700 text-gray-600 cursor-not-allowed'}`}
                      title={`${skill.name} - Uses ${getSkillResourceLabel(skill.linkedResource)}${skill.cost > 1 ? ` ×${skill.cost}` : ''}`}
                    >
                      {skill.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="flex gap-2 mt-auto">
            <div className="flex-1 bg-gray-900/50 border border-cyan-500/30 p-2 rounded text-center">
              <div className="text-gray-500 font-mono text-xs">AC</div>
              <div className="text-cyan-300 font-mono text-xl">{playerCharacter.ac}</div>
            </div>
            <div className="flex-1 bg-gray-900/50 border border-cyan-500/30 p-2 rounded text-center">
              <div className="text-gray-500 font-mono text-xs">INIT</div>
              <div className="text-cyan-300 font-mono text-xl">{formatMod(playerCharacter.initiative)}</div>
            </div>
            <div className="flex-1 bg-gray-900/50 border border-cyan-500/30 p-2 rounded text-center">
              <div className="text-gray-500 font-mono text-xs">SPEED</div>
              <div className="text-cyan-300 font-mono text-xl">{playerCharacter.speed}</div>
            </div>
            <div className="flex-1 bg-gray-900/50 border border-cyan-500/30 p-2 rounded text-center">
              <div className="text-gray-500 font-mono text-xs">PROF</div>
              <div className="text-cyan-300 font-mono text-xl">+{playerCharacter.proficiencyBonus}</div>
            </div>
          </div>

          {/* Rest Buttons */}
          <div className="flex gap-2">
            <button onClick={shortRest} className="flex-1 py-2 bg-cyan-900/30 border border-cyan-500/50 text-cyan-300 font-mono text-sm hover:bg-cyan-500/20">SHORT REST</button>
            <button onClick={longRest} className="flex-1 py-2 bg-fuchsia-900/30 border border-fuchsia-500/50 text-fuchsia-300 font-mono text-sm hover:bg-fuchsia-500/20">LONG REST</button>
          </div>
        </div>
      ) : currentView === 'config' ? (
        /* ==================== CONFIG VIEW (BACK END) ==================== */
        <div className="flex-1 flex flex-col gap-3 overflow-auto hide-scrollbar">
          {/* Config Header */}
          <div className="flex gap-2 mb-1">
            <button onClick={() => setCurrentView('main')} className="px-3 py-1 bg-gray-800/50 border border-gray-600 text-gray-400 font-mono text-sm hover:border-cyan-500/50">◀ BACK</button>
            <div className="flex-1" />
          </div>

          {/* Basic Info Section */}
          <div className="bg-gray-900/50 border border-cyan-500/30 p-3 rounded">
            <div className="text-cyan-400 font-mono text-sm mb-2">BASIC INFO</div>
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-2">
                <div className="text-gray-500 font-mono text-xs mb-1">NAME</div>
                <input type="text" value={playerCharacter.name} onChange={(e) => setPlayerCharacter(p => ({ ...p, name: e.target.value }))} className="w-full bg-gray-800 border border-cyan-500/30 text-cyan-300 px-2 py-1 font-mono text-sm" />
              </div>
              <div>
                <div className="text-gray-500 font-mono text-xs mb-1">ORIGIN</div>
                <select value={playerCharacter.origin} onChange={(e) => setPlayerCharacter(p => ({ ...p, origin: e.target.value }))} className="w-full bg-gray-800 border border-cyan-500/30 text-cyan-300 px-2 py-1 font-mono text-sm">
                  {ORIGINS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <div className="text-gray-500 font-mono text-xs mb-1">LEVEL</div>
                  <div className="w-full bg-gray-800 border border-cyan-500/30 text-cyan-300 px-2 py-1 font-mono text-sm text-center">{playerCharacter.level || 1}</div>
                </div>
                <div className="flex-1">
                  <div className="text-gray-500 font-mono text-xs mb-1">PROF</div>
                  <div className="w-full bg-gray-800 border border-cyan-500/30 text-cyan-300 px-2 py-1 font-mono text-sm text-center">+{playerCharacter.proficiencyBonus}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Classes Section */}
          <div className="bg-gray-900/50 border border-fuchsia-500/30 p-3 rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="text-fuchsia-400 font-mono text-sm">CLASSES</span>
              {playerCharacter.classes.length < 2 && (
                <button onClick={addClass} className="px-2 py-0.5 bg-gray-800/50 border border-fuchsia-500/30 text-fuchsia-300 font-mono text-xs hover:border-fuchsia-400">+ MULTICLASS</button>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {playerCharacter.classes.map((cls, index) => (
                <div key={index} className="flex items-center gap-2 bg-gray-800/50 p-2 rounded border border-fuchsia-500/20">
                  <div className="flex-1">
                    <div className="text-gray-500 font-mono text-xs mb-1">CLASS</div>
                    <select value={cls.name} onChange={(e) => updateClass(index, 'name', e.target.value)} className="w-full bg-gray-900 border border-fuchsia-500/30 text-fuchsia-300 px-2 py-1 font-mono text-sm">
                      {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="w-16">
                    <div className="text-gray-500 font-mono text-xs mb-1">LVL</div>
                    <input type="number" value={cls.level} onChange={(e) => updateClass(index, 'level', Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))} className="w-full bg-gray-900 border border-fuchsia-500/30 text-fuchsia-300 px-2 py-1 font-mono text-sm text-center" min={1} max={20} />
                  </div>
                  {cls.level >= 3 && SUBCLASSES[cls.name] && (
                    <div className="flex-1">
                      <div className="text-gray-500 font-mono text-xs mb-1">SUBCLASS</div>
                      <select value={cls.subclass || ''} onChange={(e) => updateClass(index, 'subclass', e.target.value || null)} className="w-full bg-gray-900 border border-fuchsia-500/30 text-fuchsia-300 px-2 py-1 font-mono text-sm">
                        <option value="">None</option>
                        {SUBCLASSES[cls.name].map(sc => <option key={sc} value={sc}>{sc}</option>)}
                      </select>
                    </div>
                  )}
                  {playerCharacter.classes.length > 1 && (
                    <button onClick={() => removeClass(index)} className="px-2 py-1 bg-red-900/30 border border-red-500/50 text-red-300 font-mono text-xs hover:bg-red-500/20 self-end">×</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Combat Stats Section */}
          <div className="bg-gray-900/50 border border-red-500/30 p-3 rounded">
            <div className="text-red-400 font-mono text-sm mb-2">COMBAT STATS</div>
            <div className="grid grid-cols-5 gap-3">
              <div>
                <div className="text-gray-500 font-mono text-xs mb-1">MAX HP</div>
                <input type="number" value={playerCharacter.hp.max} onChange={(e) => updatePlayerHP('max', e.target.value)} className="w-full bg-gray-800 border border-red-500/30 text-red-300 px-2 py-1 font-mono text-sm" />
              </div>
              <div>
                <div className="text-gray-500 font-mono text-xs mb-1">ARMOR CLASS</div>
                <input type="number" value={playerCharacter.ac} onChange={(e) => setPlayerCharacter(p => ({ ...p, ac: parseInt(e.target.value) || 10 }))} className="w-full bg-gray-800 border border-red-500/30 text-red-300 px-2 py-1 font-mono text-sm" />
              </div>
              <div>
                <div className="text-gray-500 font-mono text-xs mb-1">INITIATIVE</div>
                <input type="number" value={playerCharacter.initiative} onChange={(e) => setPlayerCharacter(p => ({ ...p, initiative: parseInt(e.target.value) || 0 }))} className="w-full bg-gray-800 border border-red-500/30 text-red-300 px-2 py-1 font-mono text-sm" />
              </div>
              <div>
                <div className="text-gray-500 font-mono text-xs mb-1">SPEED</div>
                <input type="number" value={playerCharacter.speed} onChange={(e) => setPlayerCharacter(p => ({ ...p, speed: parseInt(e.target.value) || 30 }))} className="w-full bg-gray-800 border border-red-500/30 text-red-300 px-2 py-1 font-mono text-sm" />
              </div>
            </div>
          </div>

          {/* Ability Scores & Saving Throws Section */}
          <div className="bg-gray-900/50 border border-fuchsia-500/30 p-3 rounded">
            <div className="text-fuchsia-400 font-mono text-sm mb-2">ABILITY SCORES & SAVING THROWS</div>
            <div className="grid grid-cols-6 gap-2">
              {ABILITIES.map(ability => {
                const score = playerCharacter.abilities[ability];
                const mod = getAbilityMod(score);
                const proficient = playerCharacter.savingThrows?.[ability];
                const saveBonus = mod + (proficient ? playerCharacter.proficiencyBonus : 0);
                return (
                  <div key={ability} className="bg-gray-800/50 border border-fuchsia-500/20 p-2 rounded">
                    <div className="text-fuchsia-400 font-mono text-xs text-center mb-1">{ability}</div>
                    <input type="number" value={score} onChange={(e) => updatePlayerAbility(ability, e.target.value)} className="w-full bg-gray-900 border border-fuchsia-500/30 text-fuchsia-300 px-1 py-0.5 text-center font-mono text-lg mb-1" />
                    <div className="text-gray-400 font-mono text-xs text-center">MOD: {formatMod(mod)}</div>
                    <button onClick={() => toggleSavingThrow(ability)} className={`w-full mt-1 px-1 py-0.5 border font-mono text-xs transition-all ${proficient ? 'bg-fuchsia-500/30 border-fuchsia-400 text-fuchsia-300' : 'bg-gray-800 border-gray-600 text-gray-500'}`}>
                      SAVE {formatMod(saveBonus)}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Spell Slots Section */}
          <div className="bg-gray-900/50 border border-purple-500/30 p-3 rounded">
            <div className="text-purple-400 font-mono text-sm mb-2">SPELL SLOTS</div>
            <div className="grid grid-cols-5 gap-2">
              {[1,2,3,4,5,6,7,8,9].map(level => (
                <div key={level} className="bg-gray-800/50 p-2 rounded">
                  <div className="text-purple-300 font-mono text-xs text-center mb-1">LVL {level}</div>
                  <input type="number" value={playerCharacter.spellSlots?.[level]?.max || 0} onChange={(e) => setSpellSlotMax(level, e.target.value)} className="w-full bg-gray-900 border border-purple-500/30 text-purple-300 px-1 py-0.5 text-center font-mono text-sm" min={0} max={4} />
                </div>
              ))}
              <div className="bg-gray-800/50 p-2 rounded border border-fuchsia-500/30">
                <div className="text-fuchsia-300 font-mono text-xs text-center mb-1">PACT</div>
                <div className="flex gap-1">
                  <input type="number" value={playerCharacter.spellSlots?.pact?.max || 0} onChange={(e) => setSpellSlotMax('pact', e.target.value)} className="w-1/2 bg-gray-900 border border-fuchsia-500/30 text-fuchsia-300 px-1 py-0.5 text-center font-mono text-xs" min={0} max={4} placeholder="#" />
                  <input type="number" value={playerCharacter.spellSlots?.pact?.level || 1} onChange={(e) => setPactSlotLevel(e.target.value)} className="w-1/2 bg-gray-900 border border-fuchsia-500/30 text-fuchsia-300 px-1 py-0.5 text-center font-mono text-xs" min={1} max={5} placeholder="Lvl" />
                </div>
              </div>
            </div>
          </div>

          {/* Custom Resources Section */}
          <div className="bg-gray-900/50 border border-orange-500/30 p-3 rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="text-orange-400 font-mono text-sm">CUSTOM RESOURCES</span>
              <button onClick={() => setAddingResource(true)} className="px-2 py-0.5 bg-gray-800/50 border border-orange-500/30 text-orange-300 font-mono text-xs hover:border-orange-400">+ ADD</button>
            </div>
            {addingResource && (
              <div className="bg-gray-800/50 p-2 rounded mb-2 border border-orange-500/50">
                <div className="grid grid-cols-4 gap-2 mb-2">
                  <input type="text" placeholder="Name" value={newResource.name} onChange={(e) => setNewResource(r => ({ ...r, name: e.target.value }))} className="col-span-2 bg-gray-900 border border-orange-500/30 text-orange-300 px-2 py-1 font-mono text-sm" autoFocus />
                  <input type="number" placeholder="Max" value={newResource.max} onChange={(e) => setNewResource(r => ({ ...r, max: parseInt(e.target.value) || 1 }))} className="bg-gray-900 border border-orange-500/30 text-orange-300 px-2 py-1 font-mono text-sm" min={1} />
                  <div className="flex gap-1">
                    <button onClick={addCustomResource} className="flex-1 px-2 py-1 bg-orange-500/20 border border-orange-400 text-orange-300 font-mono text-xs">ADD</button>
                    <button onClick={() => { setAddingResource(false); setNewResource({ name: '', max: 1, color: 'cyan', shortRest: false, isPool: false }); }} className="px-2 py-1 bg-gray-800/50 border border-gray-600 text-gray-400 font-mono text-xs">×</button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {RESOURCE_COLORS.map(c => (
                      <button key={c.id} onClick={() => setNewResource(r => ({ ...r, color: c.id }))} className={`w-5 h-5 rounded-full border-2 transition-all ${c.bg} ${newResource.color === c.id ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-900' : 'border-transparent opacity-60 hover:opacity-100'}`} />
                    ))}
                  </div>
                  <label className="flex items-center gap-1 text-gray-400 font-mono text-xs">
                    <input type="checkbox" checked={newResource.shortRest} onChange={(e) => setNewResource(r => ({ ...r, shortRest: e.target.checked }))} className="accent-orange-500" />
                    Short Rest
                  </label>
                  <label className="flex items-center gap-1 text-gray-400 font-mono text-xs">
                    <input type="checkbox" checked={newResource.isPool} onChange={(e) => setNewResource(r => ({ ...r, isPool: e.target.checked }))} className="accent-orange-500" />
                    Pool (numeric)
                  </label>
                </div>
              </div>
            )}
            {(playerCharacter.customResources || []).length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {(playerCharacter.customResources || []).map((res, i) => {
                  const colors = getColorById(res.color);
                  return (
                    <div key={i} className={`bg-gray-800/50 border ${colors.border}/50 p-2 rounded`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`${colors.text} font-mono text-sm`}>{res.name}</span>
                        <button onClick={() => removeCustomResource(i)} className="text-gray-500 hover:text-red-400 font-mono text-xs">×</button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 font-mono text-xs">Max:</span>
                        <input type="number" value={res.max} onChange={(e) => updateCustomResource(i, 'max', parseInt(e.target.value) || 1)} className={`w-12 bg-gray-900 border ${colors.border}/30 ${colors.text} px-1 py-0.5 text-center font-mono text-sm`} min={1} />
                        <div className={`w-4 h-4 rounded-full ${colors.bg}`} />
                        {res.shortRest && <span className="text-gray-500 text-xs">(SR)</span>}
                        {res.isPool && <span className="text-gray-500 text-xs">(Pool)</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-gray-500 font-mono text-sm">No custom resources added</div>
            )}
          </div>

          {/* Skills Section */}
          <div className="bg-gray-900/50 border border-green-500/30 p-3 rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-400 font-mono text-sm">SKILLS & ABILITIES</span>
              <button onClick={() => setAddingSkill(true)} className="px-2 py-0.5 bg-gray-800/50 border border-green-500/30 text-green-300 font-mono text-xs hover:border-green-400">+ ADD</button>
            </div>
            {addingSkill && (
              <div className="bg-gray-800/50 p-2 rounded mb-2 border border-green-500/50">
                <div className="grid grid-cols-4 gap-2 mb-2">
                  <input type="text" placeholder="Skill Name" value={newSkill.name} onChange={(e) => setNewSkill(s => ({ ...s, name: e.target.value }))} className="col-span-2 bg-gray-900 border border-green-500/30 text-green-300 px-2 py-1 font-mono text-sm" autoFocus />
                  <select value={newSkill.linkedResource} onChange={(e) => setNewSkill(s => ({ ...s, linkedResource: e.target.value }))} className="bg-gray-900 border border-green-500/30 text-green-300 px-2 py-1 font-mono text-sm">
                    <option value="">Link to...</option>
                    {getAvailableResources().map(r => (
                      <option key={r.key} value={r.key}>{r.label}</option>
                    ))}
                  </select>
                  <div className="flex gap-1">
                    <button onClick={addSkill} className="flex-1 px-2 py-1 bg-green-500/20 border border-green-400 text-green-300 font-mono text-xs">ADD</button>
                    <button onClick={() => { setAddingSkill(false); setNewSkill({ name: '', linkedResource: '', cost: 1 }); }} className="px-2 py-1 bg-gray-800/50 border border-gray-600 text-gray-400 font-mono text-xs">×</button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 font-mono text-xs">Cost:</span>
                  <input type="number" value={newSkill.cost} onChange={(e) => setNewSkill(s => ({ ...s, cost: parseInt(e.target.value) || 1 }))} className="w-12 bg-gray-900 border border-green-500/30 text-green-300 px-1 py-0.5 text-center font-mono text-sm" min={1} />
                  <span className="text-gray-500 font-mono text-xs">resource(s) per use</span>
                </div>
              </div>
            )}
            {(playerCharacter.skills || []).length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {(playerCharacter.skills || []).map((skill, i) => (
                  <div key={i} className="bg-gray-800/50 border border-green-500/30 p-2 rounded flex items-center justify-between">
                    <div>
                      <span className="text-green-300 font-mono text-sm">{skill.name}</span>
                      <div className="text-gray-500 font-mono text-xs">{getSkillResourceLabel(skill.linkedResource)}{skill.cost > 1 ? ` ×${skill.cost}` : ''}</div>
                    </div>
                    <button onClick={() => removeSkill(i)} className="text-gray-500 hover:text-red-400 font-mono text-xs px-2">×</button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 font-mono text-sm">No skills added. Add skills that consume spell slots or resources.</div>
            )}
          </div>

          {/* Features Section */}
          <div className="bg-gray-900/50 border border-yellow-500/30 p-3 rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="text-yellow-400 font-mono text-sm">FEATURES & ABILITIES</span>
              <button onClick={() => setAddingFeature(true)} className="px-2 py-0.5 bg-gray-800/50 border border-yellow-500/30 text-yellow-300 font-mono text-xs hover:border-yellow-400">+ ADD</button>
            </div>
            {addingFeature && (
              <div className="flex gap-2 mb-2">
                <input type="text" id="configFeatName" placeholder="Feature name" className="flex-1 bg-gray-800 border border-yellow-500/30 text-yellow-300 px-2 py-1 font-mono text-sm" autoFocus />
                <button onClick={() => { const name = document.getElementById('configFeatName').value; if (name.trim()) addFeature(name.trim(), ''); }} className="px-2 py-1 bg-yellow-500/20 border border-yellow-400 text-yellow-300 font-mono text-xs">ADD</button>
                <button onClick={() => setAddingFeature(false)} className="px-2 py-1 bg-gray-800/50 border border-gray-600 text-gray-400 font-mono text-xs">×</button>
              </div>
            )}
            {playerCharacter.features.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {playerCharacter.features.map((feat, i) => (
                  <button key={i} onClick={() => removeFeature(i)} className="px-2 py-0.5 bg-yellow-900/30 border border-yellow-600/50 text-yellow-300 font-mono text-xs hover:border-red-400 hover:text-red-300" title="Click to remove">{feat.name}</button>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 font-mono text-sm">No features added</div>
            )}
          </div>

          {/* Proficiencies & Languages */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-900/50 border border-gray-600 p-3 rounded">
              <div className="text-gray-400 font-mono text-xs mb-1">PROFICIENCIES</div>
              <textarea value={playerCharacter.proficiencies} onChange={(e) => setPlayerCharacter(p => ({ ...p, proficiencies: e.target.value }))} className="w-full bg-gray-800 border border-gray-600 text-gray-300 font-mono text-sm resize-none h-20 p-2" placeholder="Armor, weapons, tools..."></textarea>
            </div>
            <div className="bg-gray-900/50 border border-gray-600 p-3 rounded">
              <div className="text-gray-400 font-mono text-xs mb-1">LANGUAGES</div>
              <textarea value={playerCharacter.languages} onChange={(e) => setPlayerCharacter(p => ({ ...p, languages: e.target.value }))} className="w-full bg-gray-800 border border-gray-600 text-gray-300 font-mono text-sm resize-none h-20 p-2" placeholder="Common, Elvish..."></textarea>
            </div>
          </div>

          {/* Notes Section */}
          <div className="bg-gray-900/50 border border-gray-600 p-3 rounded">
            <div className="text-gray-400 font-mono text-xs mb-1">NOTES</div>
            <textarea value={playerCharacter.notes || ''} onChange={(e) => setPlayerCharacter(p => ({ ...p, notes: e.target.value }))} className="w-full bg-gray-800 border border-gray-600 text-gray-300 font-mono text-sm resize-none h-24 p-2" placeholder="Character notes, backstory, goals..."></textarea>
          </div>
        </div>
      ) : (
        /* ==================== MAIN VIEW (GAMEPLAY) ==================== */
        <div className="flex-1 flex flex-col gap-2 overflow-auto hide-scrollbar">
          {/* Quick Stats Bar */}
          <div className="flex gap-2">
            <div className="flex-1 bg-gray-900/50 border border-green-500/30 p-2 rounded">
              <div className="flex items-center gap-2">
                <span className="text-green-400 font-mono text-sm">HP</span>
                <span className="text-2xl font-mono font-bold" style={{color: playerCharacter.hp.current <= playerCharacter.hp.max * 0.25 ? '#f87171' : playerCharacter.hp.current <= playerCharacter.hp.max * 0.5 ? '#facc15' : '#4ade80'}}>{playerCharacter.hp.current}</span>
                <span className="text-gray-500 font-mono">/ {playerCharacter.hp.max}</span>
                {playerCharacter.hp.temp > 0 && <span className="text-cyan-400 font-mono text-sm">+{playerCharacter.hp.temp}</span>}
              </div>
              <div className="h-1.5 bg-gray-800 rounded overflow-hidden mt-1">
                <div className="h-full transition-all duration-300" style={{width: `${(playerCharacter.hp.current / playerCharacter.hp.max) * 100}%`, background: playerCharacter.hp.current <= playerCharacter.hp.max * 0.25 ? '#f87171' : playerCharacter.hp.current <= playerCharacter.hp.max * 0.5 ? '#facc15' : '#4ade80'}} />
              </div>
            </div>
            <div className="bg-gray-900/50 border border-cyan-500/30 p-2 rounded text-center">
              <div className="text-gray-500 font-mono text-xs">AC</div>
              <div className="text-cyan-300 font-mono text-xl">{playerCharacter.ac}</div>
            </div>
            <div className="bg-gray-900/50 border border-cyan-500/30 p-2 rounded text-center">
              <div className="text-gray-500 font-mono text-xs">INIT</div>
              <div className="text-cyan-300 font-mono text-xl">{formatMod(playerCharacter.initiative)}</div>
            </div>
            <div className="bg-gray-900/50 border border-cyan-500/30 p-2 rounded text-center">
              <div className="text-gray-500 font-mono text-xs">SPEED</div>
              <div className="text-cyan-300 font-mono text-xl">{playerCharacter.speed}</div>
            </div>
          </div>

          {/* Ability Scores */}
          <div className="grid grid-cols-6 gap-2">
            {ABILITIES.map(ability => {
              const score = playerCharacter.abilities[ability];
              const mod = getAbilityMod(score);
              return (
                <div key={ability} className="bg-gray-900/50 border border-cyan-500/30 p-2 rounded text-center">
                  <div className="text-cyan-400 font-mono text-xs">{ability}</div>
                  <div className="text-fuchsia-400 font-mono text-lg font-bold">{formatMod(mod)}</div>
                  <div className="text-gray-500 font-mono text-xs">{score}</div>
                </div>
              );
            })}
          </div>

          {/* Spell Slots */}
          {Object.keys(playerCharacter.spellSlots || {}).length > 0 && (
            <div className="bg-gray-900/50 border border-purple-500/30 p-2 rounded">
              <div className="flex flex-wrap gap-1">
                {Object.entries(playerCharacter.spellSlots).map(([key, slot]) => (
                  Array.from({ length: slot.max }).map((_, i) => {
                    const available = i < slot.max - slot.used;
                    const isPact = key === 'pact';
                    return (
                      <button
                        key={`${key}-${i}`}
                        onClick={() => available ? useSpellSlot(key) : restoreSpellSlot(key)}
                        className={`w-7 h-7 rounded-full border-2 font-mono text-xs font-bold flex items-center justify-center transition-all ${
                          isPact
                            ? (available ? 'bg-fuchsia-500 border-fuchsia-400 text-white' : 'bg-fuchsia-900/50 border-fuchsia-800 text-fuchsia-600')
                            : (available ? 'bg-purple-500 border-purple-400 text-white' : 'bg-purple-900/50 border-purple-800 text-purple-600')
                        }`}
                        title={isPact ? `Pact Slot (Lvl ${slot.level})` : `Level ${key} Spell Slot`}
                      >
                        {isPact ? slot.level : key}
                      </button>
                    );
                  })
                ))}
              </div>
            </div>
          )}

          {/* Custom Resources */}
          {(playerCharacter.customResources || []).length > 0 && (
            <div className="bg-gray-900/50 border border-orange-500/30 p-2 rounded">
              <div className="flex flex-wrap gap-2">
                {(playerCharacter.customResources || []).map((res, i) => {
                  const colors = getColorById(res.color);
                  return (
                    <div key={i} className={`flex items-center gap-1 bg-gray-800/50 px-2 py-1 rounded border ${colors.border}/30`}>
                      <span className={`${colors.text} font-mono text-sm`}>{res.name}:</span>
                      {res.isPool ? (
                        <input type="number" value={res.max - res.used} onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          updateCustomResource(i, 'used', res.max - Math.max(0, Math.min(res.max, val)));
                        }} className={`w-12 bg-gray-900 border ${colors.border}/30 ${colors.text} px-1 py-0.5 text-center font-mono text-sm`} min={0} max={res.max} />
                      ) : (
                        <div className="flex gap-0.5">
                          {Array.from({ length: res.max }).map((_, j) => {
                            const available = j < res.max - res.used;
                            return (
                              <button key={j} onClick={() => updateCustomResource(i, 'used', available ? res.used + 1 : res.used - 1)} className={`w-4 h-4 rounded-sm border transition-all ${available ? `${colors.bg} ${colors.border}` : 'bg-gray-700 border-gray-600'}`} />
                            );
                          })}
                        </div>
                      )}
                      {res.shortRest && <span className="text-gray-500 text-xs">(SR)</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Skills */}
          {(playerCharacter.skills || []).length > 0 && (
            <div className="bg-gray-900/50 border border-green-500/30 p-2 rounded">
              <div className="flex flex-wrap gap-2">
                {(playerCharacter.skills || []).map((skill, i) => {
                  const available = getSkillAvailable(skill);
                  return (
                    <button
                      key={i}
                      onClick={() => available && useSkill(i)}
                      disabled={!available}
                      className={`px-3 py-1.5 border font-mono text-sm transition-all ${available ? 'bg-green-900/30 border-green-500/50 text-green-300 hover:bg-green-500/30 hover:border-green-400' : 'bg-gray-900/50 border-gray-700 text-gray-600 cursor-not-allowed'}`}
                      title={`Uses ${getSkillResourceLabel(skill.linkedResource)}${skill.cost > 1 ? ` ×${skill.cost}` : ''}`}
                    >
                      {skill.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Features */}
          {playerCharacter.features.length > 0 && (
            <div className="bg-gray-900/50 border border-yellow-500/30 p-2 rounded">
              <div className="flex flex-wrap gap-1">
                {playerCharacter.features.map((feat, i) => (
                  <span key={i} className="px-2 py-0.5 bg-yellow-900/30 border border-yellow-600/50 text-yellow-300 font-mono text-xs">{feat.name}</span>
                ))}
              </div>
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Bottom Actions */}
          <div className="flex gap-2">
            <button onClick={() => setCurrentView('combat')} className="flex-1 py-2 bg-red-900/30 border border-red-500/50 text-red-300 font-mono text-sm hover:bg-red-500/20 hover:border-red-400 transition-all">⚔ COMBAT</button>
            <button onClick={shortRest} className="flex-1 py-2 bg-cyan-900/30 border border-cyan-500/50 text-cyan-300 font-mono text-sm hover:bg-cyan-500/20">SHORT REST</button>
            <button onClick={longRest} className="flex-1 py-2 bg-fuchsia-900/30 border border-fuchsia-500/50 text-fuchsia-300 font-mono text-sm hover:bg-fuchsia-500/20">LONG REST</button>
          </div>
        </div>
      )}
    </div>
  );
}
