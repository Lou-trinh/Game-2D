export const WeaponCategories = {
    HANDGUNS: 1,
    SMG: 2,
    SHOTGUNS: 3,
    ASSAULT_RIFLES: 4,
    BATTLE_RIFLES: 5,
    SNIPER_RIFLES: 6,
    LMG: 7,
    ROCKET_LAUNCHERS: 8,
    MELEE: 9,
    BOMB: 10
};

export const WeaponData = [
    { key: 'M4A1', name: 'M4A1', price: 0, texture: 'M4A1', category: WeaponCategories.ASSAULT_RIFLES, maxAmmo: 60, speed: 1000, range: 180 },
    { key: 'AK47', name: 'AK-47', price: 500, texture: 'AK47', category: WeaponCategories.ASSAULT_RIFLES, maxAmmo: 60, speed: 1000, range: 180 },
    { key: 'Glock_17', name: 'Glock 17', price: 200, texture: 'Glock_17', category: WeaponCategories.HANDGUNS, maxAmmo: 20, speed: 900, range: 150, audio: 'pistol' },
    { key: 'Astra_680', name: 'Astra 680', price: 250, texture: 'Astra_680', category: WeaponCategories.HANDGUNS, maxAmmo: 18, speed: 850, range: 140, audio: 'pistol' },
    { key: 'Charter_Arms_Bulldog', name: 'Charter Arms Bulldog', price: 300, texture: 'Charter_Arms_Bulldog', category: WeaponCategories.HANDGUNS, maxAmmo: 15, speed: 800, range: 130, audio: 'pistol' },
    { key: 'Colt_1911', name: 'Colt 1911', price: 350, texture: 'Colt_1911', category: WeaponCategories.HANDGUNS, maxAmmo: 17, speed: 900, range: 150, audio: 'pistol' },
    { key: 'Mark_23', name: 'Mark 23', price: 400, texture: 'Mark_23', category: WeaponCategories.HANDGUNS, maxAmmo: 22, speed: 950, range: 160, audio: 'pistol' },
    { key: 'SIG_P250', name: 'SIG P250', price: 320, texture: 'SIG_P250', category: WeaponCategories.HANDGUNS, maxAmmo: 19, speed: 880, range: 145, audio: 'pistol' },
    { key: 'P90', name: 'P90', price: 400, texture: 'P90', category: WeaponCategories.SMG, maxAmmo: 60, speed: 1100, range: 140, audio: 'SMG' },
    { key: 'Pump_Shotgun', name: 'Pump Shotgun', price: 600, texture: 'Pump_Shotgun', category: WeaponCategories.SHOTGUNS, maxAmmo: 10, speed: 900, range: 100, audio: 'shotgun', fireRate: 1500, projectileCount: 8, spread: 10, damage: 15 },
    { key: 'DBS', name: 'DBS', price: 800, texture: 'DBS', category: WeaponCategories.SHOTGUNS, maxAmmo: 14, speed: 950, range: 120, audio: 'shotgun', fireRate: 1000, projectileCount: 2, spread: 5, damage: 30 },
    { key: 'SKS', name: 'SKS', price: 800, texture: 'SKS', category: WeaponCategories.SNIPER_RIFLES, maxAmmo: 20, speed: 1400, range: 300, audio: 'DMR', fireRate: 300 },
    { key: 'Grenade', name: 'Lựu đạn', price: 100, texture: 'Grenade', category: WeaponCategories.BOMB, maxAmmo: 3 },
    { key: 'Minigun', name: 'Minigun', price: 1500, texture: 'Minigun', category: WeaponCategories.LMG, maxAmmo: 120, speed: 1200, range: 250, audio: 'minigun' },
    { key: 'Shovel', name: 'Xẻng quân dụng', price: 50, texture: 'Shovel', category: WeaponCategories.MELEE, maxAmmo: 0, attackType: 'melee', audio: 'shovel_swing' },
    { key: 'Knife', name: 'Knife', price: 100, texture: 'Knife', category: WeaponCategories.MELEE, maxAmmo: 0, attackType: 'melee', damage: 20, audio: 'katana' },
    { key: 'Katana', name: 'Katana', price: 500, texture: 'Katana', category: WeaponCategories.MELEE, maxAmmo: 0, attackType: 'melee', damage: 40, audio: 'katana' },
    { key: 'Rocket', name: 'Súng phóng Rocket', price: 2000, texture: 'Rocket', category: WeaponCategories.ROCKET_LAUNCHERS, maxAmmo: 1, projectileTexture: 'Rocket_Bullet', attackType: 'gun_fire', speed: 300, range: 450, isExplosive: true },
    { key: 'AWM', name: 'AWM', price: 1000, texture: 'AWM', category: WeaponCategories.SNIPER_RIFLES, maxAmmo: 10, speed: 1500, range: 350, audio: 'sniper', fireRate: 1500, damage: 50, pierce: true },
    { key: 'AWP', name: 'AWP', price: 1000, texture: 'AWP', category: WeaponCategories.SNIPER_RIFLES, maxAmmo: 10, speed: 1500, range: 350, audio: 'sniper', fireRate: 1500, damage: 50, pierce: true },
    { key: 'MP5', name: 'MP5', price: 600, texture: 'MP5', category: WeaponCategories.SMG, maxAmmo: 40, speed: 1100, range: 160, audio: 'SMG' },
    { key: 'MPK5', name: 'MPK5', price: 550, texture: 'MPK5', category: WeaponCategories.SMG, maxAmmo: 35, speed: 1050, range: 155, audio: 'SMG' },
    { key: 'SMG', name: 'SMG', price: 500, texture: 'SMG', category: WeaponCategories.SMG, maxAmmo: 30, speed: 1000, range: 150, audio: 'SMG' },
    { key: 'Thompson', name: 'Thompson', price: 600, texture: 'Thompson', category: WeaponCategories.SMG, maxAmmo: 50, speed: 1000, range: 150, audio: 'SMG' },
    { key: 'M762', name: 'M762', price: 700, texture: 'M762', category: WeaponCategories.ASSAULT_RIFLES, maxAmmo: 40, speed: 1050, range: 200, audio: 'rifle_shot' },
    { key: 'MK14', name: 'MK14', price: 900, texture: 'MK14', category: WeaponCategories.SNIPER_RIFLES, maxAmmo: 20, speed: 1400, range: 280, audio: 'MK14', fireRate: 1000, damage: 35, pierce: true },
    { key: 'M24', name: 'M24', price: 950, texture: 'M24', category: WeaponCategories.SNIPER_RIFLES, maxAmmo: 10, speed: 1500, range: 350, audio: 'sniper', fireRate: 1400, damage: 48, pierce: true },
    { key: 'Kar98K', name: 'Kar98K', price: 900, texture: 'Kar98K', category: WeaponCategories.SNIPER_RIFLES, maxAmmo: 10, speed: 1500, range: 340, audio: 'sniper', fireRate: 1500, damage: 45, pierce: true },
    { key: 'Win94', name: 'Win94', price: 700, texture: 'Win94', category: WeaponCategories.SNIPER_RIFLES, maxAmmo: 8, speed: 1400, range: 280, audio: 'sniper', fireRate: 800, damage: 40, pierce: true },
    { key: 'SCAR-L', name: 'SCAR-L', price: 650, texture: 'SCAR-L', category: WeaponCategories.ASSAULT_RIFLES, maxAmmo: 40, speed: 1000, range: 190, audio: 'rifle_shot', scale: 0.45 },
    { key: 'Vector', name: 'Vector', price: 500, texture: 'Vector', category: WeaponCategories.SMG, maxAmmo: 30, speed: 1200, range: 130, audio: 'SMG', scale: 0.45 },
    { key: 'MP9', name: 'MP9', price: 450, texture: 'MP9', category: WeaponCategories.SMG, maxAmmo: 30, speed: 1150, range: 140, audio: 'SMG' },
    { key: 'Gasoline_Bomb', name: 'Bom xăng', price: 150, texture: 'gasoline_bombs', category: WeaponCategories.BOMB, maxAmmo: 3 }
];

export function getWeaponsByCategory(category) {
    return WeaponData.filter(w => w.category === category);
}

export function getWeaponsByCategories(categories) {
    if (!Array.isArray(categories)) categories = [categories];
    return WeaponData.filter(w => categories.includes(w.category));
}

export function getWeaponByKey(key) {
    return WeaponData.find(w => w.key === key);
}
