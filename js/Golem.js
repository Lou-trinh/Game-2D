import Phaser from 'phaser';

export default class Golem {
  constructor(data) {
    const { scene, x, y } = data;
    this.scene = scene;

    this.sprite = scene.matter.add.sprite(x, y, 'golem', 'golem_idle_1');
    this.sprite.setScale(1.5);

    const SCALE = this.sprite.scaleX; // 1.5

    // Body hình tròn
    this.sprite.setBody({
      type: 'circle',
      radius: 15 * SCALE
    });

    this.sprite.setFixedRotation();
    this.sprite.setFriction(0);
    this.sprite.setFrictionAir(0.15);
    this.sprite.setMass(60);

    // *** QUAN TRỌNG: Làm cho Golem đi xuyên qua cây, đá và các vật cản khác ***
    // Chỉ va chạm với player
    this.sprite.setCollisionCategory(0x0002); // Category riêng cho Golem
    this.sprite.setCollidesWith([0x0001]); // Chỉ va chạm với player (category 0x0001)

    // Thuộc tính
    this.maxHealth = 500;
    this.health = 500;
    this.isDead = false;
    this.speed = 0.8;

    // Phạm vi - điều chỉnh giống TreeMan
    this.detectionRange = 80 * SCALE;  // Phạm vi phát hiện
    this.attackRange = 60 * SCALE;     // Phạm vi idle walk - tăng lên
    this.meleeRange = 50 * SCALE;      // Phạm vi tấn công thực sự - tăng lên

    this.state = 'idle';
    this.direction = 'down';

    this.lastDamageTime = 0;
    this.damageCooldown = 2000;  // 2 giây tấn công 1 lần
    this.damageAmount = 10;

    this.scaleFactor = SCALE;

    this.createHealthBar(scene);
    this.setupCollision();
    this.setupAnimations();

    this.sprite.golemInstance = this;
  }

  static preload(scene) {
    scene.load.atlas(
      'golem',
      'assets/images/golem/golem.png',
      'assets/images/golem/golem_atlas.json'
    );
    scene.load.animation('golem_anim', 'assets/images/golem/golem_anim.json');

    scene.load.image('blood', 'assets/images/item/blood.png');
    scene.load.image('meat', 'assets/images/item/meat.png');

    // Load effect tấn công
    scene.load.atlas(
      'effect_1',
      'assets/images/effects/effect_1/effect_1.png',
      'assets/images/effects/effect_1/effect_1_atlas.json'
    );
    scene.load.animation('effect_1_anim', 'assets/images/effects/effect_1/effect_1_anim.json');
  }

  createHealthBar(scene) {
    const barWidth = 80;
    const barHeight = 8;
    const offsetY = 50 * this.scaleFactor;

    this.healthBarBg = scene.add.rectangle(
      this.sprite.x,
      this.sprite.y - offsetY,
      barWidth,
      barHeight,
      0x000000
    );
    this.healthBarBg.setDepth(10000);

    this.healthBar = scene.add.rectangle(
      this.sprite.x - barWidth / 2,
      this.sprite.y - offsetY,
      barWidth,
      barHeight,
      0xff0000
    );
    this.healthBar.setOrigin(0, 0.5);
    this.healthBar.setDepth(10001);
  }

  updateHealthBar() {
    if (!this.healthBar || !this.healthBarBg || this.isDead) return;

    const barWidth = 80;
    const offsetY = 50 * this.scaleFactor;

    this.healthBarBg.setPosition(this.sprite.x, this.sprite.y - offsetY);
    this.healthBar.setPosition(this.sprite.x - barWidth / 2, this.sprite.y - offsetY);

    const healthWidth = (this.health / this.maxHealth) * barWidth;
    this.healthBar.width = healthWidth;

    if (this.health > 60) {
      this.healthBar.setFillStyle(0xff0000);
    } else if (this.health > 30) {
      this.healthBar.setFillStyle(0xff6600);
    } else {
      this.healthBar.setFillStyle(0xcc0000);
    }
  }

  setupAnimations() {
    if (this.scene.anims.exists('golem_idle')) {
      this.sprite.play('golem_idle');
    }
  }

  playIdleAnimation() {
    if (this.scene.anims.exists('golem_idle')) {
      this.sprite.play('golem_idle', true);
    } else if (this.scene.anims.exists('golem_walk')) {
      this.sprite.play('golem_walk', true);
    }
  }

  setupCollision() {
    this.sprite.setOnCollide((data) => {
      const otherBody = data.bodyA === this.sprite.body ? data.bodyB : data.bodyA;

      if (otherBody.label === 'playerSensor') return;

      if (otherBody.gameObject === this.scene.player) {
        this.attackPlayer();
      }
    });
  }

  findNearestTarget() {
    const player = this.scene.player;
    let nearestTarget = player;
    let nearestDistance = Phaser.Math.Distance.Between(
      this.sprite.x, this.sprite.y, player.x, player.y
    );

    if (this.scene.summonedMonsters) {
      this.scene.summonedMonsters.forEach(monster => {
        if (!monster || monster.isDead) return;
        const distance = Phaser.Math.Distance.Between(
          this.sprite.x, this.sprite.y, monster.x, monster.y
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
    const now = this.scene.time.now;
    if (!monster || monster.isDead) return;

    const distance = Phaser.Math.Distance.Between(
      this.sprite.x, this.sprite.y, monster.x, monster.y
    );
    if (distance > this.meleeRange) return;

    if (now - this.lastDamageTime > this.damageCooldown) {
      this.lastDamageTime = now;
      monster.takeDamage?.(this.damageAmount);
      this.sprite.setTint(0xff6666);
      this.scene.time.delayedCall(100, () => this.sprite.clearTint());
      this.createAttackEffect(monster.x, monster.y);
      console.log(`🗿 Golem attacked ice monster! Dealt ${this.damageAmount} damage`);
    }
  }

  attackPlayer() {
    const now = this.scene.time.now;
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
    if (distance > this.meleeRange) return;

    if (now - this.lastDamageTime > this.damageCooldown) {
      this.lastDamageTime = now;
      player.takeDamage?.(this.damageAmount);

      // Hiệu ứng tấn công
      this.sprite.setTint(0xff6666);
      this.scene.time.delayedCall(100, () => this.sprite.clearTint());

      // Tạo effect tấn công tại vị trí player
      this.createAttackEffect(player.x, player.y);
    }
  }

  createAttackEffect(x, y) {
    if (!this.scene.anims.exists('effect_1')) return;

    // Tạo effect cao hơn để che được player (dịch lên trên)
    const effectY = y - 20;  // Dịch lên 20 pixels
    const effect = this.scene.add.sprite(x, effectY, 'effect_1', '001');
    effect.setScale(1);  // Tăng scale lên để rõ hơn
    effect.setDepth(10000);  // Hiển thị trên cùng

    // Chạy animation CHỈ 1 LẦN (không lặp)
    effect.play({
      key: 'effect_1',
      repeat: 0  // Chỉ chạy 1 lần
    });

    // Xóa effect sau khi animation kết thúc
    effect.on('animationcomplete', () => {
      effect.destroy();
    });
  }

  update() {
    if (!this.sprite || !this.sprite.body || this.isDead) return;

    const player = this.scene.player;
    if (!player) return;

    const { target, distance } = this.findNearestTarget();
    const isIceMonster = target !== player;

    // Logic giống TreeMan
    if (distance <= this.meleeRange) {
      this.state = 'attack';
      this.sprite.setVelocity(0, 0);

      const currentAnim = this.sprite.anims.currentAnim;
      if (!currentAnim || currentAnim.key !== 'golem_idle') {
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
      this.state = 'idle';
      this.sprite.setVelocity(0, 0);

      // Khi idle (ngoài tầm), cũng dùng idle animation
      const currentAnim = this.sprite.anims.currentAnim;
      if (!currentAnim || currentAnim.key !== 'golem_idle') {
        this.playIdleAnimation();
      }
    }

    this.updateHealthBar();
    this.sprite.setDepth(this.sprite.y);

    // Flip theo hướng di chuyển
    const vx = this.sprite.body.velocity.x;
    if (vx < 0) this.sprite.setFlipX(true);
    else if (vx > 0) this.sprite.setFlipX(false);
  }

  idleWalk(target) {
    // Di chuyển với tốc độ bình thường (giống chase)
    const angle = Phaser.Math.Angle.Between(
      this.sprite.x, this.sprite.y, target.x, target.y
    );

    const velocityX = Math.cos(angle) * this.speed;
    const velocityY = Math.sin(angle) * this.speed;

    this.sprite.setVelocity(velocityX, velocityY);

    if (this.scene.anims.exists('golem_walk')) {
      this.sprite.play('golem_walk', true);
    }
  }

  chaseTarget(target) {
    const angle = Phaser.Math.Angle.Between(
      this.sprite.x, this.sprite.y, target.x, target.y
    );

    const velocityX = Math.cos(angle) * this.speed;
    const velocityY = Math.sin(angle) * this.speed;

    this.sprite.setVelocity(velocityX, velocityY);

    if (this.scene.anims.exists('golem_walk')) {
      this.sprite.play('golem_walk', true);
    }
  }

  takeDamage(amount) {
    if (this.isDead) return;
    this.health = Math.max(0, this.health - amount);

    this.sprite.setTint(0xff0000);
    this.scene.time.delayedCall(100, () => {
      if (!this.isDead) this.sprite.clearTint();
    });

    this.updateHealthBar();

    if (this.health <= 0) this.die();
  }

  // Thêm method để lấy hitbox cho việc kiểm tra va chạm
  getHitbox() {
    // Sử dụng radius của circle body thực tế
    const radius = 20 * this.scaleFactor;
    const diameter = radius * 2;
    return new Phaser.Geom.Rectangle(
      this.sprite.x - radius,
      this.sprite.y - radius,
      diameter,
      diameter
    );
  }

  die() {
    if (this.isDead) return;
    this.isDead = true;

    this.healthBar?.setVisible(false);
    this.healthBarBg?.setVisible(false);

    this.dropItems();

    this.sprite.setTint(0x666666);
    this.sprite.setVelocity(0, 0);

    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      duration: 500,
      onComplete: () => {
        this.sprite.destroy();
        this.healthBar?.destroy();
        this.healthBarBg?.destroy();
      }
    });
  }

  dropItems() {
    const dropX = this.sprite.x;
    const dropY = this.sprite.y;

    // Rơi 2 blood
    for (let i = 0; i < 2; i++) {
      this.scene.time.delayedCall(i * 80, () => {
        const blood = this.scene.add.image(dropX, dropY, 'blood');
        blood.setScale(0.05);
        blood.setDepth(dropY - 1);
        blood.setAlpha(0.8);
        blood.setData('itemType', 'blood');

        const bloodTargetX = dropX - 20 + (i * 25) + Math.random() * 10;
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
            this.scene.items?.push(blood);
          }
        });

        this.scene.tweens.add({
          targets: blood,
          angle: 360,
          duration: 500,
          ease: 'Linear'
        });
      });
    }

    // Rơi 5 meat
    for (let i = 0; i < 5; i++) {
      this.scene.time.delayedCall(80 + (i * 70), () => {
        const meat = this.scene.add.image(dropX, dropY, 'meat');
        meat.setScale(0.1);
        meat.setDepth(dropY - 1);
        meat.setAlpha(0.8);
        meat.setData('itemType', 'meat');

        const angle = (Math.PI * 2 / 5) * i;
        const radius = 25 + Math.random() * 15;
        const meatTargetX = dropX + Math.cos(angle) * radius;
        const meatTargetY = dropY + Math.sin(angle) * radius;

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
            this.scene.items?.push(meat);
          }
        });

        this.scene.tweens.add({
          targets: meat,
          angle: -360,
          duration: 550,
          ease: 'Linear'
        });
      });
    }
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }
}
