import Phaser from 'phaser';

export default class IceMonster {
    constructor(data) {
        const { scene, x, y, owner } = data;
        this.scene = scene;
        this.owner = owner; // Reference to player who summoned it

        // Create sprite with Matter Physics
        this.sprite = scene.matter.add.sprite(x, y, 'ice_monster', 'ice_monster_idle_1');

        // Configure physics body
        this.sprite.setBody({
            type: 'circle',
            radius: 8
        });

        this.sprite.setFixedRotation();
        this.sprite.setFriction(0);
        this.sprite.setFrictionAir(0.15);
        this.sprite.setMass(20);

        // Collision settings - no physical collision with enemies (pass through them)
        this.sprite.setCollisionCategory(0x0004); // Unique category for summons
        this.sprite.setCollidesWith([0x0000]); // Don't physically collide with anything

        // Ice Monster properties
        this.maxHealth = 150;
        this.health = 150;
        this.isDead = false;
        this.speed = 1.2;
        this.detectionRange = 100;
        this.attackRange = 20;
        this.meleeRange = 18;
        this.state = 'idle';
        this.isAlly = true; // Mark as ally

        // Damage cooldown
        this.lastDamageTime = 0;
        this.damageCooldown = 1000;
        this.damageAmount = 25;

        // Follow player when no enemies
        this.followDistance = 30;

        // Create health bar
        this.createHealthBar(scene);

        // Setup animations
        this.setupAnimations();

        // Store reference
        this.sprite.iceMonsterInstance = this;

        console.log('❄️ Ice Monster summoned!');
    }

    static preload(scene) {
        scene.load.atlas(
            'ice_monster',
            'assets/images/skill/ice_monster/ice_monster.png',
            'assets/images/skill/ice_monster/ice_monster_atlas.json'
        );
        scene.load.animation('ice_monster_anim', 'assets/images/skill/ice_monster/ice_monster_anim.json');
    }

    createHealthBar(scene) {
        // Health bar background
        this.healthBarBg = scene.add.rectangle(
            this.sprite.x,
            this.sprite.y - 25,
            40,
            5,
            0x000000
        );
        this.healthBarBg.setDepth(10000);

        // Health bar (cyan color for ice theme)
        this.healthBar = scene.add.rectangle(
            this.sprite.x,
            this.sprite.y - 25,
            40,
            5,
            0x00ffff
        );
        this.healthBar.setOrigin(0, 0.5);
        this.healthBar.setDepth(10001);
    }

    updateHealthBar() {
        if (!this.healthBar || !this.healthBarBg || this.isDead) return;

        // Update health bar position
        this.healthBarBg.setPosition(this.sprite.x, this.sprite.y - 25);

        // Update health bar width
        const healthWidth = (this.health / this.maxHealth) * 40;
        this.healthBar.width = healthWidth;

        // Position health bar from left of background
        this.healthBar.setPosition(this.sprite.x - 20, this.sprite.y - 25);

        // Change color based on HP
        if (this.health > 100) {
            this.healthBar.setFillStyle(0x00ffff); // Cyan
        } else if (this.health > 50) {
            this.healthBar.setFillStyle(0x00ccff); // Light blue
        } else {
            this.healthBar.setFillStyle(0x0099ff); // Blue
        }
    }

    setupAnimations() {
        if (this.scene.anims.exists('ice_monster_idle')) {
            this.sprite.play('ice_monster_idle');
        } else {
            console.warn('Ice Monster animations not loaded yet');
        }
    }

    findNearestEnemy() {
        const enemyGroups = [
            this.scene.bears,
            this.scene.treeMen,
            this.scene.forestGuardians,
            this.scene.gnollBrutes,
            this.scene.gnollShamans,
            this.scene.wolves,
            this.scene.golems,
            this.scene.mushrooms,
            this.scene.smallMushrooms
        ];

        let nearestEnemy = null;
        let nearestDistance = Infinity;

        enemyGroups.forEach(group => {
            if (!group) return;
            (Array.isArray(group) ? group : []).forEach(enemy => {
                if (!enemy || enemy.isDead) return;

                const distance = Phaser.Math.Distance.Between(
                    this.sprite.x,
                    this.sprite.y,
                    enemy.x,
                    enemy.y
                );

                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestEnemy = enemy;
                }
            });
        });

        return nearestEnemy;
    }

    followPlayer() {
        if (!this.owner) return;

        const distance = Phaser.Math.Distance.Between(
            this.sprite.x,
            this.sprite.y,
            this.owner.x,
            this.owner.y
        );

        // Only follow if player is far enough
        if (distance > this.followDistance) {
            const angle = Phaser.Math.Angle.Between(
                this.sprite.x,
                this.sprite.y,
                this.owner.x,
                this.owner.y
            );

            const velocityX = Math.cos(angle) * this.speed;
            const velocityY = Math.sin(angle) * this.speed;

            this.sprite.setVelocity(velocityX, velocityY);

            if (this.scene.anims.exists('ice_monster_walk')) {
                this.sprite.play('ice_monster_walk', true);
            }

            // Flip sprite based on movement direction
            if (velocityX < 0) {
                this.sprite.setFlipX(true);
            } else if (velocityX > 0) {
                this.sprite.setFlipX(false);
            }
        } else {
            this.sprite.setVelocity(0, 0);
            if (this.scene.anims.exists('ice_monster_idle')) {
                this.sprite.play('ice_monster_idle', true);
            }
        }
    }

    chaseEnemy(enemy) {
        const angle = Phaser.Math.Angle.Between(
            this.sprite.x,
            this.sprite.y,
            enemy.x,
            enemy.y
        );

        const velocityX = Math.cos(angle) * this.speed;
        const velocityY = Math.sin(angle) * this.speed;

        this.sprite.setVelocity(velocityX, velocityY);

        if (this.scene.anims.exists('ice_monster_walk')) {
            this.sprite.play('ice_monster_walk', true);
        }

        // Flip sprite based on movement direction
        if (velocityX < 0) {
            this.sprite.setFlipX(true);
        } else if (velocityX > 0) {
            this.sprite.setFlipX(false);
        }
    }

    attackEnemy(enemy) {
        const currentTime = this.scene.time.now;

        if (!enemy || enemy.isDead) return;

        // Check distance
        const distance = Phaser.Math.Distance.Between(
            this.sprite.x,
            this.sprite.y,
            enemy.x,
            enemy.y
        );

        if (distance > this.meleeRange) {
            return;
        }

        // Only attack if cooldown passed
        if (currentTime - this.lastDamageTime > this.damageCooldown) {
            this.lastDamageTime = currentTime;

            // Play attack animation
            if (this.scene.anims.exists('ice_monster_attack')) {
                this.sprite.play('ice_monster_attack', true);
            }

            // Deal damage to enemy
            if (enemy.takeDamage) {
                enemy.takeDamage(this.damageAmount);
                console.log(`❄️ Ice Monster attacked enemy! Dealt ${this.damageAmount} damage`);

                // Attack flash effect
                this.sprite.setTint(0x66ffff);
                this.scene.time.delayedCall(100, () => {
                    this.sprite.clearTint();
                });
            }
        }
    }

    update() {
        if (!this.sprite || !this.sprite.body || this.isDead) return;

        // Find nearest enemy
        const nearestEnemy = this.findNearestEnemy();

        if (nearestEnemy) {
            const distance = Phaser.Math.Distance.Between(
                this.sprite.x,
                this.sprite.y,
                nearestEnemy.x,
                nearestEnemy.y
            );

            if (distance <= this.meleeRange) {
                // In attack range - stop and attack
                this.state = 'attack';
                this.sprite.setVelocity(0, 0);

                this.attackEnemy(nearestEnemy);
            } else if (distance < this.detectionRange) {
                // Chase enemy
                this.state = 'chase';
                this.chaseEnemy(nearestEnemy);
            } else {
                // Enemy too far, follow player
                this.state = 'follow';
                this.followPlayer();
            }
        } else {
            // No enemies, follow player
            this.state = 'follow';
            this.followPlayer();
        }

        // Update health bar
        this.updateHealthBar();

        // Update depth for proper rendering order
        this.sprite.setDepth(this.sprite.y);
    }

    takeDamage(amount) {
        if (this.isDead) return;

        this.health -= amount;
        if (this.health < 0) this.health = 0;

        // Flash effect when hit
        this.sprite.setTint(0xff0000);
        this.scene.time.delayedCall(100, () => {
            if (!this.isDead) {
                this.sprite.clearTint();
            }
        });

        console.log(`❄️ Ice Monster health: ${this.health}/${this.maxHealth}`);

        // Update health bar
        this.updateHealthBar();

        if (this.health <= 0) {
            this.die();
        }
    }

    die() {
        if (this.isDead) return;

        this.isDead = true;
        console.log('💀 Ice Monster died!');

        // Hide health bar
        if (this.healthBar) this.healthBar.setVisible(false);
        if (this.healthBarBg) this.healthBarBg.setVisible(false);

        // Death effect
        this.sprite.setTint(0x666666);
        this.sprite.setVelocity(0, 0);

        // Fade out animation
        this.scene.tweens.add({
            targets: this.sprite,
            alpha: 0,
            duration: 500,
            onComplete: () => {
                this.sprite.destroy();
                if (this.healthBar) this.healthBar.destroy();
                if (this.healthBarBg) this.healthBarBg.destroy();
            }
        });
    }

    getHitbox() {
        return new Phaser.Geom.Rectangle(
            this.sprite.x - 12,
            this.sprite.y - 12,
            24,
            24
        );
    }

    get x() {
        return this.sprite.x;
    }

    get y() {
        return this.sprite.y;
    }
}
