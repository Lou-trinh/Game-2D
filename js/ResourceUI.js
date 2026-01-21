export default class ResourceUI {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;

        // Position in top-right corner - only diamonds now
        const startX = scene.cameras.main.width - 15;
        const startY = 75; // Move below HUD (which starts at Y=10 and height=60)

        // Diamond icon and text
        this.diamondIcon = scene.add.image(startX - 65, startY + 12, 'diamond');
        this.diamondIcon.setScale(1.2);
        this.diamondIcon.setScrollFactor(0);
        this.diamondIcon.setDepth(2005);

        this.diamondText = scene.add.text(
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
        this.diamondText.setOrigin(1, 0); // Align to right
        this.diamondText.setScrollFactor(0);
        this.diamondText.setDepth(2005); // Above HUD panel

        // Coin icon and text
        this.coinText = scene.add.text(
            startX,
            startY + 30, // Position below diamonds
            '💰 0',
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

        // Weapon and Ammo section (below health bar)
        const weaponY = hudY + 43;

        // Weapon Icon (LARGER, with background)
        this.weaponBg = this.scene.add.circle(healthX + 18, weaponY, 20, 0x1a1a1a, 0.8);
        this.weaponBg.setScrollFactor(0);
        this.weaponBg.setDepth(2000);
        this.weaponBg.setStrokeStyle(1, 0x555555, 1);

        this.weaponIcon = this.scene.add.image(healthX + 18, weaponY, 'm4a1');
        this.weaponIcon.setScrollFactor(0);
        this.weaponIcon.setDepth(2001);
        this.weaponIcon.setScale(1.4); // Slightly smaller scale to fit compact frame

        // If player has weapon config
        if (this.player.characterConfig && this.player.characterConfig.weapon) {
            const weaponTex = this.player.characterConfig.weapon.texture;
            if (this.scene.textures.exists(weaponTex)) {
                this.weaponIcon.setTexture(weaponTex);
            }
        }

        // Ammo Icon (bullet_1.png) with background
        this.ammoBg = this.scene.add.circle(healthX + 50, weaponY, 10, 0x1a1a1a, 0.8);
        this.ammoBg.setScrollFactor(0);
        this.ammoBg.setDepth(2000);
        this.ammoBg.setStrokeStyle(1, 0x555555, 1);

        this.ammoIcon = this.scene.add.image(healthX + 50, weaponY, 'bullet_1');
        this.ammoIcon.setScrollFactor(0);
        this.ammoIcon.setDepth(2001);
        this.ammoIcon.setScale(0.35);

        // Ammo Text (60/60) - larger and more visible
        this.ammoText = this.scene.add.text(healthX + 75, weaponY, '60/60', {
            fontSize: '16px',
            fontStyle: 'bold',
            color: '#ffff00',
            stroke: '#000000',
            strokeThickness: 3
        });
        this.ammoText.setOrigin(0, 0.5);
        this.ammoText.setScrollFactor(0);
        this.ammoText.setDepth(2002);

        // Hide ammo elements if not Player 1 (M4A1)
        if (this.player.characterType !== 'player_1') {
            this.ammoIcon.setVisible(false);
            this.ammoText.setVisible(false);
            this.ammoBg.setVisible(false);
        }

        // Create Exit Button (top right corner)
        this.createExitButton();
    }

    updatePlayerHUD() {
        if (!this.player) return;

        // Update Health (with null check)
        if (this.hudHealth) {
            const hpPercent = Phaser.Math.Clamp(this.player.health / this.player.maxHealth, 0, 1);
            this.hudHealth.width = 120 * hpPercent;

            // Change color based on health percentage
            if (hpPercent > 0.6) {
                this.hudHealth.setFillStyle(0x00ff00); // Green
            } else if (hpPercent > 0.3) {
                this.hudHealth.setFillStyle(0xffaa00); // Orange
            } else {
                this.hudHealth.setFillStyle(0xff0000); // Red
            }
        }

        // Update Health Text
        if (this.healthText) {
            const currentHP = Math.ceil(this.player.health);
            const maxHP = this.player.maxHealth;
            this.healthText.setText(`${currentHP}/${maxHP}`);
        }

        // Update Ammo (with null check)
        if (this.player.characterType === 'player_1' && this.ammoText) {
            const current = this.player.currentAmmo !== undefined ? this.player.currentAmmo : 30;
            const max = this.player.maxAmmo || 30;
            this.ammoText.setText(`${current}/${max}`);

            // Change ammo color based on amount
            if (current === 0) {
                this.ammoText.setColor('#ff0000'); // Red when empty
            } else if (current <= 10) {
                this.ammoText.setColor('#ffaa00'); // Orange when low
            } else {
                this.ammoText.setColor('#ffff00'); // Yellow when normal
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
                    onComplete: () => {
                        // Stop MainScene and go to MenuScene
                        this.scene.scene.stop('MainScene');
                        this.scene.scene.start('MenuScene');
                    }
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
                onComplete: () => {
                    // Stop MainScene and go to MenuScene
                    this.scene.scene.stop('MainScene');
                    this.scene.scene.start('MenuScene');
                }
            });
        });
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
        this.coinText.setText(`💰 ${this.player.coinCount || 0}`);
        this.updatePlayerHUD();
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

        // Backpack
        if (this.backpack) this.backpack.destroy();
    }
}
