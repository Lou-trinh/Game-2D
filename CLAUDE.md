# Game-2D — CLAUDE.md

## Stack
- **Phaser 3.90** + webpack 5, canvas 960×540, `Phaser.Scale.FIT`
- **Firebase**: Firestore (realtime), Auth (Google OAuth)
- **Deploy**: GitHub Actions → gh-pages → Cloudflare Pages (Workers)
- **URL**: https://survival-game-2d.loutrinh2312000.workers.dev
- **Repo**: https://github.com/Lou-trinh/Game-2D

## Cấu trúc file quan trọng
```
js/
  firebase.js        — tất cả Firestore/Auth functions
  MenuScene.js       — lobby, friends, room invite, multiplayer UI
  MainScene.js       — gameplay, multiplayer sync (positions, enemies, death)
  SceneLoading.js    — login screen, auth flow
  survival-game.js   — Phaser game entry, scene registry
.github/workflows/deploy.yml  — CI/CD pipeline
.claude/skills/               — skill files chi tiết (đọc theo task)
```

## Skills chi tiết
| File | Nội dung |
|------|----------|
| `.claude/skills/firebase.md` | Firebase config, Firestore schema, Auth functions |
| `.claude/skills/multiplayer.md` | Host-authoritative architecture, room flow, player sync |
| `.claude/skills/ios-login.md` | iOS Safari login, HTML button positioning, gotchas |
| `.claude/skills/deploy.md` | Deploy pipeline, git push rules, YAML gotchas |
| `.claude/skills/errors.md` | Các lỗi đã gặp và cách fix |
| `.claude/skills/scenes.md` | Phaser config, scene registry, pass data qua Registry |
| `.claude/skills/ui-patterns.md` | Panel array-destroy, button pattern, DOM input, `_domPos()` |
| `.claude/skills/gameplay.md` | Enemy spawn phases, depth sorting, tilemap, item pickup |
| `.claude/skills/economy.md` | localStorage economy, weapon ownership, inventory slots |
| `.claude/skills/characters.md` | Danh sách nhân vật, stats, asset loading, flow chọn nhân vật |
| `.claude/skills/weapons.md` | 55 vũ khí, categories, fields, storage, gotchas |
| `.claude/skills/monsters.md` | 10 loại quái, stats, spawn phases, collision, multiplayer |
| `.claude/skills/maps.md` | Tiled map, layers, collision, spawn gates, thêm map mới |
| `.claude/skills/animations.md` | Animation keys, frames, frameRate, trigger logic cho player + 10 quái |
| `.claude/skills/friends.md` | Friends panel (3 tab), Firestore, badge, listener lifecycle |
| `.claude/skills/inventory-shop.md` | Inventory xem stats, weapon slots equip, SceneShop mua, Economy localStorage |
| `.claude/skills/room-invite.md` | Tạo phòng, gửi/nhận invite, lobby flow, start game, state variables |
| `.claude/skills/death-revive.md` | GameOverScene (3 lựa chọn), ReviveScene (ad + diamond), revivePlayer() |
| `.claude/skills/player-skills.md` | skill_2 portal teleport, surf trail, CharacterSelectScene UI |
| `.claude/skills/input-controls.md` | Keyboard mapping, mobile joystick/buttons, camera, collision categories |
| `.claude/skills/loot-system.md` | dropLoot, item types, magnet pickup, Chest spawn + open flow |
| `.claude/skills/combat-effects.md` | AoE grenade/bomb, fire/electric zone, DoT, visual effects, audio keys |
| `.claude/skills/hud.md` | ResourceUI API, HP bar, ammo icons, inventory popup, mobile vs desktop layout |

## Không làm
- KHÔNG dùng `signInWithRedirect` trên mobile
- KHÔNG restrict API key domain (block internal Firebase auth calls)
- KHÔNG dùng Bash tool cho git push (dùng PowerShell tool)
- KHÔNG sửa thứ đang chạy đúng nếu không được yêu cầu
