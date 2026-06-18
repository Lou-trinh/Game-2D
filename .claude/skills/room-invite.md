# Skill: Room Invite & Multiplayer Lobby

## Flow tạo phòng (Host)
```
"BẮT ĐẦU" → "Chơi 3 người" → showMultiplayerLobby()
→ tạo roomCode 6 ký tự (random base36, uppercase)
→ renderSlots([optimistic host]) ngay lập tức (không chờ Firestore)
→ createRoom(roomCode, myProfile)  — rooms/{code} status='waiting'
→ onRoomPlayersChange listener (skip callback nếu players.length === 0)
```
Khi có ≥2 players: host thấy nút "Bắt đầu ▶".

## Flow gửi invite
```
Slot trống → "+ Mời bạn" → showFriendsList(inviteLink, roomCode)
→ getFriends(uid) (one-time, tối đa 5 bạn hiển thị)
→ click "Mời" → button disable + hiện "..."
→ sendRoomInvite(me.uid, myProfile, friend.uid, roomCode)
   → ghi players/{friend.uid}/roomInvites/{me.uid}
→ thành công: toast xanh "✓ Đã gửi"
→ thất bại:  toast đỏ "✗ Gửi thất bại, thử lại"
```

## Flow nhận invite (Guest)
```
Login → onAuthChange → try { await Economy.syncFromCloud() } catch {} 
→ _startRoomInviteListener()
→ onRoomInviteChange(uid) = onSnapshot players/{uid}/roomInvites (snap.docs.map)
→ check _shownInvites Set (key = "{senderUid}_{roomCode}_{sentAt}")
→ nếu mới → showRoomInvitePopup(invite)  — depth 300-303
```

**Popup actions**:
- **Xác nhận**: `declineRoomInvite(uid, invite.uid)` (cleanup Firestore) → `closeMultiplayerLobby()` → `showMultiplayerLobby(invite.roomCode)`
- **Từ chối**: `declineRoomInvite(uid, invite.uid)` → đóng popup

⚠️ Cả 2 hành động đều gọi `declineRoomInvite()` — tên hàm gây nhầm nhưng logic đúng (xóa doc khỏi Firestore).

## Flow join phòng (Guest)
```
joinRoom(roomCode, myProfile)  — rooms/{code}/players/{uid}, isHost=false
→ onRoomPlayersChange listener (thấy host + self ngay)
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
players/{uid}/roomInvites/{senderUid}  — { uid, displayName, photoURL, roomCode, sentAt }
rooms/{roomCode}                       — { status: 'waiting'|'started', createdAt }
rooms/{roomCode}/players/{uid}         — { isHost, joinedAt, ...profile }
```

## State variables (MenuScene)
| Biến | Ý nghĩa |
|------|---------|
| `_shownInvites` | Set `{senderUid}_{roomCode}_{sentAt}` — chặn popup duplicate |
| `_roomInviteUnsub` | Unsubscribe invite listener |
| `_lobbyUnsub` | Unsubscribe players listener |
| `_lobbyStatusUnsub` | Unsubscribe room status listener |
| `_lobbyRoomCode` | Room code hiện tại (để leaveRoom khi đóng) |
| `_lobbySlotEls` | Array Phaser elements của 3 player slots |
| `lobbyPopup` | Array Phaser objects lobby panel |
| `friendsPopup` | Array Phaser objects friends list |
| `joinPopup` | Array Phaser objects join-by-code popup |

## Gotchas & bugs đã fix

- **⚠️ CRITICAL — intermittent invite**: `_startRoomInviteListener()` nằm sau `await Economy.syncFromCloud()`. Nếu syncFromCloud throw (network lỗi / Firestore timeout), listener không được gọi → bạn không nhận invite. Fix: `try { await Economy.syncFromCloud() } catch {}`.

- **Listener dùng `snap.docs.map()`** (không phải `docChanges()`): đảm bảo không bỏ sót event khi Firestore reconnect hoặc metadata-only update.

- **`_shownInvites` key có `sentAt`**: cho phép host gửi lại invite cùng room → popup mới hiện ra (sentAt khác nhau).

- **Optimistic render host slot**: `renderSlots([localProfile])` trước khi `createRoom` resolve → tránh all-slots-blank. Listener skip callback nếu `players.length === 0`.

- **Host không thấy guest join**: listener `onRoomPlayersChange` phải start NGAY (không đợi createRoom `.then()`), chỉ skip empty snapshot.

- **Room code collision**: dùng `Math.random()`, không check trùng với room active (chấp nhận được với 36^6 combo).

- **Guest tự động vào MainScene** khi `status === 'started'` — không cần UI thêm.

- **Host là `players[0]`** với `isHost === true` — sort theo `joinedAt` ascending.
