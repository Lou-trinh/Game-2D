import Phaser from 'phaser';
import { Economy } from './utils/Economy';

export default class TreeMan {
  constructor(data) {
    const { scene, x, y } = data;
    this.scene = scene;

    // Tạo sprite với Matter Physics - FIX: dùng frame đúng từ atlas
    this.sprite = scene.matter.add.sprite(x, y, 'tree_man', 'ent_idle_1');

    // Cấu hình physics body - GIỮ NGUYÊN SIZE
    this.sprite.setBody({
      type: 'circle',
      radius: 8
    });

    this.sprite.setFixedRotation();
    this.sprite.setFriction(0);
    this.sprite.setFrictionAir(0.15);
    this.sprite.setMass(30);

    // Làm cho TreeMan đi xuyên qua cây, đá và các vật cản khác
    // Chỉ va chạm với player
    this.sprite.setCollisionCategory(0x0002); // Category riêng cho TreeMan
    this.sprite.setCollidesWith([0x0001]); // Chỉ va chạm với player (category 0x0001)

    // Thuộc tính của Tree Man
    this.maxHealth = 100;
    this.health = 100;
    this.isDead = false;
    this.speed = 0.4;
    this.detectionRange = Infinity; // Always chase
    this.attackRange = 20;
    this.meleeRange = 17;
    this.state = 'idle';
    this.direction = 'down';

    // Damage cooldown
    this.lastDamageTime = 0;
    this.damageCooldown = 1000;
    this.damageAmount = 10;

    // Tạo health bar
    this.createHealthBar(scene);

    // Lưu reference vào sprite để dễ truy cập
    this.sprite.treeManInstance = this;

    // Setup collision với player
    this.setupCollision();

    // Khởi tạo animation - PHẢI GỌI SAU CÙNG
    this.setupAnimations();
  }

  static preload(scene) {
    scene.load.atlas(
      'tree_man',
      'assets/images/monsters/tree_man/tree_man.png',
      'assets/images/monsters/tree_man/tree_man_atlas.json'
    );
    scene.load.animation('tree_man_anim', 'assets/images/monsters/tree_man/tree_man_anim.json');

    scene.load.image('blood', 'assets/images/item/blood.png');
    scene.load.image('blood2', 'assets/images/item/blood2.png');
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

    // Cập nhật vị trí health bar theo tree man
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
    // Thử play idle trước, nếu không có thì dùng walk
    if (this.scene.anims.exists('tree_man_idle')) {
      this.sprite.play('tree_man_idle');
    } else if (this.scene.anims.exists('tree_man_walk')) {
      // Nếu không có idle, dùng walk làm idle
      this.sprite.play('tree_man_walk');
    } else {
      console.warn('⚠️ No tree man animations found, retrying...');
      // Thử lại sau 50ms
      this.scene.time.delayedCall(50, () => {
        if (this.scene.anims.exists('tree_man_idle')) {
          this.sprite.play('tree_man_idle');
        } else if (this.scene.anims.exists('tree_man_walk')) {
          this.sprite.play('tree_man_walk');
        } else {
          console.error('❌ Failed to load tree man animations!');
        }
      });
    }
  }

  playIdleAnimation() {
    // Helper function để play idle animation (hoặc walk nếu idle không có)
    if (this.scene.anims.exists('tree_man_idle')) {
      this.sprite.play('tree_man_idle', true);
    } else if (this.scene.anims.exists('tree_man_walk')) {
      this.sprite.play('tree_man_walk', true);
    }
  }

  setupCollision() {
    // Lắng nghe va chạm với player
    this.sprite.setOnCollide((data) => {
      const { bodyA, bodyB } = data;

      // Kiểm tra xem có va chạm với player không
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
    const player = this.scene.getNearestPlayer(this.sprite.x, this.sprite.y);
    let nearestTarget = player;
    let nearestDistance = player
      ? Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, player.x, player.y)
      : Infinity;

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
    const currentTime = this.scene.time.now;
    if (!monster || monster.isDead) return;

    const distance = Phaser.Math.Distance.Between(
      this.sprite.x, this.sprite.y, monster.x, monster.y
    );
    if (distance > this.meleeRange) return;

    if (currentTime - this.lastDamageTime > this.damageCooldown) {
      this.lastDamageTime = currentTime;
      if (monster.takeDamage) {
        monster.takeDamage(this.damageAmount);
        this.sprite.setTint(0xff6666);
        this.scene.time.delayedCall(100, () => {
          this.sprite.clearTint();
        });
      }
    }
  }

  attackPlayer() {
    const currentTime = this.scene.time.now;
    const player = this.scene.getNearestPlayer(this.sprite.x, this.sprite.y);

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

    const player = this.scene.getNearestPlayer(this.sprite.x, this.sprite.y);
    if (!player) return;

    const { target, distance } = this.findNearestTarget();
    if (!target) {
      this.state = 'idle';
      this.sprite.setVelocity(0, 0);
      return;
    }
    const isIceMonster = target !== player;

    // Xác định trạng thái
    if (distance <= this.meleeRange) {
      this.state = 'attack';
      this.sprite.setVelocity(0, 0);

      const currentAnim = this.sprite.anims.currentAnim;
      if (!currentAnim || currentAnim.key !== 'tree_man_idle') {
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
      if (!currentAnim || currentAnim.key !== 'tree_man_idle') {
        this.playIdleAnimation();
      }
    }

    // Cập nhật health bar
    this.updateHealthBar();

    // Cập nhật depth để render đúng thứ tự
    this.sprite.setDepth(this.sprite.y);
  }

  idleWalk(target) {
    const angle = Phaser.Math.Angle.Between(
      this.sprite.x, this.sprite.y, target.x, target.y
    );

    const slowSpeed = this.speed * 0.15;
    const velocityX = Math.cos(angle) * slowSpeed;
    const velocityY = Math.sin(angle) * slowSpeed;

    this.sprite.setVelocity(velocityX, velocityY);

    if (this.scene.anims.exists('tree_man_walk')) {
      this.sprite.play('tree_man_walk', true);
    }

    // Flip sprite theo hướng di chuyển
    if (velocityX < 0) {
      this.sprite.setFlipX(true);
    } else if (velocityX > 0) {
      this.sprite.setFlipX(false);
    }
  }

  chaseTarget(target) {
    const angle = Phaser.Math.Angle.Between(
      this.sprite.x, this.sprite.y, target.x, target.y
    );

    const velocityX = Math.cos(angle) * this.speed;
    const velocityY = Math.sin(angle) * this.speed;

    this.sprite.setVelocity(velocityX, velocityY);

    if (this.scene.anims.exists('tree_man_walk')) {
      this.sprite.play('tree_man_walk', true);
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
    this.spawnBloodPuddle();
    this.scene.time.delayedCall(100, () => {
      if (!this.isDead) {
        this.sprite.clearTint();
      }
    });


    // Cập nhật health bar
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
      if (this.scene?._sessionKills !== undefined) this.scene._sessionKills++;
    Economy.addExp(20);

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
    if (!this.scene.dropLoot) return;
    this.scene.dropLoot(this.sprite.x, this.sprite.y, Phaser.Math.Between(2, 5), 'coin');
    if (Math.random() < 0.03)
      this.scene.dropLoot(this.sprite.x, this.sprite.y, 1, 'frag_common');
    if (Math.random() < 0.01)
      this.scene.dropLoot(this.sprite.x, this.sprite.y, 1, 'frag_rare');
  }

  get x() {
    return this.sprite.x;
  }

  get y() {
    return this.sprite.y;
  }
}

