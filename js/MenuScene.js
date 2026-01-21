import { getAllCharacters, getCharacterConfig } from './Character';
import { Economy } from './utils/Economy';

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
        this.createWeaponPanel(padding, topBarHeight + padding + 160, 130);

        // 3. RIGHT COLUMN (Map, Shop, Start)
        const rightPanelX = width - rightPanelWidth - padding;
        const rightColumnCenter = rightPanelX + rightPanelWidth / 2;

        this.createRightPanel(rightPanelX, topBarHeight + padding, rightPanelWidth);

        // 4. CENTER AREA (Spotlight & Start)
        this.createCenterSpotlight(width / 2, height / 2 + 20);

        // 5. SHOP BUTTON & START BUTTON (Aligned)
        this.createShopButton(rightColumnCenter, height - 160);
        this.createStartButton(rightColumnCenter, height - 100);

        // Fade in effect
        this.cameras.main.fadeIn(500, 0, 0, 0);
    }

    createTopBar(height) {
        const { width } = this.scale;

        // Background panel
        const bar = this.createPanel(10, 10, 180, 50, 0x2c3e50, 0.8);

        // Player Info
        const avatar = this.add.sprite(35, 35, 'player_1', 'player_1');
        avatar.setScale(0.8);

        this.add.text(65, 18, 'Player info', {
            fontSize: '14px',
            color: '#ffffff',
            fontStyle: 'bold'
        });

        // EXP Bar (mini)
        const expBg = this.add.graphics();
        expBg.fillStyle(0x000000, 0.5);
        expBg.fillRect(65, 38, 110, 12);
        const expFill = this.add.graphics();
        expFill.fillStyle(0xe67e22, 1);
        expFill.fillRect(66, 39, 62, 10);
        this.add.text(120, 39, '62/130', { fontSize: '10px', color: '#ffffff' }).setOrigin(0.5, 0);

        // Diamonds
        const diaBar = this.createPanel(width - 240, 10, 110, 30, 0x2c3e50, 0.8);
        this.add.text(width - 230, 16, '💎', { fontSize: '16px' });

        const diamonds = Economy.getDiamonds();
        this.add.text(width - 155, 17, diamonds.toLocaleString(), { fontSize: '14px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(1, 0);
        this.add.text(width - 145, 15, '+', { fontSize: '16px', color: '#76c442', fontStyle: 'bold' });

        // Coins
        const coinBar = this.createPanel(width - 120, 10, 110, 30, 0x2c3e50, 0.8);
        const coinIcon = this.add.image(width - 110, 25, 'coin');
        coinIcon.setDisplaySize(20, 20);

        const coins = Economy.getCoins();
        this.add.text(width - 35, 17, coins.toLocaleString(), { fontSize: '14px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(1, 0);
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
        const weaponHeight = 150; // Shorter
        this.createPanel(x, y, width, weaponHeight, this.colors.panelBg, 0.9);

        // Horizontal Title
        this.add.text(x + width / 2, y + 12, 'VŨ KHÍ', {
            fontSize: '13px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Weapon Icons Container (grid alignment)
        this.weaponContainer = this.add.container(x + width / 2, y + 85);
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

        const slotSize = 45;
        const spacing = 10;

        // Draw 4 slots in 2x2 grid
        for (let i = 0; i < 4; i++) {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const sx = (col - 0.5) * (slotSize + spacing);
            const sy = (row - 0.5) * (slotSize + spacing);

            const wBg = this.add.rectangle(sx, sy, slotSize, slotSize, 0x000000, 0.4);

            if (i === 0 && config.weapon) {
                wBg.setStrokeStyle(2, this.colors.highlight);
                const wIcon = this.add.image(sx, sy, config.weapon.texture);
                wIcon.setDisplaySize(35, 35);
                this.weaponContainer.add([wBg, wIcon]);
            } else {
                wBg.setStrokeStyle(1, 0x555555);
                this.weaponContainer.add(wBg);
            }
        }
    }

    createPanel(x, y, w, h, color, alpha) {
        const graphics = this.add.graphics();
        graphics.fillStyle(color, alpha);
        graphics.fillRoundedRect(x, y, w, h, 8);
        graphics.lineStyle(2, 0x4a5a6a, 0.8);
        graphics.strokeRoundedRect(x, y, w, h, 8);
        return graphics;
    }
}
