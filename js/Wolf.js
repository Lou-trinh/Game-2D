import Phaser from 'phaser';

export default class Wolf {
  constructor(data) {
    const { scene, x, y } = data;
    this.scene = scene;

    // Tạo sprite với Matter Physics
    this.sprite = scene.matter.add.sprite(x, y, 'wolf', 'wolf_idle_1');

    // Cấu hình physics body - GIỐNG BEAR
    this.sprite.setBody({
      type: 'circle',
      radius: 8
    });

    this.sprite.setFixedRotation();
    this.sprite.setFriction(0);
    this.sprite.setFrictionAir(0.15);
    this.sprite.setMass(30);

    // *** QUAN TRỌNG: Làm cho Wolf đi xuyên qua cây, đá và các vật cản khác ***
    // Chỉ va chạm với player
    this.sprite.setCollisionCategory(0x0002); // Category riêng cho Wolf
    this.sprite.setCollidesWith([0x0001]); // Chỉ va chạm với player (category 0x0001)

    // Thuộc tính của Wolf
    this.maxHealth = 100;
    this.health = 100;
    this.isDead = false;
    this.speed = 1.0; // Nhanh hơn bear một chút
    this.detectionRange = Infinity; // Always chase // Phát hiện xa hơn bear
    this.attackRange = 25; // Tầm idle walk
    this.meleeRange = 17; // Tầm đánh thật - GIỐNG BEAR
    this.state = 'idle';
    this.direction = 'down';

    // Damage cooldown - GIỐNG BEAR
    this.lastDamageTime = 0;
    this.damageCooldown = 1000; // Đánh mỗi 1 giây
    this.damageAmount = 12; // Damage cao hơn bear một chút

    // Tạo health bar
    this.createHealthBar(scene);

    // Lưu reference vào sprite
    this.sprite.wolfInstance = this;

    // Setup collision với player
    this.setupCollision();

    // Khởi tạo animation
    this.setupAnimations();
  }

  static preload(scene) {
    scene.load.atlas(
      'wolf',
      'assets/images/wolf/wolf.png',
      'assets/images/wolf/wolf_atlas.json'
    );
    scene.load.animation('wolf_anim', 'assets/images/wolf/wolf_anim.json');

    scene.load.image('blood', 'assets/images/item/blood.png');
    scene.load.image('meat', 'assets/images/item/meat.png');
  }

  createHealthBar(scene) {
    // Tạo background cho health bar
    this.healthBarBg = scene.add.rectangle(
      this.sprite.x,
      this.sprite.y - 25,
      40,
      5,
      0x000000
    );
    this.healthBarBg.setDepth(10000);

    // Tạo thanh máu (màu đỏ)
    this.healthBar = scene.add.rectangle(
      this.sprite.x,
      this.sprite.y - 25,
      40,
      5,
      0xff0000 // Màu đỏ
    );
    this.healthBar.setOrigin(0, 0.5);
    this.healthBar.setDepth(10001);
  }

  updateHealthBar() {
    if (!this.healthBar || !this.healthBarBg || this.isDead) return;

    // Cập nhật vị trí health bar theo wolf
    this.healthBarBg.setPosition(this.sprite.x, this.sprite.y - 25);

    // Cập nhật độ rộng thanh máu
    const healthWidth = (this.health / this.maxHealth) * 40;
    this.healthBar.width = healthWidth;

    // Đặt vị trí thanh máu bắt đầu từ bên trái của background
    this.healthBar.setPosition(this.sprite.x - 20, this.sprite.y - 25);

    // Đổi màu thanh máu theo tỷ lệ HP
    if (this.health > 60) {
      this.healthBar.setFillStyle(0xff0000); // Đỏ
    } else if (this.health > 30) {
      this.healthBar.setFillStyle(0xff6600); // Cam
    } else {
      this.healthBar.setFillStyle(0xcc0000); // Đỏ đậm
    }
  }

  setupAnimations() {
    // Chờ một chút để animation được load xong
    this.scene.time.delayedCall(100, () => {
      if (this.scene.anims.exists('wolf_idle')) {
        this.sprite.play('wolf_idle');
        console.log('✅ Wolf idle animation started');
      } else if (this.scene.anims.exists('idle')) {
        this.sprite.play('idle');
        console.log('✅ Wolf idle animation started (fallback)');
      } else if (this.scene.anims.exists('wolf_walk')) {
        this.sprite.play('wolf_walk');
        console.log('⚠️ Using walk as idle (wolf_walk)');
      } else if (this.scene.anims.exists('walk')) {
        this.sprite.play('walk');
        console.log('⚠️ Using walk as idle (walk)');
      } else {
        console.error('❌ No Wolf animations found!');
        console.log('Available animations:', this.scene.anims.anims.entries);
      }
    });
  }

  playIdleAnimation() {
    if (this.scene.anims.exists('wolf_idle')) {
      this.sprite.play('wolf_idle', true);
    } else if (this.scene.anims.exists('idle')) {
      this.sprite.play('idle', true);
    }
  }

  playWalkAnimation() {
    if (this.scene.anims.exists('wolf_walk')) {
      this.sprite.play('wolf_walk', true);
    } else if (this.scene.anims.exists('walk')) {
      this.sprite.play('walk', true);
    }
  }

  setupCollision() {
    // GIỐNG BEAR - Lắng nghe va chạm với player
    this.sprite.setOnCollide((data) => {
      const { bodyA, bodyB } = data;
      const otherBody = bodyA === this.sprite.body ? bodyB : bodyA;

      // CHỈ TÍNH VA CHẠM VỚI COLLIDER, BỎ QUA SENSOR
      if (otherBody.label === 'playerSensor') {
        return;
      }

      if (otherBody.gameObject && otherBody.gameObject === this.scene.player) {
        this.attackPlayer();
      }
    });
  }

  findNearestTarget() {
    const player = this.scene.player;
    let nearestTarget = player;
    let nearestDistance = Phaser.Math.Distance.Between(
      this.sprite.x,
      this.sprite.y,
      player.x,
      player.y
    );

    // Check for ice monsters
    if (this.scene.summonedMonsters) {
      this.scene.summonedMonsters.forEach(monster => {
        if (!monster || monster.isDead) return;

        const distance = Phaser.Math.Distance.Between(
          this.sprite.x,
          this.sprite.y,
          monster.x,
          monster.y
        );

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

    // Check distance
    const distance = Phaser.Math.Distance.Between(
      this.sprite.x,
      this.sprite.y,
      monster.x,
      monster.y
    );

    if (distance > this.meleeRange) {
      return;
    }

    // Only attack if cooldown passed
    if (currentTime - this.lastDamageTime > this.damageCooldown) {
      this.lastDamageTime = currentTime;

      // Deal damage to ice monster
      if (monster.takeDamage) {
        monster.takeDamage(this.damageAmount);
        console.log(`🐺 Wolf attacked ice monster! Dealt ${this.damageAmount} damage`);

        // Attack flash effect
        this.sprite.setTint(0xff6666);
        this.scene.time.delayedCall(100, () => {
          if (!this.isDead) {
            this.sprite.clearTint();
          }
        });
      }
    }
  }

  attackPlayer() {
    const currentTime = this.scene.time.now;
    const player = this.scene.player;

    if (!player || player.isDead) return;

    // KIỂM TRA KHOẢNG CÁCH CENTER-TO-CENTER
    const distance = Phaser.Math.Distance.Between(
      this.sprite.x,
      this.sprite.y,
      player.x,
      player.y
    );

    // CHỈ TẤN CÔNG NẾU THỰC SỰ GẦN
    if (distance > this.meleeRange) {
      return;
    }

    // Chỉ gây damage nếu đã qua thời gian cooldown
    if (currentTime - this.lastDamageTime > this.damageCooldown) {
      this.lastDamageTime = currentTime;

      // Gây damage cho player
      if (player.takeDamage) {
        player.takeDamage(this.damageAmount);
        console.log(`🐺 Wolf attacked player! (distance: ${distance.toFixed(1)}px)`);

        // HIỆU ỨNG TẤN CÔNG - nhấp đỏ
        this.sprite.setTint(0xff6666);
        this.scene.time.delayedCall(100, () => {
          if (!this.isDead) {
            this.sprite.clearTint();
          }
        });
      }
    }
  }

  update() {
    if (!this.sprite || !this.sprite.body || this.isDead) return;

    const player = this.scene.player;
    if (!player) return;

    // Find nearest target (player or ice monster)
    const { target, distance } = this.findNearestTarget();
    const isIceMonster = target !== player;

    // Xác định trạng thái - GIỐNG BEAR
    if (distance <= this.meleeRange) {
      // TRONG TẦM TẤN CÔNG - DỪNG LẠI VÀ TẤN CÔNG
      this.state = 'attack';
      this.sprite.setVelocity(0, 0);

      this.playIdleAnimation();

      if (isIceMonster) {
        this.attackIceMonster(target);
      } else {
        this.attackPlayer();
      }

    } else if (distance < this.attackRange) {
      // Trong phạm vi idle walk
      this.state = 'idle_walk';
      this.idleWalk(target);
    } else if (distance < this.detectionRange) {
      // Phát hiện target - đuổi theo
      this.state = 'chase';
      this.chaseTarget(target);
    } else {
      // Ngoài tầm - đứng yên
      this.state = 'idle';
      this.playIdleAnimation();
      this.sprite.setVelocity(0, 0);
    }

    // Cập nhật health bar
    this.updateHealthBar();

    // Cập nhật depth để render đúng thứ tự
    this.sprite.setDepth(this.sprite.y);
  }

  idleWalk(target) {
    // Di chuyển CỰC CHẬM khi ở gần - GIỐNG BEAR
    const angle = Phaser.Math.Angle.Between(
      this.sprite.x,
      this.sprite.y,
      target.x,
      target.y
    );

    const slowSpeed = this.speed * 0.15;
    const velocityX = Math.cos(angle) * slowSpeed;
    const velocityY = Math.sin(angle) * slowSpeed;

    this.sprite.setVelocity(velocityX, velocityY);

    this.playWalkAnimation();

    // Flip sprite theo hướng di chuyển
    if (velocityX < 0) {
      this.sprite.setFlipX(true);
    } else if (velocityX > 0) {
      this.sprite.setFlipX(false);
    }
  }

  chaseTarget(target) {
    const angle = Phaser.Math.Angle.Between(
      this.sprite.x,
      this.sprite.y,
      target.x,
      target.y
    );

    const velocityX = Math.cos(angle) * this.speed;
    const velocityY = Math.sin(angle) * this.speed;

    this.sprite.setVelocity(velocityX, velocityY);

    this.playWalkAnimation();

    // Flip sprite theo hướng di chuyển
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

    // Hiệu ứng nhấp nháy khi bị tấn công
    this.sprite.setTint(0xff0000);
    this.scene.time.delayedCall(100, () => {
      if (!this.isDead) {
        this.sprite.clearTint();
      }
    });

    console.log(`🐺 Wolf health: ${this.health}/${this.maxHealth}`);

    // Cập nhật health bar
    this.updateHealthBar();

    if (this.health <= 0) {
      this.die();
    }
  }

  die() {
    if (this.isDead) return;

    this.isDead = true;
    console.log('💀 Wolf died!');

    // Ẩn health bar
    if (this.healthBar) this.healthBar.setVisible(false);
    if (this.healthBarBg) this.healthBarBg.setVisible(false);

    // Rơi vật phẩm
    this.dropItems();

    // Hiệu ứng chết
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
    // Item drops disabled - blood, meat, and diamonds no longer drop
    return;
  }

  get x() {
    return this.sprite.x;
  }

  get y() {
    return this.sprite.y;
  }
}
