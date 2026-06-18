# Skill: Gameplay Systems (MainScene)

## Tilemap
```
Tiled JSON → layers: Ground / Road / Bush / Decor / Above
Collision: thuộc tính `collides: true` trên tile properties
Spawn points: Object layer tên "Spawn"
```

## Enemy spawn system
**2 cổng spawn cố định**: `(100, 260)` và `(860, 260)`, alternating trái/phải.

**9 phases theo elapsed time** (0–200 giây), mỗi phase thay đổi pool và interval:
```js
// getSpawnPool(elapsed) trả về weighted array
// Ví dụ: [{ type: 'slime', weight: 5 }, { type: 'orc', weight: 2 }]
// Interval giảm dần từ 1500ms xuống ~600ms ở phase cuối
```

**Multiplayer spawn**:
- Host: spawn bình thường, gán `mpId` (counter tăng dần), sync lên Firestore
- Guest: nhận enemy state từ Firestore, render sprite với `mpId` để match

## Depth sorting (y-based)
```js
// update() loop — mọi entity đều dùng pattern này
player.setDepth(player.y);
enemies.forEach(e => e.setDepth(e.y));
items.forEach(i => i.setDepth(i.y));
```
Entity nào ở dưới màn hình (y lớn hơn) sẽ render trên top — giống top-down 2D perspective.

## Item pickup (magnet + pickup range)
```js
// Trong update():
items.forEach(item => {
    const dist = Phaser.Math.Distance.Between(player.x, player.y, item.x, item.y);
    if (dist < 30) {  // magnet range
        // tween fly về phía player
    }
    if (dist < 20) {  // pickup range
        const type = item.getData('itemType'); // 'coin', 'exp', 'diamond'
        // áp dụng effect, destroy item
    }
});
```

## Multiplayer cleanup lifecycle
```js
_cleanupMultiplayer() {
    // 1. Clear timers (enemy sync, player sync)
    // 2. Unsub tất cả Firestore listeners
    // 3. Destroy remote player sprites + name texts
    // 4. removePlayerState(roomCode, uid) — xóa khỏi Firestore
}
// Gọi trong cả shutdown() và destroy()
```
Nếu bỏ qua cleanup, Firestore listeners tiếp tục fire sau khi scene đóng.

## Arrays (không dùng Phaser Group)
Project dùng plain JS arrays, không phải `Phaser.GameObjects.Group`:
```js
this.summonedMonsters = [];  // enemies
this.items = [];             // drops
this.stones = [];            // obstacles
```
`update()` phải filter dead objects thủ công:
```js
this.summonedMonsters = this.summonedMonsters.filter(m => m.active);
```
