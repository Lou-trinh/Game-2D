import { getAllCharacters, getCharacterConfig } from './Character';
import { Economy } from './utils/Economy';
import { WeaponData, WeaponCategories, getWeaponsByCategory, getWeaponByKey, getWeaponsByCategories } from './data/WeaponData';

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
        const diaIcon = this.add.image(width - 225, 25, 'diamond');
        diaIcon.setScale(1.1);

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
        // Default for slots if nothing equipped
        if (this.selectedCharacterKey === 'player_1') {
            if (!equipped.slot1) equipped.slot1 = 'Glock_17';
            if (!equipped.slot2) equipped.slot2 = 'M4A1';
            if (!equipped.slot3) equipped.slot3 = 'SKS';
        }

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
                wIcon.setDisplaySize(slotSize * 0.8, slotSize * 0.5);
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

        // Input Zone (Captures drag start) - Added BEFORE scrollContainer to be behind it
        const inputZone = this.add.zone(listX + listW / 2, listY + listH / 2, listW, listH);
        inputZone.setInteractive();
        panel.add(inputZone);

        // Container
        const scrollContainer = this.add.container(listX, listY);
        panel.add(scrollContainer);

        // Mask
        const maskShape = this.make.graphics();
        maskShape.fillStyle(0xffffff);
        maskShape.fillRect(pX + listX, pY + listY, listW, listH);
        const mask = maskShape.createGeometryMask();
        scrollContainer.setMask(mask);


        // Update Scroll Helper
        const updateScroll = (y) => {
            currentScrollY = Phaser.Math.Clamp(y, -maxScrollY, 0);
            scrollContainer.y = listY + currentScrollY; // Relative to panel? No, scrollContainer is child of panel at (listX, listY)
            // Wait, if scrollContainer is at (listX, listY), then modifying y moves it relative to that?
            // SceneShop: this.gridContainer.y = this.currentScrollY; (assuming gridContainer was at 0,0 relative to parent or handled differently)
            // Here: scrollContainer is added at (listX, listY). If we blindly set y = currentScrollY (negative), it jumps up.
            // Correct: scrollContainer.y = listY + currentScrollY;
        };
        // Correction: In SceneShop logic, gridContainer usually sits at (0,0) inside a clip container, or we modify y directly.
        // Let's stick to: scrollContainer initial Y is listY.
        // So new Y = listY + scrollOffset.

        inputZone.on('pointerdown', (pointer) => {
            isDownOnList = true;
            startY = pointer.y;
            startScrollY = currentScrollY; // Track offset, not absolute y
            isDragging = false;
        });

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
            // Only scroll if active scene?
            // Since we add/remove listeners, it's fine.
            const scrollSpeed = 30;
            updateScroll(currentScrollY - deltaY * scrollSpeed / 100);
        };

        this.input.on('pointermove', onPointerMove);
        this.input.on('pointerup', onPointerUp);
        this.input.on('wheel', onWheel);

        // Cleanup
        const cleanupListeners = () => {
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
                else if (slotKey === 'slot2') currentWeaponKey = 'M4A1';
                else if (slotKey === 'slot3') currentWeaponKey = 'SKS';
            }

            weapons.forEach((w, i) => {
                const col = i % 3;
                const rows = Math.floor(i / 3);
                const x = itemXOffset + col * (itemW + spacing) + itemW / 2; // Center anchor
                const y = rows * (itemH + spacing) + itemH / 2; // Center anchor

                const item = this.add.container(x, y);
                scrollContainer.add(item);

                const isEquipped = w.key === currentWeaponKey;

                // Card bg
                const cardGraphics = this.add.graphics();
                const drawCard = (bgColor, borderColor, borderAlpha) => {
                    cardGraphics.clear();
                    cardGraphics.fillStyle(bgColor, 0.4);
                    cardGraphics.fillRoundedRect(-itemW / 2, -itemH / 2, itemW, itemH, 10);
                    cardGraphics.lineStyle(2, borderColor, borderAlpha);
                    cardGraphics.strokeRoundedRect(-itemW / 2 + 1, -itemH / 2 + 1, itemW - 2, itemH - 2, 9);
                };
                const baseBorder = isEquipped ? this.colors.highlight : 0x4a5a6a;
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
                wIcon.setDisplaySize(itemW * 0.7, itemH * 0.35);

                const wName = this.add.text(0, 15, w.name, {
                    fontSize: '9px',
                    fontStyle: 'bold',
                    color: '#ffffff',
                    align: 'center',
                    wordWrap: { width: itemW - 8 }
                }).setOrigin(0.5);

                const btnY = 40;
                const btnW = itemW - 10;
                const btnH = 20;

                const btnBg = this.add.graphics();
                btnBg.fillStyle(isEquipped ? 0x27ae60 : 0x3498db, 1);
                btnBg.fillRoundedRect(-btnW / 2, btnY - btnH / 2, btnW, btnH, 5);
                const btnText = this.add.text(0, btnY, isEquipped ? 'ĐÃ CHỌN' : 'CHỌN', {
                    fontSize: '9px', fontStyle: 'bold', color: '#ffffff'
                }).setOrigin(0.5);

                item.add([wIcon, wName, btnBg, btnText]);

                // Hover/Click Logic
                itemInteract.on('pointerup', (pointer) => {
                    const diff = Math.abs(pointer.y - startY);
                    if (diff < dragThreshold && !isDragging) {
                        if (!isEquipped) {
                            // Select weapon but DO NOT close
                            this.equipWeapon(slotKey, w.key);

                            // Visual feedback: Flash effect or just immediate update
                            // Visual feedback: Flash effect or just immediate update
                            this.tweens.add({
                                targets: item,
                                scaleX: 0.95,
                                scaleY: 0.95,
                                duration: 50,
                                yoyo: true,
                                onComplete: () => {
                                    this.showWeaponSelection(categoryId, slotKey, currentScrollY);
                                }
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
        localStorage.setItem('equipped_weapons', JSON.stringify(equipped));
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
}
