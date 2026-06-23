# Skill: Multiplayer

## Architecture
- **Host-authoritative**: host chạy enemy AI, broadcast enemy positions mỗi **400ms** qua `updateGameState`
- **Guest**: tắt spawn timer, đọc enemy từ Firestore `onGameStateChange`
- **Player sync**: `updatePlayerState` mỗi **300ms** — fields: `x, y, flipX, animKey, alive, health`
- **Game start**: host gọi `setRoomStatus('started')`, guests lắng nghe `onRoomStatusChange`
- **Death sync**: set `alive: false` trong playerState, hiện ghost sprite (texture `'ghost'`, scale 0.3, floating tween)

## Room flow
1. Host tạo room → `createRoom(roomCode, profile)` → status: `'waiting'`
2. Guest join → `joinRoom(roomCode, profile)`
3. Cả hai lắng nghe `onRoomPlayersChange` để hiện lobby
4. Host start → `setRoomStatus('started')` → guests nhận callback → vào game
5. Trong game: `onOtherPlayersChange` sync vị trí real-time

## Room invite
- `sendRoomInvite(fromUid, fromProfile, toUid, roomCode)` → lưu vào `players/{toUid}/roomInvites/{fromUid}`
- `onRoomInviteChange(uid, cb)` — realtime listener
- `declineRoomInvite(uid, fromUid)` — xoá invite

## hostLeft flow
1. Host thoát game (chết hoặc về sảnh) → xóa `gameState` Firestore
2. Guest detect → set `_hostLeft = true`, dừng nhận broadcast
3. Guest tự chạy AI cho `_guestEnemySprites` (xem chi tiết trong `monsters.md` — mục **hostLeft**)
4. `_localSpawnTimer` spawn thêm enemy mỗi 1500ms từ pool 9 loại

**Lưu ý quan trọng**: enemy Firestore-synced và locally spawned có `_dmg/_range` khác nhau
→ luôn dùng `_mpType` để nhận diện loại enemy, không dùng `_dmg === 0`

## Files
- `js/MenuScene.js` — lobby UI, friend system, room invite
- `js/MainScene.js` — gameplay, sync enemies + players, death handling
- `js/firebase.js` — tất cả Firestore functions
