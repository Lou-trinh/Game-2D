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

## Files
- `js/MenuScene.js` — lobby UI, friend system, room invite
- `js/MainScene.js` — gameplay, sync enemies + players, death handling
- `js/firebase.js` — tất cả Firestore functions
