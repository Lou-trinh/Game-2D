import { auth, loadProgress, saveProgress } from '../firebase.js';

let saveTimeout = null;

export const Economy = {
  getCoins: () => {
    const val = localStorage.getItem('total_coins');
    return val ? parseInt(val) : 0;
  },
  saveCoins: (amount) => {
    localStorage.setItem('total_coins', amount.toString());
    Economy._scheduleSave();
  },
  addCoins: (amount) => {
    const current = Economy.getCoins();
    Economy.saveCoins(current + amount);
  },
  getDiamonds: () => {
    const val = localStorage.getItem('total_diamonds');
    return val ? parseInt(val) : 0;
  },
  saveDiamonds: (amount) => {
    localStorage.setItem('total_diamonds', amount.toString());
    Economy._scheduleSave();
  },
  addDiamonds: (amount) => {
    const current = Economy.getDiamonds();
    Economy.saveDiamonds(current + amount);
  },
  getEquippedWeapons: () => {
    return JSON.parse(localStorage.getItem('equipped_weapons') || '{}');
  },
  saveEquippedWeapons: (weapons) => {
    localStorage.setItem('equipped_weapons', JSON.stringify(weapons));
    Economy._scheduleSave();
  },

  DEFAULT_WEAPONS: ['Shovel', 'Glock_17', 'MP5', 'Grenade'],
  getOwnedWeapons: () => {
    const stored = JSON.parse(localStorage.getItem('owned_weapons') || '[]');
    const merged = [...new Set([...Economy.DEFAULT_WEAPONS, ...stored])];
    return merged;
  },
  isWeaponOwned: (key) => Economy.getOwnedWeapons().includes(key),
  ownWeapon: (key) => {
    const stored = JSON.parse(localStorage.getItem('owned_weapons') || '[]');
    if (!stored.includes(key)) {
      stored.push(key);
      localStorage.setItem('owned_weapons', JSON.stringify(stored));
      Economy._scheduleSave();
    }
  },

  getFragCommon: () => parseInt(localStorage.getItem('frag_common') || '0'),
  addFragCommon: (n = 1) => {
    const v = Economy.getFragCommon() + n;
    localStorage.setItem('frag_common', v.toString());
    Economy._scheduleSave();
    return v;
  },
  getFragRare: () => parseInt(localStorage.getItem('frag_rare') || '0'),
  addFragRare: (n = 1) => {
    const v = Economy.getFragRare() + n;
    localStorage.setItem('frag_rare', v.toString());
    Economy._scheduleSave();
    return v;
  },

  getLevel: () => {
    const val = localStorage.getItem('player_level');
    return val ? parseInt(val) : 1;
  },
  getExp: () => {
    const val = localStorage.getItem('player_exp');
    return val ? parseInt(val) : 0;
  },
  getExpForLevel: (level) => level * 100,
  addExp: (amount) => {
    let exp = Economy.getExp() + amount;
    let level = Economy.getLevel();
    while (exp >= Economy.getExpForLevel(level)) {
      exp -= Economy.getExpForLevel(level);
      level += 1;
    }
    localStorage.setItem('player_exp', exp.toString());
    localStorage.setItem('player_level', level.toString());
    Economy._scheduleSave();
  },

  async syncFromCloud() {
    const user = auth.currentUser;
    if (!user) return false;
    const data = await loadProgress(user.uid);
    if (!data) return false;
    if (data.coins !== undefined) localStorage.setItem('total_coins', data.coins.toString());
    if (data.diamonds !== undefined) localStorage.setItem('total_diamonds', data.diamonds.toString());
    if (data.equippedWeapons) localStorage.setItem('equipped_weapons', JSON.stringify(data.equippedWeapons));
    if (data.exp !== undefined) localStorage.setItem('player_exp', data.exp.toString());
    if (data.level !== undefined) localStorage.setItem('player_level', data.level.toString());
    if (data.ownedWeapons) localStorage.setItem('owned_weapons', JSON.stringify(data.ownedWeapons));
    if (data.fragCommon != null) localStorage.setItem('frag_common', data.fragCommon.toString());
    if (data.fragRare   != null) localStorage.setItem('frag_rare',   data.fragRare.toString());
    console.log('☁️ Synced from cloud:', data);
    return true;
  },

  _scheduleSave() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => Economy._saveToCloud(), 3000);
  },

  async _saveToCloud() {
    const user = auth.currentUser;
    if (!user) return;
    const stored = JSON.parse(localStorage.getItem('owned_weapons') || '[]');
    const data = {
      coins: Economy.getCoins(),
      diamonds: Economy.getDiamonds(),
      equippedWeapons: Economy.getEquippedWeapons(),
      exp: Economy.getExp(),
      level: Economy.getLevel(),
      ownedWeapons: stored,
      fragCommon: Economy.getFragCommon(),
      fragRare:   Economy.getFragRare(),
      lastSeen: new Date().toISOString()
    };
    await saveProgress(user.uid, data);
    console.log('☁️ Saved to cloud:', data);
  },

  async forceSave() {
    if (saveTimeout) { clearTimeout(saveTimeout); saveTimeout = null; }
    await Economy._saveToCloud();
  }
};
