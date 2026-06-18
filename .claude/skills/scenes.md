# Skill: Scenes & Phaser Config

## Phaser Game config (js/survival-game.js)
```js
{
  type: Phaser.AUTO,
  width: 960, height: 540,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  pixelArt: true, roundPixels: true,
  physics: { default: 'matter', matter: { gravity: { x:0, y:0 } } },
  activePointers: 5,  // multitouch
  plugins: { scene: [PhaserMatterCollisionPlugin] },
}
```
- **Gravity = 0**: top-down game, không phải platformer
- `setupLandscapeOrientation()` chạy ngay khi init (file `js/orientation.js`)

## Scene registry (thứ tự load)
```
SceneLoading → MenuScene → CharacterSelectScene → MainScene → GameOverScene → ReviveScene → SceneShop
```
- Tất cả scene mount 1 lần lúc game init, không lazy-load riêng
- Chuyển scene dùng `this.scene.start('MenuScene')` / `this.scene.stop('MainScene')`

## Pass data giữa scenes
Dùng Phaser Registry (không phải global variable):
```js
// Set (ở scene nguồn)
this.registry.set('selectedCharacter', charKey);
this.registry.set('roomCode', code);
this.registry.set('isMultiplayerHost', true);

// Get (ở scene đích)
const char = this.registry.get('selectedCharacter');
```
Keys quan trọng: `selectedCharacter`, `roomCode`, `isMultiplayerHost`

## Auth flow trong SceneLoading (3 lớp fallback)
```
onAuthChange listener (primary)
  ↓ nếu không fire ngay
checkRedirectResult() (mobile redirect fallback)
  ↓ nếu vẫn null
auth.currentUser (session đã tồn tại)
```
`started` flag + `proceed()` idempotent — đảm bảo không gọi double khi nhiều path fire cùng lúc.
