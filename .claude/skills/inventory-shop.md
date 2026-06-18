# Skill: Inventory & Shop

## Inventory Panel (Kho đồ)
Mở: click "🎒 KHO ĐỒ" → `openInventoryPanel()`, panel 490×300.

**Tab Mảnh** (`frags`): hiển thị `frag_common` + `frag_rare` với count từ `Economy.getFragCommon/Rare()`. Click → tooltip. Chỉ xem, không action.

**Tab Vũ khí** (`weapons`): `Economy.getOwnedWeapons()` → list owned. Click → `_showWeaponInfo()` với stats (damage, maxAmmo, range, fireRate). Không equip tại đây — equip qua weapon slot panel.

`_weaponInfoKey` track tooltip đang mở — click lại cùng weapon thì toggle ẩn.

## Weapon Slots + Equip

**4 slots**, mỗi slot có categories hợp lệ:
| Slot | Categories |
|------|-----------|
| slot1 | Handguns, Melee |
| slot2 | SMG, Shotguns, Assault Rifles |
| slot3 | Sniper, LMG, Rocket |
| slot4 | Bomb |

**Defaults (player_1)**: slot1=Glock_17, slot2=MP5, slot4=Grenade

**Equip flow**:
```
Click slot → showWeaponSelection(categoryId, slotKey)
→ popup scrollable (owned weapons + unowned để mua)
→ click owned → equipWeapon(slotKey, key)
→ Economy.saveEquippedWeapons({...}) → localStorage
→ updateWeaponList() rebuild slots
```

**Mua trong popup**: `Economy.getDiamonds() >= price` → `Economy.ownWeapon()` + `Economy.saveDiamonds()` → rebuild popup (giữ `initialScrollY`).

**Purge logic**: `updateWeaponList()` tự xóa slot nếu weapon không còn owned:
```js
if (!Economy.isWeaponOwned(equipped[slot])) delete equipped[slot];
```

## Shop (SceneShop)
Launch song song MenuScene (không stop):
```js
this.scene.launch('SceneShop'); // cả 2 scene chạy cùng lúc
this.scene.stop('SceneShop');   // đóng
```
- Sidebar trái: chọn category → `refreshWeaponGrid()` → grid 3 cột
- Nút "ĐÃ CÓ" (xanh) nếu owned; giá kim cương (cam) nếu chưa
- `isDragging` flag ngăn click mua ngẫu nhiên khi đang scroll
- ⚠️ `showWeaponSelection` trong MenuScene cũng cho mua — duplicate với SceneShop

## Economy (localStorage keys)
| Key | Nội dung |
|-----|---------|
| `total_diamonds` | Số kim cương |
| `total_coins` | Số xu |
| `owned_weapons` | JSON array weapon keys đã sở hữu |
| `equipped_weapons` | JSON object `{slot1, slot2, slot3, slot4}` |
| `frag_common`, `frag_rare` | Số mảnh |
| `player_exp`, `player_level` | Exp và level |

## Gotchas
- Inventory chỉ **xem** stats, không equip — user hay nhầm
- SceneShop và MenuScene cùng chạy song song → cẩn thận input conflict
- Economy là localStorage-only, không sync giữa thiết bị, reset khi clear browser data
