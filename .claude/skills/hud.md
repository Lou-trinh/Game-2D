# Skill: HUD (ResourceUI)

## Class: ResourceUI (js/ResourceUI.js)
HUD chính trong MainScene, cập nhật mỗi frame.

## Layout adaptive (mobile vs desktop)
| Element | Mobile | Desktop |
|---------|--------|---------|
| Weapon slots | Center bottom | Bottom-left |
| `bottomOffset` | 24px | 80px |

## API chính

### `updatePlayerHUD()`
Gọi mỗi frame trong MainScene `update()`:
- HP bar fill theo `player.health / player.maxHealth`
- Highlight active weapon slot
- Gọi `updateAmmoUI()`

### `updateAmmoUI()`
Logic theo weapon type:
- Melee → ẩn ammo UI hoàn toàn
- Bomb → hiện quantity (số lượng còn lại)
- Ranged → đổi bullet icon theo category:

| Category | Icon |
|----------|------|
| Handguns, SMG | `bullet_1` |
| Shotguns | `bullet_2` |
| Assault/Sniper/LMG | `bullet_3` |
| Rocket | `bullet_4` |

### `openInventoryPanel()` / `closeInventoryPanel()` / `refreshInventoryPanel()`
Popup "KHO ĐỒ" trong MainScene (khác với Inventory panel trong MenuScene):
- Hiện 4 loại currency: diamonds, coins, frag_common, frag_rare
- Lấy từ `Economy.getDiamonds()` etc.
- Mở/đóng trong game (không cần về Menu)

## Exit Button
Stop MainScene → start MenuScene (không phải navigate(-1)):
```js
this.scene.stop('MainScene');
this.scene.start('MenuScene');
```

## Gotchas
- ResourceUI là class riêng, không phải Phaser Scene — không có `create()` hay `update()` của Phaser
- `updatePlayerHUD()` phải được gọi thủ công từ `MainScene.update()`
- Mobile layout tự detect qua screen width, không qua `isMobile` flag
