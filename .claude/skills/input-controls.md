# Skill: Input Controls

## Keyboard (Player.js)
| Key | Action |
|-----|--------|
| WASD / Arrow keys | Di chuyển |
| Space (held) | Bắn liên tục |
| 1 / 2 / 3 / 4 | Switch weapon slot |
| R | Reload |
| Mouse click | Xác định `lastAttackAngle` + flip player, không trigger bắn |

## Mobile Controls (MobileControls.js)
Auto-show khi: Android/iOS, hoặc `innerWidth <= 900`, hoặc `ontouchstart` tồn tại.

Depth 30000–30001, `setScrollFactor(0)` — luôn ở góc màn hình.

### Virtual Joystick
- `base` circle + `knob` circle, track `pointerId` để hỗ trợ multi-touch
- Knob clamp trong `radius = 72px`
- Set `player.mobileMoveVector` (vector normalized) mỗi frame

### 3 Buttons
| Button | Action |
|--------|--------|
| FIRE (held) | `player.mobileFireHeld = true` |
| R | Reload |
| SW | `switchToNextWeapon()` — tìm slot tiếp theo có vũ khí, wrap-around 4 slots |

### Flags trên Player
```js
player.mobileMoveVector = { x, y }  // joystick direction
player.mobileFireHeld = true/false  // fire button held state
```

## Camera (MainScene)
```js
this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);
this.cameras.main.startFollow(player, true, 0.1, 0.1); // lerp mượt
```
Không có shake ngoài ReviveScene (diamond fail → camera shake).

## Orientation Lock (orientation.js)
Chỉ chạy trên touch device (`pointer: coarse` hoặc `ontouchstart`).

```
first pointerdown/touchstart (once)
→ document.documentElement.requestFullscreen()
→ screen.orientation.lock('landscape')  // best-effort, có thể bị reject
```

Overlay `#rotate-device` (CSS): toggle class `is-portrait` trên `<html>` khi phát hiện portrait mode. Listeners: `orientationchange` + `resize`.

Lỗi fullscreen/orientation bị **silent-catch** — không throw ra ngoài (browser reject ngoài trusted gesture).

## Collision Categories (Matter.js)
| Entity | category | collidesWith |
|--------|----------|-------------|
| Player | `0x0001` | `[0x0002]` enemy |
| Enemy/Chest | `0x0002` | `[0x0001]` player |
| IceMonster (ally) | `0x0004` | `[0x0000]` không gì cả |
| Static obstacles | — | không có filter (collision với tất cả) |
