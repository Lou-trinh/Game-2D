# Skill: Economy & Inventory

## Storage
Toàn bộ economy dùng **localStorage** (không lưu Firestore):
```js
Economy.getCoins()           // localStorage key: 'coins'
Economy.getDiamonds()        // localStorage key: 'diamonds'
Economy.getOwnedWeapons()    // localStorage key: 'owned_weapons' (JSON array)
```
Equipped weapons: `localStorage.getItem('equipped_weapons')` — JSON array tối đa 3 slot.

## Weapon ownership check
```js
const owned = Economy.getOwnedWeapons(); // ['sword', 'bow', ...]
const isOwned = owned.includes(weaponKey);
// Nếu chưa sở hữu → show mua, nếu đã có → show equip
```

## Inventory panel (MenuScene)
- Tab **Mảnh** (fragments) và **Vũ khí** (weapons)
- Weapon thumbnail: tạo on-demand bằng `generateTexture()` từ Graphics
- Tối đa **3 weapon slots** ở LeftPanel (index 0–2)
- Slot state lưu trong `equipped_weapons` array

## SceneShop
- Scene riêng (`SceneShop`), mount cùng lúc với game init
- Mở bằng `this.scene.launch('SceneShop')` (chạy song song với MenuScene, không stop)
- Đóng bằng `this.scene.stop('SceneShop')`

## Gotchas
- Economy là localStorage-only — reset khi clear browser data, không sync giữa thiết bị
- Không có backend validation — economy có thể bị user modify qua DevTools
