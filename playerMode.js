// ==================== PLAYER MODE COMPONENT ====================
// Extracted from main XPTracker for modularity

function PlayerMode({ party, partyLevel, onExit, savedCharacter, onSaveCharacter }) {
  const { useState, useEffect } = React;

  // ==================== STATE ====================
  const [playerCharacter, setPlayerCharacter] = useState(savedCharacter);
  const [playerSetupStep, setPlayerSetupStep] = useState(savedCharacter ? null : 'select');
  const [showPlayerSheet, setShowPlayerSheet] = useState(true);
  const [showPlayerCombat, setShowPlayerCombat] = useState(false);
  const [editingAbility, setEditingAbility] = useState(null);
  const [addingFeature, setAddingFeature] = useState(false);
  const [actionEconomy, setActionEconomy] = useState({ Action: true, Bonus: true, Reaction: true, Movement: true, Object: true });
  const [playerConcentration, setPlayerConcentration] = useState(null);
  const [damageInput, setDamageInput] = useState('');

  // ==================== SAVE CHARACTER CHANGES ====================
  useEffect(() => {
    if (playerCharacter) {
      onSaveCharacter(playerCharacter);
    }
  }, [playerCharacter]);

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

  const getClassResources = (char) => {
    const character = char || playerCharacter;
    if (!character) return [];

    const resources = [];
    const mods = {};
    ABILITIES.forEach(a => { mods[a] = getAbilityMod(character.abilities[a]); });

    character.classes.forEach(cls => {
      const templates = CLASS_RESOURCE_TEMPLATES[cls.name] || [];
      templates.forEach(template => {
        if (template.minLevel && cls.level < template.minLevel) return;

        const max = template.getMax(cls.level, mods);
        const shortRest = typeof template.shortRest === 'function' ? template.shortRest(cls.level) : template.shortRest;

        resources.push({
          name: template.name,
          ability: template.ability,
          max,
          used: 0,
          shortRest,
          isPool: template.isPool || false,
          className: cls.name
        });
      });
    });

    return resources;
  };

  const createDefaultPlayerCharacter = (partyMember) => ({
    id: partyMember?.id || Date.now(),
    linkedToParty: !!partyMember,
    name: partyMember?.name || 'New Operative',
    origin: partyMember?.origin || 'Lifer',
    classes: partyMember?.classes || [{ name: 'Fighter', level: 1, subclass: null }],
    abilities: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
    hp: { current: 10, max: 10, temp: 0 },
    ac: 10,
    initiative: 0,
    speed: 30,
    proficiencyBonus: 2,
    spellSlots: {},
    resources: [],
    features: [],
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

    const classResources = getClassResources(character);

    return { ...character, spellSlots, classResources };
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

  // ==================== RESTING ====================
  const shortRest = () => {
    setPlayerCharacter(p => {
      const restoredSlots = { ...p.spellSlots };
      Object.keys(restoredSlots).forEach(key => {
        if (restoredSlots[key].isPact) {
          restoredSlots[key] = { ...restoredSlots[key], used: 0 };
        }
      });
      return {
        ...p,
        spellSlots: restoredSlots,
        classResources: (p.classResources || []).map(r => r.shortRest ? { ...r, used: 0 } : r)
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
    setShowPlayerSheet(true);
    setShowPlayerCombat(false);
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
          ) : showPlayerCombat ? (
            <span className="text-xl font-bold tracking-widest" style={{textShadow: '0 0 20px rgba(255,0,255,0.5)', color: '#ff00ff'}}>COMBAT OPS</span>
          ) : playerCharacter ? (
            <div>
              <span className="text-gray-400 font-mono text-sm">Lvl {getPlayerLevel()} {playerCharacter.origin} </span>
              <span className="text-xl font-bold" style={{textShadow: '0 0 20px rgba(255,0,255,0.5)', color: '#ff00ff'}}>{playerCharacter.name}</span>
              <span className="text-gray-400 font-mono text-sm"> {playerCharacter.classes.map(c => `${c.name} ${c.level}${c.subclass ? ` (${c.subclass})` : ''}`).join(' / ')}</span>
            </div>
          ) : (
            <span className="text-xl font-bold tracking-widest" style={{textShadow: '0 0 20px rgba(255,0,255,0.5)', color: '#ff00ff'}}>OPERATIVE</span>
          )}
        </div>
        <div className="flex gap-1">
          {!playerSetupStep && <button onClick={() => setPlayerSetupStep('select')} className="px-2 py-1 text-xs font-mono border transition-all bg-gray-800/50 border-gray-600 text-gray-400 hover:border-cyan-500/50" title="Switch Character">↔</button>}
          {!playerSetupStep && <button onClick={() => { setShowPlayerSheet(true); setShowPlayerCombat(false); }} className={`px-2 py-1 text-xs font-mono border transition-all ${!showPlayerCombat ? 'bg-fuchsia-500/20 border-fuchsia-400 text-fuchsia-300' : 'bg-gray-800/50 border-gray-600 text-gray-400 hover:border-fuchsia-500/50'}`}>SHEET</button>}
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
      ) : showPlayerCombat ? (
        /* ==================== COMBAT VIEW ==================== */
        <div className="flex-1 flex flex-col gap-2">
          {/* Combat Header */}
          <div className="flex gap-2 mb-1">
            <button onClick={() => { setShowPlayerCombat(false); setShowPlayerSheet(true); }} className="px-3 py-1 bg-gray-800/50 border border-gray-600 text-gray-400 font-mono text-sm hover:border-fuchsia-500/50">◀ SHEET</button>
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
      ) : (
        /* ==================== CHARACTER SHEET ==================== */
        <div className="flex-1 flex flex-col gap-2 overflow-auto hide-scrollbar">
          {/* Top Stats Row */}
          <div className="flex gap-2">
            {/* Speed, Initiative, AC group */}
            <div className="flex gap-2 bg-gray-900/50 border border-cyan-500/30 p-2 rounded">
              <div className="text-center">
                <div className="text-cyan-400 font-mono text-xs">SPEED</div>
                <input type="number" value={playerCharacter.speed} onChange={(e) => setPlayerCharacter(p => ({ ...p, speed: parseInt(e.target.value) || 30 }))} className="w-12 bg-gray-800 border border-cyan-500/30 text-cyan-300 px-1 py-0.5 text-center font-mono text-xl" />
              </div>
              <div className="text-center">
                <div className="text-cyan-400 font-mono text-xs">INITIATIVE</div>
                <input type="number" value={playerCharacter.initiative} onChange={(e) => setPlayerCharacter(p => ({ ...p, initiative: parseInt(e.target.value) || 0 }))} className="w-12 bg-gray-800 border border-cyan-500/30 text-cyan-300 px-1 py-0.5 text-center font-mono text-xl" />
              </div>
              <div className="text-center">
                <div className="text-cyan-400 font-mono text-xs">ARMOR CLASS</div>
                <input type="number" value={playerCharacter.ac} onChange={(e) => setPlayerCharacter(p => ({ ...p, ac: parseInt(e.target.value) || 10 }))} className="w-12 bg-gray-800 border border-cyan-500/30 text-cyan-300 px-1 py-0.5 text-center font-mono text-xl" />
              </div>
            </div>

            {/* Features & Abilities - inline */}
            <div className="flex-1 bg-gray-900/50 border border-yellow-500/30 p-2 rounded">
              <div className="flex items-center justify-between mb-1">
                <span className="text-yellow-400 font-mono text-sm">FEATURES & ABILITIES</span>
                <button onClick={() => setAddingFeature(true)} className="px-2 py-0.5 bg-gray-800/50 border border-yellow-500/30 text-yellow-300 font-mono text-xs hover:border-yellow-400">+ ADD</button>
              </div>
              {addingFeature ? (
                <div className="flex gap-2">
                  <input type="text" id="newFeatName" placeholder="Feature name" className="flex-1 bg-gray-800 border border-yellow-500/30 text-yellow-300 px-2 py-1 font-mono text-sm" autoFocus />
                  <button onClick={() => { const name = document.getElementById('newFeatName').value; if (name.trim()) addFeature(name.trim(), ''); }} className="px-2 py-1 bg-yellow-500/20 border border-yellow-400 text-yellow-300 font-mono text-xs">ADD</button>
                  <button onClick={() => setAddingFeature(false)} className="px-2 py-1 bg-gray-800/50 border border-gray-600 text-gray-400 font-mono text-xs">×</button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {playerCharacter.features.map((feat, i) => (
                    <button key={i} onClick={() => removeFeature(i)} className="px-2 py-0.5 bg-yellow-900/30 border border-yellow-600/50 text-yellow-300 font-mono text-xs hover:border-red-400 hover:text-red-300" title="Click to remove">{feat.name}</button>
                  ))}
                  {playerCharacter.features.length === 0 && <span className="text-gray-500 font-mono text-sm">No features added</span>}
                </div>
              )}
            </div>

            {/* Proficiency */}
            <div className="bg-gray-900/50 border border-cyan-500/30 p-2 rounded text-center">
              <div className="text-cyan-400 font-mono text-xs">PROFICIENCY</div>
              <input type="number" value={playerCharacter.proficiencyBonus} onChange={(e) => setPlayerCharacter(p => ({ ...p, proficiencyBonus: parseInt(e.target.value) || 2 }))} className="w-12 bg-gray-800 border border-cyan-500/30 text-cyan-300 px-1 py-0.5 text-center font-mono text-xl" />
            </div>

            {/* HP */}
            <div className="bg-gray-900/50 border border-green-500/30 p-2 rounded">
              <div className="text-green-400 font-mono text-xs text-right">HIT POINTS</div>
              <div className="flex items-center gap-1">
                <input type="number" value={playerCharacter.hp.current} onChange={(e) => updatePlayerHP('current', e.target.value)} className="w-12 bg-gray-800 border border-green-500/30 text-green-300 px-1 py-0.5 text-center font-mono text-lg" />
                <span className="text-gray-500 font-mono">/</span>
                <input type="number" value={playerCharacter.hp.max} onChange={(e) => updatePlayerHP('max', e.target.value)} className="w-12 bg-gray-800 border border-green-500/30 text-green-300 px-1 py-0.5 text-center font-mono text-lg" />
              </div>
              <div className="flex items-center justify-end gap-1">
                <span className="text-cyan-500 font-mono text-xs">TEMP:</span>
                <input type="number" value={playerCharacter.hp.temp} onChange={(e) => updatePlayerHP('temp', e.target.value)} className="w-10 bg-gray-800 border border-cyan-500/30 text-cyan-300 px-1 py-0.5 text-center font-mono text-sm" />
              </div>
            </div>
          </div>

          {/* Ability Scores */}
          <div className="grid grid-cols-6 gap-2">
            {ABILITIES.map(ability => {
              const score = playerCharacter.abilities[ability];
              const mod = getAbilityMod(score);
              return (
                <div key={ability} className="bg-gray-900/50 border border-cyan-500/30 p-2 rounded text-center">
                  <div className="text-cyan-400 font-mono text-xs mb-1">{ability}</div>
                  {editingAbility === ability ? (
                    <input type="number" value={score} onChange={(e) => updatePlayerAbility(ability, e.target.value)} onBlur={() => setEditingAbility(null)} onKeyDown={(e) => e.key === 'Enter' && setEditingAbility(null)} className="w-12 bg-gray-800 border border-cyan-400 text-cyan-300 px-1 py-0.5 text-center font-mono text-lg mx-auto" autoFocus />
                  ) : (
                    <button onClick={() => setEditingAbility(ability)} className="text-cyan-300 font-mono text-lg hover:text-cyan-100">{score}</button>
                  )}
                  <div className="text-fuchsia-400 font-mono text-sm font-bold">{formatMod(mod)}</div>
                </div>
              );
            })}
          </div>

          {/* Spell Slots & Class Resources Row */}
          <div className="flex gap-2">
            {/* Spell Slots - Left */}
            <div className="flex-1 bg-gray-900/50 border border-purple-500/30 p-2 rounded">
              {Object.keys(playerCharacter.spellSlots || {}).length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {Object.entries(playerCharacter.spellSlots).map(([key, slot]) => (
                    Array.from({ length: slot.max }).map((_, i) => {
                      const available = i < slot.max - slot.used;
                      return (
                        <button
                          key={`${key}-${i}`}
                          onClick={() => available ? useSpellSlot(key) : restoreSpellSlot(key)}
                          className={`w-7 h-7 rounded-full border-2 font-mono text-xs font-bold flex items-center justify-center transition-all ${
                            slot.isPact
                              ? (available ? 'bg-fuchsia-500 border-fuchsia-400 text-white' : 'bg-fuchsia-900/50 border-fuchsia-800 text-fuchsia-600')
                              : (available ? 'bg-purple-500 border-purple-400 text-white' : 'bg-purple-900/50 border-purple-800 text-purple-600')
                          }`}
                          title={slot.isPact ? `Pact Slot (Lvl ${slot.level})` : `Level ${slot.level} Spell Slot`}
                        >
                          {slot.level}
                        </button>
                      );
                    })
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 font-mono text-sm">No spellcasting</div>
              )}
            </div>

            {/* Class Resources - Right */}
            {(playerCharacter.classResources || []).length > 0 && (
              <div className="flex gap-2">
                {(playerCharacter.classResources || []).map((res, i) => {
                  const colors = ABILITY_COLORS[res.ability] || ABILITY_COLORS.STR;
                  return (
                    <div key={i} className={`bg-gray-900/50 border ${colors.border}/30 p-2 rounded`}>
                      <div className={`${colors.text} font-mono text-xs text-center mb-1`}>{res.name}</div>
                      {res.isPool ? (
                        <input
                          type="number"
                          value={res.max - res.used}
                          onChange={(e) => setClassResourcePool(i, e.target.value)}
                          className={`w-12 bg-gray-800 border ${colors.border}/30 ${colors.text} px-1 py-0.5 text-center font-mono text-lg`}
                          max={res.max}
                          min={0}
                        />
                      ) : (
                        <div className="flex gap-1 justify-center">
                          {Array.from({ length: res.max }).map((_, j) => {
                            const available = j < res.max - res.used;
                            return (
                              <button
                                key={j}
                                onClick={() => available ? useClassResource(i) : restoreClassResource(i)}
                                className={`w-5 h-5 rounded-full border-2 transition-all ${available ? `${colors.bg} ${colors.border}` : `${colors.bgUsed} border-gray-600`}`}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Spacer to push content up */}
          <div className="flex-1" />

          {/* Proficiencies & Languages */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-900/50 border border-gray-600 p-2 rounded">
              <div className="text-gray-400 font-mono text-xs mb-1">PROFICIENCIES</div>
              <textarea value={playerCharacter.proficiencies} onChange={(e) => setPlayerCharacter(p => ({ ...p, proficiencies: e.target.value }))} className="w-full bg-transparent text-gray-300 font-mono text-sm resize-none h-16" placeholder="Armor, weapons, tools..."></textarea>
            </div>
            <div className="bg-gray-900/50 border border-gray-600 p-2 rounded">
              <div className="text-gray-400 font-mono text-xs mb-1">LANGUAGES</div>
              <textarea value={playerCharacter.languages} onChange={(e) => setPlayerCharacter(p => ({ ...p, languages: e.target.value }))} className="w-full bg-transparent text-gray-300 font-mono text-sm resize-none h-16" placeholder="Common, Elvish..."></textarea>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex gap-2">
            <button onClick={() => { setShowPlayerCombat(true); setShowPlayerSheet(false); }} className="flex-1 py-2 bg-red-900/30 border border-red-500/50 text-red-300 font-mono text-sm hover:bg-red-500/20 hover:border-red-400 transition-all">⚔ COMBAT MODE</button>
            <button onClick={shortRest} className="flex-1 py-2 bg-cyan-900/30 border border-cyan-500/50 text-cyan-300 font-mono text-sm hover:bg-cyan-500/20">SHORT REST</button>
            <button onClick={longRest} className="flex-1 py-2 bg-fuchsia-900/30 border border-fuchsia-500/50 text-fuchsia-300 font-mono text-sm hover:bg-fuchsia-500/20">LONG REST</button>
          </div>
        </div>
      )}
    </div>
  );
}
