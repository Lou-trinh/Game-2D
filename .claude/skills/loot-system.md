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

## Gotcha
- Items dùng plain array `this.items[]`, không phải Phaser Group
- Phải `filter(i => i.active)` mỗi frame để cleanup items đã pickup
- Magnet effect dùng tween, không phải physics — item không va chạm với obstacle khi bay về player
