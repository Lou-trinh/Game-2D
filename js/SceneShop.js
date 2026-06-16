import Phaser from 'phaser';
import { Economy } from './utils/Economy';
import { WeaponData, WeaponCategories, getWeaponsByCategory } from './data/WeaponData';

export default class SceneShop extends Phaser.Scene {
    constructor() {
        super({ key: 'SceneShop' });
        this.weapons = WeaponData;
        this.selectedCategory = WeaponCategories.ASSAULT_RIFLES; // Default category

        // Category Label Mapping
        this.categoryLabels = {
            [WeaponCategories.HANDGUNS]: "Súng ngắn / Súng lục",
            [WeaponCategories.SMG]: "Súng tiểu liên",
            [WeaponCategories.SHOTGUNS]: "Súng săn / Súng hoa cải",
            [WeaponCategories.ASSAULT_RIFLES]: "Súng trường",
            [WeaponCategories.SNIPER_RIFLES]: "Súng bắn tỉa",
            [WeaponCategories.LMG]: "Súng máy hạng nhẹ",
            [WeaponCategories.ROCKET_LAUNCHERS]: "Súng phóng rocket / tên lửa",
            [WeaponCategories.MELEE]: "Vũ khí cận chiến",
            [WeaponCategories.BOMB]: "Các loại bom"
        };
    }

    create() {
        const { width, height } = this.scale;

        // Overlay Background
        const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.7);
        overlay.setOrigin(0);
        overlay.setInteractive(); // Block clicks to scene below

        // Shop Container
        const panelWidth = 460; // Further reduced
        const panelHeight = 300; // Further reduced
        const panelX = (width - panelWidth) / 2;
        const panelY = (height - panelHeight) / 2 - 50; // Shifted up 50px

        this.createPanel(panelX, panelY, panelWidth, panelHeight);

        // Sidebar Background
        const sidebarWidth = 120; // Narrower
        const sidebarBg = this.add.graphics();
        sidebarBg.fillStyle(0x0d1520, 0.8);
        sidebarBg.fillRoundedRect(panelX + 6, panelY + 6, sidebarWidth - 12, panelHeight - 12, 6);

        // Title
        this.add.text(panelX + sidebarWidth + (panelWidth - sidebarWidth) / 2, panelY + 20, 'CỬA HÀNG VŨ KHÍ', {
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);

        // Diamonds display
        this.diaText = this.add.text(panelX + sidebarWidth + (panelWidth - sidebarWidth) / 2, panelY + 42, `💎 ${Economy.getDiamonds()}`, {
            fontSize: '14px',
            color: '#4dbdff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Close Button
        const closeBtn = this.add.text(panelX + panelWidth - 20, panelY + 20, '✕', {
            fontSize: '20px',
            color: '#aaaaaa'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        closeBtn.on('pointerdown', () => this.scene.stop());
        closeBtn.on('pointerover', () => closeBtn.setColor('#ffffff'));
        closeBtn.on('pointerout', () => closeBtn.setColor('#aaaaaa'));

        // Sidebar Categories
        this.createCategorySidebar(panelX + 10, panelY + 10, sidebarWidth - 20);

        // Weapon Grid Container
        // Define List Area
        this.listX = panelX + sidebarWidth + 12;
        this.listY = panelY + 65;
        this.listW = panelWidth - sidebarWidth - 24;
        this.listH = panelHeight - 85;

        // Container for clipping
        const listClip = this.add.container(this.listX, this.listY);

        // Mask
        const maskShape = this.make.graphics();
        maskShape.fillStyle(0xffffff);
        maskShape.fillRect(this.listX, this.listY, this.listW, this.listH);
        const mask = maskShape.createGeometryMask();
        listClip.setMask(mask);

        // Scroll Container (holds the items)
        this.gridContainer = this.add.container(0, 0);
        listClip.add(this.gridContainer);

        // Scroll Logic Setup
        this.currentScrollY = 0;
        this.maxScrollY = 0;
        this.isDragging = false;
        this.startY = 0;
        this.startScrollY = 0;
        const dragThreshold = 10;

        // inputZone NOT made interactive — prevents it from blocking clicks on weapon buttons (Phaser topOnly).
        // Instead, track scroll start via scene-level pointerdown with bounds check.
        this.input.on('pointerdown', (pointer) => {
            if (pointer.x >= this.listX && pointer.x <= this.listX + this.listW &&
                pointer.y >= this.listY && pointer.y <= this.listY + this.listH) {
                if (!this.isPointerDownOnList) {
                    this.isPointerDownOnList = true;
                    this.startY = pointer.y;
                    this.startScrollY = this.gridContainer.y;
                    this.isDragging = false;
                }
            }
        });

        this.input.on('pointermove', (pointer) => {
            if (pointer.isDown && this.isPointerDownOnList) {
                const diff = pointer.y - this.startY;
                if (Math.abs(diff) > dragThreshold) {
                    this.isDragging = true;
                    this.updateScroll(this.startScrollY + diff);
                }
            }
        });

        this.input.on('pointerup', () => {
            this.isPointerDownOnList = false;
            this.isDragging = false;
        });

        // Mouse Wheel
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            const scrollSpeed = 30;
            this.updateScroll(this.currentScrollY - deltaY * scrollSpeed / 100);
        });

        this.refreshWeaponGrid();

        // Cleanup listeners
        this.events.on('shutdown', () => {
            this.input.off('pointermove');
            this.input.off('pointerup');
            this.input.off('wheel');
        });
    }

    updateScroll(y) {
        this.currentScrollY = Phaser.Math.Clamp(y, -this.maxScrollY, 0);
        this.gridContainer.y = this.currentScrollY;
    }

    createCategorySidebar(startX, startY, sidebarWidth) {
        const categories = Object.keys(this.categoryLabels);
        const itemH = 24; // Shorter
        const spacing = 3;

        this.categoryButtons = [];

        categories.forEach((catKey, i) => {
            const y = startY + i * (itemH + spacing);
            const label = this.categoryLabels[catKey];
            const isSelected = parseInt(catKey) === this.selectedCategory;

            const btnBg = this.add.rectangle(startX + sidebarWidth / 2, y + itemH / 2, sidebarWidth, itemH, isSelected ? 0x76c442 : 0x1e2a3a, isSelected ? 0.8 : 0.5);
            btnBg.setInteractive({ useHandCursor: true });

            const btnText = this.add.text(startX + 5, y + itemH / 2, label, {
                fontSize: '9px',
                color: isSelected ? '#ffffff' : '#999999',
                fontStyle: isSelected ? 'bold' : 'normal',
                wordWrap: { width: sidebarWidth - 10 }
            }).setOrigin(0, 0.5);

            btnBg.on('pointerdown', () => {
                this.selectedCategory = parseInt(catKey);
                this.updateCategoryUI();
                this.refreshWeaponGrid();
            });

            this.categoryButtons.push({ bg: btnBg, text: btnText, catKey: parseInt(catKey) });
        });
    }

    updateCategoryUI() {
        this.categoryButtons.forEach(btn => {
            const isSelected = btn.catKey === this.selectedCategory;
            btn.bg.setFillStyle(isSelected ? 0x76c442 : 0x1e2a3a, isSelected ? 0.8 : 0.5);
            btn.text.setColor(isSelected ? '#ffffff' : '#999999');
            btn.text.setFontStyle(isSelected ? 'bold' : 'normal');
        });
    }

    refreshWeaponGrid() {
        this.gridContainer.removeAll(true);
        this.currentScrollY = 0;
        this.gridContainer.y = 0;

        const filteredWeapons = getWeaponsByCategory(this.selectedCategory);

        if (filteredWeapons.length === 0) {
            this.gridContainer.add(this.add.text(0, 50, 'CHƯA CÓ VŨ KHÍ TRONG MỤC NÀY', {
                fontSize: '14px',
                color: '#666666'
            }));
            this.maxScrollY = 0;
            return;
        }

        const itemWidth = 90; // Reduced from 100
        const itemHeight = 110; // Reduced from 120
        const spacing = 10; // Reduced from 15
        const cols = 3;

        filteredWeapons.forEach((weapon, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = col * (itemWidth + spacing) + itemWidth / 2; // Center anchor adjustment
            const y = row * (itemHeight + spacing) + itemHeight / 2;

            const item = this.createShopItem(x, y, itemWidth, itemHeight, weapon);
            this.gridContainer.add(item);
        });

        // Calculate max scroll
        const rows = Math.ceil(filteredWeapons.length / cols);
        const totalHeight = rows * (itemHeight + spacing) + spacing; // Total content height
        this.maxScrollY = Math.max(0, totalHeight - this.listH);
    }

    createShopItem(x, y, w, h, weapon) {
        const container = this.add.container(x, y);

        // Background
        const bg = this.add.rectangle(0, 0, w, h, 0x1a2533, 0.9);
        bg.setStrokeStyle(2, 0x4a5a6a);

        // Weapon Image - Adjusted position and scale
        const img = this.add.image(0, -20, weapon.texture);
        const maxW = w * 0.65;
        const maxH = w * 0.45;
        const imgW = img.width;
        const imgH = img.height;
        const fitScale = Math.min(maxW / imgW, maxH / imgH, 1);
        img.setScale(fitScale * (weapon.popupScale || weapon.hudScale || 1));

        // Name
        const name = this.add.text(0, 15, weapon.name, { // Moved up from 20
            fontSize: '9px', // Reduced from 10px
            color: '#ffffff',
            fontStyle: 'bold',
            wordWrap: { width: w - 8 }, // Tighter wrap
            align: 'center'
        }).setOrigin(0.5);

        // Buy/Equip Button
        const isOwned = this.isOwned(weapon.key);
        const btnY = 42; // Shifted down from 38
        const btn = this.add.rectangle(0, btnY, w - 10, 20, isOwned ? 0x27ae60 : 0xd35400); // Slightly shorter height
        btn.setInteractive({ useHandCursor: true });

        const btnText = this.add.text(0, btnY, isOwned ? 'ĐÃ CÓ' : `${weapon.price} 💎`, {
            fontSize: '9px', // Reduced from 10px
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);

        container.add([bg, img, name, btn, btnText]);

        // Pass drag events through items to the list container logic
        // We do this by ensuring items don't block the scene input or we just handle clicks carefully
        // Ideally we want click to buy, but drag to scroll.
        // The simple check is: if we dragged, don't click.

        btn.on('pointerdown', () => {
            this.isPointerDownOnList = true; // Also allow dragging starting from button
            this.startY = this.input.activePointer.y;
            this.startScrollY = this.gridContainer.y;
        });

        btn.on('pointerup', () => {
            if (!this.isDragging) {
                if (isOwned) return;
                this.buyWeapon(weapon, btn, btnText);
            }
        });

        btn.on('pointerover', () => btn.setAlpha(0.8));
        btn.on('pointerout', () => btn.setAlpha(1));

        return container;
    }

    isOwned(key) {
        return Economy.isWeaponOwned(key);
    }

    buyWeapon(weapon, btn, btnText) {
        const currentDiamonds = Economy.getDiamonds();
        if (currentDiamonds >= weapon.price) {
            Economy.saveDiamonds(currentDiamonds - weapon.price);
            Economy.ownWeapon(weapon.key);
            this.diaText.setText(`💎 ${Economy.getDiamonds()}`);
            btn.setFillStyle(0x27ae60);
            btnText.setText('ĐÃ CÓ');
        } else {
            if (this._noFundsText && this._noFundsText.active) this._noFundsText.destroy();
            this._noFundsText = this.add.text(
                this.listX + this.listW / 2,
                this.listY - 12,
                'Không đủ kim cương!',
                { fontSize: '13px', color: '#ff4444', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3 }
            ).setOrigin(0.5, 1).setDepth(200);
            this.tweens.add({
                targets: this._noFundsText, alpha: 0, y: this.listY - 30, duration: 1200, ease: 'Power1',
                onComplete: () => { if (this._noFundsText && this._noFundsText.active) this._noFundsText.destroy(); }
            });
        }
    }

    createPanel(x, y, w, h) {
        const graphics = this.add.graphics();
        graphics.fillStyle(0x1a2533, 0.95);
        graphics.fillRoundedRect(x, y, w, h, 15);
        graphics.lineStyle(3, 0x76c442, 1);
        graphics.strokeRoundedRect(x, y, w, h, 15);

        // Shadow/glow
        graphics.lineStyle(10, 0x76c442, 0.1);
        graphics.strokeRoundedRect(x - 5, y - 5, w + 10, h + 10, 15);
    }
}
