import Phaser from 'phaser';

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    preload() {
        // Load menu assets
        this.load.image('button_start', 'assets/images/inventory/button/button_start.png');
        this.load.image('button_characters', 'assets/images/inventory/button/button_characters.png');
        this.load.image('button_settings', 'assets/images/inventory/button/button_settings.png');
        this.load.image('menu_bg', 'assets/images/inventory/background.png');
    }

    create() {
        const { width, height } = this.scale;

        // Background image
        const bg = this.add.image(0, 0, 'menu_bg');
        bg.setOrigin(0, 0);
        bg.setDisplaySize(width, height);



        // Button configuration
        const buttonStartY = height / 2 - 100;
        const buttonSpacing = 100; // Increased spacing to prevent overlap

        // Bắt đầu button
        this.createImageButton(width / 2, buttonStartY, 'button_start', () => {
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.time.delayedCall(500, () => {
                this.scene.start('MainScene');
            });
        });

        // Chọn nhân vật button
        this.createImageButton(width / 2, buttonStartY + buttonSpacing, 'button_characters', () => {
            this.scene.start('CharacterSelectScene');
        });

        // Cài đặt button
        this.createImageButton(width / 2, buttonStartY + buttonSpacing * 2, 'button_settings', () => {
            console.log('Cài đặt - Coming soon!');
            // TODO: Navigate to settings scene
        });

        // Instructions
        const instructions = this.add.text(width / 2, height - 40, 'Use WASD to move, Click to attack', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            color: '#aaaaaa'
        });
        instructions.setOrigin(0.5);

        // Fade in effect
        this.cameras.main.fadeIn(500, 0, 0, 0);
    }

    createImageButton(x, y, key, callback) {
        // Create button sprite
        const button = this.add.sprite(x, y, key);
        button.setInteractive({ useHandCursor: true });

        // Initial scale (adjust if images are too big/small)
        // button.setScale(0.8); 

        // Hover effects
        button.on('pointerover', () => {
            button.setTint(0xdddddd); // Light tint on hover
            button.setScale(1.05);
        });

        button.on('pointerout', () => {
            button.clearTint();
            button.setScale(1);
        });

        button.on('pointerdown', () => {
            // Click animation
            this.tweens.add({
                targets: button,
                scale: 0.95,
                duration: 50,
                yoyo: true,
                onComplete: callback
            });
        });

        return button;
    }
}
