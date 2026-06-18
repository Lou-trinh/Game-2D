# Skill: iOS Safari Login

## Vấn đề cốt lõi
iOS Safari ITP (Intelligent Tracking Prevention) block `signInWithRedirect` vì dùng domain trung gian `firebaseapp.com`.
Phaser Zone `pointerdown` không có gesture trust đủ để gọi `window.open` (popup bị block).

## Giải pháp
Dùng `signInWithPopup` + **HTML button thật** (DOM click event có gesture trust).

## Implementation (js/SceneLoading.js)
Mobile path trong `_showLoginPopup()`:
```js
const canvas = this.game.canvas;
const htmlBtn = document.createElement('button');
const doSync = () => {
    const r = canvas.getBoundingClientRect();
    const sx = r.width / this.scale.width;
    const sy = r.height / this.scale.height;
    Object.assign(htmlBtn.style, {
        left:   `${r.left + (cx - btnW / 2) * sx}px`,
        top:    `${r.top  + (btnY - btnH / 2) * sy}px`,
        width:  `${btnW * sx}px`,
        height: `${btnH * sy}px`,
        fontSize: `${Math.round(15 * Math.min(sx, sy))}px`,
    });
};
const syncPos = () => { requestAnimationFrame(() => requestAnimationFrame(doSync)); };
const syncOrientation = () => { setTimeout(doSync, 350); };
// position: fixed, zIndex: 9999, touchAction: manipulation
window.addEventListener('resize', syncPos);
window.addEventListener('orientationchange', syncOrientation);
```

## Gotchas
- `resize` event fire trước khi iOS layout settle → double `requestAnimationFrame`
- `orientationchange` fire trước khi layout settle → `setTimeout(350ms)`
- Phải `btnBg.destroy()` + `btnTxt.destroy()` để tránh hiện 2 nút cùng lúc
- Cleanup trong `_hideLoginPopup()`: remove event listeners + remove HTMLElement

## Không làm
- KHÔNG dùng `signInWithRedirect` trên mobile
- KHÔNG dùng Phaser Zone/pointerdown để trigger popup
- KHÔNG restrict API key domain (block internal Firebase auth calls)
