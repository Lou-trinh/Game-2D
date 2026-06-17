import { getAllCharacters, getCharacterConfig } from './Character';
import { Economy } from './utils/Economy';
import { WeaponData, WeaponCategories, getWeaponsByCategory, getWeaponByKey, getWeaponsByCategories } from './data/WeaponData';
import { auth, onAuthChange, signInWithGoogle, signOutUser } from './firebase.js';

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
        this.selectedCharacterKey = 'player_1';
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

        // 5. SHOP + INVENTORY + START BUTTONS
        this.createShopButton(rightColumnCenter, height - 220);
        this.createInventoryButton(rightColumnCenter, height - 160);
        this.createStartButton(rightColumnCenter, height - 100);

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
        const charHeight = 140; // Slightly shorter
        this.createPanel(x, y, width, charHeight, this.colors.panelBg, 0.9);
        this.add.text(x + width / 2, y + 12, 'CHỌN NHÂN VẬT', {
            fontSize: '13px', // Slightly smaller font
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Character Grid
        const chars = getAllCharacters();
        const iconSize = 38; // Smaller icons
        const spacing = 8;
        const gridWidth = 3 * iconSize + 2 * spacing;
        const startX = x + (width - gridWidth) / 2;
        const startY = y + 38;

        this.charIcons = [];
        chars.forEach((char, i) => {
            const col = i % 3;
            const row = Math.floor(i / 3);
            const ix = startX + col * (iconSize + spacing);
            const iy = startY + row * (iconSize + spacing);

            const btn = this.add.container(ix + iconSize / 2, iy + iconSize / 2);
            const bg = this.add.rectangle(0, 0, iconSize, iconSize, 0x000000, 0.4);
            bg.setStrokeStyle(2, char.key === this.selectedCharacterKey ? this.colors.highlight : 0x555555);

            const isP1 = char.key === 'player_1';
            const sprite = this.add.sprite(0, 14, char.texture);
            sprite.setOrigin(0.5, 1);
            sprite.setDisplaySize(iconSize * (isP1 ? 0.9 : 0.8), iconSize * (isP1 ? 0.9 : 0.8));

            btn.add([bg, sprite]);
            btn.setInteractive(new Phaser.Geom.Rectangle(-iconSize / 2, -iconSize / 2, iconSize, iconSize), Phaser.Geom.Rectangle.Contains);

            btn.on('pointerdown', () => this.selectCharacter(char.key));
            btn.on('pointerover', () => { if (this.selectedCharacterKey !== char.key) bg.setStrokeStyle(2, 0xaaaaaa); });
            btn.on('pointerout', () => { if (this.selectedCharacterKey !== char.key) bg.setStrokeStyle(2, 0x555555); });

            this.charIcons.push({ key: char.key, bg: bg });
        });
    }

    createWeaponPanel(x, y, width) {
        const weaponHeight = 180; // Increased from 150 to fit 2x2 grid labels
        this.createPanel(x, y, width, weaponHeight, this.colors.panelBg, 0.9);

        // Horizontal Title
        this.add.text(x + width / 2, y + 10, 'VŨ KHÍ', {
            fontSize: '11px', // Smaller header
            color: '#aaaaaa',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Weapon Icons Container (grid alignment)
        this.weaponContainer = this.add.container(x + width / 2, y + 95); // Moved down from 85 to 95
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

        // Pulsing animation (slightly different timing than start)
        this.tweens.add({
            targets: btn,
            y: y - 3,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.tweens.add({
            targets: glow,
            alpha: 0.8,
            scale: 1.1,
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

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

        this.tweens.add({
            targets: btn,
            y: y - 3,
            duration: 2200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

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

    openInventoryPanel() {
        if (this.invPanel) this.closeInventoryPanel();

        const { width, height } = this.cameras.main;
        const pw = 260, ph = 240;
        const px = (width - pw) / 2;
        const py = (height - ph) / 2;

        this.invPanel = [];

        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.5);
        overlay.fillRect(0, 0, width, height);
        overlay.setDepth(500);
        overlay.setInteractive();
        overlay.on('pointerdown', () => this.closeInventoryPanel());
        this.invPanel.push(overlay);

        const bg = this.add.graphics();
        bg.setDepth(501);
        bg.fillStyle(0x111111, 0.95);
        bg.fillRoundedRect(px, py, pw, ph, 10);
        bg.lineStyle(2, 0x1abc9c, 1);
        bg.strokeRoundedRect(px, py, pw, ph, 10);
        this.invPanel.push(bg);

        const title = this.add.text(px + pw / 2, py + 14, 'KHO ĐỒ', {
            fontSize: '16px', fontStyle: 'bold', color: '#1abc9c',
            stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5, 0).setDepth(502);
        this.invPanel.push(title);

        const divider = this.add.graphics().setDepth(502);
        divider.lineStyle(1, 0x1abc9c, 0.5);
        divider.lineBetween(px + 10, py + 36, px + pw - 10, py + 36);
        this.invPanel.push(divider);

        const closeBtn = this.add.text(px + pw - 12, py + 10, '✕', {
            fontSize: '14px', color: '#aaaaaa'
        }).setOrigin(1, 0).setDepth(502).setInteractive({ useHandCursor: true });
        closeBtn.on('pointerover', () => closeBtn.setColor('#ff4444'));
        closeBtn.on('pointerout', () => closeBtn.setColor('#aaaaaa'));
        closeBtn.on('pointerdown', () => this.closeInventoryPanel());
        this.invPanel.push(closeBtn);

        const rows = [
            { key: 'diamond',    label: 'Kim cương',   scale: 0.9,  getValue: () => Economy.getDiamonds() },
            { key: 'coin',       label: 'Đồng xu',     scale: 0.2,  getValue: () => Economy.getCoins() },
            { key: 'frag_common', label: 'Mảnh thường', scale: 0.55, getValue: () => Economy.getFragCommon() },
            { key: 'frag_rare',   label: 'Mảnh hiếm',  scale: 0.55, getValue: () => Economy.getFragRare() },
        ];

        let ry = py + 46;
        rows.forEach(row => {
            const icon = this.add.image(px + 22, ry + 14, row.key).setScale(row.scale).setDepth(502);
            const lbl = this.add.text(px + 42, ry + 6, row.label, {
                fontSize: '13px', color: '#cccccc'
            }).setDepth(502);
            const val = this.add.text(px + pw - 14, ry + 6, `${row.getValue()}`, {
                fontSize: '15px', fontStyle: 'bold', color: '#ffffff',
                stroke: '#000000', strokeThickness: 2,
            }).setOrigin(1, 0).setDepth(502);
            this.invPanel.push(icon, lbl, val);
            ry += 40;
        });
    }

    closeInventoryPanel() {
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

        // Pulsing and floating animation
        this.tweens.add({
            targets: btn,
            y: y - 5,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.tweens.add({
            targets: glow,
            alpha: 0.8,
            scale: 1.1,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

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
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.time.delayedCall(500, () => {
                this.registry.set('selectedCharacter', this.selectedCharacterKey);
                this.scene.start('MainScene');
            });
        });
    }

    selectCharacter(key) {
        this.selectedCharacterKey = key;

        // Update Grid Highlights
        this.charIcons.forEach(icon => {
            icon.bg.setStrokeStyle(2, icon.key === key ? this.colors.highlight : 0x555555);
        });

        this.updateSpotlight();
        this.updateWeaponList();
    }

    updateSpotlight() {
        const config = getCharacterConfig(this.selectedCharacterKey);
        this.spotlightSprite.setTexture(config.texture);
        if (config.idleAnim) {
            this.spotlightSprite.play(config.idleAnim);
        }
        this.spotlightSprite.setOrigin(0.5, 1);

        // Character specific elevation
        if (this.selectedCharacterKey === 'player_1') {
            this.spotlightSprite.setY(this.scale.height / 2 + 55); // Lowered
        } else {
            this.spotlightSprite.setY(this.scale.height / 2 + 35); // Lowered
        }

        // Update Info
        this.charNameText.setText(config.name.toUpperCase());
        this.charDescText.setText(config.description);
    }

    updateWeaponList() {
        this.weaponContainer.removeAll(true);
        const config = getCharacterConfig(this.selectedCharacterKey);

        const slotSize = 50;
        const spacing = 12;

        // Slot names/categories
        const categories = [
            { id: 1, name: 'Ô 1' },
            { id: 2, name: 'Ô 2' },
            { id: 3, name: 'Ô 3' },
            { id: 4, name: 'Ô 4' }
        ];

        // Load equipped weapons from localStorage
        const equipped = JSON.parse(localStorage.getItem('equipped_weapons') || '{}');
        // Default slots for new players
        if (this.selectedCharacterKey === 'player_1') {
            if (!equipped.slot1) equipped.slot1 = 'Glock_17';
            if (!equipped.slot2) equipped.slot2 = 'MP5';
            if (!equipped.slot4) equipped.slot4 = 'Grenade';
        }
        // Clear any slot containing a weapon the player doesn't own
        Object.keys(equipped).forEach(slot => {
            if (equipped[slot] && !Economy.isWeaponOwned(equipped[slot])) {
                delete equipped[slot];
            }
        });

        // Draw 4 slots in 2x2 grid
        categories.forEach((cat, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const sx = (col - 0.5) * (slotSize + spacing);
            const sy = (row - 0.5) * (slotSize + spacing + 15); // Extra space for labels

            const slotKey = `slot${i + 1}`;
            const weaponKey = equipped[slotKey];
            const weapon = weaponKey ? getWeaponByKey(weaponKey) : null;

            // Label
            const label = this.add.text(sx, sy - slotSize / 2 - 8, cat.name, {
                fontSize: '9px',
                color: '#aaaaaa',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            this.weaponContainer.add(label);

            // Slot Background
            const wBg = this.add.rectangle(sx, sy, slotSize, slotSize, 0x000000, 0.4);
            wBg.setStrokeStyle(1, weapon ? this.colors.highlight : 0x555555);
            wBg.setInteractive({ useHandCursor: true });
            this.weaponContainer.add(wBg);

            if (weapon) {
                const wIcon = this.add.image(sx, sy, weapon.texture);
                const maxW = slotSize * 0.8;
                const maxH = slotSize * 0.6;
                const imgW = wIcon.width;
                const imgH = wIcon.height;
                const fitScale = Math.min(maxW / imgW, maxH / imgH, 1);
                wIcon.setScale(fitScale * (weapon.hudScale || 1));
                this.weaponContainer.add(wIcon);
            } else {
                const plus = this.add.text(sx, sy, '+', { fontSize: '20px', color: '#555555' }).setOrigin(0.5);
                this.weaponContainer.add(plus);
            }

            wBg.on('pointerdown', () => {
                this.showWeaponSelection(cat.id, slotKey);
            });

            wBg.on('pointerover', () => wBg.setStrokeStyle(2, 0xffffff));
            wBg.on('pointerout', () => wBg.setStrokeStyle(1, weapon ? this.colors.highlight : 0x555555));
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
                await Economy.syncFromCloud();
                if (this.diamondText) this.diamondText.setText(Economy.getDiamonds().toLocaleString());
                if (this.coinText) this.coinText.setText(Economy.getCoins().toLocaleString());
                this.updateExpBar();
                this._renderAuthUI(user);
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
