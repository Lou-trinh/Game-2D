import Phaser from 'phaser';

export default class GnollShaman {
  constructor(data) {
    const { scene, x, y } = data;
    this.scene = scene;

    // Tạo sprite với Matter Physics
    this.sprite = scene.matter.add.sprite(x, y, 'gnollshaman', 'gnollshaman_idle_1');

    // Cấu hình physics body
    this.sprite.setBody({
      type: 'circle',
      radius: 8
    });

    this.sprite.setFixedRotation();
    this.sprite.setFriction(0);
    this.sprite.setFrictionAir(0.15);
    this.sprite.setMass(30);

    // *** QUAN TRỌNG: Làm cho GnollShaman đi xuyên qua cây, đá và các vật cản khác ***
    // Chỉ va chạm với player
    this.sprite.setCollisionCategory(0x0002); // Category riêng cho GnollShaman
    this.sprite.setCollidesWith([0x0001]); // Chỉ va chạm với player (category 0x0001)

    // Thuộc tính của GnollShaman
    this.maxHealth = 80;
    this.health = 80;
    this.isDead = false;
    this.speed = 0.7;
    this.detectionRange = Infinity; // Always chase
    this.attackRange = 150; // Increased range
    this.meleeRange = 130; // Increased range
    this.state = 'idle';
    this.direction = 'down';

    // Attack cooldown cho ranged attack
    this.lastAttackTime = 0;
    this.attackCooldown = 1500;
    this.projectileDamage = 12;
    this.projectiles = [];

    // Tạo health bar
    this.createHealthBar(scene);

    // Lưu reference vào sprite để dễ truy cập
    this.sprite.gnollShamanInstance = this;

    // Setup collision với player
    this.setupCollision();

    // Khởi tạo animation
    this.setupAnimations();
  }

  static preload(scene) {
    scene.load.atlas(
      'gnollshaman',
      'assets/images/gnoll_shaman/gnollshaman.png',
      'assets/images/gnoll_shaman/gnollshaman_atlas.json'
    );
    scene.load.animation('gnollshaman_anim', 'assets/images/gnoll_shaman/gnollshaman_anim.json');

    scene.load.image('blood', 'assets/images/item/blood.png');
    scene.load.image('blood2', 'assets/images/item/blood2.png');
    scene.load.image('meat', 'assets/images/item/meat.png');
  }

  createHealthBar(scene) {
    this.healthBarBg = scene.add.rectangle(
      this.sprite.x,
      this.sprite.y - 25,
      40,
      5,
      0x000000
    );
    this.healthBarBg.setDepth(10000);

    this.healthBar = scene.add.rectangle(
      this.sprite.x,
      this.sprite.y - 25,
      40,
      5,
      0xff0000
    );
    this.healthBar.setOrigin(0, 0.5);
    this.healthBar.setDepth(10001);
  }

  updateHealthBar() {
    if (!this.healthBar || !this.healthBarBg || this.isDead) return;

    this.healthBarBg.setPosition(this.sprite.x, this.sprite.y - 25);

    const healthWidth = (this.health / this.maxHealth) * 40;
    this.healthBar.width = healthWidth;

    this.healthBar.setPosition(this.sprite.x - 20, this.sprite.y - 25);

    if (this.health > 48) {
      this.healthBar.setFillStyle(0xff0000); // Red
    } else if (this.health > 24) {
      this.healthBar.setFillStyle(0xff6600); // Orange
    } else {
      this.healthBar.setFillStyle(0xcc0000); // Dark Red
    }
  }

  setupAnimations() {
    this.scene.time.delayedCall(100, () => {
      if (this.scene.anims.exists('gnollshaman_idle')) {
        this.sprite.play('gnollshaman_idle');
        console.log('✅ Gnoll Shaman idle animation started');
      } else if (this.scene.anims.exists('idle')) {
        this.sprite.play('idle');
        console.log('✅ Gnoll Shaman idle animation started (fallback)');
      } else if (this.scene.anims.exists('gnollshaman_walk')) {
        this.sprite.play('gnollshaman_walk');
        console.log('⚠️ Using walk as idle (gnollshaman_walk)');
      } else if (this.scene.anims.exists('walk')) {
        this.sprite.play('walk');
        console.log('⚠️ Using walk as idle (walk)');
      } else {
        console.error('❌ No Gnoll Shaman animations found!');
        console.log('Available animations:', this.scene.anims.anims.entries);
      }
    });
  }

  playIdleAnimation() {
    if (this.scene.anims.exists('gnollshaman_idle')) {
      this.sprite.play('gnollshaman_idle', true);
    } else if (this.scene.anims.exists('idle')) {
      this.sprite.play('idle', true);
    } else if (this.scene.anims.exists('gnollshaman_walk')) {
      this.sprite.play('gnollshaman_walk', true);
    } else if (this.scene.anims.exists('walk')) {
      this.sprite.play('walk', true);
    }
  }

  playWalkAnimation() {
    if (this.scene.anims.exists('gnollshaman_walk')) {
      this.sprite.play('gnollshaman_walk', true);
    } else if (this.scene.anims.exists('walk')) {
      this.sprite.play('walk', true);
    }
  }

  setupCollision() {
    this.sprite.setOnCollide((data) => {
      const { bodyA, bodyB } = data;
      const otherBody = bodyA === this.sprite.body ? bodyB : bodyA;
      if (otherBody.label === 'playerSensor') return;
    });
  }

  findNearestTarget() {
    const player = this.scene.player;
    let nearestTarget = player;
    let nearestDistance = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, player.x, player.y);
    if (this.scene.summonedMonsters) {
      this.scene.summonedMonsters.forEach(monster => {
        if (!monster || monster.isDead) return;
        const distance = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, monster.x, monster.y);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestTarget = monster;
        }
      });
    }
    return { target: nearestTarget, distance: nearestDistance };
  }

  shootProjectile(target) {
    const currentTime = this.scene.time.now;

    if (!target || target.isDead) return;
    if (currentTime - this.lastAttackTime < this.attackCooldown) return;

    this.lastAttackTime = currentTime;

    const projectile = this.scene.add.circle(this.sprite.x, this.sprite.y, 6, 0x9966ff, 0.8);
    projectile.setDepth(this.sprite.y + 1);
    projectile.setStrokeStyle(2, 0xcc99ff, 1);

    const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, target.x, target.y);
    const speed = 3;
    projectile.velocityX = Math.cos(angle) * speed;
    projectile.velocityY = Math.sin(angle) * speed;
    projectile.damage = this.projectileDamage;
    projectile.lifeTime = 0;
    projectile.maxLifeTime = 2000;

    this.projectiles.push(projectile);
    console.log(`🔮 Gnoll Shaman shot projectile!`);

    this.sprite.setTint(0xcc99ff);
    this.scene.time.delayedCall(100, () => {
      if (!this.isDead) this.sprite.clearTint();
    });
  }

  updateProjectiles(delta) {
    const player = this.scene.player;

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      if (!proj || !proj.active) {
        this.projectiles.splice(i, 1);
        continue;
      }

      proj.x += proj.velocityX;
      proj.y += proj.velocityY;
      proj.setDepth(proj.y);
      proj.lifeTime += delta;

      if (proj.lifeTime >= proj.maxLifeTime) {
        proj.destroy();
        this.projectiles.splice(i, 1);
        continue;
      }

      // Check collision with player
      if (player && !player.isDead) {
        const distance = Phaser.Math.Distance.Between(proj.x, proj.y, player.x, player.y);
        if (distance <= 15) {
          player.takeDamage?.(proj.damage);
          console.log(`🔮 Magic projectile hit player! Damage: ${proj.damage}`);
          proj.destroy();
          this.projectiles.splice(i, 1);
          continue;
        }
      }

      // Check collision with ice monsters
      if (this.scene.summonedMonsters) {
        for (const monster of this.scene.summonedMonsters) {
          if (!monster || monster.isDead) continue;
          const distance = Phaser.Math.Distance.Between(proj.x, proj.y, monster.x, monster.y);
          if (distance <= 15) {
            monster.takeDamage?.(proj.damage);
            console.log(`🔮 Magic projectile hit ice monster! Damage: ${proj.damage}`);
            proj.destroy();
            this.projectiles.splice(i, 1);
            break;
          }
        }
      }
    }
  }

  update(time, delta) {
    if (!this.sprite || !this.sprite.body || this.isDead) return;
    const player = this.scene.player;
    if (!player) return;

    this.updateProjectiles(delta);

    const { target, distance } = this.findNearestTarget();
    const isIceMonster = target !== player;

    // Validate target still exists
    if (!target || (isIceMonster && (!target.sprite || target.isDead))) {
      this.state = 'idle';
      this.sprite.setVelocity(0, 0);
      this.playIdleAnimation();
      this.updateHealthBar();
      this.sprite.setDepth(this.sprite.y);
      return;
    }

    // Attack range: 50-130 units for ice monster, 60-130 for player (increased)
    const minAttackDistance = isIceMonster ? 50 : 60;
    const maxAttackDistance = this.meleeRange; // 130

    if (distance >= minAttackDistance && distance <= maxAttackDistance) {
      // IN ATTACK RANGE - STOP AND SHOOT
      this.state = 'attack';
      this.sprite.setVelocity(0, 0);

      const currentAnim = this.sprite.anims.currentAnim;
      if (!currentAnim || (currentAnim.key !== 'gnollshaman_idle' && currentAnim.key !== 'idle')) {
        this.playIdleAnimation();
      }

      // Face target
      if (target.x < this.sprite.x) {
        this.sprite.setFlipX(true);
      } else {
        this.sprite.setFlipX(false);
      }

      this.shootProjectile(target);

    } else if (distance < minAttackDistance) {
      // TOO CLOSE
      if (isIceMonster) {
        // Don't retreat from ice monster - stand ground and keep attacking
        this.state = 'attack';
        this.sprite.setVelocity(0, 0);

        const currentAnim = this.sprite.anims.currentAnim;
        if (!currentAnim || (currentAnim.key !== 'gnollshaman_idle' && currentAnim.key !== 'idle')) {
          this.playIdleAnimation();
        }

        // Face target
        if (target.x < this.sprite.x) {
          this.sprite.setFlipX(true);
        } else {
          this.sprite.setFlipX(false);
        }

        this.shootProjectile(target);
      } else {
        // Retreat from player only
        this.state = 'retreat';
        this.retreatFromTarget(target);
      }
    } else if (distance < this.detectionRange) {
      // TOO FAR - CHASE
      this.state = 'chase';
      this.chaseTarget(target);
    } else {
      // OUT OF RANGE - IDLE
      this.state = 'idle';
      this.sprite.setVelocity(0, 0);

      const currentAnim = this.sprite.anims.currentAnim;
      if (!currentAnim || (currentAnim.key !== 'gnollshaman_idle' && currentAnim.key !== 'idle')) {
        this.playIdleAnimation();
      }
    }

    this.updateHealthBar();
    this.sprite.setDepth(this.sprite.y);
  }

  retreatFromTarget(target) {
    const angle = Phaser.Math.Angle.Between(target.x, target.y, this.sprite.x, this.sprite.y);

    const velocityX = Math.cos(angle) * this.speed;
    const velocityY = Math.sin(angle) * this.speed;

    this.sprite.setVelocity(velocityX, velocityY);
    this.playWalkAnimation();

    if (velocityX < 0) {
      this.sprite.setFlipX(true);
    } else if (velocityX > 0) {
      this.sprite.setFlipX(false);
    }
  }

  chaseTarget(target) {
    const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, target.x, target.y);

    const velocityX = Math.cos(angle) * this.speed;
    const velocityY = Math.sin(angle) * this.speed;

    this.sprite.setVelocity(velocityX, velocityY);
    this.playWalkAnimation();

    if (velocityX < 0) {
      this.sprite.setFlipX(true);
    } else if (velocityX > 0) {
      this.sprite.setFlipX(false);
    }
  }

  takeDamage(amount) {
    if (this.isDead) return;

    this.health -= amount;
    if (this.health < 0) this.health = 0;

    this.sprite.setTint(0xff0000);
    this.spawnBloodPuddle();
    this.scene.time.delayedCall(100, () => {
      if (!this.isDead) {
        this.sprite.clearTint();
      }
    });

    console.log(`🔮 Gnoll Shaman health: ${this.health}/${this.maxHealth}`);

    this.updateHealthBar();

    if (this.health <= 0) {
      this.die();
    }
  }

  spawnBloodPuddle() {
    if (!this.scene || !this.sprite) return;
    const blood = this.scene.add.image(this.sprite.x + Phaser.Math.Between(-10, 10), this.sprite.y + 15, 'blood2');
    blood.setDepth(0);
    blood.setScale(Phaser.Math.FloatBetween(0.2, 0.4));
    // blood.setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));

    this.scene.tweens.add({
      targets: blood,
      alpha: 0,
      duration: 5000,
      ease: 'Power2',
      onComplete: () => {
        blood.destroy();
      }
    });
  }

  die() {
    if (this.isDead) return;

    this.isDead = true;
    console.log('💀 Gnoll Shaman died!');

    if (this.healthBar) this.healthBar.setVisible(false);
    if (this.healthBarBg) this.healthBarBg.setVisible(false);

    this.projectiles.forEach(proj => {
      if (proj && proj.active) {
        proj.destroy();
      }
    });
    this.projectiles = [];

    this.dropItems();

    this.sprite.setTint(0x666666);
    this.sprite.setVelocity(0, 0);

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

  dropItems() {
    // Drop 2-4 coins
    const coinCount = Phaser.Math.Between(2, 4);
    if (this.scene.dropLoot) {
      this.scene.dropLoot(this.sprite.x, this.sprite.y, coinCount, 'coin');
    }
  }

  get x() {
    return this.sprite.x;
  }

  get y() {
    return this.sprite.y;
  }
}
