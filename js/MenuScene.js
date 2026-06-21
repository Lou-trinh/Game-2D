import { getAllCharacters, getCharacterConfig } from './Character';
import { Economy } from './utils/Economy';
import { WeaponData, WeaponCategories, getWeaponsByCategory, getWeaponByKey, getWeaponsByCategories } from './data/WeaponData';
import { auth, onAuthChange, signInWithGoogle, signOutUser, saveUserProfile, getFriends, searchPlayers, sendFriendRequest, acceptFriendRequest, declineFriendRequest, removeFriend, onFriendRequestsChange, createRoom, joinRoom, onRoomPlayersChange, leaveRoom, setRoomStatus, onRoomStatusChange, sendRoomInvite, onRoomInviteChange, declineRoomInvite, updatePlayerInRoom } from './firebase.js';

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
        this.selectedCharacterKey = localStorage.getItem('selected_character') || 'player_1';
        this.selectedMap = 'map_1';
    }

    preload() {
        // Menu assets already loaded in SceneLoading
        this.load.image('button_start', 'assets/images/inventory/button/button_start.png');
        this.load.image('menu_bg', 'assets/images/inventory/background.png');
    }

    create() {
        const { width, height } = this.scale;
        this.colors = {
            panelBg: 0x1a2533,
            panelBorder: 0x4a5a6a,
            highlight: 0x76c442,
            textAction: 0xffffff,
            textLabel: 0xcccccc
        };

        // Background image
        const bg = this.add.image(0, 0, 'menu_bg');
        bg.setOrigin(0, 0);
        bg.setDisplaySize(width, height);
        // bg.setAlpha(0.6); // Removed to use original image brightness

        // Layout Constants
        const topBarHeight = 60;
        const padding = 15;
        const leftPanelWidth = 170; // Smaller width
        const rightPanelWidth = 150; // Smaller width

        // 1. TOP BAR
        this.createTopBar(topBarHeight);

        // 2. LEFT PANELS (Characters & Weapons)
        this.createCharacterPanel(padding, topBarHeight + padding, leftPanelWidth);
        this.createWeaponPanel(padding, topBarHeight + padding + 160, 140);

        // 3. RIGHT COLUMN (Map, Shop, Start)
        const rightPanelX = width - rightPanelWidth - padding;
        const rightColumnCenter = rightPanelX + rightPanelWidth / 2;

        this.createRightPanel(rightPanelX, topBarHeight + padding, rightPanelWidth);

        // 4. CENTER AREA (Spotlight & Start)
        this.createCenterSpotlight(width / 2, height / 2 + 20);

        // 5. SHOP + FRIENDS + INVENTORY + START BUTTONS (horizontal, right-aligned)
        const btnY = height - 55;
        const btnGap = 125;
        const rightBtnX = width - 70;
        this.createShopButton(rightBtnX - btnGap * 3, btnY);
        this.createFriendsButton(rightBtnX - btnGap * 2, btnY);
        this.createInventoryButton(rightBtnX - btnGap, btnY);
        this.createStartButton(rightBtnX, btnY);

        // Fade in effect
        this.cameras.main.fadeIn(500, 0, 0, 0);

        // Auth UI
        this.setupAuthUI();
    }

    createTopBar(height) {
        const { width } = this.scale;

        // Background panel
        const bar = this.createPanel(10, 10, 180, 50, 0x2c3e50, 0.8);

        // Avatar placeholder (circle, hiện khi chưa đăng nhập)
        this.avatarBg = this.add.graphics();
        this.avatarBg.fillStyle(0x3d4f61, 1);
        this.avatarBg.fillCircle(35, 35, 18);
        this.avatarBg.lineStyle(2, 0x4a5a6a, 1);
        this.avatarBg.strokeCircle(35, 35, 18);

        // EXP Bar (dynamic — refs stored để refresh sau sync)
        const expBg = this.add.graphics();
        expBg.fillStyle(0x000000, 0.5);
        expBg.fillRect(65, 38, 110, 12);

        this.expFill = this.add.graphics();
        this.expText = this.add.text(120, 39, '', { fontSize: '9px', color: '#ffffff' }).setOrigin(0.5, 0);
        this.updateExpBar();

        // Diamonds
        const diaBar = this.createPanel(width - 240, 10, 110, 30, 0x2c3e50, 0.8);
        const diaIcon = this.add.image(width - 225, 25, 'diamond');
        diaIcon.setScale(1.1);

        const diamonds = Economy.getDiamonds();
        this.diamondText = this.add.text(width - 155, 17, diamonds.toLocaleString(), { fontSize: '14px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(1, 0);
        this.add.text(width - 145, 15, '+', { fontSize: '16px', color: '#76c442', fontStyle: 'bold' });

        // Coins
        const coinBar = this.createPanel(width - 120, 10, 110, 30, 0x2c3e50, 0.8);
        const coinIcon = this.add.image(width - 110, 25, 'coin');
        coinIcon.setDisplaySize(20, 20);

        const coins = Economy.getCoins();
        this.coinText = this.add.text(width - 35, 17, coins.toLocaleString(), { fontSize: '14px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(1, 0);
        this.add.text(width - 25, 15, '+', { fontSize: '16px', color: '#76c442', fontStyle: 'bold' });
    }

    createCharacterPanel(x, y, width) {
        const charHeight = 150;

        // Panel bg
        const g = this.add.graphics();
        g.fillStyle(0x0a1628, 0.97);
        g.fillRoundedRect(x, y, width, charHeight, 10);
        g.lineStyle(1, 0x1a3040, 1);
        g.strokeRoundedRect(x, y, width, charHeight, 10);

        // Header band
        const accent = this.add.graphics();
        accent.fillStyle(0x0e8a70, 1);
        accent.fillRoundedRect(x + 1, y + 1, width - 2, 30, { tl: 9, tr: 9, bl: 0, br: 0 });

        this.add.text(x + width / 2, y + 16, 'NHÂN VẬT', {
            fontSize: '10px', color: '#ffffff', fontStyle: 'bold',
        }).setOrigin(0.5);

        const div = this.add.graphics();
        div.lineStyle(1, 0x1a3040, 1);
        div.lineBetween(x + 10, y + 32, x + width - 10, y + 32);

        const chars = getAllCharacters();
        const iconSize = 42;
        const spacing = 8;
        const cols = 3;
        const gridWidth = cols * iconSize + (cols - 1) * spacing;
        const startX = x + (width - gridWidth) / 2;
        const startY = y + 40;

        this.charIcons = [];
        chars.forEach((char, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const cx = startX + col * (iconSize + spacing) + iconSize / 2;
            const cy = startY + row * (iconSize + spacing) + iconSize / 2;

            const btn = this.add.container(cx, cy);
            const glow = this.add.graphics();
            const bg = this.add.graphics();

            const drawState = (selected) => {
                glow.clear(); bg.clear();
                if (selected) {
                    glow.fillStyle(0x1abc9c, 0.14);
                    glow.fillRoundedRect(-iconSize / 2 - 4, -iconSize / 2 - 4, iconSize + 8, iconSize + 8, 9);
                }
                bg.fillStyle(selected ? 0x0d2535 : 0x071018, 1);
                bg.fillRoundedRect(-iconSize / 2, -iconSize / 2, iconSize, iconSize, 6);
                bg.lineStyle(selected ? 2 : 1, selected ? 0x1abc9c : 0x1a3040, 1);
                bg.strokeRoundedRect(-iconSize / 2, -iconSize / 2, iconSize, iconSize, 6);
            };
            drawState(char.key === this.selectedCharacterKey);

            const isP1 = char.key === 'player_1';
            const sprite = this.add.sprite(0, 12, char.texture);
            sprite.setOrigin(0.5, 1);
            sprite.setDisplaySize(iconSize * (isP1 ? 0.82 : 0.72), iconSize * (isP1 ? 0.82 : 0.72));

            const hit = this.add.rectangle(0, 0, iconSize, iconSize, 0, 0).setInteractive({ useHandCursor: true });
            btn.add([glow, bg, sprite, hit]);

            hit.on('pointerdown', () => this.selectCharacter(char.key));
            hit.on('pointerover', () => {
                if (this.selectedCharacterKey !== char.key) {
                    bg.clear();
                    bg.fillStyle(0x0d2030, 1);
                    bg.fillRoundedRect(-iconSize / 2, -iconSize / 2, iconSize, iconSize, 6);
                    bg.lineStyle(1, 0x2a5060, 1);
                    bg.strokeRoundedRect(-iconSize / 2, -iconSize / 2, iconSize, iconSize, 6);
                }
            });
            hit.on('pointerout', () => {
                if (this.selectedCharacterKey !== char.key) drawState(false);
            });

            this.charIcons.push({ key: char.key, setSelected: (sel) => drawState(sel) });
        });
    }

    createWeaponPanel(x, y, width) {
        const weaponHeight = 185;

        const g = this.add.graphics();
        g.fillStyle(0x0a1628, 0.97);
        g.fillRoundedRect(x, y, width, weaponHeight, 10);
        g.lineStyle(1, 0x1a3040, 1);
        g.strokeRoundedRect(x, y, width, weaponHeight, 10);

        const accent = this.add.graphics();
        accent.fillStyle(0x1a6fa8, 1);
        accent.fillRoundedRect(x + 1, y + 1, width - 2, 30, { tl: 9, tr: 9, bl: 0, br: 0 });

        this.add.text(x + width / 2, y + 16, 'VŨ KHÍ', {
            fontSize: '10px', color: '#ffffff', fontStyle: 'bold',
        }).setOrigin(0.5);

        const div = this.add.graphics();
        div.lineStyle(1, 0x1a3040, 1);
        div.lineBetween(x + 10, y + 32, x + width - 10, y + 32);

        this.weaponContainer = this.add.container(x + width / 2, y + 105);
        this.updateWeaponList();
    }

    createRightPanel(x, y, width) {
        const panelHeight = 190; // Shorter
        this.createPanel(x, y, width, panelHeight, this.colors.panelBg, 0.9);
        this.add.text(x + width / 2, y + 15, 'MAP', {
            fontSize: '14px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const maps = [
            { key: 'map_1', name: 'Map 1', texture: 'map_1' },
            { key: 'map_2', name: 'Map 2', texture: 'map_2' },
            { key: 'map_3', name: 'Map 3', texture: 'map_3' },
            { key: 'map_4', name: 'Map 4', texture: 'map_4' },
            { key: 'map_5', name: 'Map 5', texture: 'map_5' },
            { key: 'map_6', name: 'Locked', texture: 'map_1', locked: true }
        ];

        this.mapIcons = [];
        const mapW = 60; // Thinner
        const mapH = 40; // Shorter
        const spacingX = 8;
        const spacingY = 8;
        const startX = x + (width - (2 * mapW + spacingX)) / 2 + mapW / 2;
        const startY = y + 45 + mapH / 2;

        maps.forEach((map, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const mx = startX + col * (mapW + spacingX);
            const my = startY + row * (mapH + spacingY);

            const img = this.add.image(mx, my, map.texture);
            img.setDisplaySize(mapW, mapH);

            if (map.locked) {
                img.setTint(0x333333);
                const lockIcon = this.add.text(mx, my, '🔒', { fontSize: '14px' }).setOrigin(0.5);
            } else {
                img.setInteractive({ useHandCursor: true });
                img.on('pointerdown', () => this.selectMap(map.key));
            }

            const border = this.add.graphics();
            border.lineStyle(2, map.key === this.selectedMap ? this.colors.highlight : 0x555555);
            border.strokeRect(mx - mapW / 2, my - mapH / 2, mapW, mapH);

            this.mapIcons.push({
                key: map.key,
                border: border,
                x: mx - mapW / 2,
                y: my - mapH / 2,
                width: mapW,
                height: mapH
            });
        });
    }

    selectMap(key) {
        this.selectedMap = key;
        this.mapIcons.forEach(icon => {
            icon.border.clear();
            icon.border.lineStyle(2, icon.key === this.selectedMap ? this.colors.highlight : 0x555555);
            icon.border.strokeRect(icon.x, icon.y, icon.width, icon.height);
        });
    }

    createCenterSpotlight(x, y) {
        y += 0; // Middle ground

        // Spotlight effect
        const beam = this.add.graphics();
        beam.fillGradientStyle(0xffffff, 0xffffff, 0xffffff, 0xffffff, 0.1, 0.1, 0, 0);
        beam.fillRect(x - 50, y - 200, 100, 240);
        beam.setAlpha(0.1);

        // Character Sprite
        this.spotlightSprite = this.add.sprite(x, y + 40, 'player_1');
        this.spotlightSprite.setScale(4.0); // Even larger spotlight character

        // Character Name Text
        this.charNameText = this.add.text(x, y + 100, '', {
            fontSize: '28px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 6,
            shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 4, stroke: true, fill: true }
        }).setOrigin(0.5);

        this.charDescText = this.add.text(x, y + 110, '', {
            fontSize: '14px',
            color: '#cccccc',
            align: 'center',
            wordWrap: { width: 300 }
        }).setOrigin(0.5);

        this.updateSpotlight();
    }

    createShopButton(x, y) {
        const btn = this.add.container(x, y);

        // Styling - Similar to Start Button but Orange
        // Premium Glow Effect
        const glow = this.add.graphics();
        glow.fillStyle(0xe67e22, 0.3); // Orange glow
        glow.fillRoundedRect(-65, -20, 130, 40, 10);
        glow.setAlpha(0.5);

        // Button Background
        const bg = this.add.rectangle(0, 0, 120, 35, 0xd35400, 1); // Darker orange
        bg.setStrokeStyle(3, 0xffffff, 1);

        // Inner depth effect
        const inner = this.add.graphics();
        inner.lineStyle(2, 0xe67e22, 1);
        inner.strokeRoundedRect(-56, -14, 112, 28, 5);

        // Icon
        const icon = this.add.image(-45, 0, 'cart3'); // Moved left
        icon.setDisplaySize(24, 24);

        // Text
        const text = this.add.text(15, 0, 'CỬA HÀNG', { // Moved right
            fontSize: '16px',
            color: '#ffffff',
            fontStyle: 'bold',
            shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 2, fill: true }
        }).setOrigin(0.5);

        btn.add([glow, bg, inner, icon, text]);
        bg.setInteractive({ useHandCursor: true });

        bg.on('pointerover', () => {
            bg.setFillStyle(0xe67e22, 1);
            bg.setStrokeStyle(4, 0xffcc00, 1); // Gold highlight
            btn.setScale(1.1);
        });
        bg.on('pointerout', () => {
            bg.setFillStyle(0xd35400, 1);
            bg.setStrokeStyle(3, 0xffffff, 1);
            btn.setScale(1);
        });

        bg.on('pointerdown', () => {
            this.scene.launch('SceneShop');
        });
    }

    createInventoryButton(x, y) {
        const btn = this.add.container(x, y);

        const glow = this.add.graphics();
        glow.fillStyle(0x1abc9c, 0.3);
        glow.fillRoundedRect(-65, -20, 130, 40, 10);
        glow.setAlpha(0.5);

        const bg = this.add.rectangle(0, 0, 120, 35, 0x16a085, 1);
        bg.setStrokeStyle(3, 0xffffff, 1);

        const inner = this.add.graphics();
        inner.lineStyle(2, 0x1abc9c, 1);
        inner.strokeRoundedRect(-56, -14, 112, 28, 5);

        const text = this.add.text(0, 0, '🎒 KHO ĐỒ', {
            fontSize: '15px',
            color: '#ffffff',
            fontStyle: 'bold',
            shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 2, fill: true }
        }).setOrigin(0.5);

        btn.add([glow, bg, inner, text]);
        bg.setInteractive({ useHandCursor: true });

        bg.on('pointerover', () => {
            bg.setFillStyle(0x1abc9c, 1);
            bg.setStrokeStyle(4, 0xaaffee, 1);
            btn.setScale(1.1);
        });
        bg.on('pointerout', () => {
            bg.setFillStyle(0x16a085, 1);
            bg.setStrokeStyle(3, 0xffffff, 1);
            btn.setScale(1);
        });
        bg.on('pointerdown', () => this.openInventoryPanel());
    }

    createFriendsButton(x, y) {
        const btn = this.add.container(x, y);

        const glow = this.add.graphics();
        glow.fillStyle(0x8e44ad, 0.3);
        glow.fillRoundedRect(-65, -20, 130, 40, 10);
        glow.setAlpha(0.5);

        const bg = this.add.rectangle(0, 0, 120, 35, 0x6c3483, 1);
        bg.setStrokeStyle(3, 0xffffff, 1);

        const inner = this.add.graphics();
        inner.lineStyle(2, 0x8e44ad, 1);
        inner.strokeRoundedRect(-56, -14, 112, 28, 5);

        const text = this.add.text(0, 0, '👥 BẠN BÈ', {
            fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
            shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 2, fill: true }
        }).setOrigin(0.5);

        // Notification badge — absolute canvas position, above everything
        this._friendBtnX = x;
        this._friendBtnY = y;
        this._friendBadgeBg = this.add.graphics().setDepth(50);
        this._friendBadgeText = this.add.text(x + 50, y - 16, '', {
            fontSize: '9px', color: '#ffffff', fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(51);

        btn.add([glow, bg, inner, text]);
        bg.setInteractive({ useHandCursor: true });

        bg.on('pointerover', () => {
            bg.setFillStyle(0x8e44ad, 1);
            bg.setStrokeStyle(4, 0xd7bde2, 1);
            btn.setScale(1.1);
        });
        bg.on('pointerout', () => {
            bg.setFillStyle(0x6c3483, 1);
            bg.setStrokeStyle(3, 0xffffff, 1);
            btn.setScale(1);
        });
        bg.on('pointerdown', () => this.openFriendsPanel());
    }

    _startFriendRequestListener() {
        const user = auth.currentUser;
        if (!user || !this._friendBadgeBg) return;
        if (this._friendRequestUnsub) this._friendRequestUnsub();

        this._friendRequestUnsub = onFriendRequestsChange(user.uid, (requests) => {
            this._pendingRequests = requests;
            const count = requests.length;

            // Update badge
            this._friendBadgeBg.clear();
            this._friendBadgeText.setText('');
            if (count > 0) {
                const bx = this._friendBtnX + 50, by = this._friendBtnY - 16;
                this._friendBadgeBg.fillStyle(0xe74c3c, 1);
                this._friendBadgeBg.fillCircle(bx, by, count > 9 ? 10 : 8);
                this._friendBadgeText.setPosition(bx, by).setText(count > 9 ? '9+' : String(count));
            }

            // Rebuild panel nếu đang mở ở tab yêu cầu
            if (this.friendsPanel && this._friendsPanelTab === 'requests') {
                this._buildFriendsPanel();
            }
        });

        this.events.once('destroy', () => { if (this._friendRequestUnsub) this._friendRequestUnsub(); });
        this.events.once('shutdown', () => { if (this._friendRequestUnsub) this._friendRequestUnsub(); });
    }

    _startRoomInviteListener() {
        const user = auth.currentUser;
        if (!user) return;
        if (this._roomInviteUnsub) this._roomInviteUnsub();

        this._shownInvites = new Set();
        console.log('[RoomInvite] Listener started for uid:', user.uid);

        this._roomInviteUnsub = onRoomInviteChange(user.uid, (invites) => {
            console.log('[RoomInvite] onSnapshot fired, invites:', invites);
            invites.forEach(invite => {
                const key = `${invite.uid || invite.displayName}_${invite.roomCode}_${invite.sentAt || 0}`;
                if (!this._shownInvites.has(key)) {
                    this._shownInvites.add(key);
                    console.log('[RoomInvite] Showing popup for:', invite);
                    this.showRoomInvitePopup(invite);
                }
            });
        });

        this.events.once('destroy', () => { if (this._roomInviteUnsub) this._roomInviteUnsub(); });
        this.events.once('shutdown', () => { if (this._roomInviteUnsub) this._roomInviteUnsub(); });
    }

    showRoomInvitePopup(invite) {
        const { width, height } = this.scale;
        const pw = 320, ph = 160;
        const px = (width - pw) / 2, py = (height - ph) / 2 - 40;
        const popupEls = [];

        const ov = this.add.rectangle(0, 0, width, height, 0x000000, 0.55).setOrigin(0).setDepth(300).setInteractive();
        popupEls.push(ov);

        const pg = this.add.graphics().setDepth(301);
        pg.fillStyle(0x07101c, 0.99);
        pg.fillRoundedRect(px, py, pw, ph, 12);
        pg.lineStyle(2, 0x1abc9c, 0.8);
        pg.strokeRoundedRect(px, py, pw, ph, 12);
        popupEls.push(pg);

        const hg = this.add.graphics().setDepth(301);
        hg.fillStyle(0x0e5a48, 1);
        hg.fillRoundedRect(px + 1, py + 1, pw - 2, 34, { tl: 11, tr: 11, bl: 0, br: 0 });
        popupEls.push(hg);

        popupEls.push(
            this.add.text(px + pw / 2, py + 18, 'LỜI MỜI VÀO PHÒNG', { fontSize: '12px', color: '#1abc9c', fontStyle: 'bold' }).setOrigin(0.5).setDepth(302)
        );

        const senderName = invite.displayName || 'Người chơi';
        popupEls.push(
            this.add.text(px + pw / 2, py + 56, `${senderName} mời bạn vào phòng`, {
                fontSize: '11px', color: '#c8dde8',
            }).setOrigin(0.5).setDepth(302)
        );
        popupEls.push(
            this.add.text(px + pw / 2, py + 74, `Mã phòng: ${invite.roomCode}`, {
                fontSize: '13px', color: '#1abc9c', fontStyle: 'bold',
            }).setOrigin(0.5).setDepth(302)
        );

        const closeAll = () => popupEls.forEach(e => e && e.destroy && e.destroy());

        // Xác nhận
        const confirmG = this.add.graphics().setDepth(301);
        const drawConfirm = (h) => {
            confirmG.clear();
            confirmG.fillStyle(h ? 0x1abc9c : 0x0e6b58, 1);
            confirmG.fillRoundedRect(px + pw / 2 - 124, py + 100, 110, 36, 7);
        };
        drawConfirm(false);
        popupEls.push(confirmG);
        popupEls.push(
            this.add.text(px + pw / 2 - 69, py + 118, 'Xác nhận', { fontSize: '12px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(302)
        );
        const confirmHit = this.add.rectangle(px + pw / 2 - 69, py + 118, 110, 36, 0, 0).setDepth(303).setInteractive({ useHandCursor: true });
        confirmHit.on('pointerover', () => drawConfirm(true));
        confirmHit.on('pointerout', () => drawConfirm(false));
        confirmHit.on('pointerdown', () => {
            const user = auth.currentUser;
            if (user) declineRoomInvite(user.uid, invite.uid).catch(() => {});
            closeAll();
            this.closeMultiplayerLobby();
            this.showMultiplayerLobby(invite.roomCode);
        });
        popupEls.push(confirmHit);

        // Từ chối
        const declineG = this.add.graphics().setDepth(301);
        const drawDecline = (h) => {
            declineG.clear();
            declineG.fillStyle(h ? 0x7f1e1e : 0x3d1010, 1);
            declineG.fillRoundedRect(px + pw / 2 + 14, py + 100, 110, 36, 7);
        };
        drawDecline(false);
        popupEls.push(declineG);
        popupEls.push(
            this.add.text(px + pw / 2 + 69, py + 118, 'Từ chối', { fontSize: '12px', color: '#ffaaaa', fontStyle: 'bold' }).setOrigin(0.5).setDepth(302)
        );
        const declineHit = this.add.rectangle(px + pw / 2 + 69, py + 118, 110, 36, 0, 0).setDepth(303).setInteractive({ useHandCursor: true });
        declineHit.on('pointerover', () => drawDecline(true));
        declineHit.on('pointerout', () => drawDecline(false));
        declineHit.on('pointerdown', () => {
            const user = auth.currentUser;
            if (user) declineRoomInvite(user.uid, invite.uid).catch(() => {});
            closeAll();
        });
        popupEls.push(declineHit);
    }

    openFriendsPanel() {
        if (this.friendsPanel) { this.closeFriendsPanel(); return; }
        this._friendsPanelTab = this._friendsPanelTab || 'requests';
        this._buildFriendsPanel();
    }

    _buildFriendsPanel() {
        if (this.friendsPanel) {
            this.friendsPanel.forEach(e => e.destroy());
            this.friendsPanel = null;
        }

        const { width, height } = this.scale;
        this.friendsPanel = [];

        const pw = 480, ph = 320;
        const px = (width - pw) / 2, py = (height - ph) / 2;

        // Overlay
        const ov = this.add.rectangle(0, 0, width, height, 0x000000, 0.5).setOrigin(0).setDepth(500).setInteractive();
        ov.on('pointerdown', () => this.closeFriendsPanel());
        this.friendsPanel.push(ov);

        // Panel bg
        const pg = this.add.graphics().setDepth(501);
        pg.fillStyle(0x07101c, 0.98);
        pg.fillRoundedRect(px, py, pw, ph, 12);
        pg.lineStyle(1.5, 0x8e44ad, 0.7);
        pg.strokeRoundedRect(px, py, pw, ph, 12);
        this.friendsPanel.push(pg);

        // Header
        const hg = this.add.graphics().setDepth(501);
        hg.fillStyle(0x4a235a, 1);
        hg.fillRoundedRect(px + 1, py + 1, pw - 2, 34, { tl: 11, tr: 11, bl: 0, br: 0 });
        this.friendsPanel.push(hg);

        this.friendsPanel.push(
            this.add.text(px + pw / 2, py + 18, 'BẠN BÈ', { fontSize: '13px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(502)
        );

        const xBtn = this.add.text(px + pw - 18, py + 18, '✕', { fontSize: '13px', color: '#ccbbdd' }).setOrigin(0.5).setDepth(502).setInteractive({ useHandCursor: true });
        xBtn.on('pointerdown', (p, lx, ly, ev) => { ev.stopPropagation(); this.closeFriendsPanel(); });
        xBtn.on('pointerover', () => xBtn.setColor('#ffffff'));
        xBtn.on('pointerout', () => xBtn.setColor('#ccbbdd'));
        this.friendsPanel.push(xBtn);

        // Tabs
        const tabs = [
            { id: 'requests', label: 'Yêu cầu' },
            { id: 'friends',  label: 'Bạn bè' },
            { id: 'search',   label: 'Tìm kiếm' },
        ];
        const tabW = pw / tabs.length;
        tabs.forEach((tab, i) => {
            const tx = px + i * tabW + tabW / 2;
            const ty = py + 48;
            const isActive = this._friendsPanelTab === tab.id;

            const tbg = this.add.graphics().setDepth(501);
            tbg.fillStyle(isActive ? 0x1a0a24 : 0x0a0514, 1);
            tbg.fillRect(px + i * tabW, py + 36, tabW, 24);
            if (isActive) {
                tbg.lineStyle(2, 0x8e44ad, 1);
                tbg.lineBetween(px + i * tabW, py + 60, px + (i + 1) * tabW, py + 60);
            }
            this.friendsPanel.push(tbg);

            // Badge for requests tab
            let labelStr = tab.label;
            const reqCount = (this._pendingRequests || []).length;
            if (tab.id === 'requests' && reqCount > 0) labelStr += ` (${reqCount})`;

            const ttxt = this.add.text(tx, ty, labelStr, {
                fontSize: '10px', color: isActive ? '#d7bde2' : '#5a4a6a', fontStyle: 'bold',
            }).setOrigin(0.5).setDepth(502).setInteractive({ useHandCursor: true });
            ttxt.on('pointerdown', (p, lx, ly, ev) => {
                ev.stopPropagation();
                this._friendsPanelTab = tab.id;
                this._buildFriendsPanel();
            });
            this.friendsPanel.push(ttxt);
        });

        // Divider
        const dg = this.add.graphics().setDepth(501);
        dg.lineStyle(1, 0x1a3040, 1);
        dg.lineBetween(px, py + 60, px + pw, py + 60);
        this.friendsPanel.push(dg);

        // Content
        const cx = px + 12, cy = py + 68, cw = pw - 24, ch = ph - 80;
        if (this._friendsPanelTab === 'requests') this._drawRequestsTab(cx, cy, cw, ch);
        else if (this._friendsPanelTab === 'friends') this._drawFriendsTab(cx, cy, cw, ch);
        else this._drawFriendsSearchTab(cx, cy, cw, ch);
    }

    _drawRequestsTab(cx, cy, cw, ch) {
        const requests = this._pendingRequests || [];
        if (requests.length === 0) {
            this.friendsPanel.push(
                this.add.text(cx + cw / 2, cy + ch / 2, 'Không có yêu cầu kết bạn nào.', {
                    fontSize: '10px', color: '#2a4050',
                }).setOrigin(0.5).setDepth(502)
            );
            return;
        }

        const user = auth.currentUser;
        requests.forEach((req, i) => {
            const ry = cy + i * 54;
            const rowG = this.add.graphics().setDepth(501);
            rowG.fillStyle(0x0a1628, 1);
            rowG.fillRoundedRect(cx, ry, cw, 46, 6);
            this.friendsPanel.push(rowG);

            const colors = [0x8e44ad, 0x2980b9, 0xe67e22, 0x1abc9c, 0xe74c3c];
            const avG = this.add.graphics().setDepth(502);
            avG.fillStyle(colors[i % colors.length], 0.9);
            avG.fillCircle(cx + 24, ry + 23, 16);
            this.friendsPanel.push(avG);
            this.friendsPanel.push(
                this.add.text(cx + 24, ry + 23, (req.displayName || '?')[0].toUpperCase(), {
                    fontSize: '13px', color: '#ffffff', fontStyle: 'bold',
                }).setOrigin(0.5).setDepth(503)
            );

            this.friendsPanel.push(
                this.add.text(cx + 48, ry + 10, req.displayName || 'Người chơi', {
                    fontSize: '11px', color: '#e8eef5', fontStyle: 'bold',
                }).setDepth(502)
            );
            this.friendsPanel.push(
                this.add.text(cx + 48, ry + 26, 'Muốn kết bạn với bạn', {
                    fontSize: '9px', color: '#5a6a7a',
                }).setDepth(502)
            );

            // Accept button
            const accG = this.add.graphics().setDepth(502);
            const drawAcc = (h) => { accG.clear(); accG.fillStyle(h ? 0x1abc9c : 0x0e6b58, 1); accG.fillRoundedRect(cx + cw - 132, ry + 11, 58, 24, 5); };
            drawAcc(false);
            this.friendsPanel.push(accG);
            const accTxt = this.add.text(cx + cw - 103, ry + 23, 'Chấp nhận', { fontSize: '8px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(503);
            this.friendsPanel.push(accTxt);
            const accHit = this.add.rectangle(cx + cw - 103, ry + 23, 58, 24, 0, 0).setDepth(504).setInteractive({ useHandCursor: true });
            this.friendsPanel.push(accHit);
            accHit.on('pointerover', () => { drawAcc(true); ev => ev && ev.stopPropagation && ev.stopPropagation(); });
            accHit.on('pointerout', () => drawAcc(false));
            accHit.on('pointerdown', (p, lx, ly, ev) => {
                ev.stopPropagation();
                if (!user) return;
                const myProfile = { uid: user.uid, displayName: user.displayName || 'Player', photoURL: user.photoURL || '' };
                acceptFriendRequest(user.uid, myProfile, req.uid, req)
                    .catch(() => {});
            });

            // Decline button
            const decG = this.add.graphics().setDepth(502);
            const drawDec = (h) => { decG.clear(); decG.fillStyle(h ? 0xe74c3c : 0x4a1a1a, 1); decG.fillRoundedRect(cx + cw - 68, ry + 11, 56, 24, 5); };
            drawDec(false);
            this.friendsPanel.push(decG);
            const decTxt = this.add.text(cx + cw - 40, ry + 23, 'Từ chối', { fontSize: '8px', color: '#cc8888', fontStyle: 'bold' }).setOrigin(0.5).setDepth(503);
            this.friendsPanel.push(decTxt);
            const decHit = this.add.rectangle(cx + cw - 40, ry + 23, 56, 24, 0, 0).setDepth(504).setInteractive({ useHandCursor: true });
            this.friendsPanel.push(decHit);
            decHit.on('pointerover', () => { drawDec(true); decTxt.setColor('#ffffff'); });
            decHit.on('pointerout', () => { drawDec(false); decTxt.setColor('#cc8888'); });
            decHit.on('pointerdown', (p, lx, ly, ev) => {
                ev.stopPropagation();
                if (!user) return;
                declineFriendRequest(user.uid, req.uid).catch(() => {});
            });
        });
    }

    _drawFriendsTab(cx, cy, cw, ch) {
        const user = auth.currentUser;
        if (!user) {
            this.friendsPanel.push(
                this.add.text(cx + cw / 2, cy + ch / 2, 'Đăng nhập để xem danh sách bạn bè.', { fontSize: '10px', color: '#2a4050' }).setOrigin(0.5).setDepth(502)
            );
            return;
        }

        const loadTxt = this.add.text(cx + cw / 2, cy + ch / 2, 'Đang tải...', { fontSize: '10px', color: '#3d6070' }).setOrigin(0.5).setDepth(502);
        this.friendsPanel.push(loadTxt);

        getFriends(user.uid).then(friends => {
            if (!this.friendsPanel) return;
            loadTxt.destroy();
            if (friends.length === 0) {
                this.friendsPanel.push(
                    this.add.text(cx + cw / 2, cy + ch / 2, 'Chưa có bạn bè.\nTìm kiếm bạn bè ở tab Tìm kiếm.', { fontSize: '10px', color: '#2a4050', align: 'center' }).setOrigin(0.5).setDepth(502)
                );
                return;
            }
            friends.forEach((friend, i) => {
                const ry = cy + i * 54;
                const rowG = this.add.graphics().setDepth(501);
                rowG.fillStyle(0x0a1628, 1);
                rowG.fillRoundedRect(cx, ry, cw, 46, 6);
                this.friendsPanel.push(rowG);

                const colors = [0x1abc9c, 0x2980b9, 0xe67e22, 0x8e44ad, 0xe74c3c];
                const avG = this.add.graphics().setDepth(502);
                avG.fillStyle(colors[i % colors.length], 0.9);
                avG.fillCircle(cx + 24, ry + 23, 16);
                this.friendsPanel.push(avG);
                this.friendsPanel.push(
                    this.add.text(cx + 24, ry + 23, (friend.displayName || '?')[0].toUpperCase(), { fontSize: '13px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(503)
                );
                this.friendsPanel.push(
                    this.add.text(cx + 48, ry + 14, friend.displayName || 'Người chơi', { fontSize: '11px', color: '#e8eef5', fontStyle: 'bold' }).setDepth(502)
                );

                // Remove friend
                const rmG = this.add.graphics().setDepth(502);
                const drawRm = (h) => { rmG.clear(); rmG.fillStyle(h ? 0xe74c3c : 0x2a1010, 1); rmG.fillRoundedRect(cx + cw - 74, ry + 11, 62, 24, 5); };
                drawRm(false);
                this.friendsPanel.push(rmG);
                const rmTxt = this.add.text(cx + cw - 43, ry + 23, 'Xóa bạn', { fontSize: '8px', color: '#cc8888', fontStyle: 'bold' }).setOrigin(0.5).setDepth(503);
                this.friendsPanel.push(rmTxt);
                const rmHit = this.add.rectangle(cx + cw - 43, ry + 23, 62, 24, 0, 0).setDepth(504).setInteractive({ useHandCursor: true });
                this.friendsPanel.push(rmHit);
                rmHit.on('pointerover', () => { drawRm(true); rmTxt.setColor('#ffffff'); });
                rmHit.on('pointerout', () => { drawRm(false); rmTxt.setColor('#cc8888'); });
                rmHit.on('pointerdown', (p, lx, ly, ev) => {
                    ev.stopPropagation();
                    removeFriend(user.uid, friend.uid).then(() => this._buildFriendsPanel()).catch(() => {});
                });
            });
        }).catch(() => { if (loadTxt.active) loadTxt.setText('Lỗi tải danh sách.'); });
    }

    _drawFriendsSearchTab(cx, cy, cw, ch) {
        const user = auth.currentUser;
        if (!user) {
            this.friendsPanel.push(
                this.add.text(cx + cw / 2, cy + ch / 2, 'Đăng nhập để tìm kiếm bạn bè.', { fontSize: '10px', color: '#2a4050' }).setOrigin(0.5).setDepth(502)
            );
            return;
        }

        // Search input (DOM)
        const inputEl = document.createElement('input');
        inputEl.type = 'text';
        inputEl.placeholder = 'Nhập tên người chơi...';
        const _ps = this._domPos(cx, cy, cw - 70, 30);
        inputEl.style.cssText = [
            'position:fixed', `left:${_ps.left}px`, `top:${_ps.top}px`,
            `width:${_ps.w}px`, `height:${_ps.h}px`,
            'background:#0d2535', 'border:1px solid #1a3040',
            'border-radius:6px', 'color:#e8eef5',
            `font-size:${_ps.fs}px`, 'padding:0 8px', 'outline:none', 'box-sizing:border-box', 'z-index:9999',
        ].join(';');
        inputEl.addEventListener('mousedown', e => e.stopPropagation());
        inputEl.addEventListener('pointerdown', e => e.stopPropagation());
        document.body.appendChild(inputEl);
        inputEl.focus();
        this.friendsPanel.push({ destroy: () => inputEl.remove() });

        // Search button
        const sbG = this.add.graphics().setDepth(502);
        const drawSb = (h) => { sbG.clear(); sbG.fillStyle(h ? 0x8e44ad : 0x4a235a, 1); sbG.fillRoundedRect(cx + cw - 64, cy, 64, 30, 6); };
        drawSb(false);
        this.friendsPanel.push(sbG);
        this.friendsPanel.push(
            this.add.text(cx + cw - 32, cy + 15, 'Tìm', { fontSize: '11px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(503)
        );
        const sbHit = this.add.rectangle(cx + cw - 32, cy + 15, 64, 30, 0, 0).setDepth(504).setInteractive({ useHandCursor: true });
        sbHit.on('pointerover', () => { sbG.clear(); drawSb(true); });
        sbHit.on('pointerout', () => { sbG.clear(); drawSb(false); });
        this.friendsPanel.push(sbHit);

        const resultArea = { y: cy + 40 };
        this._searchResultEls = [];

        const doSearch = () => {
            const q = inputEl.value.trim();
            if (!q) return;
            this._searchResultEls.forEach(e => e.destroy());
            this._searchResultEls = [];

            const loadT = this.add.text(cx + cw / 2, resultArea.y + 20, 'Đang tìm...', { fontSize: '10px', color: '#3d6070' }).setOrigin(0.5).setDepth(502);
            this._searchResultEls.push(loadT);
            this.friendsPanel.push(loadT);

            searchPlayers(q, user.uid).then(results => {
                loadT.destroy();
                if (!results.length) {
                    const nt = this.add.text(cx + cw / 2, resultArea.y + 20, 'Không tìm thấy người chơi nào.', { fontSize: '10px', color: '#2a4050' }).setOrigin(0.5).setDepth(502);
                    this._searchResultEls.push(nt);
                    this.friendsPanel.push(nt);
                    return;
                }
                results.slice(0, 4).forEach((found, i) => {
                    const ry = resultArea.y + i * 54;
                    const rowG = this.add.graphics().setDepth(501);
                    rowG.fillStyle(0x0a1628, 1);
                    rowG.fillRoundedRect(cx, ry, cw, 46, 6);
                    this._searchResultEls.push(rowG);
                    this.friendsPanel.push(rowG);

                    const avG = this.add.graphics().setDepth(502);
                    avG.fillStyle(0x2980b9, 0.9);
                    avG.fillCircle(cx + 24, ry + 23, 16);
                    this._searchResultEls.push(avG);
                    this.friendsPanel.push(avG);
                    const initT = this.add.text(cx + 24, ry + 23, (found.displayName || '?')[0].toUpperCase(), { fontSize: '13px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(503);
                    this._searchResultEls.push(initT);
                    this.friendsPanel.push(initT);
                    const nameT = this.add.text(cx + 48, ry + 14, found.displayName || 'Người chơi', { fontSize: '11px', color: '#e8eef5', fontStyle: 'bold' }).setDepth(502);
                    this._searchResultEls.push(nameT);
                    this.friendsPanel.push(nameT);

                    const addG = this.add.graphics().setDepth(502);
                    const drawAdd = (h) => { addG.clear(); addG.fillStyle(h ? 0x8e44ad : 0x4a235a, 1); addG.fillRoundedRect(cx + cw - 80, ry + 11, 68, 24, 5); };
                    drawAdd(false);
                    this._searchResultEls.push(addG);
                    this.friendsPanel.push(addG);
                    const addTxt = this.add.text(cx + cw - 46, ry + 23, '+ Kết bạn', { fontSize: '8px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(503);
                    this._searchResultEls.push(addTxt);
                    this.friendsPanel.push(addTxt);
                    const addHit = this.add.rectangle(cx + cw - 46, ry + 23, 68, 24, 0, 0).setDepth(504).setInteractive({ useHandCursor: true });
                    this._searchResultEls.push(addHit);
                    this.friendsPanel.push(addHit);
                    addHit.on('pointerover', () => { drawAdd(true); addTxt.setColor('#e8d0ff'); });
                    addHit.on('pointerout', () => { drawAdd(false); addTxt.setColor('#fff'); });
                    addHit.on('pointerdown', (p, lx, ly, ev) => {
                        ev.stopPropagation();
                        const myProfile = { uid: user.uid, displayName: user.displayName || 'Player', photoURL: user.photoURL || '' };
                        sendFriendRequest(user.uid, myProfile, found.uid).then(() => {
                            addTxt.setText('✓ Đã gửi');
                            addHit.disableInteractive();
                            drawAdd(false);
                        }).catch(() => {});
                    });
                });
            }).catch(() => { loadT.setText('Lỗi tìm kiếm.'); });
        };

        sbHit.on('pointerdown', (p, lx, ly, ev) => { ev.stopPropagation(); doSearch(); });
        inputEl.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
    }

    closeFriendsPanel() {
        if (!this.friendsPanel) return;
        this.friendsPanel.forEach(e => e.destroy());
        this.friendsPanel = null;
    }

    openInventoryPanel(tab) {
        if (this.invPanel) this.closeInventoryPanel();
        if (tab !== undefined) this.invActiveTab = tab;
        if (!this.invActiveTab) this.invActiveTab = 'frags';

        // Generate frag textures if MainScene hasn't run yet
        ['frag_common', 'frag_rare'].forEach(key => {
            if (this.textures.exists(key)) return;
            const g = this.add.graphics();
            if (key === 'frag_common') {
                g.fillStyle(0xaa4400); // dark base
                g.fillTriangle(16, 5, 27, 16, 16, 27); g.fillTriangle(16, 5, 5, 16, 16, 27);
                g.fillStyle(0xff8800); // main color
                g.fillTriangle(16, 8, 25, 16, 16, 25); g.fillTriangle(16, 8, 7, 16, 16, 25);
                g.fillStyle(0xffcc66); // inner shine
                g.fillTriangle(16, 10, 22, 15, 16, 18);
                g.fillStyle(0xffffff, 0.5); // top glint
                g.fillTriangle(16, 8, 20, 13, 17, 11);
            } else {
                g.fillStyle(0x550088);
                g.fillTriangle(16, 5, 27, 16, 16, 27); g.fillTriangle(16, 5, 5, 16, 16, 27);
                g.fillStyle(0xaa44ff);
                g.fillTriangle(16, 8, 25, 16, 16, 25); g.fillTriangle(16, 8, 7, 16, 16, 25);
                g.fillStyle(0xddaaff);
                g.fillTriangle(16, 10, 22, 15, 16, 18);
                g.fillStyle(0xffffff, 0.5);
                g.fillTriangle(16, 8, 20, 13, 17, 11);
            }
            g.generateTexture(key, 32, 32);
            g.destroy();
        });

        const { width, height } = this.cameras.main;
        const pw = 490, ph = 300;
        const px = (width - pw) / 2;
        const py = (height - ph) / 2;
        const leftW = Math.round(pw * 0.2);   // 98px sidebar
        const rightX = px + leftW;
        const rightW = pw - leftW;            // 392px content
        const contentY = py + 44;
        const contentH = ph - 44;             // 256px
        this._invBounds = { px, py, pw, ph, rightX, rightW, contentY, contentH };

        this.invPanel = [];

        // Dim overlay — clicks outside panel close it
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.65);
        overlay.fillRect(0, 0, width, height);
        overlay.setDepth(500)
            .setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);
        overlay.on('pointerdown', () => this.closeInventoryPanel());
        this.invPanel.push(overlay);

        // Block overlay from firing when clicking inside panel
        const blocker = this.add.rectangle(px + pw / 2, py + ph / 2, pw, ph, 0x000000, 0)
            .setDepth(501).setInteractive();
        this.invPanel.push(blocker);

        // Outer panel glow (drawn before bg so it appears behind border)
        const panelGlow = this.add.graphics().setDepth(501);
        panelGlow.lineStyle(10, 0x1abc9c, 0.06);
        panelGlow.strokeRoundedRect(px - 5, py - 5, pw + 10, ph + 10, 17);
        panelGlow.lineStyle(5, 0x1abc9c, 0.12);
        panelGlow.strokeRoundedRect(px - 2, py - 2, pw + 4, ph + 4, 14);
        this.invPanel.push(panelGlow);

        // Panel background + border
        const bg = this.add.graphics().setDepth(501);
        bg.fillStyle(0x0d1117, 0.98);
        bg.fillRoundedRect(px, py, pw, ph, 12);
        bg.lineStyle(2, 0x1abc9c, 1);
        bg.strokeRoundedRect(px, py, pw, ph, 12);
        this.invPanel.push(bg);

        // Header bar
        const hdr = this.add.graphics().setDepth(502);
        hdr.fillStyle(0x0f2b26, 1);
        hdr.fillRoundedRect(px + 1, py + 1, pw - 2, 42, { tl: 11, tr: 11, bl: 0, br: 0 });
        this.invPanel.push(hdr);

        const hdiv = this.add.graphics().setDepth(502);
        hdiv.lineStyle(1, 0x1abc9c, 0.5);
        hdiv.lineBetween(px, py + 43, px + pw, py + 43);
        this.invPanel.push(hdiv);

        this.invPanel.push(
            this.add.text(px + pw / 2, py + 12, 'KHO ĐỒ', {
                fontSize: '17px', fontStyle: 'bold', color: '#1abc9c',
                stroke: '#000000', strokeThickness: 3,
            }).setOrigin(0.5, 0).setDepth(503)
        );

        const closeBtn = this.add.text(px + pw - 14, py + 13, '✕', {
            fontSize: '15px', color: '#666666',
        }).setOrigin(1, 0).setDepth(503).setInteractive({ useHandCursor: true });
        closeBtn.on('pointerover', () => closeBtn.setColor('#ff4444'));
        closeBtn.on('pointerout', () => closeBtn.setColor('#666666'));
        closeBtn.on('pointerdown', () => this.closeInventoryPanel());
        this.invPanel.push(closeBtn);

        // Left sidebar background
        const sidebarBg = this.add.graphics().setDepth(502);
        sidebarBg.fillStyle(0x070c10, 1);
        // Stop 12px before panel bottom so the panel's border-radius corner stays fully visible
        sidebarBg.fillRect(px + 2, contentY, leftW - 2, contentH - 12);
        this.invPanel.push(sidebarBg);

        // Sidebar/content vertical divider — stop 2px above panel bottom border
        const vdiv = this.add.graphics().setDepth(503);
        vdiv.lineStyle(1, 0x1abc9c, 0.25);
        vdiv.lineBetween(px + leftW, contentY, px + leftW, py + ph - 2);
        this.invPanel.push(vdiv);

        // === LEFT NAV TABS ===
        const navItems = [
            { id: 'frags',   icon: 'frag_common', label: 'Mảnh' },
            { id: 'weapons', icon: 'Glock_17',     label: 'Vũ khí' },
        ];
        const tabH = 72;

        navItems.forEach((nav, i) => {
            const isActive = this.invActiveTab === nav.id;
            const ty = contentY + i * tabH;

            // Tab fill
            const tabBg = this.add.graphics().setDepth(502);
            if (isActive) {
                tabBg.fillStyle(0x102e28, 1);
                tabBg.fillRect(px + 1, ty, leftW - 1, tabH);
                // Active indicator stripe on right edge
                tabBg.fillStyle(0x1abc9c, 1);
                tabBg.fillRect(px + leftW - 3, ty + 6, 3, tabH - 12);
            }
            if (i > 0) {
                tabBg.lineStyle(1, 0x1a2830, 1);
                tabBg.lineBetween(px + 6, ty, px + leftW - 6, ty);
            }
            this.invPanel.push(tabBg);

            // Icon
            const iconY = ty + tabH / 2 - 12;
            if (this.textures.exists(nav.icon)) {
                const img = this.add.image(px + leftW / 2, iconY, nav.icon).setDepth(504);
                img.setScale(Math.min(22 / img.width, 18 / img.height));
                img.setAlpha(isActive ? 1 : 0.35);
                this.invPanel.push(img);
            }

            // Label
            this.invPanel.push(
                this.add.text(px + leftW / 2, ty + tabH / 2 + 6, nav.label, {
                    fontSize: '10px', color: isActive ? '#1abc9c' : '#4a6070',
                    align: 'center',
                }).setOrigin(0.5, 0).setDepth(504)
            );

            // Invisible hit zone for the tab
            const zone = this.add.rectangle(
                px + leftW / 2, ty + tabH / 2, leftW - 2, tabH, 0x000000, 0
            ).setDepth(505).setInteractive({ useHandCursor: !isActive });
            zone.on('pointerover', () => {
                if (!isActive) { tabBg.fillStyle(0x0c2020, 1); tabBg.fillRect(px + 1, ty, leftW - 1, tabH); }
            });
            zone.on('pointerout', () => {
                if (!isActive) { tabBg.clear(); }
            });
            zone.on('pointerdown', () => { if (!isActive) this.openInventoryPanel(nav.id); });
            this.invPanel.push(zone);
        });

        // === RIGHT CONTENT ===
        if (this.invActiveTab === 'frags') {
            this._drawFragsContent(rightX, contentY, rightW, contentH);
        } else {
            this._drawWeaponsContent(rightX, contentY, rightW, contentH);
        }
    }

    _drawFragsContent(rx, ry, rw, rh) {
        const fragDefs = [
            { key: 'frag_common', label: 'Mảnh thường', border: 0x1abc9c, getValue: () => Economy.getFragCommon() },
            { key: 'frag_rare',   label: 'Mảnh hiếm',   border: 0x1abc9c, getValue: () => Economy.getFragRare() },
        ];

        const sq = 72;
        const gap = 20;
        const totalW = fragDefs.length * sq + (fragDefs.length - 1) * gap;
        const startX = rx + 16;
        const cy = ry + sq / 2 + 16;

        fragDefs.forEach((frag, i) => {
            const fx = startX + i * (sq + gap);

            // Frame
            const frame = this.add.graphics().setDepth(502);
            frame.fillStyle(0x091520, 1);
            frame.fillRoundedRect(fx, cy - sq / 2, sq, sq, 7);
            frame.lineStyle(1.5, frag.border, 0.4);
            frame.strokeRoundedRect(fx, cy - sq / 2, sq, sq, 7);
            this.invPanel.push(frame);

            // Icon centered in frame
            const icon = this.add.image(fx + sq / 2, cy, frag.key).setDepth(503);
            icon.setScale(Math.min(46 / icon.width, 46 / icon.height));
            this.invPanel.push(icon);

            // Count badge — bottom-right corner of frame
            const count = frag.getValue();
            this.invPanel.push(
                this.add.text(fx + sq - 4, cy + sq / 2 - 4, `${count}`, {
                    fontSize: '11px', fontStyle: 'bold', color: '#ffffff',
                    stroke: '#000000', strokeThickness: 3,
                }).setOrigin(1, 1).setDepth(504)
            );

            // Label below frame
            this.invPanel.push(
                this.add.text(fx + sq / 2, cy + sq / 2 + 6, frag.label, {
                    fontSize: '10px', color: '#7a9ab0',
                }).setOrigin(0.5, 0).setDepth(503)
            );

            // Hit zone
            const zone = this.add.rectangle(fx + sq / 2, cy, sq, sq, 0x000000, 0)
                .setDepth(504).setInteractive({ useHandCursor: true });
            zone.on('pointerdown', (ptr, lx, ly, event) => {
                event.stopPropagation();
                if (this._weaponInfoKey === frag.key) {
                    this._hideWeaponInfo();
                } else {
                    this._showFragInfo(frag, fx, cy, sq);
                    this._weaponInfoKey = frag.key;
                }
            });
            this.invPanel.push(zone);
        });
    }

    _drawWeaponsContent(rx, ry, rw, rh) {
        const ownedWeapons = Economy.getOwnedWeapons();
        const cols = 4;
        const hPad = 16;
        const cellW = (rw - hPad * 2) / cols;
        const slotW = cellW - 20, slotH = 60;
        const cellH = 86;
        const rows = Math.ceil(ownedWeapons.length / cols);
        const startY = ry + 20;

        ownedWeapons.forEach((key, i) => {
            const wdata = getWeaponByKey(key);
            if (!wdata) return;
            const col = i % cols;
            const row = Math.floor(i / cols);
            const cx = rx + hPad + col * cellW + cellW / 2;
            const cy = startY + row * cellH;
            const sx = cx - slotW / 2, sy = cy;

            // Slot glow
            const slotGlow = this.add.graphics().setDepth(502);
            slotGlow.lineStyle(6, 0x1abc9c, 0.06);
            slotGlow.strokeRoundedRect(sx - 3, sy - 3, slotW + 6, slotH + 6, 10);
            slotGlow.lineStyle(3, 0x1abc9c, 0.1);
            slotGlow.strokeRoundedRect(sx - 1, sy - 1, slotW + 2, slotH + 2, 8);
            this.invPanel.push(slotGlow);

            // Slot background
            const slot = this.add.graphics().setDepth(502);
            slot.fillStyle(0x091520, 1);
            slot.fillRoundedRect(sx, sy, slotW, slotH, 7);
            slot.fillStyle(0xffffff, 0.025);
            slot.fillRoundedRect(sx, sy, slotW, slotH * 0.4, { tl: 7, tr: 7, bl: 0, br: 0 });
            slot.lineStyle(1.5, 0x1abc9c, 0.3);
            slot.strokeRoundedRect(sx, sy, slotW, slotH, 7);
            this.invPanel.push(slot);

            // Weapon icon
            if (this.textures.exists(wdata.texture)) {
                const img = this.add.image(cx, cy + slotH / 2, wdata.texture).setDepth(503);
                img.setScale(Math.min(56 / img.width, 40 / img.height));
                this.invPanel.push(img);
            }

            // Weapon name
            this.invPanel.push(
                this.add.text(cx, cy + slotH + 4, wdata.name, {
                    fontSize: '9px', color: '#7a9ab0',
                    wordWrap: { width: slotW },
                    align: 'center',
                }).setOrigin(0.5, 0).setDepth(503)
            );

            // Hit zone — triggers weapon info on hover/tap
            const zone = this.add.rectangle(cx, cy + slotH / 2, slotW, slotH, 0x000000, 0)
                .setDepth(504).setInteractive({ useHandCursor: true });
            zone.on('pointerdown', (ptr, lx, ly, event) => {
                event.stopPropagation();
                if (this._weaponInfoKey === wdata.key) {
                    this._hideWeaponInfo();
                } else {
                    this._showWeaponInfo(wdata, cx, cy);
                    this._weaponInfoKey = wdata.key;
                }
            });
            this.invPanel.push(zone);
        });
    }

    _showFragInfo(frag, fx, cy, sq) {
        this._hideWeaponInfo();
        if (!this._invBounds) return;
        const { px, py, pw, ph, contentY } = this._invBounds;

        const fragDesc = {
            frag_common: 'Thu thập từ quái vật và rương.\nDùng để nâng cấp vũ khí.',
            frag_rare:   'Rơi ngẫu nhiên từ quái mạnh.\nDùng để chế tạo vũ khí đặc biệt.',
        };

        const iw = 200, ih = 100;
        let ix = fx;
        let iy = cy + sq / 2 + 24;
        if (iy + ih > py + ph - 4) iy = cy - sq / 2 - ih - 8;
        ix = Math.max(px + 105, Math.min(px + pw - iw - 4, ix));

        this.weaponInfo = [];

        const g = this.add.graphics().setDepth(600);
        g.fillStyle(0x07101c, 0.97);
        g.fillRoundedRect(ix, iy, iw, ih, 10);
        g.lineStyle(7, 0x1abc9c, 0.1);
        g.strokeRoundedRect(ix - 3, iy - 3, iw + 6, ih + 6, 13);
        g.lineStyle(1.5, 0x1abc9c, 0.7);
        g.strokeRoundedRect(ix, iy, iw, ih, 10);
        this.weaponInfo.push(g);

        this.weaponInfo.push(
            this.add.text(ix + 12, iy + 12, frag.label, {
                fontSize: '13px', fontStyle: 'bold', color: '#e8eef5',
            }).setDepth(601)
        );

        const dg = this.add.graphics().setDepth(601);
        dg.lineStyle(1, 0x1a3040, 1);
        dg.lineBetween(ix + 10, iy + 32, ix + iw - 10, iy + 32);
        this.weaponInfo.push(dg);

        this.weaponInfo.push(
            this.add.text(ix + 12, iy + 38, `Số lượng: ${frag.getValue()}`, {
                fontSize: '11px', fontStyle: 'bold', color: '#8bbccc',
            }).setDepth(601)
        );
        this.weaponInfo.push(
            this.add.text(ix + 12, iy + 58, fragDesc[frag.key] || '', {
                fontSize: '10px', color: '#3d6070',
                wordWrap: { width: iw - 24 },
            }).setDepth(601)
        );
    }

    _showWeaponInfo(wdata, slotCX, slotCY) {
        this._hideWeaponInfo();
        if (!this._invBounds) return;

        const { px, py, pw, ph, rightX, contentY } = this._invBounds;
        const slotH = 60;
        const catName = {
            1:'Súng ngắn', 2:'Tiểu liên', 3:'Shotgun', 4:'Súng trường',
            5:'Battle Rifle', 6:'Bắn tỉa', 7:'Súng máy', 8:'Tên lửa',
            9:'Cận chiến', 10:'Vật ném',
        };

        const stats = [];
        stats.push({ label: 'Sát thương', value: wdata.damage ? `${wdata.damage}` : '—' });
        if (wdata.maxAmmo > 0) stats.push({ label: 'Số đạn',   value: `${wdata.maxAmmo}` });
        if (wdata.range)       stats.push({ label: 'Tầm bắn',  value: `${wdata.range}` });
        if (wdata.fireRate)    stats.push({ label: 'Nhịp bắn', value: `${wdata.fireRate}ms` });

        const iw = 210;
        const ih = 54 + stats.length * 20 + 12;

        // Position below slot; flip above if it would overflow panel bottom
        let iy = slotCY + slotH + 10;
        if (iy + ih > py + ph - 4) iy = slotCY - ih - 10;
        iy = Math.max(contentY + 2, Math.min(iy, py + ph - ih - 4));
        let ix = slotCX - iw / 2;
        ix = Math.max(rightX + 4, Math.min(px + pw - iw - 4, ix));

        this.weaponInfo = [];

        // Background
        const g = this.add.graphics().setDepth(600);
        g.fillStyle(0x07101c, 0.97);
        g.fillRoundedRect(ix, iy, iw, ih, 10);
        g.lineStyle(7, 0x3498db, 0.1);
        g.strokeRoundedRect(ix - 3, iy - 3, iw + 6, ih + 6, 13);
        g.lineStyle(1.5, 0x3498db, 0.8);
        g.strokeRoundedRect(ix, iy, iw, ih, 10);
        this.weaponInfo.push(g);

        // Weapon icon
        if (this.textures.exists(wdata.texture)) {
            const img = this.add.image(ix + 28, iy + 26, wdata.texture).setDepth(601);
            img.setScale(Math.min(38 / img.width, 28 / img.height));
            this.weaponInfo.push(img);
        }

        // Name + category badge
        this.weaponInfo.push(
            this.add.text(ix + 58, iy + 12, wdata.name, {
                fontSize: '13px', fontStyle: 'bold', color: '#e8eef5',
            }).setDepth(601)
        );
        this.weaponInfo.push(
            this.add.text(ix + 58, iy + 30, catName[wdata.category] || '—', {
                fontSize: '10px', color: '#2980b9',
            }).setDepth(601)
        );

        // Divider
        const dg = this.add.graphics().setDepth(601);
        dg.lineStyle(1, 0x1a3040, 1);
        dg.lineBetween(ix + 10, iy + 52, ix + iw - 10, iy + 52);
        this.weaponInfo.push(dg);

        // Stats rows
        stats.forEach((stat, i) => {
            const sy = iy + 60 + i * 20;
            this.weaponInfo.push(
                this.add.text(ix + 12, sy, stat.label, {
                    fontSize: '10px', color: '#3d6070',
                }).setDepth(601)
            );
            this.weaponInfo.push(
                this.add.text(ix + iw - 12, sy, stat.value, {
                    fontSize: '10px', fontStyle: 'bold', color: '#8bbccc',
                }).setOrigin(1, 0).setDepth(601)
            );
        });
    }

    _hideWeaponInfo() {
        if (!this.weaponInfo) return;
        this.weaponInfo.forEach(e => e.destroy());
        this.weaponInfo = null;
        this._weaponInfoKey = null;
    }

    closeInventoryPanel() {
        this._hideWeaponInfo();
        if (!this.invPanel) return;
        this.invPanel.forEach(e => e.destroy());
        this.invPanel = null;
    }

    createStartButton(x, y) {
        const btn = this.add.container(x, y);

        // Premium Glow Effect
        const glow = this.add.graphics();
        glow.fillStyle(0x3498db, 0.3);
        glow.fillRoundedRect(-65, -20, 130, 40, 10);
        glow.setAlpha(0.5);

        // Button Background with Gradient-like stroke
        const bg = this.add.rectangle(0, 0, 120, 35, 0x2980b9, 1);
        bg.setStrokeStyle(3, 0xffffff, 1);

        // Inner depth effect
        const inner = this.add.graphics();
        inner.lineStyle(2, 0x3498db, 1);
        inner.strokeRoundedRect(-56, -14, 112, 28, 5);

        const text = this.add.text(0, 0, 'BẮT ĐẦU', {
            fontSize: '18px',
            color: '#ffffff',
            fontStyle: 'bold',
            shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 2, fill: true }
        }).setOrigin(0.5);

        btn.add([glow, bg, inner, text]);
        bg.setInteractive({ useHandCursor: true });

        bg.on('pointerover', () => {
            bg.setFillStyle(0x3498db, 1);
            bg.setStrokeStyle(4, 0x76c442, 1);
            btn.setScale(1.1);
        });
        bg.on('pointerout', () => {
            bg.setFillStyle(0x2980b9, 1);
            bg.setStrokeStyle(3, 0xffffff, 1);
            btn.setScale(1);
        });
        bg.on('pointerdown', () => {
            btn.setScale(0.95);
            this.time.delayedCall(100, () => btn.setScale(1));
            this.showGameModePopup();
        });
    }

    showGameModePopup() {
        if (this.gameModePopup) return;
        const { width, height } = this.scale;
        this.gameModePopup = [];

        const pw = 340, ph = 210;
        const px = (width - pw) / 2, py = (height - ph) / 2;

        const ov = this.add.rectangle(0, 0, width, height, 0x000000, 0.65).setOrigin(0).setDepth(200).setInteractive();
        ov.on('pointerdown', () => this.closeGameModePopup());
        this.gameModePopup.push(ov);

        const pg = this.add.graphics().setDepth(201);
        pg.fillStyle(0x07101c, 0.98);
        pg.fillRoundedRect(px, py, pw, ph, 12);
        pg.lineStyle(1.5, 0x1abc9c, 0.6);
        pg.strokeRoundedRect(px, py, pw, ph, 12);
        this.gameModePopup.push(pg);

        const hg = this.add.graphics().setDepth(201);
        hg.fillStyle(0x0e8a70, 1);
        hg.fillRoundedRect(px + 1, py + 1, pw - 2, 34, { tl: 11, tr: 11, bl: 0, br: 0 });
        this.gameModePopup.push(hg);

        this.gameModePopup.push(
            this.add.text(px + pw / 2, py + 18, 'CHỌN CHẾ ĐỘ CHƠI', { fontSize: '12px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(202)
        );

        const xBtn = this.add.text(px + pw - 18, py + 18, '✕', { fontSize: '13px', color: '#99ccbb' }).setOrigin(0.5).setDepth(202).setInteractive({ useHandCursor: true });
        xBtn.on('pointerdown', () => this.closeGameModePopup());
        xBtn.on('pointerover', () => xBtn.setColor('#ffffff'));
        xBtn.on('pointerout', () => xBtn.setColor('#99ccbb'));
        this.gameModePopup.push(xBtn);

        const makeBtn = (bx, by, bw, bh, label, color, hoverColor, onClick) => {
            const bg = this.add.graphics().setDepth(202);
            const draw = (hover) => {
                bg.clear();
                bg.fillStyle(hover ? hoverColor : color, 1);
                bg.fillRoundedRect(bx - bw / 2, by - bh / 2, bw, bh, 9);
                bg.lineStyle(1.5, hover ? 0xffffff : 0x33667755, 1);
                bg.strokeRoundedRect(bx - bw / 2, by - bh / 2, bw, bh, 9);
            };
            draw(false);
            const txt = this.add.text(bx, by - 7, label, { fontSize: '13px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(203);
            const hit = this.add.rectangle(bx, by, bw, bh, 0, 0).setDepth(204).setInteractive({ useHandCursor: true });
            hit.on('pointerdown', onClick);
            hit.on('pointerover', () => draw(true));
            hit.on('pointerout', () => draw(false));
            return [bg, txt, hit];
        };

        this.gameModePopup.push(...makeBtn(
            px + pw / 2 - 84, py + 130, 148, 58,
            '🧍 Chơi 1 mình', 0x0e6b58, 0x1abc9c,
            () => {
                this.closeGameModePopup();
                this.cameras.main.fadeOut(500, 0, 0, 0);
                this.time.delayedCall(500, () => {
                    this.registry.set('selectedCharacter', this.selectedCharacterKey);
                    this.scene.start('MainScene');
                });
            }
        ));
        this.gameModePopup.push(
            this.add.text(px + pw / 2 - 84, py + 152, 'Chơi offline', { fontSize: '9px', color: '#66aa88' }).setOrigin(0.5).setDepth(203)
        );

        this.gameModePopup.push(...makeBtn(
            px + pw / 2 + 84, py + 130, 148, 58,
            '👥 Chơi 3 người', 0x1a5a8a, 0x2980b9,
            () => {
                this.closeGameModePopup();
                this.showMultiplayerLobby();
            }
        ));
        this.gameModePopup.push(
            this.add.text(px + pw / 2 + 84, py + 152, 'Kết nối online', { fontSize: '9px', color: '#6699bb' }).setOrigin(0.5).setDepth(203)
        );

        // Join room link
        const joinTxt = this.add.text(px + pw / 2, py + 188, '🔑 Tham gia phòng bằng mã mời', {
            fontSize: '10px', color: '#2980b9',
        }).setOrigin(0.5).setDepth(203).setInteractive({ useHandCursor: true });
        joinTxt.on('pointerover', () => joinTxt.setStyle({ color: '#5fa8d8', fontSize: '10px' }));
        joinTxt.on('pointerout', () => joinTxt.setStyle({ color: '#2980b9', fontSize: '10px' }));
        joinTxt.on('pointerdown', () => {
            this.closeGameModePopup();
            this.showJoinRoomPopup();
        });
        this.gameModePopup.push(joinTxt);
    }

    showFriendsList(inviteLink, roomCode) {
        if (this.friendsPopup) return;
        const { width, height } = this.scale;
        this.friendsPopup = [];

        const pw = 320, ph = 380;
        const px = (width - pw) / 2, py = (height - ph) / 2;

        const ov = this.add.rectangle(0, 0, width, height, 0x000000, 0.55).setOrigin(0).setDepth(210).setInteractive();
        // Không close khi click overlay vì DOM input sẽ trigger event này
        this.friendsPopup.push(ov);

        const pg = this.add.graphics().setDepth(211);
        pg.fillStyle(0x07101c, 0.99);
        pg.fillRoundedRect(px, py, pw, ph, 12);
        pg.lineStyle(1.5, 0x2980b9, 0.7);
        pg.strokeRoundedRect(px, py, pw, ph, 12);
        this.friendsPopup.push(pg);

        const hg = this.add.graphics().setDepth(211);
        hg.fillStyle(0x1a5a8a, 1);
        hg.fillRoundedRect(px + 1, py + 1, pw - 2, 34, { tl: 11, tr: 11, bl: 0, br: 0 });
        this.friendsPopup.push(hg);

        this.friendsPopup.push(
            this.add.text(px + pw / 2, py + 18, 'MỜI BẠN BÈ', { fontSize: '12px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(212)
        );

        const xBtn = this.add.text(px + pw - 18, py + 18, '✕', { fontSize: '13px', color: '#99bbcc' }).setOrigin(0.5).setDepth(212).setInteractive({ useHandCursor: true });
        xBtn.on('pointerdown', () => this.closeFriendsList());
        xBtn.on('pointerover', () => xBtn.setColor('#ffffff'));
        xBtn.on('pointerout', () => xBtn.setColor('#99bbcc'));
        this.friendsPopup.push(xBtn);

        // Search bar (DOM) — positioned using canvas scale
        const inputEl = document.createElement('input');
        inputEl.type = 'text';
        inputEl.placeholder = 'Tìm bạn bè...';
        const _p1 = this._domPos(px + 14, py + 44, pw - 90, 28);
        inputEl.style.cssText = [
            'position:fixed', `left:${_p1.left}px`, `top:${_p1.top}px`,
            `width:${_p1.w}px`, `height:${_p1.h}px`,
            'background:#0d2535', 'border:1px solid #1a3040',
            'border-radius:6px', 'color:#e8eef5',
            `font-size:${_p1.fs}px`, 'padding:0 8px', 'outline:none', 'box-sizing:border-box',
        ].join(';');
        inputEl.addEventListener('mousedown', e => e.stopPropagation());
        inputEl.addEventListener('pointerdown', e => e.stopPropagation());
        document.body.appendChild(inputEl);
        this.friendsPopup.push({ destroy: () => inputEl.remove() });

        // Search button
        const searchG = this.add.graphics().setDepth(211);
        const drawSearch = (h) => {
            searchG.clear();
            searchG.fillStyle(h ? 0x2980b9 : 0x1a5a8a, 1);
            searchG.fillRoundedRect(px + pw - 70, py + 44, 56, 28, 6);
        };
        drawSearch(false);
        this.friendsPopup.push(searchG);
        this.friendsPopup.push(
            this.add.text(px + pw - 42, py + 58, 'Tìm', { fontSize: '11px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(212)
        );
        const searchHit = this.add.rectangle(px + pw - 42, py + 58, 56, 28, 0, 0).setDepth(213).setInteractive({ useHandCursor: true });
        searchHit.on('pointerover', () => drawSearch(true));
        searchHit.on('pointerout', () => drawSearch(false));
        this.friendsPopup.push(searchHit);

        // Divider
        const divG = this.add.graphics().setDepth(211);
        divG.lineStyle(1, 0x1a3040, 1);
        divG.lineBetween(px + 12, py + 80, px + pw - 12, py + 80);
        this.friendsPopup.push(divG);

        // List area — load friends then render
        const listAreaY = py + 88;
        const listAreaH = ph - 140;
        const loadingTxt = this.add.text(px + pw / 2, listAreaY + listAreaH / 2, 'Đang tải...', {
            fontSize: '11px', color: '#3d6070',
        }).setOrigin(0.5).setDepth(212);
        this.friendsPopup.push(loadingTxt);

        const user = auth.currentUser;
        if (!user) {
            loadingTxt.setText('Đăng nhập để dùng tính năng này');
            return;
        }

        const renderList = (friends) => {
            loadingTxt.destroy();
            if (friends.length === 0) {
                const emptyTxt = this.add.text(px + pw / 2, listAreaY + listAreaH / 2 - 10, 'Chưa có bạn bè.\nDùng ô tìm kiếm bên trên.', {
                    fontSize: '10px', color: '#2a4050', align: 'center',
                }).setOrigin(0.5).setDepth(212);
                this.friendsPopup.push(emptyTxt);
                return;
            }

            friends.slice(0, 5).forEach((friend, i) => {
                const fy = listAreaY + i * 54;
                // Row bg
                const rowG = this.add.graphics().setDepth(211);
                rowG.fillStyle(0x0a1e2e, 1);
                rowG.fillRoundedRect(px + 12, fy, pw - 24, 46, 6);
                this.friendsPopup.push(rowG);

                // Avatar circle + initial
                const colors = [0x1abc9c, 0x2980b9, 0xe67e22, 0x8e44ad, 0xe74c3c];
                const avG = this.add.graphics().setDepth(212);
                avG.fillStyle(colors[i % colors.length], 0.8);
                avG.fillCircle(px + 36, fy + 23, 16);
                this.friendsPopup.push(avG);
                this.friendsPopup.push(
                    this.add.text(px + 36, fy + 23, (friend.displayName || '?')[0].toUpperCase(), {
                        fontSize: '13px', color: '#ffffff', fontStyle: 'bold',
                    }).setOrigin(0.5).setDepth(213)
                );

                // Name
                this.friendsPopup.push(
                    this.add.text(px + 60, fy + 14, friend.displayName || 'Người chơi', {
                        fontSize: '11px', color: '#e8eef5', fontStyle: 'bold',
                    }).setDepth(212)
                );

                // Invite button
                const ibG = this.add.graphics().setDepth(212);
                const drawIb = (h) => {
                    ibG.clear();
                    ibG.fillStyle(h ? 0x1abc9c : 0x0e6b58, 1);
                    ibG.fillRoundedRect(px + pw - 82, fy + 12, 66, 24, 5);
                };
                drawIb(false);
                this.friendsPopup.push(ibG);
                const ibTxt = this.add.text(px + pw - 49, fy + 24, 'Mời', { fontSize: '10px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(213);
                this.friendsPopup.push(ibTxt);
                const ibHit = this.add.rectangle(px + pw - 49, fy + 24, 66, 24, 0, 0).setDepth(214).setInteractive({ useHandCursor: true });
                this.friendsPopup.push(ibHit);

                const toastFriend = this.add.text(px + pw / 2, py + ph - 28, `✓ Đã gửi lời mời cho ${friend.displayName}!`, {
                    fontSize: '9px', color: '#1abc9c',
                }).setOrigin(0.5).setDepth(212).setAlpha(0);
                this.friendsPopup.push(toastFriend);

                ibHit.on('pointerover', () => { drawIb(true); ibTxt.setColor('#aaffdd'); });
                ibHit.on('pointerout', () => { drawIb(false); ibTxt.setColor('#ffffff'); });
                ibHit.on('pointerdown', () => {
                    const me = auth.currentUser;
                    if (me && roomCode) {
                        ibHit.disableInteractive();
                        ibTxt.setText('...');
                        const myProfile = { uid: me.uid, displayName: me.displayName || 'Player', photoURL: me.photoURL || '' };
                        const resetBtn = () => {
                            if (ibTxt.active) ibTxt.setText('Mời');
                            if (ibHit.active) ibHit.setInteractive({ useHandCursor: true });
                        };
                        const showToast = (msg, color) => {
                            if (toastFriend.active) {
                                toastFriend.setText(msg).setColor(color).setAlpha(1);
                                this.time.delayedCall(2500, () => { if (toastFriend.active) toastFriend.setAlpha(0); });
                            }
                        };
                        const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 6000));
                        Promise.race([sendRoomInvite(me.uid, myProfile, friend.uid, roomCode), timeout])
                            .then(() => { resetBtn(); showToast(`✓ Đã gửi lời mời cho ${friend.displayName}!`, '#1abc9c'); })
                            .catch(err => {
                                console.warn('[Invite] sendRoomInvite failed:', err?.code || err?.message);
                                resetBtn();
                                showToast('✗ Gửi thất bại, thử lại', '#ff5555');
                            });
                    } else {
                        navigator.clipboard.writeText(inviteLink).catch(() => {});
                        toastFriend.setText('✓ Đã sao chép link mời!').setColor('#1abc9c').setAlpha(1);
                        this.time.delayedCall(2500, () => { if (toastFriend.active) toastFriend.setAlpha(0); });
                    }
                });
            });
        };

        const renderSearchResults = (results) => {
            // Clear previous search results
            this.friendsPopup.filter(e => e._isSearchResult).forEach(e => e.destroy());
            this.friendsPopup = this.friendsPopup.filter(e => !e._isSearchResult);

            results.slice(0, 4).forEach((user, i) => {
                const fy = listAreaY + i * 54;
                const rowG = this.add.graphics().setDepth(211);
                rowG.fillStyle(0x0a1e2e, 1);
                rowG.fillRoundedRect(px + 12, fy, pw - 24, 46, 6);
                rowG._isSearchResult = true;
                this.friendsPopup.push(rowG);

                const avG = this.add.graphics().setDepth(212);
                avG.fillStyle(0x2980b9, 0.8);
                avG.fillCircle(px + 36, fy + 23, 16);
                avG._isSearchResult = true;
                this.friendsPopup.push(avG);

                const initTxt = this.add.text(px + 36, fy + 23, (user.displayName || '?')[0].toUpperCase(), {
                    fontSize: '13px', color: '#ffffff', fontStyle: 'bold',
                }).setOrigin(0.5).setDepth(213);
                initTxt._isSearchResult = true;
                this.friendsPopup.push(initTxt);

                const nameTxt = this.add.text(px + 60, fy + 14, user.displayName || 'Người chơi', {
                    fontSize: '11px', color: '#e8eef5', fontStyle: 'bold',
                }).setDepth(212);
                nameTxt._isSearchResult = true;
                this.friendsPopup.push(nameTxt);

                // Add friend button
                const addG = this.add.graphics().setDepth(212);
                addG._isSearchResult = true;
                const drawAdd = (h) => {
                    addG.clear();
                    addG.fillStyle(h ? 0x2980b9 : 0x1a5a8a, 1);
                    addG.fillRoundedRect(px + pw - 90, fy + 12, 74, 24, 5);
                };
                drawAdd(false);
                this.friendsPopup.push(addG);

                const addTxt = this.add.text(px + pw - 53, fy + 24, '+ Kết bạn', { fontSize: '9px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(213);
                addTxt._isSearchResult = true;
                this.friendsPopup.push(addTxt);

                const addHit = this.add.rectangle(px + pw - 53, fy + 24, 74, 24, 0, 0).setDepth(214).setInteractive({ useHandCursor: true });
                addHit._isSearchResult = true;
                this.friendsPopup.push(addHit);

                addHit.on('pointerover', () => { drawAdd(true); addTxt.setColor('#aaddff'); });
                addHit.on('pointerout', () => { drawAdd(false); addTxt.setColor('#ffffff'); });
                addHit.on('pointerdown', () => {
                    const me = auth.currentUser;
                    if (!me) return;
                    const myProfile = { uid: me.uid, displayName: me.displayName || 'Player', photoURL: me.photoURL || '' };
                    sendFriendRequest(me.uid, myProfile, user.uid).catch(() => {});
                    addTxt.setText('✓ Đã gửi');
                    addHit.disableInteractive();
                });
            });
        };

        getFriends(user.uid).then(friends => renderList(friends)).catch(() => {
            loadingTxt.setText('Không thể tải danh sách bạn bè');
        });

        searchHit.on('pointerdown', () => {
            const q = inputEl.value.trim();
            if (!q) return;
            searchPlayers(q, user.uid).then(results => {
                loadingTxt.setAlpha(0);
                renderSearchResults(results.length ? results : []);
                if (!results.length) {
                    const notFound = this.add.text(px + pw / 2, listAreaY + 30, 'Không tìm thấy người chơi', {
                        fontSize: '10px', color: '#2a4050',
                    }).setOrigin(0.5).setDepth(212);
                    notFound._isSearchResult = true;
                    this.friendsPopup.push(notFound);
                }
            }).catch(() => {});
        });
        inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') searchHit.emit('pointerdown'); });
    }

    closeFriendsList() {
        if (!this.friendsPopup) return;
        this.friendsPopup.forEach(e => e.destroy());
        this.friendsPopup = null;
    }

    showJoinRoomPopup() {
        if (this.joinPopup) return;
        const { width, height } = this.scale;
        this.joinPopup = [];

        const pw = 320, ph = 180;
        const px = (width - pw) / 2, py = (height - ph) / 2;

        const ov = this.add.rectangle(0, 0, width, height, 0x000000, 0.65).setOrigin(0).setDepth(200).setInteractive();
        // Không close khi click overlay vì DOM input sẽ trigger event này
        this.joinPopup.push(ov);

        const pg = this.add.graphics().setDepth(201);
        pg.fillStyle(0x07101c, 0.98);
        pg.fillRoundedRect(px, py, pw, ph, 12);
        pg.lineStyle(1.5, 0x2980b9, 0.6);
        pg.strokeRoundedRect(px, py, pw, ph, 12);
        this.joinPopup.push(pg);

        const hg = this.add.graphics().setDepth(201);
        hg.fillStyle(0x1a5a8a, 1);
        hg.fillRoundedRect(px + 1, py + 1, pw - 2, 34, { tl: 11, tr: 11, bl: 0, br: 0 });
        this.joinPopup.push(hg);

        this.joinPopup.push(
            this.add.text(px + pw / 2, py + 18, 'NHẬP MÃ PHÒNG', { fontSize: '12px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(202)
        );

        const backBtn = this.add.text(px + 18, py + 18, '←', { fontSize: '16px', color: '#99bbcc' }).setOrigin(0.5).setDepth(202).setInteractive({ useHandCursor: true });
        backBtn.on('pointerdown', () => { this.closeJoinRoomPopup(); this.showGameModePopup(); });
        backBtn.on('pointerover', () => backBtn.setColor('#ffffff'));
        backBtn.on('pointerout', () => backBtn.setColor('#99bbcc'));
        this.joinPopup.push(backBtn);

        // Input box (DOM) — positioned using canvas scale
        const inputEl = document.createElement('input');
        inputEl.type = 'text';
        inputEl.maxLength = 6;
        inputEl.placeholder = 'VD: U3GI8M';
        const _p2 = this._domPos(px + 40, py + 56, pw - 80, 30);
        inputEl.style.cssText = [
            'position:fixed', `left:${_p2.left}px`, `top:${_p2.top}px`,
            `width:${_p2.w}px`, `height:${_p2.h}px`,
            'background:#0d2535', 'border:1px solid #1a3040',
            'border-radius:6px', 'color:#1abc9c',
            `font-size:${Math.round(_p2.fs * 1.4)}px`, 'font-weight:bold',
            'text-align:center', `letter-spacing:${Math.round(_p2.fs * 0.4)}px`,
            'outline:none', 'padding:0', 'box-sizing:border-box',
        ].join(';');
        inputEl.addEventListener('mousedown', e => e.stopPropagation());
        inputEl.addEventListener('pointerdown', e => e.stopPropagation());
        document.body.appendChild(inputEl);
        inputEl.focus();
        this.joinPopup.push({ destroy: () => inputEl.remove() });

        // Confirm button
        const confirmG = this.add.graphics().setDepth(201);
        const drawConfirm = (hover) => {
            confirmG.clear();
            confirmG.fillStyle(hover ? 0x1abc9c : 0x0e6b58, 1);
            confirmG.fillRoundedRect(px + pw / 2 - 60, py + ph - 50, 120, 32, 8);
        };
        drawConfirm(false);
        this.joinPopup.push(confirmG);
        this.joinPopup.push(
            this.add.text(px + pw / 2, py + ph - 34, 'Tham gia', { fontSize: '13px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(202)
        );
        const confirmHit = this.add.rectangle(px + pw / 2, py + ph - 34, 120, 32, 0, 0).setDepth(204).setInteractive({ useHandCursor: true });
        confirmHit.on('pointerover', () => drawConfirm(true));
        confirmHit.on('pointerout', () => drawConfirm(false));
        confirmHit.on('pointerdown', () => {
            const code = inputEl.value.trim().toUpperCase();
            if (code.length < 4) return;
            this.closeJoinRoomPopup();
            this.showMultiplayerLobby(code);
        });
        this.joinPopup.push(confirmHit);
    }

    closeJoinRoomPopup() {
        if (!this.joinPopup) return;
        this.joinPopup.forEach(e => e.destroy());
        this.joinPopup = null;
    }

    closeGameModePopup() {
        if (!this.gameModePopup) return;
        this.gameModePopup.forEach(e => e.destroy());
        this.gameModePopup = null;
    }

    showMultiplayerLobby(existingCode, isReturn = false) {
        if (this.lobbyPopup) return;
        const { width, height } = this.scale;
        this.lobbyPopup = [];

        const pw = 400, ph = 350;
        const px = (width - pw) / 2, py = (height - ph) / 2;
        const isHost = !existingCode && !isReturn;
        const roomCode = existingCode || Math.random().toString(36).substring(2, 8).toUpperCase();
        const inviteLink = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;

        const ov = this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0).setDepth(200).setInteractive();
        this.lobbyPopup.push(ov);

        const pg = this.add.graphics().setDepth(201);
        pg.fillStyle(0x07101c, 0.98);
        pg.fillRoundedRect(px, py, pw, ph, 12);
        pg.lineStyle(1.5, 0x2980b9, 0.7);
        pg.strokeRoundedRect(px, py, pw, ph, 12);
        this.lobbyPopup.push(pg);

        const hg = this.add.graphics().setDepth(201);
        hg.fillStyle(0x1a5a8a, 1);
        hg.fillRoundedRect(px + 1, py + 1, pw - 2, 34, { tl: 11, tr: 11, bl: 0, br: 0 });
        this.lobbyPopup.push(hg);

        this.lobbyPopup.push(
            this.add.text(px + pw / 2, py + 18, 'PHÒNG CHỜ', { fontSize: '13px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(202)
        );

        const backBtn = this.add.text(px + 18, py + 18, '←', { fontSize: '16px', color: '#99bbcc' }).setOrigin(0.5).setDepth(202).setInteractive({ useHandCursor: true });
        backBtn.on('pointerdown', () => { this.closeMultiplayerLobby(); this.showGameModePopup(); });
        backBtn.on('pointerover', () => backBtn.setColor('#ffffff'));
        backBtn.on('pointerout', () => backBtn.setColor('#99bbcc'));
        this.lobbyPopup.push(backBtn);

        const xBtn = this.add.text(px + pw - 18, py + 18, '✕', { fontSize: '13px', color: '#99bbcc' }).setOrigin(0.5).setDepth(202).setInteractive({ useHandCursor: true });
        xBtn.on('pointerdown', () => this.closeMultiplayerLobby());
        xBtn.on('pointerover', () => xBtn.setColor('#ffffff'));
        xBtn.on('pointerout', () => xBtn.setColor('#99bbcc'));
        this.lobbyPopup.push(xBtn);

        // Room code + copy row
        this.lobbyPopup.push(
            this.add.text(px + pw / 2, py + 50, 'MÃ PHÒNG', { fontSize: '9px', color: '#5fa8b8', fontStyle: 'bold' }).setOrigin(0.5).setDepth(202)
        );

        const codeG = this.add.graphics().setDepth(201);
        codeG.fillStyle(0x0d2535, 1);
        codeG.fillRoundedRect(px + pw / 2 - 90, py + 60, 148, 28, 6);
        codeG.lineStyle(1, 0x1a3040, 1);
        codeG.strokeRoundedRect(px + pw / 2 - 90, py + 60, 148, 28, 6);
        this.lobbyPopup.push(codeG);
        this.lobbyPopup.push(
            this.add.text(px + pw / 2 - 16, py + 74, roomCode, { fontSize: '15px', color: '#1abc9c', fontStyle: 'bold', letterSpacing: 6 }).setOrigin(0.5).setDepth(202)
        );

        // Copy link button (right of code box)
        const copyG = this.add.graphics().setDepth(201);
        const drawCopyBtn = (hover) => {
            copyG.clear();
            copyG.fillStyle(hover ? 0x1e6e9e : 0x133350, 1);
            copyG.fillRoundedRect(px + pw / 2 + 64, py + 60, 62, 28, 6);
            copyG.lineStyle(1, hover ? 0x2980b9 : 0x1a3a50, 1);
            copyG.strokeRoundedRect(px + pw / 2 + 64, py + 60, 62, 28, 6);
        };
        drawCopyBtn(false);
        this.lobbyPopup.push(copyG);

        const copyTxt = this.add.text(px + pw / 2 + 95, py + 74, '📋 Sao chép', { fontSize: '8px', color: '#7ec8e3', fontStyle: 'bold' }).setOrigin(0.5).setDepth(203);
        this.lobbyPopup.push(copyTxt);

        const copyHit = this.add.rectangle(px + pw / 2 + 95, py + 74, 62, 28, 0, 0).setDepth(204).setInteractive({ useHandCursor: true });
        this.lobbyPopup.push(copyHit);

        // Toast text (hidden initially)
        const toastTxt = this.add.text(px + pw / 2, py + 96, '✓ Đã sao chép link mời!', {
            fontSize: '9px', color: '#1abc9c', fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(202).setAlpha(0);
        this.lobbyPopup.push(toastTxt);

        copyHit.on('pointerover', () => drawCopyBtn(true));
        copyHit.on('pointerout', () => drawCopyBtn(false));
        copyHit.on('pointerdown', () => {
            navigator.clipboard.writeText(inviteLink).catch(() => {});
            toastTxt.setAlpha(1);
            this.time.delayedCall(2000, () => { if (toastTxt.active) toastTxt.setAlpha(0); });
        });

        // Player slots — dynamic, re-rendered on Firestore update
        const slotW = 100, slotH = 100, slotGap = 14;
        const totalW = 3 * slotW + 2 * slotGap;
        const slotStartX = px + (pw - totalW) / 2;
        const slotY = py + 112;
        this._lobbySlotEls = [];

        const renderSlots = (players) => {
            this._lobbySlotEls.forEach(e => e && e.destroy && e.destroy());
            this._lobbySlotEls = [];

            for (let i = 0; i < 3; i++) {
                const p = players[i] || null;
                const sx = slotStartX + i * (slotW + slotGap);

                const sg = this.add.graphics().setDepth(201);
                sg.fillStyle(p ? 0x0d2535 : 0x050e18, 1);
                sg.fillRoundedRect(sx, slotY, slotW, slotH, 8);
                sg.lineStyle(1.5, p ? 0x1abc9c : 0x1a3040, 1);
                sg.strokeRoundedRect(sx, slotY, slotW, slotH, 8);
                this._lobbySlotEls.push(sg);

                if (p) {
                    if (p.inGame) {
                        // Player still in-game — show "đang chơi" badge
                        const igG = this.add.graphics().setDepth(202);
                        igG.fillStyle(0x1a6b8a, 1);
                        igG.fillRoundedRect(sx + slotW / 2 - 28, slotY + 6, 56, 14, 4);
                        this._lobbySlotEls.push(igG);
                        this._lobbySlotEls.push(
                            this.add.text(sx + slotW / 2, slotY + 13, '🎮 đang chơi', { fontSize: '7px', color: '#7de8ff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(203)
                        );
                    } else if (p.isHost) {
                        const badgeG = this.add.graphics().setDepth(202);
                        badgeG.fillStyle(0xe67e22, 1);
                        badgeG.fillRoundedRect(sx + slotW / 2 - 18, slotY + 6, 36, 14, 4);
                        this._lobbySlotEls.push(badgeG);
                        this._lobbySlotEls.push(
                            this.add.text(sx + slotW / 2, slotY + 13, 'HOST', { fontSize: '7px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(203)
                        );
                    }
                    const avG = this.add.graphics().setDepth(202);
                    avG.fillStyle(0x1abc9c, 0.15);
                    avG.fillCircle(sx + slotW / 2, slotY + 54, 22);
                    avG.lineStyle(2, 0x1abc9c, 0.8);
                    avG.strokeCircle(sx + slotW / 2, slotY + 54, 22);
                    this._lobbySlotEls.push(avG);
                    const charCfg = getCharacterConfig(p.characterKey || 'player_1');
                    const spr = this.add.sprite(sx + slotW / 2, slotY + 62, charCfg.texture, charCfg.idleFrame).setScale(1.5).setDepth(202);
                    this._lobbySlotEls.push(spr);
                    this._lobbySlotEls.push(
                        this.add.text(sx + slotW / 2, slotY + 84, p.displayName || 'Người chơi', { fontSize: '9px', color: '#1abc9c', fontStyle: 'bold' }).setOrigin(0.5).setDepth(202)
                    );
                } else {
                    const invG = this.add.graphics().setDepth(202);
                    const drawInv = (hover) => {
                        invG.clear();
                        invG.fillStyle(hover ? 0x0d2535 : 0x071018, 1);
                        invG.fillRoundedRect(sx + 14, slotY + 62, slotW - 28, 22, 5);
                        invG.lineStyle(1, hover ? 0x2980b9 : 0x1a3040, 1);
                        invG.strokeRoundedRect(sx + 14, slotY + 62, slotW - 28, 22, 5);
                    };
                    drawInv(false);
                    this._lobbySlotEls.push(invG);
                    this._lobbySlotEls.push(
                        this.add.text(sx + slotW / 2, slotY + 36, '?', { fontSize: '28px', color: '#1a3040', fontStyle: 'bold' }).setOrigin(0.5).setDepth(202)
                    );
                    const invTxt = this.add.text(sx + slotW / 2, slotY + 73, '+ Mời bạn', { fontSize: '8px', color: '#2980b9' }).setOrigin(0.5).setDepth(203);
                    this._lobbySlotEls.push(invTxt);
                    const invHit = this.add.rectangle(sx + slotW / 2, slotY + 73, slotW - 28, 22, 0, 0).setDepth(204).setInteractive({ useHandCursor: true });
                    this._lobbySlotEls.push(invHit);
                    invHit.on('pointerover', () => { drawInv(true); invTxt.setColor('#5fa8d8'); });
                    invHit.on('pointerout', () => { drawInv(false); invTxt.setColor('#2980b9'); });
                    invHit.on('pointerdown', () => this.showFriendsList(inviteLink, roomCode));
                }
            }

            // Start button — active for host when ≥2 players, passive for guests
            const me = auth.currentUser;
            const amHost = players.length > 0 && players[0].uid === me?.uid && players[0].isHost;
            const canStart = players.length >= 2;

            const startG = this.add.graphics().setDepth(201);
            if (canStart && amHost) {
                startG.fillStyle(0x0e6b3a, 1);
                startG.fillRoundedRect(px + pw / 2 - 85, py + ph - 48, 170, 34, 8);
                startG.lineStyle(1.5, 0x1abc9c, 0.9);
                startG.strokeRoundedRect(px + pw / 2 - 85, py + ph - 48, 170, 34, 8);
            } else {
                startG.fillStyle(0x0a1c14, 1);
                startG.fillRoundedRect(px + pw / 2 - 85, py + ph - 48, 170, 34, 8);
                startG.lineStyle(1, 0x1abc9c, 0.2);
                startG.strokeRoundedRect(px + pw / 2 - 85, py + ph - 48, 170, 34, 8);
            }
            this._lobbySlotEls.push(startG);

            const startLabel = canStart && amHost ? 'Bắt đầu ▶' : canStart ? 'Chờ host bắt đầu...' : 'Đang chờ người chơi...';
            const startColor = canStart && amHost ? '#1fff90' : '#2a5040';
            const startTxt = this.add.text(px + pw / 2, py + ph - 31, startLabel, {
                fontSize: '10px', color: startColor, fontStyle: canStart && amHost ? 'bold' : 'normal',
            }).setOrigin(0.5).setDepth(202);
            this._lobbySlotEls.push(startTxt);

            if (canStart && amHost) {
                const startHit = this.add.rectangle(px + pw / 2, py + ph - 31, 170, 34, 0, 0).setDepth(203).setInteractive({ useHandCursor: true });
                startHit.on('pointerover', () => { startG.clear(); startG.fillStyle(0x17a35a, 1); startG.fillRoundedRect(px + pw / 2 - 85, py + ph - 48, 170, 34, 8); startG.lineStyle(1.5, 0x1abc9c, 1); startG.strokeRoundedRect(px + pw / 2 - 85, py + ph - 48, 170, 34, 8); });
                startHit.on('pointerout', () => { startG.clear(); startG.fillStyle(0x0e6b3a, 1); startG.fillRoundedRect(px + pw / 2 - 85, py + ph - 48, 170, 34, 8); startG.lineStyle(1.5, 0x1abc9c, 0.9); startG.strokeRoundedRect(px + pw / 2 - 85, py + ph - 48, 170, 34, 8); });
                startHit.on('pointerdown', () => {
                    setRoomStatus(roomCode, 'started').catch(() => {});
                    this.registry.set('selectedCharacter', this.selectedCharacterKey);
                    this.registry.set('roomCode', roomCode);
                    this.registry.set('isMultiplayerHost', true);
                    this.closeMultiplayerLobby(false); // keep player docs in room
                    this.cameras.main.fadeOut(400, 0, 0, 0);
                    this.time.delayedCall(400, () => this.scene.start('MainScene'));
                });
                this._lobbySlotEls.push(startHit);
            }
        };

        // Create/join room in Firestore + listen for player changes
        const user = auth.currentUser;
        this._lobbyRoomCode = roomCode;
        if (user) {
            const myProfile = { uid: user.uid, displayName: user.displayName || 'Bạn', photoURL: user.photoURL || '', characterKey: this.selectedCharacterKey || 'player_1' };
            if (isHost) {
                // Show host slot immediately so UI isn't blank while createRoom writes to Firestore
                renderSlots([{ ...myProfile, isHost: true, joinedAt: Date.now() }]);
                createRoom(roomCode, myProfile).catch(() => {});
                // Start listener immediately — ignore empty snapshot (createRoom still pending)
                this._lobbyUnsub = onRoomPlayersChange(roomCode, (players) => {
                    if (players.length === 0) return; // createRoom not committed yet, skip
                    renderSlots(players);
                });
            } else if (isReturn) {
                // Returning from game — already in room, just mark inGame: false and listen
                updatePlayerInRoom(roomCode, user.uid, { inGame: false }).catch(() => {});
                this._lobbyUnsub = onRoomPlayersChange(roomCode, renderSlots);
            } else {
                joinRoom(roomCode, myProfile).catch(() => {});
                this._lobbyUnsub = onRoomPlayersChange(roomCode, renderSlots);
                this._lobbyStatusUnsub = onRoomStatusChange(roomCode, (roomData) => {
                    if (roomData.status === 'started') {
                        this.registry.set('selectedCharacter', this.selectedCharacterKey);
                        this.registry.set('roomCode', roomCode);
                        this.registry.set('isMultiplayerHost', false);
                        this.closeMultiplayerLobby(false); // keep player docs in room
                        this.cameras.main.fadeOut(400, 0, 0, 0);
                        this.time.delayedCall(400, () => this.scene.start('MainScene'));
                    }
                });
            }
        } else {
            renderSlots([{ displayName: this.registry.get('playerName') || 'Bạn', isHost: true }]);
        }
    }

    closeMultiplayerLobby(doLeave = true) {
        if (!this.lobbyPopup) return;
        if (this._lobbyUnsub) { this._lobbyUnsub(); this._lobbyUnsub = null; }
        if (this._lobbyStatusUnsub) { this._lobbyStatusUnsub(); this._lobbyStatusUnsub = null; }
        if (this._lobbySlotEls) { this._lobbySlotEls.forEach(e => e && e.destroy && e.destroy()); this._lobbySlotEls = null; }
        const user = auth.currentUser;
        if (doLeave && user && this._lobbyRoomCode) {
            leaveRoom(this._lobbyRoomCode, user.uid).catch(() => {});
        }
        this._lobbyRoomCode = null;
        this.lobbyPopup.forEach(e => e.destroy());
        this.lobbyPopup = null;
    }

    selectCharacter(key) {
        this.selectedCharacterKey = key;
        localStorage.setItem('selected_character', key);

        this.charIcons.forEach(icon => icon.setSelected(icon.key === key));

        this.updateSpotlight();
        this.updateWeaponList();

        // Sync character selection to room if currently in lobby
        const user = auth.currentUser;
        if (user && this._lobbyRoomCode) {
            updatePlayerInRoom(this._lobbyRoomCode, user.uid, { characterKey: key }).catch(() => {});
        }
    }

    updateSpotlight() {
        const config = getCharacterConfig(this.selectedCharacterKey);
        this.spotlightSprite.setTexture(config.texture, config.idleFrame);
        if (config.idleAnim) {
            this.spotlightSprite.play(config.idleAnim);
        }
        this.spotlightSprite.setOrigin(0.5, 1);
        this.spotlightSprite.setY(this.scale.height / 2 + 110);

        // Update Info
        this.charNameText.setText(config.name.toUpperCase());
        this.charDescText.setText(config.description);
    }

    updateWeaponList() {
        this.weaponContainer.removeAll(true);
        const config = getCharacterConfig(this.selectedCharacterKey);

        const slotSize = 52;
        const spacing = 10;

        const categories = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];

        const equipped = JSON.parse(localStorage.getItem('equipped_weapons') || '{}');
        if (!equipped.slot1) equipped.slot1 = 'Glock_17';
        if (!equipped.slot2) equipped.slot2 = 'MP5';
        if (!equipped.slot4) equipped.slot4 = 'Grenade';
        Object.keys(equipped).forEach(slot => {
            if (equipped[slot] && !Economy.isWeaponOwned(equipped[slot])) delete equipped[slot];
        });

        categories.forEach((cat, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const sx = (col - 0.5) * (slotSize + spacing);
            const sy = (row - 0.5) * (slotSize + spacing);

            const slotKey = `slot${i + 1}`;
            const weaponKey = equipped[slotKey];
            const weapon = weaponKey ? getWeaponByKey(weaponKey) : null;

            const slotG = this.add.graphics();
            const drawSlot = (hover) => {
                slotG.clear();
                slotG.fillStyle(weapon ? (hover ? 0x122b3f : 0x0d2535) : (hover ? 0x0d1e2c : 0x071018), 1);
                slotG.fillRoundedRect(sx - slotSize / 2, sy - slotSize / 2, slotSize, slotSize, 6);
                slotG.lineStyle(weapon ? 2 : 1, weapon ? (hover ? 0x2dd4bf : 0x1abc9c) : (hover ? 0x2a5060 : 0x1a3040), 1);
                slotG.strokeRoundedRect(sx - slotSize / 2, sy - slotSize / 2, slotSize, slotSize, 6);
            };
            drawSlot(false);
            this.weaponContainer.add(slotG);

            // Slot number badge (top-left)
            const numT = this.add.text(sx - slotSize / 2 + 4, sy - slotSize / 2 + 3, `${i + 1}`, {
                fontSize: '8px', color: weapon ? '#1abc9c' : '#2a4050', fontStyle: 'bold',
            });
            this.weaponContainer.add(numT);

            if (weapon) {
                const wIcon = this.add.image(sx, sy, weapon.texture);
                const fitScale = Math.min((slotSize * 0.78) / wIcon.width, (slotSize * 0.58) / wIcon.height, 1);
                wIcon.setScale(fitScale * (weapon.hudScale || 1));
                this.weaponContainer.add(wIcon);
            } else {
                const dash = this.add.text(sx, sy + 1, '—', { fontSize: '14px', color: '#1a3040' }).setOrigin(0.5);
                this.weaponContainer.add(dash);
            }

            const hit = this.add.rectangle(sx, sy, slotSize, slotSize, 0, 0).setInteractive({ useHandCursor: true });
            this.weaponContainer.add(hit);

            hit.on('pointerdown', () => this.showWeaponSelection(cat.id, slotKey));
            hit.on('pointerover', () => drawSlot(true));
            hit.on('pointerout', () => drawSlot(false));
        });
    }

    showWeaponSelection(categoryId, slotKey, initialScrollY = 0) {
        if (this.selectionPopup) {
            this.selectionPopup.destroy();
            this.selectionPopup = null;
        }

        const { width, height } = this.scale;

        // Root container
        this.selectionPopup = this.add.container(0, 0).setDepth(100);

        // 1. Overlay
        const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0);
        overlay.setInteractive();
        this.selectionPopup.add(overlay);

        // 2. Panel
        const pW = 340;
        const pH = 300;
        const pX = (width - pW) / 2;
        const pY = (height - pH) / 2;

        const panel = this.add.container(pX, pY);
        this.selectionPopup.add(panel);

        // Graphics
        const bgGraphics = this.add.graphics();
        bgGraphics.lineStyle(10, this.colors.highlight, 0.1);
        bgGraphics.strokeRoundedRect(-5, -5, pW + 10, pH + 10, 15);
        bgGraphics.fillStyle(0x1a2533, 0.98);
        bgGraphics.fillRoundedRect(0, 0, pW, pH, 15);
        bgGraphics.lineStyle(2, this.colors.highlight, 1);
        bgGraphics.strokeRoundedRect(0, 0, pW, pH, 15);
        bgGraphics.fillStyle(0xffffff, 0.05);
        bgGraphics.fillRoundedRect(10, 10, pW - 20, 35, 8);
        panel.add(bgGraphics);

        // Title logic
        let titleText = '';
        let titleSymbol = '';
        let allowedCategories = [];

        switch (categoryId) {
            case 1:
                titleText = 'CHỌN VŨ KHÍ Ô 1 (LỤC / CẬN CHIẾN)';
                titleSymbol = '🔫';
                allowedCategories = [WeaponCategories.HANDGUNS, WeaponCategories.MELEE];
                break;
            case 2:
                titleText = 'CHỌN VŨ KHÍ Ô 2 (TIỂU LIÊN/SÚNG TRƯỜNG)';
                titleSymbol = '🔫';
                allowedCategories = [WeaponCategories.SMG, WeaponCategories.SHOTGUNS, WeaponCategories.ASSAULT_RIFLES];
                break;
            case 3:
                titleText = 'CHỌN VŨ KHÍ Ô 3 (SNIPER/LMG/ROCKET)';
                titleSymbol = '🎯';
                allowedCategories = [WeaponCategories.SNIPER_RIFLES, WeaponCategories.LMG, WeaponCategories.ROCKET_LAUNCHERS];
                break;
            case 4:
                titleText = 'CHỌN VŨ KHÍ Ô 4 (CÁC LOẠI BOM)';
                titleSymbol = '💣';
                allowedCategories = [WeaponCategories.BOMB];
                break;
        }

        const title = this.add.text(pW / 2, 27, `${titleSymbol} ${titleText}`, {
            fontSize: '11px',
            fontStyle: 'bold',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: pW - 50 }
        }).setOrigin(0.5);
        panel.add(title);

        // --- SCROLLING LOGIC (MATCHING SceneShop) ---
        const listX = 20;
        const listY = 60;
        const listW = pW - 40;
        const listH = pH - 80;

        // Scroll State
        let currentScrollY = initialScrollY; // Use passed value

        let maxScrollY = 0;
        let isDownOnList = false;
        let isDragging = false;
        let startY = 0;
        let startScrollY = 0;
        const dragThreshold = 10;

        // Container
        const scrollContainer = this.add.container(listX, listY);
        panel.add(scrollContainer);

        // Mask
        const maskShape = this.make.graphics();
        maskShape.fillStyle(0xffffff);
        maskShape.fillRect(pX + listX, pY + listY, listW, listH);
        const mask = maskShape.createGeometryMask();
        scrollContainer.setMask(mask);

        const updateScroll = (y) => {
            currentScrollY = Phaser.Math.Clamp(y, -maxScrollY, 0);
            scrollContainer.y = listY + currentScrollY;
        };

        // Track scroll start from empty space via scene-level handler (bounds check).
        // inputZone is NOT made interactive so item rectangles are topmost and receive clicks.
        const listAbsX = pX + listX;
        const listAbsY = pY + listY;
        const onListPointerDown = (pointer) => {
            if (pointer.x >= listAbsX && pointer.x <= listAbsX + listW &&
                pointer.y >= listAbsY && pointer.y <= listAbsY + listH) {
                if (!isDownOnList) {
                    isDownOnList = true;
                    startY = pointer.y;
                    startScrollY = currentScrollY;
                    isDragging = false;
                }
            }
        };

        // Global Handlers
        const onPointerMove = (pointer) => {
            if (pointer.isDown && isDownOnList) {
                const diff = pointer.y - startY;
                if (Math.abs(diff) > dragThreshold) {
                    isDragging = true;
                    updateScroll(startScrollY + diff);
                }
            }
        };

        const onPointerUp = () => {
            isDownOnList = false;
            isDragging = false;
        };

        const onWheel = (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            const scrollSpeed = 30;
            updateScroll(currentScrollY - deltaY * scrollSpeed / 100);
        };

        this.input.on('pointerdown', onListPointerDown);
        this.input.on('pointermove', onPointerMove);
        this.input.on('pointerup', onPointerUp);
        this.input.on('wheel', onWheel);

        // Cleanup
        const cleanupListeners = () => {
            this.input.off('pointerdown', onListPointerDown);
            this.input.off('pointermove', onPointerMove);
            this.input.off('pointerup', onPointerUp);
            this.input.off('wheel', onWheel);
        };

        const safeClose = () => {
            cleanupListeners();
            if (this.selectionPopup) {
                this.selectionPopup.destroy();
                this.selectionPopup = null;
            }
        };

        // Close Button
        const close = this.add.text(pW - 20, 20, '✕', { fontSize: '20px', color: '#aaaaaa' })
            .setOrigin(0.5).setInteractive({ useHandCursor: true });
        close.on('pointerdown', safeClose);
        panel.add(close);

        // Overlay close (check boundaries)
        overlay.on('pointerdown', (pointer) => {
            if (pointer.x < pX || pointer.x > pX + pW || pointer.y < pY || pointer.y > pY + pH) {
                safeClose();
            }
        });

        // --- POPULATE ITEMS ---
        const weapons = getWeaponsByCategories(allowedCategories);

        if (weapons.length === 0) {
            const empty = this.add.text(listW / 2, listH / 2, 'CHƯA SỞ HỮU VŨ KHÍ NÀO', {
                fontSize: '14px', color: '#888888', fontStyle: 'bold'
            }).setOrigin(0.5);
            scrollContainer.add(empty); // Add to container so it scrolls (or not?)
            // Actually nice if it doesn't scroll, but let's just add it.
            // Adjust maxScrollY
            maxScrollY = 0;
            updateScroll(0); // Ensure reset
        } else {
            const spacing = 10;
            const gridW = listW - 20;
            const itemW = (gridW - spacing * 2) / 3;
            const itemXOffset = 10;
            const itemH = 110;

            const equipped = JSON.parse(localStorage.getItem('equipped_weapons') || '{}');
            let currentWeaponKey = equipped[slotKey];
            if (!currentWeaponKey) {
                if (slotKey === 'slot1') currentWeaponKey = 'Glock_17';
                else if (slotKey === 'slot2') currentWeaponKey = 'MP5';
                else if (slotKey === 'slot4') currentWeaponKey = 'Grenade';
            }

            weapons.forEach((w, i) => {
                const col = i % 3;
                const rows = Math.floor(i / 3);
                const x = itemXOffset + col * (itemW + spacing) + itemW / 2; // Center anchor
                const y = rows * (itemH + spacing) + itemH / 2; // Center anchor

                const item = this.add.container(x, y);
                scrollContainer.add(item);

                const isEquipped = w.key === currentWeaponKey;
                const isOwned = Economy.isWeaponOwned(w.key);

                // Card bg
                const cardGraphics = this.add.graphics();
                const drawCard = (bgColor, borderColor, borderAlpha) => {
                    cardGraphics.clear();
                    cardGraphics.fillStyle(bgColor, 0.4);
                    cardGraphics.fillRoundedRect(-itemW / 2, -itemH / 2, itemW, itemH, 10);
                    cardGraphics.lineStyle(2, borderColor, borderAlpha);
                    cardGraphics.strokeRoundedRect(-itemW / 2 + 1, -itemH / 2 + 1, itemW - 2, itemH - 2, 9);
                };
                const baseBorder = isOwned ? (isEquipped ? this.colors.highlight : 0x4a5a6a) : 0x333333;
                drawCard(0x000000, baseBorder, 0.8);
                item.add(cardGraphics);

                // Interact zone for item
                const itemInteract = this.add.rectangle(0, 0, itemW, itemH, 0x000000, 0);
                itemInteract.setInteractive({ useHandCursor: true });
                item.add(itemInteract);

                // Pass drag event to parent logic
                itemInteract.on('pointerdown', (pointer) => {
                    if (pointer.x < listAbsX || pointer.x > listAbsX + listW ||
                        pointer.y < listAbsY || pointer.y > listAbsY + listH) return;
                    isDownOnList = true;
                    startY = pointer.y;
                    startScrollY = currentScrollY;
                    isDragging = false;
                });

                // Content
                const wIcon = this.add.image(0, -15, w.texture);
                const maxW = itemW * 0.7;
                const maxH = itemH * 0.45;
                const imgW = wIcon.width;
                const imgH = wIcon.height;
                const fitScale = Math.min(maxW / imgW, maxH / imgH, 1);
                wIcon.setScale(fitScale * (w.popupScale || w.hudScale || 1));
                if (!isOwned) wIcon.setAlpha(0.35);

                const wName = this.add.text(0, 15, w.name, {
                    fontSize: '9px',
                    fontStyle: 'bold',
                    color: isOwned ? '#ffffff' : '#888888',
                    align: 'center',
                    wordWrap: { width: itemW - 8 }
                }).setOrigin(0.5);

                const btnY = 40;
                const btnW = itemW - 10;
                const btnH = 20;

                const btnBg = this.add.graphics();
                let btnLabel;
                if (!isOwned) {
                    btnBg.fillStyle(0x92400e, 1);
                    btnBg.fillRoundedRect(-btnW / 2, btnY - btnH / 2, btnW, btnH, 5);
                    btnLabel = `💎 ${w.price}`;
                } else {
                    btnBg.fillStyle(isEquipped ? 0x27ae60 : 0x3498db, 1);
                    btnBg.fillRoundedRect(-btnW / 2, btnY - btnH / 2, btnW, btnH, 5);
                    btnLabel = isEquipped ? 'ĐÃ CHỌN' : 'CHỌN';
                }
                const btnText = this.add.text(0, btnY, btnLabel, {
                    fontSize: '9px', fontStyle: 'bold', color: '#ffffff'
                }).setOrigin(0.5);

                // Lock icon overlay for unowned weapons
                if (!isOwned) {
                    const lockIcon = this.add.text(0, -28, '🔒', { fontSize: '16px' }).setOrigin(0.5);
                    item.add(lockIcon);
                }

                item.add([wIcon, wName, btnBg, btnText]);

                // Hover/Click Logic
                itemInteract.on('pointerup', (pointer) => {
                    if (pointer.x < listAbsX || pointer.x > listAbsX + listW ||
                        pointer.y < listAbsY || pointer.y > listAbsY + listH) return;
                    const diff = Math.abs(pointer.y - startY);
                    if (diff < dragThreshold && !isDragging) {
                        if (!isOwned) {
                            // Buy with diamonds
                            if (Economy.getDiamonds() >= w.price) {
                                Economy.saveDiamonds(Economy.getDiamonds() - w.price);
                                Economy.ownWeapon(w.key);
                                if (this.diamondText) this.diamondText.setText(Economy.getDiamonds().toLocaleString());
                                this.tweens.add({
                                    targets: item, scaleX: 1.05, scaleY: 1.05, duration: 80, yoyo: true,
                                    onComplete: () => this.showWeaponSelection(categoryId, slotKey, currentScrollY)
                                });
                            } else {
                                const noFunds = this.add.text(0, btnY - 25, 'Không đủ kim cương!', {
                                    fontSize: '9px', color: '#ff4444', fontStyle: 'bold'
                                }).setOrigin(0.5).setDepth(999);
                                item.add(noFunds);
                                this.tweens.add({ targets: noFunds, alpha: 0, y: btnY - 40, duration: 1000, ease: 'Power1',
                                    onComplete: () => { if (noFunds.active) noFunds.destroy(); }
                                });
                            }
                        } else if (!isEquipped) {
                            this.equipWeapon(slotKey, w.key);
                            this.tweens.add({
                                targets: item, scaleX: 0.95, scaleY: 0.95, duration: 50, yoyo: true,
                                onComplete: () => this.showWeaponSelection(categoryId, slotKey, currentScrollY)
                            });
                        }
                    }
                });
            });

            // Calc Height
            const totalRows = Math.ceil(weapons.length / 3);
            const totalHeight = totalRows * (itemH + spacing) + spacing + 60; // Padding
            maxScrollY = Math.max(0, totalHeight - listH);

            // Initial update
            updateScroll(initialScrollY);
        }
    }

    equipWeapon(slotKey, weaponKey) {
        const equipped = JSON.parse(localStorage.getItem('equipped_weapons') || '{}');
        equipped[slotKey] = weaponKey;
        Economy.saveEquippedWeapons(equipped);
        this.updateWeaponList();
    }

    _domPos(x, y, w, h) {
        const canvas = this.sys.game.canvas;
        const rect = canvas.getBoundingClientRect();
        const sx = rect.width / this.scale.width;
        const sy = rect.height / this.scale.height;
        return {
            left: Math.round(rect.left + x * sx),
            top: Math.round(rect.top + y * sy),
            w: Math.round(w * sx),
            h: Math.round(h * sy),
            fs: Math.round(12 * sy),
        };
    }

    createPanel(x, y, w, h, color, alpha) {
        const graphics = this.add.graphics();
        graphics.fillStyle(color, alpha);
        graphics.fillRoundedRect(x, y, w, h, 8);
        graphics.lineStyle(2, 0x4a5a6a, 0.8);
        graphics.strokeRoundedRect(x, y, w, h, 8);
        return graphics;
    }

    updateExpBar() {
        if (!this.expFill || !this.expText) return;
        const level = Economy.getLevel();
        const exp = Economy.getExp();
        const required = Economy.getExpForLevel(level);
        const ratio = Math.min(exp / required, 1);
        this.expFill.clear();
        this.expFill.fillStyle(0xe67e22, 1);
        this.expFill.fillRect(66, 39, Math.floor(108 * ratio), 10);
        this.expText.setText(`Lv${level}  ${exp}/${required}`);
    }

    setupAuthUI() {
        this._authElements = [];
        this._avatarEls = [];

        // Dùng currentUser ngay để tránh flash "chưa đăng nhập"
        this._renderAuthUI(auth.currentUser);

        const unsubscribe = onAuthChange(async (user) => {
            if (user) {
                const prevUid = localStorage.getItem('current_uid');
                if (prevUid !== user.uid) {
                    localStorage.removeItem('total_coins');
                    localStorage.removeItem('total_diamonds');
                    localStorage.removeItem('equipped_weapons');
                    localStorage.removeItem('player_exp');
                    localStorage.removeItem('player_level');
                    localStorage.removeItem('owned_weapons');
                }
                localStorage.setItem('current_uid', user.uid);
                saveUserProfile(user.uid, user.displayName || 'Player', user.photoURL || '').catch(() => {});
                try { await Economy.syncFromCloud(); } catch (_) {}
                this._startFriendRequestListener();
                this._startRoomInviteListener();
                if (this.diamondText) this.diamondText.setText(Economy.getDiamonds().toLocaleString());
                if (this.coinText) this.coinText.setText(Economy.getCoins().toLocaleString());
                this.updateExpBar();
                this._renderAuthUI(user);
                // Return to lobby after dying in multiplayer
                const returnCode = this.registry.get('returnToLobbyCode');
                if (returnCode) {
                    this.registry.remove('returnToLobbyCode');
                    this.time.delayedCall(150, () => this.showMultiplayerLobby(returnCode, true));
                }
            } else {
                // Đăng xuất → về màn hình login
                unsubscribe();
                this.cameras.main.fadeOut(400, 0, 0, 0);
                this.time.delayedCall(400, () => this.scene.start('SceneLoading'));
            }
        });

        this.events.once('destroy', () => unsubscribe());
        this.events.once('shutdown', () => unsubscribe());
    }

    _renderAuthUI(user) {
        this._authElements.forEach(el => el.destroy());
        this._authElements = [];
        this._updateAvatar(user);

        // Tên căn giữa thanh EXP (x=65, w=110 → center=120), phía trên bar (y=38)
        const nameX = 120;
        const nameY = 24;
        const logoutX = 322;
        const logoutY = 48;

        if (!user) {
            const txt = this.add.text(nameX, nameY, 'Đăng nhập', {
                fontSize: '12px', color: '#76c442', fontStyle: 'bold'
            }).setOrigin(0.5, 0.5).setDepth(200);

            const hint = this.add.text(nameX, logoutY, 'để sync tiến trình', {
                fontSize: '9px', color: '#888888'
            }).setOrigin(0.5, 0.5).setDepth(200);

            const hitArea = this.add.rectangle(nameX, 35, 110, 50, 0x000000, 0)
                .setInteractive({ useHandCursor: true }).setDepth(200);
            hitArea.on('pointerdown', () => signInWithGoogle().catch(() => {}));
            hitArea.on('pointerover', () => { txt.setAlpha(0.7); hint.setAlpha(0.7); });
            hitArea.on('pointerout', () => { txt.setAlpha(1); hint.setAlpha(1); });

            this._authElements = [txt, hint, hitArea];
        } else {
            const name = user.displayName || user.email || 'Player';

            // Tên: trong frame, vùng phải
            const nameTxt = this.add.text(nameX, nameY, name, {
                fontSize: '11px', color: '#ffffff', fontStyle: 'bold',
                wordWrap: { width: 130 }, align: 'center'
            }).setOrigin(0.5, 0.5).setDepth(200);

            // Nút vuông đỏ: bên phải frame (frame kết thúc x=190), căn giữa dọc y=35
            const btnW = 36, btnH = 36;
            const btnCX = 214, btnCY = 35;

            const btnBg = this.add.graphics().setDepth(200);
            const drawBtn = (col) => {
                btnBg.clear();
                btnBg.fillStyle(col, 1);
                btnBg.fillRoundedRect(btnCX - btnW / 2, btnCY - btnH / 2, btnW, btnH, 5);
                btnBg.lineStyle(1, 0xff9999, 0.6);
                btnBg.strokeRoundedRect(btnCX - btnW / 2, btnCY - btnH / 2, btnW, btnH, 5);
            };
            drawBtn(0xc0392b);

            const btnTxt = this.add.text(btnCX, btnCY, 'Đăng\nxuất', {
                fontSize: '10px', color: '#ffffff', fontStyle: 'bold', align: 'center'
            }).setOrigin(0.5, 0.5).setDepth(201);

            const btnHit = this.add.rectangle(btnCX, btnCY, btnW, btnH, 0x000000, 0)
                .setInteractive({ useHandCursor: true }).setDepth(202);
            btnHit.on('pointerdown', () => signOutUser().catch(() => {}));
            btnHit.on('pointerover', () => drawBtn(0xe74c3c));
            btnHit.on('pointerout', () => drawBtn(0xc0392b));

            this._authElements = [nameTxt, btnBg, btnTxt, btnHit];
        }
    }

    _updateAvatar(user) {
        // Dọn ảnh cũ
        this._avatarEls.forEach(el => el.destroy());
        this._avatarEls = [];

        if (!user || !user.photoURL) {
            if (this.avatarBg) this.avatarBg.setVisible(true);
            return;
        }

        if (this.avatarBg) this.avatarBg.setVisible(false);

        const texKey = 'avatar_' + user.uid;
        const show = () => {
            const img = this.add.image(35, 35, texKey)
                .setDisplaySize(36, 36).setDepth(200);

            const maskGfx = this.make.graphics({ add: false });
            maskGfx.fillStyle(0xffffff);
            maskGfx.fillCircle(35, 35, 18);
            img.setMask(maskGfx.createGeometryMask());

            const border = this.add.graphics().setDepth(201);
            border.lineStyle(2, 0x76c442, 1);
            border.strokeCircle(35, 35, 18);

            this._avatarEls = [img, border];
        };

        if (this.textures.exists(texKey)) {
            show();
        } else {
            this.load.image(texKey, user.photoURL);
            this.load.once('complete', show);
            this.load.once('loaderror', () => {
                if (this.avatarBg) this.avatarBg.setVisible(true);
            });
            this.load.start();
        }
    }
}
