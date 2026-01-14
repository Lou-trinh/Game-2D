import Phaser from 'phaser';

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    preload() {
        // Load menu assets if needed
    }

    create() {
        const { width, height } = this.scale;

        // Background gradient effect
        const graphics = this.add.graphics();
        graphics.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
        graphics.fillRect(0, 0, width, height);

        // Game title
        const title = this.add.text(width / 2, height / 4, 'Survival Game', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '48px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
            shadow: {
                offsetX: 2,
                offsetY: 2,
                color: '#000000',
                blur: 8,
                fill: true
            }
        });
        title.setOrigin(0.5);

        // Title floating animation
        this.tweens.add({
            targets: title,
            y: title.y - 10,
            duration: 1500,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });

        // Button configuration
        const buttonStartY = height / 2;
        const buttonSpacing = 55;

        // Bắt đầu button
        this.createButton(width / 2, buttonStartY, 'BẮT ĐẦU', 0x4a90d9, () => {
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.time.delayedCall(500, () => {
                this.scene.start('MainScene');
            });
        });

        // Chọn nhân vật button
        this.createButton(width / 2, buttonStartY + buttonSpacing, 'CHỌN NHÂN VẬT', 0x9b59b6, () => {
            this.scene.start('CharacterSelectScene');
        });

        // Cài đặt button
        this.createButton(width / 2, buttonStartY + buttonSpacing * 2, 'CÀI ĐẶT', 0x27ae60, () => {
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

    createButton(x, y, text, color, callback) {
        const buttonBg = this.add.rectangle(x, y, 180, 45, color);
        buttonBg.setStrokeStyle(2, 0xffffff);
        buttonBg.setInteractive({ useHandCursor: true });

        const buttonText = this.add.text(x, y, text, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#ffffff'
        });
        buttonText.setOrigin(0.5);

        const hoverColor = Phaser.Display.Color.ValueToColor(color).lighten(20).color;

        buttonBg.on('pointerover', () => {
            buttonBg.setFillStyle(hoverColor);
            buttonBg.setScale(1.05);
            buttonText.setScale(1.05);
        });

        buttonBg.on('pointerout', () => {
            buttonBg.setFillStyle(color);
            buttonBg.setScale(1);
            buttonText.setScale(1);
        });

        buttonBg.on('pointerdown', callback);

        return { bg: buttonBg, text: buttonText };
    }
}
