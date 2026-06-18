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
- Nếu host disconnect → guest thấy enemies đóng băng (không có fallback AI)

## Load assets
```js
scene.load.atlas(key, `assets/images/${folder}/${key}.png`, `${key}_atlas.json`);
scene.load.animation(`${key}_anim`, `assets/images/${folder}/${key}_anim.json`);
```

## Thêm monster mới
1. Tạo class mới trong `js/` kế thừa pattern từ `Bear.js` hoặc `GnollShaman.js` (ranged)
2. Thêm asset folder
3. Đăng ký vào `getSpawnPool()` trong `MainScene.js` tại phase phù hợp
