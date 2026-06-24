# Skill: Known Errors & Fixes

## ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND
**Cause**: dist/ thiếu `package.json`
**Fix**: Thêm echo command trong deploy.yml để tạo package.json trong dist/

## iOS login không được (signInWithRedirect)
**Cause**: iOS Safari ITP block redirect qua domain trung gian `firebaseapp.com`
**Fix**: Dùng `signInWithPopup` + HTML button thật (xem `ios-login.md`)

## Popup button lệch vị trí sau xoay màn hình
**Cause**: `resize` và `orientationchange` event fire trước khi iOS layout settle
**Fix**: double `requestAnimationFrame` cho resize, `setTimeout(350ms)` cho orientationchange

## API_KEY_HTTP_REFERRER_BLOCKED
**Cause**: Restrict domain Google Cloud block cả internal Firebase domains (`survival-game-4c7b4.firebaseapp.com`)
**Fix**: Bỏ tất cả domain restriction trong Google Cloud Console → API Keys

## YAML heredoc bug
**Cause**: `cat << 'EOF'` trong `run: |` bị YAML parser thêm spaces trước EOF terminator
**Fix**: Dùng `echo` commands thay vì heredoc

## 2 nút login hiện cùng lúc (mobile)
**Cause**: Tạo HTML button nhưng chưa destroy Phaser canvas button
**Fix**: Gọi `btnBg.destroy()` + `btnTxt.destroy()` trước khi tạo HTML button

## GitHub Secret Scanning alert
**Cause**: API key hardcode trong git history
**Fix**: Rotate key trong Google Cloud Console → cập nhật `js/firebase.js` → dismiss alert trên GitHub

## Ghost enemies xuất hiện khi bắt đầu game mới (multiplayer)
**Cause**: Firestore `gameState/main` từ trận cũ còn `hostLeft: true` → guest vừa vào game đã trigger `_hostLeft = true` ngay lập tức
**Fix**: So sánh `state.updatedAt` với `this._gameStartedAt` (set khi enter MainScene):
```js
if ((state.updatedAt || 0) < (this._gameStartedAt || 0)) return; // skip stale data
```

## Stale enemy data flash trên màn guest khi bắt đầu game mới
**Cause**: Firestore `gameState/main` cũ còn enemy positions → render flash trước khi host ghi data mới
**Fix**: Cùng guard `updatedAt >= _gameStartedAt` ở đầu `onGameStateChange` callback
