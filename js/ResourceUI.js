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
    }

    updateResources() {
        this.woodText.setText(`🪵 ${this.player.woodCount || 0}`);
        this.stoneText.setText(`🪨 ${this.player.stoneCount || 0}`);
    }

    destroy() {
        this.woodText.destroy();
        this.stoneText.destroy();
    }
}
