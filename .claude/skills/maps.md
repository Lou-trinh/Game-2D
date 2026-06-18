# Skill: Maps

## Thực trạng
UI selector hiển thị **6 map** nhưng thực tế chỉ có **1 Tiled map file** (`assets/images/map.json`).
Map 2–6 là UI placeholder, texture chưa load — chưa implement.

## Map hiện tại (Map 1)
- **Tileset**: `assets/images/RPG Nature Tileset.png`, tile size 32×32px
- **Map file**: `assets/images/map.json` (Tiled JSON format)
- **Kích thước**: 30 tiles ngang × 32px = 960px (khớp canvas width)

## Layers (thứ tự render)

| Layer | Depth | Ghi chú |
|-------|-------|---------|
| Ground | default | nền đất, collision tiles |
| Road | default | đường đi |
| Bush | default | bụi cỏ |
| Decor | 500 | trang trí |
| Above | 1000 | trên player |
| Collision (object) | — | `matter.add.rectangle` static, label `'treeCollider'` |

## Collision setup
```js
// Tile-based collision
const groundLayer = map.createLayer('Ground', tileset);
this.matter.world.convertTilemapLayer(groundLayer); // tiles có property collides: true

// Object-based collision (cây, đá)
// object layer 'Collision' → matter.add.rectangle static bodies
```

## Spawn gates
Cố định tại `x=100, y=260` (trái) và `x=860, y=260` (phải) — hardcode trong `MainScene.getSpawnPool()`.

## Load assets
```js
this.load.image('tiles', 'assets/images/RPG Nature Tileset.png');
this.load.tilemapTiledJSON('map', 'assets/images/map.json');
```

## World bounds
```js
this.matter.world.setBounds(0, 0, mapWidth, mapHeight);
// Ngăn player và enemy ra ngoài ranh giới map
```

## Thêm map mới
1. Tạo file Tiled JSON mới, dùng cùng tileset `RPG Nature Tileset`
2. Load trong `SceneLoading.loadFullAssets()` với key mới
3. Cập nhật `MenuScene` map selector: thêm entry với key mới (bỏ `locked`)
4. Trong `MainScene.create()`: đọc `registry.get('selectedMap')` để chọn map file
5. Điều chỉnh spawn gate positions nếu map kích thước khác
