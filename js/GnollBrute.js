import Phaser from 'phaser';

export default class GnollBrute {
  constructor(data) {
    const { scene, x, y } = data;
    this.scene = scene;

    // Tạo sprite với Matter Physics
    this.sprite = scene.matter.add.sprite(x, y, 'gnollbrute', 'gnollbrute_idle_1');

    // Cấu hình physics body
    this.sprite.setBody({
      type: 'circle',
      radius: 8
    });

    this.sprite.setFixedRotation();
    this.sprite.setFriction(0);
    this.sprite.setFrictionAir(0.15);
    this.sprite.setMass(40); // Nặng hơn TreeMan một chút

    // Làm cho GnollBrute đi xuyên qua cây, đá và các vật cản khác
    // Chỉ va chạm với player
    this.sprite.setCollisionCategory(0x0002); // Category riêng cho GnollBrute
    this.sprite.setCollidesWith([0x0001]); // Chỉ va chạm với player (category 0x0001)

    // Thuộc tính của GnollBrute
    this.maxHealth = 150; // Máu nhiều hơn TreeMan
    this.health = 150;
    this.isDead = false;
    this.speed = 0.9; // Nhanh hơn TreeMan
    this.detectionRange = 80; // Phát hiện xa hơn
    this.attackRange = 25;
    this.meleeRange = 20;
    this.state = 'idle';
    this.direction = 'down';

    // Damage cooldown
    this.lastDamageTime = 0;
    this.damageCooldown = 800; // Đánh nhanh hơn TreeMan
    this.damageAmount = 15; // Damage cao hơn

    // Tạo health bar
    this.createHealthBar(scene);

    // Lưu reference vào sprite để dễ truy cập
    this.sprite.gnollBruteInstance = this;

    // Setup collision với player
    this.setupCollision();

    // Khởi tạo animation - PHẢI GỌI SAU CÙNG
    this.setupAnimations();
  }

  static preload(scene) {
    scene.load.atlas(
      'gnollbrute',
      'assets/images/gnoll_brute/gnollbrute.png',
      'assets/images/gnoll_brute/gnollbrute_atlas.json'
    );
    scene.load.animation('gnollbrute_anim', 'assets/images/gnoll_brute/gnollbrute_anim.json');

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

    // Tạo thanh máu
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

    // Cập nhật vị trí health bar theo gnoll brute
    this.healthBarBg.setPosition(this.sprite.x, this.sprite.y - 25);

    // Cập nhật độ rộng thanh máu
    const healthWidth = (this.health / this.maxHealth) * 40;
    this.healthBar.width = healthWidth;

    // Đặt vị trí thanh máu bắt đầu từ bên trái của background
    this.healthBar.setPosition(this.sprite.x - 20, this.sprite.y - 25);

    // Đổi màu thanh máu theo tỷ lệ HP
    if (this.health > 90) {
      this.healthBar.setFillStyle(0xff0000); // Đỏ
    } else if (this.health > 45) {
      this.healthBar.setFillStyle(0xff6600); // Cam
    } else {
      this.healthBar.setFillStyle(0xcc0000); // Đỏ đậm
    }
  }

  setupAnimations() {
    // Thử play idle trước, nếu không có thì dùng walk
    if (this.scene.anims.exists('gnollbrute_idle')) {
      this.sprite.play('gnollbrute_idle');
      console.log('✅ Gnoll Brute idle animation started');
    } else if (this.scene.anims.exists('gnollbrute_walk')) {
      // Nếu không có idle, dùng walk làm idle
      this.sprite.play('gnollbrute_walk');
      console.log('⚠️ Using walk as idle (idle not found)');
    } else {
      console.warn('⚠️ No Gnoll Brute animations found, retrying...');
      // Thử lại sau 50ms
      this.scene.time.delayedCall(50, () => {
        if (this.scene.anims.exists('gnollbrute_idle')) {
          this.sprite.play('gnollbrute_idle');
          console.log('✅ Gnoll Brute idle animation started (delayed)');
        } else if (this.scene.anims.exists('gnollbrute_walk')) {
          this.sprite.play('gnollbrute_walk');
          console.log('⚠️ Using walk as idle (delayed)');
        } else {
          console.error('❌ Failed to load Gnoll Brute animations!');
        }
      });
    }
  }

  playIdleAnimation() {
    // Helper function để play idle animation (hoặc walk nếu idle không có)
    if (this.scene.anims.exists('gnollbrute_idle')) {
      this.sprite.play('gnollbrute_idle', true);
    } else if (this.scene.anims.exists('gnollbrute_walk')) {
      this.sprite.play('gnollbrute_walk', true);
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
        console.log(`💪 GnollBrute attacked ice monster! Dealt ${this.damageAmount} damage`);
        this.sprite.setTint(0xff6666);
        this.scene.time.delayedCall(100, () => { this.sprite.clearTint(); });
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
        console.log(`💪 Gnoll Brute attacked player! (distance: ${distance.toFixed(1)}px)`);

        // HIỆU ỨNG TẤN CÔNG - nhấp đỏ
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
      if (!currentAnim || currentAnim.key !== 'gnollbrute_idle') {
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
      // Ngoài tầm - đứng yên
      this.state = 'gnollbrute_idle';
      this.sprite.setVelocity(0, 0);

      // Khi idle (ngoài tầm), cũng dùng idle animation
      const currentAnim = this.sprite.anims.currentAnim;
      if (!currentAnim || currentAnim.key !== 'gnollbrute_idle') {
        this.playIdleAnimation();
      }
    }

    // Cập nhật health bar
    this.updateHealthBar();

    // Cập nhật depth để render đúng thứ tự
    this.sprite.setDepth(this.sprite.y);
  }

  idleWalk(target) {
    const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, target.x, target.y);

    const slowSpeed = this.speed * 0.15;
    const velocityX = Math.cos(angle) * slowSpeed;
    const velocityY = Math.sin(angle) * slowSpeed;

    this.sprite.setVelocity(velocityX, velocityY);

    if (this.scene.anims.exists('gnollbrute_walk')) {
      this.sprite.play('gnollbrute_walk', true);
    }

    // Flip sprite theo hướng di chuyển
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

    if (this.scene.anims.exists('gnollbrute_walk')) {
      this.sprite.play('gnollbrute_walk', true);
    }

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

    console.log(`💪 Gnoll Brute health: ${this.health}/${this.maxHealth}`);

    // Cập nhật health bar
    this.updateHealthBar();

    if (this.health <= 0) {
      this.die();
    }
  }

  die() {
    if (this.isDead) return;

    this.isDead = true;
    console.log('💀 Gnoll Brute died!');

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
    const dropX = this.sprite.x;
    const dropY = this.sprite.y;

    // Rơi blood - văng sang trái
    const blood = this.scene.add.image(dropX, dropY, 'blood');
    blood.setScale(0.05);
    blood.setDepth(dropY - 1);
    blood.setAlpha(0.8);
    blood.setData('itemType', 'blood');

    // Hiệu ứng văng và nảy cho blood
    const bloodTargetX = dropX - 15 - Math.random() * 10;
    const bloodTargetY = dropY + Math.random() * 10;

    this.scene.tweens.add({
      targets: blood,
      x: bloodTargetX,
      y: bloodTargetY - 30,
      alpha: 1,
      duration: 200,
      ease: 'Quad.easeOut'
    });

    this.scene.tweens.add({
      targets: blood,
      y: bloodTargetY,
      duration: 300,
      delay: 200,
      ease: 'Bounce.easeOut',
      onComplete: () => {
        // Sau khi rơi xong, thêm vào danh sách items
        if (this.scene.items) {
          this.scene.items.push(blood);
        }
      }
    });

    // Xoay nhẹ blood
    this.scene.tweens.add({
      targets: blood,
      angle: 360,
      duration: 500,
      ease: 'Linear'
    });

    // Rơi meat - văng sang phải
    const meat = this.scene.add.image(dropX, dropY, 'meat');
    meat.setScale(0.1);
    meat.setDepth(dropY - 1);
    meat.setAlpha(0.8);
    meat.setData('itemType', 'meat');

    // Hiệu ứng văng và nảy cho meat (delay một chút)
    this.scene.time.delayedCall(80, () => {
      const meatTargetX = dropX + 15 + Math.random() * 10;
      const meatTargetY = dropY + Math.random() * 10;

      this.scene.tweens.add({
        targets: meat,
        x: meatTargetX,
        y: meatTargetY - 35,
        alpha: 1,
        duration: 200,
        ease: 'Quad.easeOut'
      });

      this.scene.tweens.add({
        targets: meat,
        y: meatTargetY,
        duration: 350,
        delay: 200,
        ease: 'Bounce.easeOut',
        onComplete: () => {
          // Sau khi rơi xong, thêm vào danh sách items
          if (this.scene.items) {
            this.scene.items.push(meat);
          }
        }
      });

      // Xoay nhẹ meat
      this.scene.tweens.add({
        targets: meat,
        angle: -360,
        duration: 550,
        ease: 'Linear'
      });
    });

    console.log('🩸🥩 Dropped blood and meat!');
  }

  get x() {
    return this.sprite.x;
  }

  get y() {
    return this.sprite.y;
  }
}
