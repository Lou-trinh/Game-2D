import Phaser from 'phaser';

export default class Chest {
    constructor(data) {
        const { scene, x, y } = data;
        this.scene = scene;

        // Create sprite with Matter Physics
        this.sprite = scene.matter.add.sprite(x, y, 'chest', 'chest1');
        this.sprite.setScale(0.8);

        // Configure physics body - static, can be hit
        this.sprite.setStatic(true);
        this.sprite.setCircle(10);
        this.sprite.setSensor(true); // Player can walk through

        // Set collision - chests collide with everything
        this.sprite.setCollisionCategory(0x0002);
        this.sprite.setCollidesWith([0x0001]);

        // Chest state
        this.isOpened = false;
        this.isOpening = false;

        // Store reference
        this.sprite.chestInstance = this;

        console.log(`📦 Chest spawned at (${x}, ${y})`);
    }

    static preload(scene) {
        scene.load.atlas(
            'chest',
            'assets/images/item/chest/chest.png',
            'assets/images/item/chest/chest_atlas.json'
        );
        scene.load.animation('chest_anim', 'assets/images/item/chest/chest_anim.json');
    }

    update() {
        if (!this.sprite || this.isOpened) return;

        // Update depth for proper rendering
        this.sprite.setDepth(this.sprite.y);
    }

    takeDamage(amount) {
        // If already opened or opening, ignore
        if (this.isOpened || this.isOpening) return;

        console.log('📦 Chest hit! Opening...');
        this.open();
    }

    open() {
        if (this.isOpened || this.isOpening) return;

        this.isOpening = true;

        // Play opening animation ONCE (no repeat)
        this.sprite.play({
            key: 'chest',
            repeat: 0  // Play only once
        });

        // Flash effect
        this.sprite.setTint(0xffff00);
        this.scene.time.delayedCall(100, () => {
            if (this.sprite) this.sprite.clearTint();
        });

        // Drop items immediately (synced with animation)
        this.dropItems();

        // Wait for animation to complete, then destroy
        this.sprite.once('animationcomplete', () => {
            this.isOpened = true;
            // Items are already dropped

            // Destroy the chest after opening
            this.sprite.destroy();
            console.log('📦 Chest opened and destroyed!');

            // Notify scene to schedule next spawn
            if (this.scene.onChestOpened) {
                this.scene.onChestOpened();
            }
        });
    }

    dropItems() {
        // Drop 10-20 coins
        const coinCount = Phaser.Math.Between(10, 20);
        if (this.scene.dropLoot) {
            this.scene.dropLoot(this.x, this.y, coinCount, 'coin');
        }

        // Spawn 3-5 random power-up items
        const itemCount = Phaser.Math.Between(3, 5);

        const dropX = this.sprite.x;
        const dropY = this.sprite.y;

        // Drop 1 blood (left side)
        this.dropSingleItem(dropX, dropY, 'blood', -25, 0);

        // Drop 1-3 health potions (replaces meat)
        const potionCount = Phaser.Math.Between(1, 3);
        for (let i = 0; i < potionCount; i++) {
            this.scene.time.delayedCall(80 + i * 80, () => {
                const ox = Phaser.Math.Between(-20, 20);
                const oy = Phaser.Math.Between(-10, 10);
                this.dropSingleItem(dropX, dropY, 'blood', ox, oy);
            });
        }

        // Drop 3-5 diamonds (scatter around)
        const diamondCount = Math.floor(Math.random() * 3) + 3;
        for (let i = 0; i < diamondCount; i++) {
            this.scene.time.delayedCall(320 + i * 100, () => {
                const angle = Math.random() * Math.PI * 2;
                const distance = 20 + Math.random() * 15;
                this.dropSingleItem(dropX, dropY, 'diamond', Math.cos(angle) * distance, Math.sin(angle) * distance);
            });
        }

        // Drop 1-2 common fragments
        const fragCommon = Phaser.Math.Between(1, 2);
        for (let i = 0; i < fragCommon; i++) {
            this.scene.time.delayedCall(620 + i * 100, () => {
                const angle = Math.random() * Math.PI * 2;
                const d = Phaser.Math.Between(20, 40);
                this.dropSingleItem(dropX, dropY, 'frag_common', Math.cos(angle) * d, Math.sin(angle) * d);
            });
        }

        // 50% chance: 1 rare fragment
        if (Math.random() < 0.5) {
            this.scene.time.delayedCall(820, () => {
                const angle = Math.random() * Math.PI * 2;
                const d = Phaser.Math.Between(25, 45);
                this.dropSingleItem(dropX, dropY, 'frag_rare', Math.cos(angle) * d, Math.sin(angle) * d);
            });
        }

        console.log(`📦 Chest: ${potionCount} potions, ${diamondCount} diamonds, ${fragCommon} frag_common`);
    }

    dropSingleItem(dropX, dropY, itemType, offsetX, offsetY) {
        const item = this.scene.add.image(dropX, dropY, itemType);

        const scaleMap = { blood: 0.1, diamond: 0.8, frag_common: 0.7, frag_rare: 0.75 };
        item.setScale(scaleMap[itemType] ?? 0.8);

        item.setDepth(dropY - 1);
        item.setAlpha(0.8);
        item.setData('itemType', itemType);

        const targetX = dropX + offsetX;
        const targetY = dropY + offsetY;

        // Bounce effect - fly up then drop down
        this.scene.tweens.add({
            targets: item,
            x: targetX,
            y: targetY - 40,
            alpha: 1,
            duration: 250,
            ease: 'Quad.easeOut',
            onComplete: () => {
                this.scene.tweens.add({
                    targets: item,
                    y: targetY,
                    duration: 400,
                    ease: 'Bounce.easeOut',
                    onComplete: () => {
                        // Add to items list for pickup
                        if (this.scene.items) {
                            this.scene.items.push(item);
                        }
                    }
                });
            }
        });

        // Rotation effect
        this.scene.tweens.add({
            targets: item,
            angle: 360,
            duration: 650,
            ease: 'Linear'
        });
    }

    getHitbox() {
        // Hitbox for attack detection
        return new Phaser.Geom.Rectangle(
            this.sprite.x - 15,
            this.sprite.y - 15,
            30,
            30
        );
    }

    get x() {
        return this.sprite.x;
    }

    get y() {
        return this.sprite.y;
    }
}
