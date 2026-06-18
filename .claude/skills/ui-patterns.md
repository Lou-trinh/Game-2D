# Skill: UI Patterns (MenuScene)

## Panel array-destroy pattern
Mọi panel/popup dùng array để track Phaser objects:
```js
// Mở panel
this.friendsPanel = [];
const bg = this.add.graphics(...);
this.friendsPanel.push(bg);
// ... push tất cả elements vào array

// Đóng panel
this._closeFriendsPanel() {
    this.friendsPanel?.forEach(e => e.destroy());
    this.friendsPanel = null;
}
```
Cleanup trong cả `destroy()` và `shutdown()` event — không chỉ 1 trong 2.

## Button pattern (graphics + hit zone tách biệt)
```js
const btn = this.add.graphics();
btn.fillStyle(0x1d4ed8).fillRoundedRect(x, y, w, h, 10);

const hit = this.add.rectangle(x + w/2, y + h/2, w, h)
    .setInteractive({ cursor: 'pointer' });
hit.on('pointerover', () => { btn.clear(); btn.fillStyle(0x2563eb)...; });
hit.on('pointerout',  () => { btn.clear(); btn.fillStyle(0x1d4ed8)...; });
hit.on('pointerdown', () => { /* action */ });
```
Graphics (visual) và Rectangle (hit zone) luôn tách biệt để dễ redraw hover state.

## DOM input trong Phaser canvas
```js
const input = document.createElement('input');
input.addEventListener('mousedown', e => e.stopPropagation());
input.addEventListener('pointerdown', e => e.stopPropagation());
// Thiếu stopPropagation → Phaser bắt event → input mất focus ngay lập tức
```

## `_domPos()` helper — convert Phaser coords → CSS fixed position
```js
_domPos(px, py, pw, ph) {
    const r = this.game.canvas.getBoundingClientRect();
    const sx = r.width  / this.scale.width;
    const sy = r.height / this.scale.height;
    return {
        left:   `${r.left + px * sx}px`,
        top:    `${r.top  + py * sy}px`,
        width:  `${pw * sx}px`,
        height: `${ph * sy}px`,
    };
}
```
Dùng cho mọi DOM element cần overlay đúng vị trí lên Phaser canvas.

## Texture từ Graphics (không load file)
```js
const g = this.add.graphics();
g.fillStyle(0xff0000).fillRect(0, 0, 64, 64);
g.generateTexture('myKey', 64, 64);
g.destroy(); // cleanup sau khi generate
// Dùng: this.add.image(x, y, 'myKey')
```
Dùng khi cần icon/thumbnail nhỏ mà không muốn thêm file asset.

## Unsub listeners — cả destroy lẫn shutdown
```js
create() {
    this._unsubFriends = onFriendRequestsChange(uid, cb);
}
// PHẢI có cả 2:
shutdown() { this._unsubFriends?.(); }
destroy()  { this._unsubFriends?.(); }
```
Nếu chỉ có `destroy` mà thiếu `shutdown`, listener sẽ leak khi scene dừng tạm thời.
