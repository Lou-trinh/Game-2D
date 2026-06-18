# Skill: Friends System

## Flow tổng quan
```
Login → _startFriendRequestListener() (Firestore onSnapshot)
Click "👥 BẠN BÈ" → openFriendsPanel() → _buildFriendsPanel()
```
Panel có 3 tab, tab mặc định = `'requests'`. Tab state persist qua `_friendsPanelTab` (không reset khi đóng/mở lại).

## Tab Yêu cầu
- Dùng `this._pendingRequests` — duy trì bởi real-time listener, không fetch lại
- **Chấp nhận**: `acceptFriendRequest(myUid, myProfile, req.uid, req)` → ghi cả 2 phía vào `friends/`, xóa `requests/`
- **Từ chối**: `declineFriendRequest(myUid, req.uid)` → xóa doc trong `requests/`
- Listener tự rebuild panel khi có thay đổi — nhưng **chỉ khi đang ở tab `'requests'`**

## Tab Bạn bè
- `getFriends(uid)` — one-shot, **không real-time** (stale đến khi mở lại tab)
- **Xóa bạn**: `removeFriend(myUid, friend.uid)` → xóa cả 2 phía

## Tab Tìm kiếm
- DOM `<input>` thêm vào `document.body` (cần `stopPropagation` mousedown/pointerdown)
- `searchPlayers(q, uid)` → Firestore range query trên `displayNameLower`, tối đa 4 kết quả
- **Kết bạn**: `sendFriendRequest(myUid, myProfile, found.uid)`
- ⚠️ **Bug đã biết**: query `where('displayNameLower', '<=', lower + '')` — `lower + ''` bằng `lower`, chỉ match exact thay vì prefix. Đúng phải là `lower + ''`

## Firestore Collections
```
players/{uid}                    — profile: uid, displayName, displayNameLower, photoURL
players/{uid}/requests/{sender}  — incoming friend requests
players/{uid}/friends/{friend}   — friends list
```

## State variables (MenuScene)
| Biến | Ý nghĩa |
|------|---------|
| `_friendsPanelTab` | Tab active, persist qua open/close |
| `_pendingRequests` | Array requests từ listener |
| `_friendRequestUnsub` | Unsubscribe hàm |
| `friendsPanel` | Array Phaser objects (null = đóng) |
| `_friendBadgeBg/_friendBadgeText` | Badge đỏ trên nút bạn bè |

## Badge notification
- Tạo trong `createFriendsButton()` tại `x+50, y-16`
- Hiện số request pending, radius 8 (≤9) hoặc 10 (>9)
- Lifecycle: start on login, cleanup on scene destroy/shutdown

## Gotchas
- Panel **rebuild hoàn toàn** mỗi khi chuyển tab (destroy all → recreate)
- Real-time listener chỉ trigger rebuild khi tab = `'requests'`; tab bạn bè và tìm kiếm không live-update
- Cleanup listener trong cả `destroy()` và `shutdown()` event
