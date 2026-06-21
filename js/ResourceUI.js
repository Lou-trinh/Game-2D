import { getWeaponByKey, WeaponCategories } from './data/WeaponData';
import { Economy } from './utils/Economy';

export default class ResourceUI {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;

        // Position in top-right corner - below HUD
        const startX = scene.cameras.main.width - 15;
        const startY = 75; // Same Y for both

        // Diamond Icon (Left side)
        this.diamondIcon = scene.add.image(startX - 130, startY + 12, 'diamond');
        this.diamondIcon.setScale(1.2);
        this.diamondIcon.setScrollFactor(0);
        this.diamondIcon.setDepth(2005);

        // Diamond Text
        this.diamondText = scene.add.text(
            startX - 75,
            startY,
            '0',
            {
                fontSize: '18px',
                fontStyle: 'bold',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 3
            }
        );
        this.diamondText.setOrigin(1, 0); // Align to right
        this.diamondText.setScrollFactor(0);
        this.diamondText.setDepth(2005);

        // Coin Icon (Right side)
        this.coinIcon = scene.add.image(startX - 50, startY + 12, 'coin');
        this.coinIcon.setScale(0.25);
        this.coinIcon.setScrollFactor(0);
        this.coinIcon.setDepth(2005);

        // Coin Text
        this.coinText = scene.add.text(
            startX,
            startY,
            '0',
            {
                fontSize: '18px',
                fontStyle: 'bold',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 3
            }
        );
        this.coinText.setOrigin(1, 0); // Align to right
        this.coinText.setScrollFactor(0);
        this.coinText.setDepth(2005);

        // Create Player HUD FIRST (before updateResources)
        this.createPlayerHUD();

        // Initial update (after HUD is created)
        this.updateResources();
    }

    createPlayerHUD() {
        const hudX = this.scene.cameras.main.width - 215; // Top-right
        const hudY = 10; // Move to top
        const panelWidth = 200; // Smaller panel
        const panelHeight = 60; // Smaller panel

        // Background panel (dark semi-transparent with border)
        this.hudPanel = this.scene.add.graphics();
        this.hudPanel.setScrollFactor(0);
        this.hudPanel.setDepth(1999);

        // Draw rounded rectangle background
        this.hudPanel.fillStyle(0x000000, 0.6); // Dark background
        this.hudPanel.fillRoundedRect(hudX, hudY, panelWidth, panelHeight, 8);

        // Draw border
        this.hudPanel.lineStyle(2, 0x444444, 0.8);
        this.hudPanel.strokeRoundedRect(hudX, hudY, panelWidth, panelHeight, 8);

        // Avatar - Use character's idle frame (smaller)
        const avatarX = hudX + 30;
        const avatarY = hudY + 30;
        const avatarTexture = this.player.characterConfig?.texture || 'player_1';
        const avatarFrame = this.player.characterConfig?.idleFrame || null;

        // Avatar background circle (smaller)
        this.avatarBg = this.scene.add.circle(avatarX, avatarY, 22, 0x222222, 0.8);
        this.avatarBg.setScrollFactor(0);
        this.avatarBg.setDepth(2000);
        this.avatarBg.setStrokeStyle(2, 0x666666, 1);

        if (avatarFrame) {
            this.avatar = this.scene.add.image(avatarX, avatarY, avatarTexture, avatarFrame);
        } else {
            this.avatar = this.scene.add.image(avatarX, avatarY, avatarTexture);
        }

        this.avatar.setScrollFactor(0);
        this.avatar.setDepth(2001);
        this.avatar.setScale(1.2); // Smaller avatar

        // Health Bar (next to avatar, adjusted)
        const healthX = hudX + 65;
        const healthY = hudY + 18;
        const healthWidth = 120; // Slightly smaller
        const healthHeight = 10; // Slightly smaller

        // Health bar background (darker)
        this.hudHealthBg = this.scene.add.rectangle(healthX, healthY, healthWidth, healthHeight, 0x330000);
        this.hudHealthBg.setOrigin(0, 0.5);
        this.hudHealthBg.setScrollFactor(0);
        this.hudHealthBg.setDepth(2000);
        this.hudHealthBg.setStrokeStyle(1, 0x660000, 1);

        // Health bar fill (gradient effect with green)
        this.hudHealth = this.scene.add.rectangle(healthX, healthY, healthWidth, healthHeight, 0x00ff00);
        this.hudHealth.setOrigin(0, 0.5);
        this.hudHealth.setScrollFactor(0);
        this.hudHealth.setDepth(2001);

        // Health text (HP value)
        this.healthText = this.scene.add.text(healthX + healthWidth / 2, healthY, '100/100', {
            fontSize: '9px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        });
        this.healthText.setOrigin(0.5, 0.5);
        this.healthText.setScrollFactor(0);
        this.healthText.setDepth(2002);

        // Weapon Slots Section
        const slotW = 40; // Smaller squares
        const slotH = 40;
        const slotMargin = 8;

        const os = this.scene.sys.game.device.os;
        const isMobile = os.android || os.iOS || window.innerWidth <= 900 || 'ontouchstart' in window;
        const totalSlotsWidth = (slotW * 4) + (slotMargin * 3);
        const slotX = isMobile ? (this.scene.cameras.main.width - totalSlotsWidth) / 2 : 20;
        this.bottomOffset = isMobile ? 24 : 80; // Reference for other methods
        const slotY = this.scene.cameras.main.height - slotH - this.bottomOffset;

        this.hudWeaponSlots = [];
        for (let i = 0; i < 4; i++) {
            const sx = slotX + i * (slotW + slotMargin);

            const bg = this.scene.add.graphics();
            bg.setScrollFactor(0);
            bg.setDepth(2000);

            // Draw square background
            const isFirst = (i === 0);
            bg.fillStyle(0x1a1a1a, 0.8);
            bg.fillRoundedRect(sx, slotY, slotW, slotH, 8);
            bg.lineStyle(isFirst ? 2 : 1, isFirst ? 0x00ff00 : 0x555555, 1);
            bg.strokeRoundedRect(sx, slotY, slotW, slotH, 8);

            const icon = this.scene.add.image(sx + slotW / 2, slotY + slotH / 2, 'M4A1');
            icon.setScrollFactor(0);
            icon.setDepth(2001);
            icon.setScale(0.75);
            icon.setVisible(false);

            // Store references for updates
            this.hudWeaponSlots.push({ bg, icon, sx, sy: slotY, sw: slotW, sh: slotH });
        }

        // Initialize icons from player data
        this.updateIcons();

        // Ammo Section
        const ammoX = isMobile ? slotX + (totalSlotsWidth / 2) - 34 : slotX + 12;
        const ammoY = slotY - 18;

        // Ammo Icon (bullet_1.png) - MINI
        this.ammoBg = this.scene.add.circle(ammoX, ammoY, 8, 0x1a1a1a, 0.8);
        this.ammoBg.setScrollFactor(0);
        this.ammoBg.setDepth(2000);
        this.ammoBg.setStrokeStyle(1, 0x555555, 1);

        this.ammoIcon = this.scene.add.image(ammoX, ammoY, 'bullet_1');
        this.ammoIcon.setScrollFactor(0);
        this.ammoIcon.setDepth(2001);
        this.ammoIcon.setScale(0.4); // Larger bullet icon

        // Ammo Text (60/60) - larger and more visible
        this.ammoText = this.scene.add.text(ammoX + 15, ammoY, '60/60', {
            fontSize: '14px',
            fontStyle: 'bold',
            color: '#ffff00',
            stroke: '#000000',
            strokeThickness: 2
        });
        this.ammoText.setOrigin(0, 0.5);
        this.ammoText.setScrollFactor(0);
        this.ammoText.setDepth(2002);

        // Hide ammo elements for non-gun characters
        const _isGunChar = ['player_1', 'character_02', 'player_3'].includes(this.player.characterType);
        if (!_isGunChar) {
            this.ammoIcon.setVisible(false);
            this.ammoText.setVisible(false);
            this.ammoBg.setVisible(false);
        }

        // Create Exit Button (top right corner)
        this.createExitButton();
    }

    updatePlayerHUD() {
        if (!this.player) return;

        // Update Health
        if (this.hudHealth) {
            const hpPercent = Phaser.Math.Clamp(this.player.health / this.player.maxHealth, 0, 1);
            this.hudHealth.width = 120 * hpPercent;

            if (hpPercent > 0.6) this.hudHealth.setFillStyle(0x00ff00);
            else if (hpPercent > 0.3) this.hudHealth.setFillStyle(0xffaa00);
            else this.hudHealth.setFillStyle(0xff0000);
        }

        if (this.healthText) {
            this.healthText.setText(`${Math.ceil(this.player.health)}/${this.player.maxHealth}`);
        }

        // Update Active Slot Highlight
        const activeIdx = parseInt(this.player.activeSlot.replace('slot', ''));
        this.updateActiveSlot(activeIdx);
        this.updateIcons();

        // Update Ammo for active slot
        this.updateAmmoUI();
    }

    updateAmmoUI() {
        if (!this.ammoText || !this.ammoIcon || !this.ammoBg) return;

        const weaponKey = this.player.weaponSlots[this.player.activeSlot];
        const weapon = getWeaponByKey(weaponKey);

        // Hide ammo HUD for melee weapons
        if (weapon && (weapon.category === WeaponCategories.MELEE)) {
            this.ammoText.setVisible(false);
            this.ammoIcon.setVisible(false);
            this.ammoBg.setVisible(false);
            return;
        } else if (weapon && (weapon.category === WeaponCategories.BOMB)) {
            // Bombs: Show quantity AND icon
            this.ammoText.setVisible(true);
            this.ammoIcon.setVisible(true); // Show icon
            this.ammoBg.setVisible(false);

            // Set icon to Grenade (Large)
            this.ammoIcon.setTexture('Grenade');
            this.ammoIcon.setScale(1.2);

            const ammo = this.player.ammoData[this.player.activeSlot] || { current: 0, max: 0 };
            this.ammoText.setText(`${ammo.current}/${ammo.max}`);

            if (ammo.current === 0) this.ammoText.setColor('#ff0000');
            else this.ammoText.setColor('#ffff00');

            return;
        } else if (['player_1', 'character_02', 'player_3'].includes(this.player.characterType)) {
            this.ammoText.setVisible(true);
            this.ammoIcon.setVisible(true);
            this.ammoBg.setVisible(true);
        }

        const ammo = this.player.ammoData[this.player.activeSlot] || { current: 0, max: 0 };
        this.ammoText.setText(`${ammo.current}/${ammo.max}`);

        if (ammo.current === 0) this.ammoText.setColor('#ff0000');
        else if (ammo.current <= ammo.max * 0.2) this.ammoText.setColor('#ffaa00');
        else this.ammoText.setColor('#ffff00');

        // Update Ammo Icon based on weapon type
        if (weaponKey && this.ammoIcon) {
            const weapon = getWeaponByKey(weaponKey);
            if (weapon) {
                let bulletTexture = 'bullet_1'; // Default: SMG / Assault / Battle Rifles
                if (weapon.category === WeaponCategories.HANDGUNS || weapon.category === WeaponCategories.MELEE) {
                    bulletTexture = 'bullet_2';
                } else if (weapon.category === WeaponCategories.SHOTGUNS) {
                    bulletTexture = 'bullet_4';
                } else if (weapon.category === WeaponCategories.SNIPER_RIFLES || weapon.category === WeaponCategories.LMG || weapon.category === WeaponCategories.ROCKET_LAUNCHERS) {
                    bulletTexture = 'bullet_3';
                }

                if (this.ammoIcon && this.ammoIcon.texture.key !== bulletTexture) {
                    this.ammoIcon.setTexture(bulletTexture);
                    this.ammoIcon.setScale(0.4);
                }
            }
        }
    }

    updateActiveSlot(slotIndex) {
        this.hudWeaponSlots.forEach((slot, i) => {
            const isActive = (i === slotIndex - 1);
            const sy = slot.sy;
            slot.bg.clear();
            slot.bg.fillStyle(0x1a1a1a, 0.8);
            slot.bg.fillRoundedRect(slot.sx, sy, slot.sw, slot.sh, 6);
            slot.bg.lineStyle(isActive ? 2 : 1, isActive ? 0x00ff00 : 0x555555, 1);
            slot.bg.strokeRoundedRect(slot.sx, sy, slot.sw, slot.sh, 6);
            slot.icon.setPosition(slot.sx + slot.sw / 2, sy + slot.sh / 2);

            // Add a subtle glow to active slot
            if (isActive) {
                slot.bg.lineStyle(4, 0x00ff00, 0.2);
                slot.bg.strokeRoundedRect(slot.sx - 2, sy - 2, slot.sw + 4, slot.sh + 4, 8);
            }
        });
    }

    updateIcons() {
        if (!this.player || !this.player.weaponSlots) return;

        for (let i = 0; i < 4; i++) {
            const weaponKey = this.player.weaponSlots[`slot${i + 1}`];
            const slot = this.hudWeaponSlots[i];

            if (weaponKey) {
                const weapon = getWeaponByKey(weaponKey);
                const texture = weapon ? weapon.texture : weaponKey;

                if (texture && this.scene.textures.exists(texture)) {
                    slot.icon.setTexture(texture);
                    slot.icon.setVisible(true);

                    // Auto-scale icon to fit inside slot (max 36x36)
                    slot.icon.setScale(1);
                    const maxSize = 36;
                    const imgW = slot.icon.width;
                    const imgH = slot.icon.height;
                    const baseScale = Math.min(maxSize / imgW, maxSize / imgH, 1);
                    const hudScale = weapon?.hudScale || 1;
                    slot.icon.setScale(baseScale * hudScale);
                } else {
                    slot.icon.setVisible(false);
                }
            } else {
                slot.icon.setVisible(false);
            }
        }
    }

    createExitButton() {
        if (!this.scene.textures.exists('button_out')) {
            // If button texture doesn't exist, create a simple text button
            const buttonX = this.scene.cameras.main.width - 50;
            const buttonY = 30;

            this.exitButton = this.scene.add.text(buttonX, buttonY, '✕', {
                fontSize: '32px',
                fontStyle: 'bold',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 3
            });
            this.exitButton.setOrigin(0.5, 0.5);
            this.exitButton.setScrollFactor(0);
            this.exitButton.setDepth(3000);
            this.exitButton.setInteractive({ useHandCursor: true });

            // Hover effects
            this.exitButton.on('pointerover', () => {
                this.exitButton.setColor('#ff0000');
                this.exitButton.setScale(1.2);
            });

            this.exitButton.on('pointerout', () => {
                this.exitButton.setColor('#ffffff');
                this.exitButton.setScale(1);
            });

            // Click logic
            this.exitButton.on('pointerdown', () => {
                this.scene.tweens.add({
                    targets: this.exitButton,
                    scale: 0.8,
                    duration: 50,
                    yoyo: true,
                    onComplete: () => this._showExitConfirmPopup()
                });
            });
            return;
        }

        // Position: Top-left corner
        const buttonX = 45;
        const buttonY = 45;

        this.exitButton = this.scene.add.sprite(buttonX, buttonY, 'button_out');
        this.exitButton.setScrollFactor(0);
        this.exitButton.setDepth(3000);
        this.exitButton.setInteractive({ useHandCursor: true });
        this.exitButton.setScale(0.35); // Smaller scale

        // Hover effects
        this.exitButton.on('pointerover', () => {
            this.exitButton.setTint(0xff6666);
            this.exitButton.setScale(0.4);
        });

        this.exitButton.on('pointerout', () => {
            this.exitButton.clearTint();
            this.exitButton.setScale(0.35);
        });

        // Click logic
        this.exitButton.on('pointerdown', () => {
            this.scene.tweens.add({
                targets: this.exitButton,
                scale: 0.3,
                duration: 50,
                yoyo: true,
                onComplete: () => this._showExitConfirmPopup()
            });
        });
    }

    _showExitConfirmPopup() {
        if (this._exitPopupObjs) return;
        const scene = this.scene;
        const { width, height } = scene.cameras.main;
        const D = 28000;
        const sf = 0;

        const dim = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.55)
            .setScrollFactor(sf).setDepth(D).setInteractive();

        const pw = 320, ph = 160;
        const bg = scene.add.graphics().setDepth(D + 1).setScrollFactor(sf);
        bg.fillStyle(0x1a2533, 0.97);
        bg.fillRoundedRect(width / 2 - pw / 2, height / 2 - ph / 2, pw, ph, 12);
        bg.lineStyle(2, 0xe74c3c, 1);
        bg.strokeRoundedRect(width / 2 - pw / 2, height / 2 - ph / 2, pw, ph, 12);

        const title = scene.add.text(width / 2, height / 2 - 50, '⚠️ Thoát game?', {
            fontSize: '16px', fontStyle: 'bold', color: '#e74c3c',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(D + 2).setScrollFactor(sf);

        const body = scene.add.text(width / 2, height / 2 - 15,
            'Nếu thoát giữa chừng bạn sẽ\nkhông nhận được bất kỳ vật phẩm nào!', {
            fontSize: '12px', color: '#cccccc', align: 'center',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(D + 2).setScrollFactor(sf);

        const makeBtn = (cx, label, fill, hoverFill, onClick) => {
            const bw = 110, bh = 32;
            const bg2 = scene.add.graphics().setDepth(D + 3).setScrollFactor(sf);
            bg2.fillStyle(fill, 1);
            bg2.fillRoundedRect(cx - bw / 2, height / 2 + 38, bw, bh, 8);
            const hit = scene.add.rectangle(cx, height / 2 + 38 + bh / 2, bw, bh)
                .setScrollFactor(sf).setDepth(D + 4).setAlpha(0.01)
                .setInteractive({ useHandCursor: true });
            const txt = scene.add.text(cx, height / 2 + 38 + bh / 2, label, {
                fontSize: '12px', fontStyle: 'bold', color: '#ffffff',
                stroke: '#000000', strokeThickness: 2
            }).setOrigin(0.5).setDepth(D + 5).setScrollFactor(sf);
            hit.on('pointerover', () => { bg2.clear(); bg2.fillStyle(hoverFill, 1); bg2.fillRoundedRect(cx - bw / 2, height / 2 + 38, bw, bh, 8); });
            hit.on('pointerout',  () => { bg2.clear(); bg2.fillStyle(fill, 1);      bg2.fillRoundedRect(cx - bw / 2, height / 2 + 38, bw, bh, 8); });
            hit.on('pointerup', onClick);
            return [bg2, hit, txt];
        };

        const exitObjs = makeBtn(width / 2 - 68, '🚪 Thoát', 0x7f1e1e, 0xb03030, () => {
            const snap = scene._economySnapshot;
            if (snap) {
                Economy.saveCoins(snap.coins);
                Economy.saveDiamonds(snap.diamonds);
                localStorage.setItem('frag_common', snap.fragCommon.toString());
                localStorage.setItem('frag_rare', snap.fragRare.toString());
            }
            scene.scene.stop('MainScene');
            scene.scene.start('MenuScene');
        });
        const stayObjs = makeBtn(width / 2 + 68, '✅ Ở lại', 0x1e5e1e, 0x27ae60, () => {
            this._exitPopupObjs.forEach(o => o.destroy());
            this._exitPopupObjs = null;
        });

        this._exitPopupObjs = [dim, bg, title, body, ...exitObjs, ...stayObjs];
    }

    createInventoryButton(slotX, slotY, slotW, slotH, slotMargin, totalSlotsWidth, isMobile) {
        // Mobile: slots are centered → place button fixed bottom-left (x=20, above joystick area)
        // Desktop: place right of weapon slots
        const bx = isMobile ? 20 : slotX + totalSlotsWidth + slotMargin;
        const by = slotY;
        const cx = bx + slotW / 2;
        const cy = by + slotH / 2;
        this._invBtnCX = cx;
        this._invBtnCY = cy;
        this._invBtnSlotY = slotY;
        this._invBtnSlotX = bx;
        this.invPanelOpen = false;

        this.invBtnBg = this.scene.add.rectangle(cx, cy, slotW, slotH, 0x222222, 0.85);
        this.invBtnBg.setScrollFactor(0).setDepth(3000);
        this.invBtnBg.setStrokeStyle(1, 0x666666, 1);
        this.invBtnBg.setInteractive({ useHandCursor: true });

        this.invBtnIcon = this.scene.add.text(cx, cy, '🎒', { fontSize: '18px' });
        this.invBtnIcon.setScrollFactor(0).setDepth(3001).setOrigin(0.5);

        this.invBtnBg.on('pointerover', () => {
            this.invBtnBg.setFillStyle(0x3a3a3a, 0.95);
            this.invBtnBg.setStrokeStyle(2, 0xaaaaaa, 1);
        });
        this.invBtnBg.on('pointerout', () => {
            this.invBtnBg.setFillStyle(0x222222, 0.85);
            this.invBtnBg.setStrokeStyle(1, 0x666666, 1);
        });
        this.invBtnBg.on('pointerdown', () => this.toggleInventoryPanel());
    }

    toggleInventoryPanel() {
        if (this.invPanelOpen) {
            this.closeInventoryPanel();
        } else {
            this.openInventoryPanel();
        }
    }

    openInventoryPanel() {
        this.invPanelOpen = true;
        const pw = 165;
        const ph = 180;
        const px = this._invBtnSlotX;
        const py = this._invBtnSlotY - ph - 8;

        this._invEls = [];

        const bg = this.scene.add.graphics();
        bg.setScrollFactor(0).setDepth(2010);
        bg.fillStyle(0x111111, 0.92);
        bg.fillRoundedRect(px, py, pw, ph, 8);
        bg.lineStyle(1, 0x555555, 1);
        bg.strokeRoundedRect(px, py, pw, ph, 8);
        this._invEls.push(bg);

        const title = this.scene.add.text(px + pw / 2, py + 10, 'KHO ĐỒ', {
            fontSize: '13px', fontStyle: 'bold', color: '#ffffff',
            stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(2011);
        this._invEls.push(title);

        const div = this.scene.add.graphics();
        div.setScrollFactor(0).setDepth(2011);
        div.lineStyle(1, 0x444444, 0.8);
        div.lineBetween(px + 8, py + 28, px + pw - 8, py + 28);
        this._invEls.push(div);

        const closeBtn = this.scene.add.text(px + pw - 8, py + 8, '✕', {
            fontSize: '12px', color: '#888888', stroke: '#000000', strokeThickness: 2,
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(2012)
          .setInteractive({ useHandCursor: true });
        closeBtn.on('pointerover', () => closeBtn.setColor('#ff4444'));
        closeBtn.on('pointerout', () => closeBtn.setColor('#888888'));
        closeBtn.on('pointerdown', () => this.closeInventoryPanel());
        this._invEls.push(closeBtn);

        const rows = [
            { key: 'diamond', label: 'Kim cương',   iconScale: 0.85, getValue: () => Economy.getDiamonds() },
            { key: 'coin',    label: 'Đồng xu',      iconScale: 0.2,  getValue: () => Economy.getCoins() },
            { key: 'frag_common', label: 'Mảnh thường', iconScale: 0.55, getValue: () => Economy.getFragCommon() },
            { key: 'frag_rare',   label: 'Mảnh hiếm',   iconScale: 0.55, getValue: () => Economy.getFragRare() },
        ];

        this._invValTexts = [];
        let ry = py + 36;
        rows.forEach(row => {
            const icon = this.scene.add.image(px + 18, ry + 14, row.key);
            icon.setScrollFactor(0).setDepth(2011).setScale(row.iconScale);
            this._invEls.push(icon);

            const lbl = this.scene.add.text(px + 34, ry + 7, row.label, {
                fontSize: '11px', color: '#bbbbbb',
            }).setScrollFactor(0).setDepth(2011);
            this._invEls.push(lbl);

            const val = this.scene.add.text(px + pw - 10, ry + 7, `${row.getValue()}`, {
                fontSize: '13px', fontStyle: 'bold', color: '#ffffff',
                stroke: '#000000', strokeThickness: 2,
            }).setOrigin(1, 0).setScrollFactor(0).setDepth(2011);
            this._invEls.push(val);
            this._invValTexts.push({ el: val, getValue: row.getValue });

            ry += 35;
        });
    }

    closeInventoryPanel() {
        this.invPanelOpen = false;
        if (this._invEls) {
            this._invEls.forEach(e => e.destroy());
            this._invEls = [];
        }
        this._invValTexts = [];
    }

    refreshInventoryPanel() {
        if (!this.invPanelOpen || !this._invValTexts) return;
        this._invValTexts.forEach(({ el, getValue }) => el.setText(`${getValue()}`));
    }

    createBackpack() {
        const { width, height } = this.scene.cameras.main;

        // Load with a safe default if not yet loaded (though it should be)
        if (!this.scene.textures.exists('backpack')) {
            return;
        }

        this.backpack = this.scene.add.sprite(
            width - 35,
            height - 110,
            'backpack'
        );

        this.backpack.setScrollFactor(0);
        this.backpack.setDepth(3000); // UI depth
        this.backpack.setScale(0.7);
        this.backpack.setInteractive({ useHandCursor: true });

        // Hover effect
        this.backpack.on('pointerover', () => {
            this.backpack.setTint(0xcccccc);
        });

        this.backpack.on('pointerout', () => {
            this.backpack.clearTint();
        });

        this.backpack.on('pointerdown', () => {
            console.log('🎒 Backpack clicked - Toggle Inventory');
            // Future inventory toggle logic here
        });

    }

    updateResources() {
        this.diamondText.setText(`${this.player.diamondCount || 0}`);
        this.coinText.setText(`${this.player.coinCount || 0}`);
        this.updatePlayerHUD();
        this.refreshInventoryPanel();
    }

    destroy() {
        // Cleanup all UI elements
        if (this.diamondIcon) this.diamondIcon.destroy();
        if (this.diamondText) this.diamondText.destroy();
        if (this.coinText) this.coinText.destroy();
        if (this.exitButton) this.exitButton.destroy();

        // HUD Panel and elements
        if (this.hudPanel) this.hudPanel.destroy();
        if (this.avatarBg) this.avatarBg.destroy();
        if (this.avatar) this.avatar.destroy();

        // Health bar
        if (this.hudHealthBg) this.hudHealthBg.destroy();
        if (this.hudHealth) this.hudHealth.destroy();
        if (this.healthText) this.healthText.destroy();

        // Weapon
        if (this.weaponBg) this.weaponBg.destroy();
        if (this.weaponIcon) this.weaponIcon.destroy();

        // Ammo
        if (this.ammoBg) this.ammoBg.destroy();
        if (this.ammoIcon) this.ammoIcon.destroy();
        if (this.ammoText) this.ammoText.destroy();

        // Inventory button + panel
        this.closeInventoryPanel();
        if (this.invBtnBg) this.invBtnBg.destroy();
        if (this.invBtnIcon) this.invBtnIcon.destroy();

        // Backpack
        if (this.backpack) this.backpack.destroy();
    }
}
