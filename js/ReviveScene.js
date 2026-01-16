import Phaser from 'phaser';

export default class ReviveScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ReviveScene' });
    }

    preload() {
        this.load.image('frame_revive', 'assets/images/inventory/frame_revive.png');
        this.load.image('button_x', 'assets/images/inventory/button/button_x.png');
        this.load.image('button_action', 'assets/images/inventory/button/button_action.png');
        this.load.image('button_diamon', 'assets/images/inventory/button/button_diamon.png');
    }

    create() {
        const { width, height } = this.scale;

        // Dark background overlay
        // Make it interactive to catch clicks outside the frame
        // Alpha 0 because we rely on GameOverScene's overlay for darkness
        const background = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0);
        background.setInteractive();



        // Revive Frame
        // Container for all popup elements
        const container = this.add.container(0, 0);

        // Revive Frame
        // Shifted up by 50px (finalY = height/2 - 50)
        // But since we put it in container, let's position relative to container 0,0?
        // Actually, easiest is to position elements where they should be on screen, add to container, 
        // and then move the container.

        // Final positions:
        const finalFrameY = height / 2 - 50;
        const finalBtnY = height / 2 - 130;

        const reviveFrame = this.add.image(width / 2, finalFrameY, 'frame_revive');
        reviveFrame.setScale(0.5);
        // reviveFrame.setInteractive(); // REMOVE: Texture is too big and blocks background

        // Frame Hit Area (Invisible "Safe Zone")
        // Size approx 520x360 scaled 0.5? No, frameScale is 0.5. 
        // Visual size estimate is needed. Using 520x360 fits the previous attempt.
        const frameHitArea = this.add.rectangle(width / 2, finalFrameY, 520, 360, 0x000000, 0);
        frameHitArea.setInteractive();
        frameHitArea.on('pointerdown', (pointer, localX, localY, event) => {
            event.stopPropagation(); // Consume click
        });

        // Buttons
        const btnY = height / 2; // Move buttons lower (approx center of screen, inside frame)
        const btnSpacing = 160; // Increase spacing slightly for larger buttons

        // Action Button (Ads/Free?)
        const actionBtn = this.createButton(width / 2 - btnSpacing / 2, btnY, 'button_action', () => {
            this.watchAd();
        }, 0.7);

        // Diamond Button (Pay?)
        const diamondBtn = this.createButton(width / 2 + btnSpacing / 2, btnY, 'button_diamon', () => {
            this.useDiamonds();
        }, 0.7);

        // Close Button (X)
        const closeBtnX = width / 2 + 120;
        // const closeBtnY = finalFrameY - 130; // approx top right relative to frame center? 
        // Logic for closeBtnX/Y seems to be absolute coordinates.
        // The user previously adjusted closeBtn positions. I should respect that but switch to createButton helper.
        // Previous code:
        // const closeBtnX = width / 2 + 120;
        // Text
        const textY = height / 2 - 80;
        const reviveText = this.add.text(width / 2, textY, 'SECOND CHANCE?', {
            fontFamily: 'Arial',
            fontSize: '28px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        });
        reviveText.setOrigin(0.5);

        // Close Button (X)
        const closeBtn = this.createButton(width / 2 + 120, height / 2 - 130, 'button_x', () => {
            this.closeScene();
        }, 0.5); // Keep close button small

        container.add([reviveFrame, frameHitArea, actionBtn, diamondBtn, reviveText, closeBtn]);

        // Start container off-screen
        container.y = height;

        // Animate Container
        this.tweens.add({
            targets: container,
            y: 0,
            duration: 500,
            ease: 'Power2'
        });

        // Store container for close animation
        this.container = container;
    }

    closeScene() {
        const { width, height } = this.scale;

        // Exit Animation
        if (this.container) {
            this.tweens.add({
                targets: this.container,
                y: height + 200,
                duration: 500,
                ease: 'Power2',
                onComplete: () => {
                    this.scene.stop('ReviveScene');
                    this.scene.resume('GameOverScene');
                }
            });
        }
    }

    watchAd() {
        const { width, height } = this.scale;

        // Semi-transparent black overlay for ad
        const adOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.9);
        adOverlay.setInteractive(); // Block input

        // Ad Text
        const adText = this.add.text(width / 2, height / 2, 'WATCHING AD: 10', {
            fontFamily: 'Arial',
            fontSize: '32px',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        adText.setOrigin(0.5);

        let countdown = 10;

        // Countdown timer
        const timer = this.time.addEvent({
            delay: 1000,
            repeat: 10,
            callback: () => {
                countdown--;
                if (countdown >= 0) {
                    adText.setText(`WATCHING AD: ${countdown}`);
                }

                if (countdown < 0) {
                    // Ad finished
                    adOverlay.destroy();
                    adText.destroy();

                    // Trigger revive in MainScene
                    const mainScene = this.scene.get('MainScene');
                    if (mainScene) {
                        mainScene.revivePlayer();
                        this.scene.stop('ReviveScene');
                        this.scene.stop('GameOverScene');
                        this.scene.resume('MainScene');
                    }
                }
            }
        });
    }

    useDiamonds() {
        // Get MainScene and Player
        const mainScene = this.scene.get('MainScene');
        if (!mainScene || !mainScene.player) return;

        const player = mainScene.player;
        const reviveCost = 20;

        if (player.diamondCount >= reviveCost) {
            // Deduct diamonds
            player.diamondCount -= reviveCost;
            console.log(`💎 Spent ${reviveCost} diamonds. Remaining: ${player.diamondCount}`);

            // Update UI
            if (mainScene.resourceUI) {
                mainScene.resourceUI.updateResources();
            }

            // Revive
            mainScene.revivePlayer();
            this.scene.stop('ReviveScene');
            this.scene.stop('GameOverScene');
            this.scene.resume('MainScene');
        } else {
            console.log("❌ Not enough diamonds!");

            // Visual feedback for failure (shake camera or show text)
            const { width, height } = this.scale;
            const errorText = this.add.text(width / 2, height / 2 + 100, 'NOT ENOUGH DIAMONDS!', {
                fontSize: '24px',
                color: '#ff0000',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 4
            }).setOrigin(0.5);

            this.tweens.add({
                targets: errorText,
                alpha: 0,
                y: errorText.y - 50,
                duration: 1000,
                onComplete: () => errorText.destroy()
            });

            this.cameras.main.shake(200, 0.01);
        }
    }

    createButton(x, y, key, callback, baseScale = 0.5) {
        const button = this.add.sprite(x, y, key);
        button.setScale(baseScale);
        button.setInteractive({ useHandCursor: true });

        button.on('pointerover', () => {
            button.setTint(0xdddddd);
            button.setScale(baseScale * 1.05); // Scale up 5%
        });

        button.on('pointerout', () => {
            button.clearTint();
            button.setScale(baseScale);
        });

        button.on('pointerdown', () => {
            this.tweens.add({
                targets: button,
                scale: baseScale * 0.95, // Scale down 5%
                duration: 50,
                yoyo: true,
                onComplete: callback
            });
        });

        return button;
    }
}
