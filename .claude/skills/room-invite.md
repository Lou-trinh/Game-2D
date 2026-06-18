# Skill: Room Invite & Multiplayer Lobby

## Flow tạo phòng (Host)
```
"BẮT ĐẦU" → "Chơi 3 người" → showMultiplayerLobby()
→ tạo roomCode 6 ký tự (random base36, uppercase)
→ createRoom(roomCode, myProfile)   — rooms/{code} status='waiting'
→ onRoomPlayersChange listener → render slots
```
Khi có ≥2 players: host thấy nút "Bắt đầu ▶".

## Flow gửi invite
```
Slot trống → "+ Mời bạn" → showFriendsList(inviteLink, roomCode)
→ getFriends(uid) (one-time, tối đa 5 bạn hiển thị)
→ click "Mời" → sendRoomInvite(me.uid, myProfile, friend.uid, roomCode)
   → ghi players/{friend.uid}/roomInvites/{me.uid}
→ toast "✓ Đã gửi lời mời" (2.5s)
```

## Flow nhận invite (Guest)
```
Login → _startRoomInviteListener()
→ onRoomInviteChange(uid) = onSnapshot players/{uid}/roomInvites
→ check _shownInvites Set (key = "{senderUid}_{roomCode}")
→ nếu mới → showRoomInvitePopup(invite)  — depth 300-303
```

**Popup actions**:
- **Xác nhận**: `declineRoomInvite(uid, invite.uid)` (cleanup Firestore) → `closeMultiplayerLobby()` → `showMultiplayerLobby(invite.roomCode)`
- **Từ chối**: `declineRoomInvite(uid, invite.uid)` → đóng popup

⚠️ Cả 2 hành động đều gọi `declineRoomInvite()` — tên hàm gây nhầm nhưng logic đúng (xóa doc khỏi Firestore).

## Flow join phòng (Guest)
```
joinRoom(roomCode, myProfile)  — rooms/{code}/players/{uid}, isHost=false
→ onRoomStatusChange listener
→ khi status === 'started' → auto vào MainScene (không cần thao tác)
```

## Start game (Host)
```
setRoomStatus(roomCode, 'started')
→ registry.set('roomCode', roomCode)
→ registry.set('isMultiplayerHost', true)
→ fade to MainScene
```

## Đóng lobby
```
closeMultiplayerLobby():
  unsub _lobbyUnsub + _lobbyStatusUnsub
  destroy slot elements
  leaveRoom(roomCode, uid)  — xóa khỏi rooms/{code}/players/
```

## Firestore Collections
```
players/{uid}/roomInvites/{senderUid}  — invite: displayName, roomCode, sentAt
rooms/{roomCode}                       — { status: 'waiting'|'started', createdAt }
rooms/{roomCode}/players/{uid}         — { isHost, joinedAt, ...profile }
```

## State variables (MenuScene)
| Biến | Ý nghĩa |
|------|---------|
| `_shownInvites` | Set `{senderUid}_{roomCode}` — chặn popup duplicate |
| `_roomInviteUnsub` | Unsubscribe invite listener |
| `_lobbyUnsub` | Unsubscribe players listener |
| `_lobbyStatusUnsub` | Unsubscribe room status listener |
| `_lobbyRoomCode` | Room code hiện tại (để leaveRoom khi đóng) |
| `_lobbySlotEls` | Array Phaser elements của 3 player slots |
| `lobbyPopup` | Array Phaser objects lobby panel |
| `friendsPopup` | Array Phaser objects friends list |
| `joinPopup` | Array Phaser objects join-by-code popup |

## Gotchas
- **Room code collision**: dùng `Math.random()`, không check trùng với room active
- `_shownInvites` reset khi `_startRoomInviteListener()` gọi lại (re-login) → invite cũ có thể hiện lại
- `showFriendsList` chỉ hiện tối đa **5 bạn** (`slice(0, 5)`)
- Guest tự động chuyển sang MainScene khi `status === 'started'` — không cần UI thêm
- Host là `players[0]` với `isHost === true` — sort theo `joinedAt` ascending
