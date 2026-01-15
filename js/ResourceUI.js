export default class ResourceUI {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;

        // Position in top-right corner
        const startX = scene.cameras.main.width - 120;
        const startY = 3;

        // Wood icon and text (first item)
        this.woodText = scene.add.text(
            startX,
            startY,
            '🪵 0',
            {
                fontSize: '16px',
                fontStyle: 'bold',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 2
            }
        );
        this.woodText.setScrollFactor(0);
        this.woodText.setDepth(1001);

        // Stone icon and text (second item, to the right of wood)
        this.stoneText = scene.add.text(
            startX + 60,  // 60 pixels to the right
            startY,
            '🪨 0',
            {
                fontSize: '16px',
                fontStyle: 'bold',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 2
            }
        );
        this.stoneText.setScrollFactor(0);
        this.stoneText.setDepth(1001);

        // Initial update
        this.updateResources();

        // Add backpack icon (bottom right)
        this.createBackpack();

        // Add exit button (top left)
        this.createExitButton();
    }

    createExitButton() {
        if (!this.scene.textures.exists('button_out')) return;

        // Position: Top-left
        this.exitButton = this.scene.add.sprite(30, 30, 'button_out');
        this.exitButton.setScrollFactor(0);
        this.exitButton.setDepth(3000);
        this.exitButton.setInteractive({ useHandCursor: true });
        this.exitButton.setScale(0.4);

        // Hover effects
        this.exitButton.on('pointerover', () => {
            this.exitButton.setTint(0xdddddd);
            this.exitButton.setScale(0.45);
        });

        this.exitButton.on('pointerout', () => {
            this.exitButton.clearTint();
            this.exitButton.setScale(0.4);
        });

        // Click logic
        this.exitButton.on('pointerdown', () => {
            this.scene.tweens.add({
                targets: this.exitButton,
                scale: 0.35,
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
        this.woodText.setText(`🪵 ${this.player.woodCount || 0}`);
        this.stoneText.setText(`🪨 ${this.player.stoneCount || 0}`);
    }

    destroy() {
        this.woodText.destroy();
        this.stoneText.destroy();
        if (this.backpack) this.backpack.destroy();
        if (this.exitButton) this.exitButton.destroy();
    }
}
