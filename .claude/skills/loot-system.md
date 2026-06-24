# Skill: Loot & Item System

## Item Types
| type | Hiệu ứng |
|------|---------|
| `diamond` | +1 💎, lưu `Economy.saveDiamonds()` |
| `blood` | +30 HP (heal) |
| `frag_common` | +1 mảnh thường, lưu `Economy.saveFragCommon()` |
| `frag_rare` | +1 mảnh hiếm, lưu `Economy.saveFragRare()` |
| `coin` | +1 xu, lưu `Economy.saveCoins()` |

## Drop Flow (MainScene)
```js
dropLoot(x, y, count, type):
  → tạo `count` item sprites tại (x, y)
  → bounce tween: nhảy ngẫu nhiên lên rồi rơi xuống
  → mỗi sprite có getData('itemType') = type
```

## Pickup Logic (update loop)
```js
items.forEach(item => {
    const dist = Phaser.Math.Distance.Between(player.x, player.y, item.x, item.y);
    if (dist < 30) // magnet range: tween bay về phía player
    if (dist < 20) // pickup range: áp dụng effect + destroy item
});
```

## Chest System
- Spawn **1 lần** sau **15 giây** từ khi game start (`time.delayedCall`)
- Chest là **sensor** — player đi xuyên qua được (không block di chuyển)
- Collision: khi player chạm → `takeDamage()` kích hoạt `open()`
- `open()`: play open animation (once) → `dropItems()` → destroy chest
- Drop pool: ngẫu nhiên trong các item types trên

## Guest Loot Table (GuestEnemyProxy)
Guest drop loot theo `sprite._mpType` — KHÔNG hardcode `1 coin`:
```js
const _lt = {
  bear:            { coin:[1,3],  fc:0.03, fr:0.01 },
  wolf:            { coin:[1,2],  fc:0.02, fr:0 },
  treeman:         { coin:[2,5],  fc:0.03, fr:0.01 },
  tree_man:        { coin:[2,5],  fc:0.03, fr:0.01 },
  forestguardian:  { coin:[5,10], fc:0.10, fr:0.04 },
  forest_guardian: { coin:[5,10], fc:0.10, fr:0.04 },
  gnollbrute:      { coin:[2,4],  fc:0.05, fr:0.02 },
  gnoll_brute:     { coin:[2,4],  fc:0.05, fr:0.02 },
  gnollshaman:     { coin:[2,4],  fc:0.04, fr:0.01 },
  gnoll_shaman:    { coin:[2,4],  fc:0.04, fr:0.01 },
  golem:           { coin:[3,6],  fc:0.08, fr:0.03 },
  mushroom:        { coin:[2,3],  fc:0.05, fr:0.02 },
  smallmushroom:   { coin:[1,1],  fc:0,    fr:0 },
  small_mushroom:  { coin:[1,1],  fc:0,    fr:0 },
};
```
Fallback nếu không match: `coin:[1,2], fc:0.03, fr:0.01`

## Gotcha
- Items dùng plain array `this.items[]`, không phải Phaser Group
- Phải `filter(i => i.active)` mỗi frame để cleanup items đã pickup
- Magnet effect dùng tween, không phải physics — item không va chạm với obstacle khi bay về player
- **Guest loot phải dùng loot table** (xem trên) — không hardcode `1 coin`
