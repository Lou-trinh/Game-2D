# Game-2D — CLAUDE.md

## Stack
- **Phaser 3.90** + webpack 5, canvas 960×540, `Phaser.Scale.FIT`
- **Firebase**: Firestore (realtime), Auth (Google OAuth)
- **Deploy**: GitHub Actions → gh-pages → Cloudflare Pages (Workers)
- **URL**: https://survival-game-2d.loutrinh2312000.workers.dev

## Cấu trúc file quan trọng
```
js/
  firebase.js        — tất cả Firestore/Auth functions
  MenuScene.js       — lobby, friends, room invite, multiplayer UI
  MainScene.js       — gameplay, multiplayer sync (positions, enemies, death)
  SceneLoading.js    — login screen, auth flow
  survival-game.js   — Phaser game entry, scene registry
.github/workflows/deploy.yml  — CI/CD pipeline
```

## Firebase config
Hardcode trực tiếp trong `js/firebase.js` (Firebase web key thiết kế để public, đã restrict domain):
- Project: `survival-game-4c7b4`
- Auth domain: `survival-game-4c7b4.firebaseapp.com`
- Key đã rotate ngày 18/6/2026, không dùng `process.env` nữa

## Firestore collections
```
players/{uid}                        — profile, displayNameLower
players/{uid}/friends/{uid}          — friend list
players/{uid}/requests/{uid}         — friend requests
players/{uid}/roomInvites/{fromUid}  — room invite notifications
rooms/{code}                         — { status: 'waiting'|'started' }
rooms/{code}/players/{uid}           — lobby players (isHost, joinedAt)
rooms/{code}/playerStates/{uid}      — realtime position/anim sync
rooms/{code}/gameState/main          — host-authoritative enemy positions
```

## Multiplayer architecture
- **Host-authoritative**: host chạy enemy AI, broadcast positions mỗi 400ms
- **Guest**: tắt spawn timer, đọc enemy từ Firestore `onGameStateChange`
- **Player sync**: `updatePlayerState` mỗi 300ms (x, y, flipX, animKey, alive, health)
- **Game start**: host gọi `setRoomStatus('started')`, guests lắng nghe `onRoomStatusChange`
- **Death sync**: ghost sprite (texture 'ghost', scale 0.3, floating tween), sync `alive: false`

## Login flow — iOS Safari
`signInWithPopup` (KHÔNG dùng `signInWithRedirect` — iOS ITP block).
Mobile dùng HTML button thật (không phải Phaser Zone) để giữ gesture trust cho `window.open`.
Button vị trí tính theo `canvas.getBoundingClientRect()` + canvas scale.
`orientationchange` listener với 350ms delay để iOS layout settle trước khi reposition.

## Deploy pipeline
```
git push main
→ GitHub Actions: npm install + webpack build → dist/
→ Thêm package.json + wrangler.toml vào dist/ bằng echo commands (KHÔNG dùng heredoc — YAML indent break terminator)
→ peaceiris/actions-gh-pages push dist/ → gh-pages branch
→ Cloudflare Pages watch gh-pages → wrangler deploy
```
**Quan trọng**: git push dùng PowerShell tool (Bash tool hang vô tận trên Windows do credential popup).

## Các lỗi đã gặp & fix
- **ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND**: dist/ thiếu package.json — fix bằng echo commands trong deploy.yml
- **iOS login không được**: signInWithRedirect bị ITP block → dùng signInWithPopup + HTML button
- **Popup button lệch vị trí sau xoay màn hình**: resize event fire trước khi layout settle → dùng double requestAnimationFrame + orientationchange với setTimeout 350ms
- **API_KEY_HTTP_REFERRER_BLOCKED**: restrict domain Google Cloud block cả internal Firebase domains → bỏ restriction
- **YAML heredoc bug**: `cat << 'EOF'` trong `run: |` bị YAML indentation thêm spaces trước EOF terminator → dùng echo commands

## Không làm
- KHÔNG dùng `signInWithRedirect` trên mobile
- KHÔNG hardcode route trong nút back (dùng `navigate(-1)`)
- KHÔNG restrict API key domain (block internal Firebase auth calls)
- KHÔNG dùng Bash tool cho git push (dùng PowerShell tool)
