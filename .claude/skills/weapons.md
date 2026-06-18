# Skill: Weapons

## Data source
Hardcode array trong `js/data/WeaponData.js`. 55 vũ khí tổng cộng.

## Categories

| ID | Category | Ví dụ |
|----|----------|-------|
| 1 | HANDGUNS | Glock_17, Colt_1911, Desert_Eagle, Mark_23 |
| 2 | SMG | MP5, P90, Vector, Thompson |
| 3 | SHOTGUNS | Pump_Shotgun, DBS, Benelli_M3, SPAS_12 |
| 4 | ASSAULT_RIFLES | M4A1, AK47, AUG, SCAR-L, QBZ, FAMAS |
| 5 | BATTLE_RIFLES | *(category tồn tại, chưa có weapon)* |
| 6 | SNIPER_RIFLES | AWM, AWP, SKS, MK14, M24, Kar98K, VSS |
| 7 | LMG | Minigun |
| 8 | ROCKET_LAUNCHERS | Rocket |
| 9 | MELEE | Shovel, Knife, Katana |
| 10 | BOMB | Grenade, Gasoline_Bomb, Electric_Bomb |

## Default weapons (`default: true`)
Glock_17, Grenade, MP5, Shovel — player bắt đầu với 4 vũ khí này.

## Fields quan trọng
```js
{
  key: 'AWM',
  name: 'AWM', price: 500,
  texture: 'AWM',          // texture key = tên file trong assets/images/weapons/
  category: 6,
  maxAmmo: 5, speed: 800, range: 600, damage: 120,
  // Optional:
  fireRate: 1000,          // ms giữa 2 lần bắn (nếu không set = auto theo input)
  projectileCount: 5,      // shotgun: số đạn mỗi lần bắn
  spread: 15,              // shotgun: góc tán (độ)
  pierce: true,            // sniper: đạn xuyên qua enemy
  isExplosive: true,       // rocket: nổ AOE
  attackType: 'melee',     // melee: logic tấn công khác hướng
  projectileTexture: 'Rocket_Bullet',
}
```

## Storage
- Ownership: `localStorage('owned_weapons')` — JSON array các key đã mua
- Equipped: `localStorage('equipped_weapons')` — object `{slot1, slot2, slot3, slot4}`
- 4 slots tương ứng phím 1–4

## Load assets
```js
scene.load.image(weapon.texture, `assets/images/weapons/${weapon.texture}.png`);
```

## Gotchas
- Melee: `attackType: 'melee'`, origin `(0.0, 1.0)` thay vì `(0.3, 0.7)`
- Shotgun: mỗi lần bắn spawn `projectileCount` viên đạn với random spread
- `fireRate` không set = fire rate theo tốc độ click/hold; có set = capped
