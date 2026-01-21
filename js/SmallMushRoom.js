import Phaser from 'phaser';

export default class SmallMushRoom {
  constructor(data) {
    const { scene, x, y } = data;
    this.scene = scene;

    // Tạo sprite với Matter Physics
    this.sprite = scene.matter.add.sprite(x, y, 'smallmushroom', 'smallmushroom_idle_1');

    // Scale nhỏ hơn Large
    this.sprite.setScale(1);

    // Cấu hình physics body - nhỏ hơn Large
    this.sprite.setBody({
      type: 'circle',
      radius: 8
    });

    this.sprite.setFixedRotation();
    this.sprite.setFriction(0);
    this.sprite.setFrictionAir(0.15);
    this.sprite.setMass(25);

    // *** QUAN TRỌNG: Làm cho SmallMushRoom đi xuyên qua cây, đá và các vật cản khác ***
    // Chỉ va chạm với player
    this.sprite.setCollisionCategory(0x0002); // Category riêng cho SmallMushRoom
    this.sprite.setCollidesWith([0x0001]); // Chỉ va chạm với player (category 0x0001)

    // Thuộc tính của SmallMushRoom - yếu hơn Large
    this.maxHealth = 50;
    this.health = 50;
    this.isDead = false;
    this.speed = 0.6;
    this.detectionRange = Infinity; // Always chase
    this.attackRange = 25;
    this.meleeRange = 18;
    this.state = 'idle';
    this.direction = 'down';

    // Damage cooldown
    this.lastDamageTime = 0;
    this.damageCooldown = 1200;
    this.damageAmount = 5; // Damage thấp hơn Large

    // Tạo health bar
    this.createHealthBar(scene);

    // Lưu reference vào sprite để dễ truy cập
    this.sprite.mushroomInstance = this;

    // Setup collision với player
    this.setupCollision();

    // Khởi tạo animation - PHẢI GỌI SAU CÙNG
    this.setupAnimations();
  }

  static preload(scene) {
    scene.load.atlas(
      'smallmushroom',
      'assets/images/small_mush_room/smallmushroom.png',
      'assets/images/small_mush_room/smallmushroom_atlas.json'
    );
    scene.load.animation(
      'smallmushroom_anim',
      'assets/images/small_mush_room/smallmushroom_anim.json'
    );

    // Sử dụng chung blood và meat
    scene.load.image('blood', 'assets/images/item/blood.png');
    scene.load.image('meat', 'assets/images/item/meat.png');
  }

  createHealthBar(scene) {
    // Tạo background cho health bar - nhỏ hơn Large
    this.healthBarBg = scene.add.rectangle(
      this.sprite.x,
      this.sprite.y - 22,
      30,
      4,
      0x000000
    );
    this.healthBarBg.setDepth(10000);

    // Tạo thanh máu
    this.healthBar = scene.add.rectangle(
      this.sprite.x,
      this.sprite.y - 22,
      30,
      4,
      0x9b59b6
    );
    this.healthBar.setOrigin(0, 0.5);
    this.healthBar.setDepth(10001);
  }

  updateHealthBar() {
    if (!this.healthBar || !this.healthBarBg || this.isDead) return;

    // Cập nhật vị trí health bar theo mushroom
    this.healthBarBg.setPosition(this.sprite.x, this.sprite.y - 22);

    // Cập nhật độ rộng thanh máu
    const healthWidth = (this.health / this.maxHealth) * 30;
    this.healthBar.width = healthWidth;

    // Đặt vị trí thanh máu bắt đầu từ bên trái của background
    this.healthBar.setPosition(this.sprite.x - 15, this.sprite.y - 22);

    // Đổi màu thanh máu theo tỷ lệ HP
    if (this.health > 30) {
      this.healthBar.setFillStyle(0x9b59b6); // Tím
    } else if (this.health > 15) {
      this.healthBar.setFillStyle(0x8e44ad); // Tím đậm
    } else {
      this.healthBar.setFillStyle(0x6c3483); // Tím rất đậm
    }
  }

  setupAnimations() {
    // Thử play idle trước, nếu không có thì dùng walk
    if (this.scene.anims.exists('smallmushroom_idle')) {
      this.sprite.play('smallmushroom_idle');
      console.log('✅ Small Mushroom idle animation started');
    } else if (this.scene.anims.exists('smallmushroom_walk')) {
      this.sprite.play('smallmushroom_walk');
      console.log('⚠️ Using smallmushroom_walk as idle');
    } else {
      console.warn('⚠️ No Small Mushroom animations found, retrying...');
      this.scene.time.delayedCall(50, () => {
        if (this.scene.anims.exists('smallmushroom_idle')) {
          this.sprite.play('smallmushroom_idle');
          console.log('✅ Small Mushroom idle animation started (delayed)');
        } else if (this.scene.anims.exists('smallmushroom_walk')) {
          this.sprite.play('smallmushroom_walk');
          console.log('⚠️ Using smallmushroom_walk as idle (delayed)');
        } else {
          console.error('❌ Failed to load Small Mushroom animations!');
        }
      });
    }
  }

  playIdleAnimation() {
    if (this.scene.anims.exists('smallmushroom_idle')) {
      this.sprite.play('smallmushroom_idle', true);
    } else if (this.scene.anims.exists('smallmushroom_walk')) {
      this.sprite.play('smallmushroom_walk', true);
    }
  }

  setupCollision() {
    this.sprite.setOnCollide((data) => {
      const { bodyA, bodyB } = data;
      const otherBody = bodyA === this.sprite.body ? bodyB : bodyA;
      if (otherBody.label === 'playerSensor') return;
      if (otherBody.gameObject && otherBody.gameObject === this.scene.player) {
        this.attackPlayer();
      }
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

  attackIceMonster(monster) {
    const currentTime = this.scene.time.now;
    if (!monster || monster.isDead) return;
    const distance = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, monster.x, monster.y);
    if (distance > this.meleeRange) return;
    if (currentTime - this.lastDamageTime > this.damageCooldown) {
      this.lastDamageTime = currentTime;
      if (monster.takeDamage) {
        monster.takeDamage(this.damageAmount);
        console.log(`🍄 SmallMushRoom attacked ice monster! Dealt ${this.damageAmount} damage`);
        this.sprite.setTint(0xff6666);
        this.scene.time.delayedCall(100, () => { this.sprite.clearTint(); });
      }
    }
  }

  attackPlayer() {
    const currentTime = this.scene.time.now;
    const player = this.scene.player;

    if (!player || player.isDead) return;

    const distance = Phaser.Math.Distance.Between(
      this.sprite.x,
      this.sprite.y,
      player.x,
      player.y
    );

    if (distance > this.meleeRange) {
      return;
    }

    if (currentTime - this.lastDamageTime > this.damageCooldown) {
      this.lastDamageTime = currentTime;

      if (player.takeDamage) {
        player.takeDamage(this.damageAmount);
        console.log(`🍄 SmallMushRoom attacked player! (distance: ${distance.toFixed(1)}px)`);

        this.sprite.setTint(0xff6666);
        this.scene.time.delayedCall(100, () => {
          this.sprite.clearTint();
        });
      }
    }
  }

  update() {
    if (!this.sprite || !this.sprite.body || this.isDead) return;
    const player = this.scene.player;
    if (!player) return;

    const { target, distance } = this.findNearestTarget();
    const isIceMonster = target !== player;

    if (distance <= this.meleeRange) {
      this.state = 'attack';
      this.sprite.setVelocity(0, 0);
      const currentAnim = this.sprite.anims.currentAnim;
      if (!currentAnim || currentAnim.key !== 'smallmushroom_idle') {
        this.playIdleAnimation();
      }
      if (isIceMonster) {
        this.attackIceMonster(target);
      } else {
        this.attackPlayer();
      }

    } else if (distance < this.attackRange) {
      this.state = 'idle_walk';
      this.idleWalk(target);
    } else if (distance < this.detectionRange) {
      this.state = 'chase';
      this.chaseTarget(target);
    } else {
      this.state = 'idle';
      this.sprite.setVelocity(0, 0);

      const currentAnim = this.sprite.anims.currentAnim;
      if (!currentAnim || currentAnim.key !== 'smallmushroom_idle') {
        this.playIdleAnimation();
      }
    }

    this.updateHealthBar();
    this.sprite.setDepth(this.sprite.y);
  }

  idleWalk(target) {
    const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, target.x, target.y);

    const slowSpeed = this.speed * 0.15;
    const velocityX = Math.cos(angle) * slowSpeed;
    const velocityY = Math.sin(angle) * slowSpeed;

    this.sprite.setVelocity(velocityX, velocityY);

    if (this.scene.anims.exists('smallmushroom_walk')) {
      this.sprite.play('smallmushroom_walk', true);
    }

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

    if (this.scene.anims.exists('smallmushroom_walk')) {
      this.sprite.play('smallmushroom_walk', true);
    }

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
    this.scene.time.delayedCall(100, () => {
      if (!this.isDead) {
        this.sprite.clearTint();
      }
    });

    console.log(`🍄 SmallMushRoom health: ${this.health}/${this.maxHealth}`);

    this.updateHealthBar();

    if (this.health <= 0) {
      this.die();
    }
  }

  die() {
    if (this.isDead) return;

    this.isDead = true;
    console.log('💀 SmallMushRoom died!');

    if (this.healthBar) this.healthBar.setVisible(false);
    if (this.healthBarBg) this.healthBarBg.setVisible(false);

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
    // Drop 1 coin
    if (this.scene.dropLoot) {
      this.scene.dropLoot(this.sprite.x, this.sprite.y, 1, 'coin');
    }
  }

  get x() {
    return this.sprite.x;
  }

  get y() {
    return this.sprite.y;
  }
}
