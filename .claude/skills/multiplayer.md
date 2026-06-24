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
4. Guest bấm **Sẵn sàng** → `updatePlayerInRoom(rc, uid, { ready: true })`
5. Host bấm **Bắt đầu** (chỉ enable khi `allGuestsReady`) → `setRoomStatus('started')` → guests vào game
6. Trong game: `onOtherPlayersChange` sync vị trí real-time

## Ready system (MenuScene.js)
- Guest thấy nút "Sẵn sàng" / "Đã sẵn sàng" — toggle `ready` trong Firestore
- Host thấy nút "Bắt đầu" — chỉ clickable khi `allGuestsReady = players.filter(p => !p.isHost).every(p => p.ready)`
- Nếu có guest chưa ready → hiện text cảnh báo "Còn người chơi chưa sẵn sàng"

## Host migration (firebase.js leaveRoom)
- `leaveRoom(rc, uid)` → xóa player → nếu `wasHost` → tự gọi `promoteRoomHost(rc)`
- `promoteRoomHost`: sort by `joinedAt`, người vào sớm nhất thành host mới
- Cập nhật `isHost` cho tất cả players + `rooms/{code}.hostUid`

## Room invite
- `sendRoomInvite(fromUid, fromProfile, toUid, roomCode)` → lưu vào `players/{toUid}/roomInvites/{fromUid}`
- `onRoomInviteChange(uid, cb)` — realtime listener
- `declineRoomInvite(uid, fromUid)` — xoá invite

## hostLeft flow
1. Host thoát game (về sảnh hoặc đóng tab) → `updateGameState(rc, { hostLeft: true })` trước khi `leaveRoom`
2. Guest detect → set `_hostLeft = true`, dừng nhận broadcast
3. **Cleanup**: stale remote player sprites (host HP bar, sprite) bị xóa khỏi map
4. Guest tự chạy AI cho `_guestEnemySprites` (xem chi tiết trong `monsters.md` — mục **hostLeft**)
5. `_localSpawnTimer` spawn thêm enemy mỗi 1500ms từ pool 9 loại
6. Khi guest chết → về sảnh: `inGame: false, ready: false` reset trong Firestore → lobby không còn hiện host "đang chơi"

**Trigger points**:
- `btn1Action` (Back to lobby): `updateGameState({ hostLeft: true })` → `setRoomStatus('waiting')` → `leaveRoom`
- `btn2Action` (Quit entirely): `updateGameState({ hostLeft: true })` → `leaveRoom` → về MenuScene
- `_cleanupMultiplayer`: safety net khi scene destroy

**Lưu ý quan trọng**: enemy Firestore-synced và locally spawned có `_dmg/_range` khác nhau
→ luôn dùng `_mpType` để nhận diện loại enemy, không dùng `_dmg === 0`

## Files
- `js/MenuScene.js` — lobby UI, friend system, room invite
- `js/MainScene.js` — gameplay, sync enemies + players, death handling
- `js/firebase.js` — tất cả Firestore functions
