import Phaser from 'phaser';

export default class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    preload() {
        this.load.image('button_restart', 'assets/images/inventory/button/button_restart.png');
        this.load.image('button_revive', 'assets/images/inventory/button/button_revive.png');
        this.load.image('button_menu', 'assets/images/inventory/button/button_menu.png');
        this.load.image('frame_over', 'assets/images/inventory/frame_over.png');
        this.load.image('frame_revive', 'assets/images/inventory/frame_revive.png');
        this.load.image('button_x', 'assets/images/inventory/button/button_x.png');
    }

    create() {
        const { width, height } = this.scale;

        this.mainContainer = this.add.container(0, 0);

        // Semi-transparent black overlay (Static, not in container)
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);

        // Ensure container is above overlay
        this.mainContainer.setDepth(1);

        // Frame
        const frame = this.add.image(width / 2 + 18, height / 2 - 30, 'frame_over');
        frame.setScale(0.5);
        this.mainContainer.add(frame);

        // Buttons
        const buttonSpacing = 80;
        const buttonStartY = height / 2 - 110;
        const buttonX = width / 2;

        // Restart Button
        const restartBtn = this.createImageButton(buttonX, buttonStartY, 'button_restart', () => {
            this.scene.stop('GameOverScene');
            this.scene.start('MainScene');
        });
        this.mainContainer.add(restartBtn);

        // Revive Button
        // Revive Button
        const reviveBtn = this.createImageButton(buttonX, buttonStartY + buttonSpacing, 'button_revive', () => {
            this.tweens.add({
                targets: this.mainContainer,
                y: -height, // Move container down out of view
                duration: 500,
                ease: 'Power2',
                onComplete: () => {
                    this.scene.pause('GameOverScene');
                    this.scene.launch('ReviveScene');
                }
            });
        });
        this.mainContainer.add(reviveBtn);

        // Menu Button
        const menuBtn = this.createImageButton(buttonX, buttonStartY + buttonSpacing * 2, 'button_menu', () => {
            this.scene.stop('GameOverScene');
            this.scene.stop('MainScene');
            this.scene.start('MenuScene');
        });
        this.mainContainer.add(menuBtn);

        // Resume event listener (when returning from ReviveScene)
        this.events.on('resume', () => {
            this.tweens.add({
                targets: this.mainContainer,
                y: 0,
                duration: 500,
                ease: 'Power2'
            });
        });
    }

    createImageButton(x, y, key, callback) {
        const button = this.add.sprite(x, y, key);
        button.setInteractive({ useHandCursor: true });

        button.on('pointerover', () => {
            button.setTint(0xdddddd);
            button.setScale(1.05);
        });

        button.on('pointerout', () => {
            button.clearTint();
            button.setScale(1);
        });

        button.on('pointerdown', () => {
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
