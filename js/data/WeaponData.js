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
    { key: 'Glock_17', name: 'Glock 17', price: 200, texture: 'Glock_17', category: WeaponCategories.HANDGUNS, maxAmmo: 20, speed: 900, range: 150 },
    { key: 'PDW', name: 'PDW', price: 400, texture: 'PDW', category: WeaponCategories.SMG, maxAmmo: 60, speed: 1100, range: 140 },
    { key: 'Pump_Shotgun', name: 'Pump Shotgun', price: 600, texture: 'Pump_Shotgun', category: WeaponCategories.SHOTGUNS, maxAmmo: 10, speed: 800, range: 120 },
    { key: 'SKS', name: 'SKS', price: 800, texture: 'SKS', category: WeaponCategories.SNIPER_RIFLES, maxAmmo: 20, speed: 1400, range: 300 },
    { key: 'Grenade', name: 'Lựu đạn', price: 100, texture: 'Grenade', category: WeaponCategories.BOMB, maxAmmo: 5 },
    { key: 'Minigun', name: 'Minigun', price: 1500, texture: 'Minigun', category: WeaponCategories.LMG, maxAmmo: 120, speed: 1200, range: 250 },
    { key: 'Shovel', name: 'Xẻng quân dụng', price: 50, texture: 'Shovel', category: WeaponCategories.MELEE, maxAmmo: 0, attackType: 'melee' },
    { key: 'Rocket', name: 'Súng phóng Rocket', price: 2000, texture: 'Rocket', category: WeaponCategories.ROCKET_LAUNCHERS, maxAmmo: 1, projectileTexture: 'Rocket_Bullet', attackType: 'gun_fire', speed: 300, range: 450, isExplosive: true }
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
