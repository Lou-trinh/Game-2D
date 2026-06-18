# Skill: Death & Revive

## GameOverScene — 3 lựa chọn
Hiện khi player chết trong MainScene.

| Nút | Action |
|-----|--------|
| Restart | Về MainScene, reset lại game |
| Revive | Mở ReviveScene (GameOverScene pause, không stop) |
| Menu | Về MenuScene |

Scene lifecycle:
- ReviveScene active → GameOverScene **pause** (container tween ra ngoài màn hình)
- ReviveScene đóng → GameOverScene **resume** (container tween trở lại)

Button dùng `sprite` + tween yoyo cho hover (khác ui-patterns dùng `rectangle`).

## ReviveScene — Hồi sinh

**Cách 1: Watch Ad** (giả):
```
click "Xem quảng cáo"
→ overlay block toàn bộ input
→ countdown 10 giây
→ mainScene.revivePlayer()
→ scene.stop('ReviveScene') → scene.stop('GameOverScene') → scene.resume('MainScene')
```

**Cách 2: Diamond** (20 💎):
```
click "Hồi sinh (20 💎)"
→ Economy.getDiamonds() >= 20
  → OK: Economy.saveDiamonds(-20) → revivePlayer() → stop cả 2 scene
  → Fail: camera shake + fade-out error text "Không đủ kim cương"
```

Frame hit area trick: rectangle invisible phủ toàn bộ scene, chặn click propagation ra background khi overlay đang hiện.

## revivePlayer() trong Player.js
- Reset HP về max
- Hồi sinh tại vị trí death
- Reset ammo tất cả slots
- Xóa ghost sprite + tween
- Sync `alive: true` lên Firestore (multiplayer)
