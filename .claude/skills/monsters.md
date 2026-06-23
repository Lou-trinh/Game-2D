# Skill: Monsters / Enemies

## Stats

| Class | Texture key | HP | Speed | Damage | Cooldown | Loại |
|-------|-------------|----|----|--------|----------|------|
| Bear | `bear` | 100 | 0.7 | 10 | 1000ms | melee |
| TreeMan | `tree_man` | 100 | 0.4 | 10 | 1000ms | melee |
| Wolf | `wolf` | 100 | 1.0 | 12 | 1000ms | melee |
| GnollBrute | `gnollbrute` | 150 | 0.8 | 15 | 800ms | melee |
| GnollShaman | `gnollshaman` | 80 | 0.7 | 12 | 1500ms | ranged |
| LargeMushRoom | `largemushroom` | 200 | 0.4 | 10 | 1000ms | melee |
| SmallMushRoom | `smallmushroom` | 50 | 0.6 | 5 | 1200ms | melee |
| ForestGuardian | `forest_guardian` | 300 | 0.8 | 15 | 2000ms | ranged (tornado) |
| Golem | `golem` | 500 | 0.45 | 10 | 2000ms | melee |
| IceMonster | `ice_monster` | 150 | 1.2 | 25 | 1000ms | **ally** (summon) |

Scale × 1.5: ForestGuardian, LargeMushRoom, Golem.

## Spawn phases (MainScene.getSpawnPool)

| Phase | Thời gian | Pool |
|-------|-----------|------|
| 1 | 0–25s | Bear ×3, TreeMan ×3 |
| 2 | 25s+ | + GnollBrute, GnollShaman, Wolf |
| 3 | 50s+ | + GnollBrute ×2, GnollShaman ×2, Wolf ×2 |
| 4 | 75s+ | + Mushroom |
| 5 | 100s+ | + Mushroom ×3 |
| 6 | 125s+ | + ForestGuardian |
| 7 | 150s+ | + ForestGuardian ×3 |
| 8 | 175s+ | + Golem |
| 9 | 200s+ | + Golem ×3 |

Spawn interval giảm dần 1500ms → ~600ms. Gate: `(100, 260)` và `(860, 260)`, luân phiên.

## Collision categories (Matter.js)
- Enemy: `category(0x0002)`, `collidesWith([0x0001])` — chỉ va chạm player
- IceMonster (ally): `category(0x0004)`, `collidesWith([0x0000])` — không va chạm gì

## Ranged enemies
- **GnollShaman**: bắn projectile theo cooldown, có `projectiles[]` array
- **ForestGuardian**: bắn tornado projectile, cooldown 2000ms

## Multiplayer (host-authoritative)
- Host chạy AI + spawn, gán `mpId` (counter tăng dần)
- Guest nhận enemy state từ Firestore, render sprite khớp `mpId`
- Nếu host disconnect → **hostLeft AI** tự động kích hoạt (xem mục dưới)

## hostLeft — Guest fallback AI (MainScene.js)

Khi host thoát giữa game, `_hostLeft = true` → guest tự chạy AI cho `_guestEnemySprites`.

### Nhận diện ranged enemy
```js
// ĐÚNG: dùng _mpType (works cả Firestore-synced lẫn locally spawned)
const _rangedTypes = ['forestguardian', 'forest_guardian', 'gnollshaman', 'gnoll_shaman'];
const isRanged = _rangedTypes.includes(sp._mpType);

// SAI: _dmg === 0 chỉ đúng với Firestore-synced (host broadcast dmg=0 cho ranged)
// Locally spawned có _dmg = def.dmg > 0 → luôn false → không bắn
```

### Broadcast fields từ host
| Field | Giá trị ranged | Giá trị melee |
|-------|---------------|---------------|
| `sp._dmg` | `0` (host broadcast `dmg: e.damageAmount \|\| 0`) | `> 0` |
| `sp._range` | `0` (ranged dùng `projectileDamage` không có `meleeRange`) | `> 0` |
| `sp._mpType` | `'forestguardian'` / `'gnollshaman'` | các loại khác |

### Chase + stop distance
```js
// Melee: stopDist = sp._range thực (KHÔNG hardcode 30)
// Golem broadcast _range = 75, local spawn _range = 50 → đủ để melee check kích hoạt
const stopDist = isRanged ? 120 : Math.max(sp._range || 20, 20);
```
- Ranged: dừng ở 120px, retreat nếu `d < 55`
- Melee: dừng đúng tại `_range` → melee check `dist < _range + 12` luôn trigger

### Ranged attack zone + cooldown
```js
if (isRanged && d >= 55 && d <= 120) {
  const isGuardian = sp._mpType === 'forestguardian' || sp._mpType === 'forest_guardian';
  const cd = isGuardian ? 2000 : 1500;
  if (now - (sp._lastLocalShot || 0) >= cd) {
    sp._lastLocalShot = now;
    this._fireLocalProjectile(sp, this.player, isGuardian);
  }
}
```

### _fireLocalProjectile(sp, target, isGuardian)
- ForestGuardian: spawn `'tornado'` sprite, play `'effect_2'`, scale 0.8, alpha 0.9, dmg 15, life 1500ms
- GnollShaman: `this.add.graphics()` circle màu `0x9966ff`, radius 6, stroke `0xcc99ff`, dmg 12, life 2000ms
- Push vào `this._guestProjectiles[id]` với `{ _local: true, _spawnAt: Date.now(), _maxLife, vx, vy, dmg }`

### _guestProjectiles loop — local vs Firestore
```js
if (gp._local) {
  // Dùng lifetime (không phụ thuộc Firestore staleness)
  if (Date.now() - gp._spawnAt >= gp._maxLife) { gp.gfx.destroy(); delete ...; return; }
  gp.gfx.x += gp.vx * drDelta / 16.67;
} else {
  // Firestore-synced: chỉ move nếu staleness < 1500ms
  const staleness = Date.now() - (gp.lastUpdateAt || 0);
  if (staleness < 1500) { gp.gfx.x += gp.vx * drDelta / 16.67; }
}
```

### _chaseSpeed — dùng type table, KHÔNG dùng velocity broadcast
```js
// velocity broadcast có thể là retreat speed → sai khi apply cho chase
const _typeSpeed = {
  bear:0.7, wolf:1.0, treeman:0.4,
  forestguardian:0.8, forest_guardian:0.8,
  gnollbrute:0.8, gnoll_brute:0.8,
  gnollshaman:0.7, gnoll_shaman:0.7,
  mushroom:0.4, smallmushroom:0.6, small_mushroom:0.6, golem:0.45,
};
sp._chaseSpeed = _typeSpeed[sp._mpType] || 0.6;
```

### _spawnLocalEnemy — pool và rangeMap
```js
// Pool: 9 loại, cycle theo index % 9
const _pool = [
  { tex:'bear',            speed:0.7,  hp:100, dmg:10 },
  { tex:'wolf',            speed:1.0,  hp:100, dmg:12 },
  { tex:'treeman',         speed:0.4,  hp:120, dmg:8  },
  { tex:'forest_guardian', speed:0.8,  hp:300, dmg:20 },
  { tex:'gnoll_brute',     speed:0.8,  hp:150, dmg:15 },
  { tex:'gnoll_shaman',    speed:0.7,  hp:80,  dmg:10 },
  { tex:'mushroom',        speed:0.4,  hp:200, dmg:10 },
  { tex:'small_mushroom',  speed:0.6,  hp:50,  dmg:5  },
  { tex:'golem',           speed:0.45, hp:500, dmg:10 },
];
// _range cho melee check
const _rangeMap = { bear:17, wolf:17, treeman:17,
  forest_guardian:0, gnoll_brute:20, gnoll_shaman:0,
  mushroom:28, small_mushroom:20, golem:50 };
```
- forest_guardian và gnoll_shaman locally spawned có `_dmg > 0` nhưng vẫn là ranged → phát hiện bằng `_mpType`

### Golem attack effect
Golem single-player có `createAttackEffect(x, y)` — spawn sprite `'effect_1'` tại player position.
Guest melee hit loop phải replicate:
```js
if (sp._mpType === 'golem' && this.textures.exists('effect_1') && this.anims.exists('effect_1')) {
  const fx = this.add.sprite(this.player.x, this.player.y - 20, 'effect_1', '001');
  fx.setScale(1).setDepth(10000);
  fx.play({ key: 'effect_1', repeat: 0 });
  fx.on('animationcomplete', () => { fx.destroy(); });
}
```

## Load assets
```js
scene.load.atlas(key, `assets/images/${folder}/${key}.png`, `${key}_atlas.json`);
scene.load.animation(`${key}_anim`, `assets/images/${folder}/${key}_anim.json`);
```

## Thêm monster mới
1. Tạo class mới trong `js/` kế thừa pattern từ `Bear.js` hoặc `GnollShaman.js` (ranged)
2. Thêm asset folder
3. Đăng ký vào `getSpawnPool()` trong `MainScene.js` tại phase phù hợp
