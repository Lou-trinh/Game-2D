import Phaser from 'phaser';
import { Economy } from './utils/Economy';

export default class ForestGuardian {
  constructor(data) {
    const { scene, x, y } = data;
    this.scene = scene;

    // Tạo sprite với Matter Physics
    this.sprite = scene.matter.add.sprite(x, y, 'forest_guardian', 'forestguardian_idle_1');

    // Làm cho Forest Guardian to hơn
    this.sprite.setScale(1.5); // Tăng kích thước lên 1.5 lần

    // Cấu hình physics body
    this.sprite.setBody({
      type: 'circle',
      radius: 22 // Tăng radius lên theo tỷ lệ (15 * 1.5 ≈ 22)
    });

    this.sprite.setFixedRotation();
    this.sprite.setFriction(0);
    this.sprite.setFrictionAir(0.15);
    this.sprite.setMass(999999); // Mass cực lớn để không bị đẩy

    // Làm cho Forest Guardian đi xuyên qua cây, đá và các vật cản khác
    // Chỉ va chạm với player
    this.sprite.setCollisionCategory(0x0002); // Category riêng cho Forest Guardian
    this.sprite.setCollidesWith([0x0001]); // Chỉ va chạm với player (category 0x0001)

    // Thuộc tính của Forest Guardian
    this.maxHealth = 300;
    this.health = 300;
    this.isDead = false;
    this.speed = 0.8;
    this.detectionRange = Infinity; // Always chase // Phát hiện xa hơn
    this.attackRange = 150; // Tầm bắn xa (increased)
    this.meleeRange = 140; // Khoảng cách tối ưu để bắn (increased)
    this.state = 'idle';
    this.direction = 'down';

    // Attack cooldown cho ranged attack
    this.lastAttackTime = 0;
    this.attackCooldown = 2000; // Bắn mỗi 2 giây
    this.projectileDamage = 15; // Damage của tornado
    this.projectiles = []; // Danh sách tornado

    // Tạo health bar
    this.createHealthBar(scene);

    // Lưu reference vào sprite để dễ truy cập
    this.sprite.forestGuardianInstance = this;

    // Setup collision với player
    this.setupCollision();

    // Khởi tạo animation
    this.setupAnimations();
  }

  static preload(scene) {
    scene.load.atlas(
      'forest_guardian',
      'assets/images/forest_guardian/forest_guardian.png',
      'assets/images/forest_guardian/forest_guardian_atlas.json'
    );
    scene.load.animation('forest_guardian_anim', 'assets/images/forest_guardian/forest_guardian_anim.json');

    // Load tornado effect
    scene.load.atlas(
      'tornado',
      'assets/images/effects/effect_2/tornado.png',
      'assets/images/effects/effect_2/tornado_atlas.json'
    );
    scene.load.animation('tornado_anim', 'assets/images/effects/effect_2/tornado_anim.json');

    scene.load.image('blood', 'assets/images/item/blood.png');
    scene.load.image('blood2', 'assets/images/item/blood2.png');
    scene.load.image('wood', 'assets/images/item/wood.png');
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
      0xff0000 // Màu đỏ
    );
    this.healthBar.setOrigin(0, 0.5);
    this.healthBar.setDepth(10001);
  }

  updateHealthBar() {
    if (!this.healthBar || !this.healthBarBg || this.isDead) return;

    // Cập nhật vị trí health bar theo forest guardian
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
      this.healthBar.setFillStyle(0xcc0000); // Đỏ đậm
    } else {
      this.healthBar.setFillStyle(0x990000); // Đỏ rất đậm
    }
  }

  setupAnimations() {
    // Thử play idle trước, nếu không có thì dùng walk
    if (this.scene.anims.exists('forest_guardian_idle')) {
      this.sprite.play('forest_guardian_idle');
      console.log('✅ Forest Guardian idle animation started');
    } else if (this.scene.anims.exists('forest_guardian_walk')) {
      // Nếu không có idle, dùng walk làm idle
      this.sprite.play('forest_guardian_walk');
      console.log('⚠️ Using forest_guardian_walk as idle (forest_guardian_idle not found)');
    } else {
      console.warn('⚠️ No forest guardian animations found, retrying...');
      // Thử lại sau 100ms
      this.scene.time.delayedCall(100, () => {
        if (this.scene.anims.exists('forest_guardian_idle')) {
          this.sprite.play('forest_guardian_idle');
          console.log('✅ Forest Guardian idle animation started (delayed)');
        } else if (this.scene.anims.exists('forest_guardian_walk')) {
          this.sprite.play('forest_guardian_walk');
          console.log('⚠️ Using forest_guardian_walk as idle (delayed)');
        } else {
          console.error('❌ Failed to load forest guardian animations!');
        }
      });
    }
  }

  playIdleAnimation() {
    // Helper function để play idle animation (hoặc walk nếu idle không có)
    if (this.scene.anims.exists('forest_guardian_idle')) {
      this.sprite.play('forest_guardian_idle', true);
    } else if (this.scene.anims.exists('forest_guardian_walk')) {
      this.sprite.play('forest_guardian_walk', true);
    }
  }

  playWalkAnimation() {
    if (this.scene.anims.exists('forest_guardian_walk')) {
      this.sprite.play('forest_guardian_walk', true);
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

  shootTornado(target) {
    const currentTime = this.scene.time.now;

    if (!target || target.isDead) return;
    if (currentTime - this.lastAttackTime < this.attackCooldown) return;

    this.lastAttackTime = currentTime;

    const tornado = this.scene.matter.add.sprite(this.sprite.x, this.sprite.y, 'tornado', '001');
    tornado.setBody({ type: 'circle', radius: 10 });
    tornado.setSensor(true);
    tornado.setScale(0.8);
    tornado.setDepth(this.sprite.y + 1);
    tornado.setAlpha(0.9);

    if (this.scene.anims.exists('effect_2')) {
      tornado.play('effect_2');
    }

    const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, target.x, target.y);
    const speed = 3;
    tornado.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    tornado.damage = this.projectileDamage;
    tornado.spawnTime = this.scene.time.now;
    tornado.maxLifeTime = 1500;

    this.projectiles.push(tornado);
    console.log(`🌪️ Forest Guardian shot tornado!`);

    this.sprite.setTint(0x66ff66);
    this.scene.time.delayedCall(100, () => {
      if (!this.isDead) this.sprite.clearTint();
    });
  }

  updateProjectiles(delta) {
    const player = this.scene.player;
    const currentTime = this.scene.time.now;

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];

      if (!proj || !proj.active) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // Cập nhật depth
      proj.setDepth(proj.y);

      // Tính thời gian sống dựa trên timestamp thực
      const lifeTime = currentTime - proj.spawnTime;

      // Fade out dần khi gần hết thời gian (1.2s-1.5s)
      if (lifeTime > 1200 && lifeTime <= proj.maxLifeTime) {
        const remainingTime = proj.maxLifeTime - lifeTime;
        const fadeAlpha = remainingTime / 300; // 300ms để fade từ 1 -> 0
        proj.setAlpha(Math.max(0, fadeAlpha * 0.9));
      }

      // Xóa nếu hết thời gian
      if (lifeTime >= proj.maxLifeTime) {
        this.projectiles.splice(i, 1);
        proj.destroy();
        console.log(`🌪️ Tornado destroyed after ${lifeTime}ms`);
        continue;
      }

      // Kiểm tra va chạm với player
      if (player && !player.isDead) {
        const distance = Phaser.Math.Distance.Between(
          proj.x,
          proj.y,
          player.x,
          player.y
        );

        if (distance <= 20) { // Bán kính va chạm
          // Tính hướng đẩy lùi
          const knockbackAngle = Phaser.Math.Angle.Between(
            proj.x,
            proj.y,
            player.x,
            player.y
          );

          const knockbackForce = 15; // Tăng lực đẩy
          const knockbackX = Math.cos(knockbackAngle) * knockbackForce;
          const knockbackY = Math.sin(knockbackAngle) * knockbackForce;

          // Thử nhiều cách đẩy player
          if (player.setVelocity) {
            // Nếu player là Matter sprite trực tiếp
            player.setVelocity(knockbackX, knockbackY);
          } else if (player.sprite && player.sprite.setVelocity) {
            // Nếu player có thuộc tính sprite
            player.sprite.setVelocity(knockbackX, knockbackY);
          } else if (player.body) {
            // Nếu có body, dùng applyForce
            const body = player.body;
            body.setVelocity(knockbackX, knockbackY);
          }

          // Gây damage cho player
          if (player.takeDamage) {
            player.takeDamage(proj.damage);
            console.log(`🌪️ Tornado hit player! Damage: ${proj.damage} + Knockback (${knockbackX.toFixed(1)}, ${knockbackY.toFixed(1)})!`);
          }

          // Xóa khỏi mảng và destroy ngay lập tức
          this.projectiles.splice(i, 1);
          proj.destroy();

          console.log(`🌪️ Tornado destroyed on hit!`);
          continue;
        }
      }

      // Check collision with ice monsters
      if (this.scene.summonedMonsters) {
        for (const monster of this.scene.summonedMonsters) {
          if (!monster || monster.isDead) continue;
          const distance = Phaser.Math.Distance.Between(proj.x, proj.y, monster.x, monster.y);
          if (distance <= 20) {
            monster.takeDamage?.(proj.damage);
            console.log(`🌪️ Tornado hit ice monster! Damage: ${proj.damage}`);
            this.projectiles.splice(i, 1);
            proj.destroy();
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

    // Attack range: 50-140 units for both targets
    const minAttackDistance = 50;
    const maxAttackDistance = this.meleeRange; // 140

    if (distance >= minAttackDistance && distance <= maxAttackDistance) {
      // IN ATTACK RANGE - STOP AND SHOOT
      this.state = 'attack';
      this.sprite.setVelocity(0, 0);

      const currentAnim = this.sprite.anims.currentAnim;
      if (!currentAnim || currentAnim.key !== 'forest_guardian_idle') {
        this.playIdleAnimation();
      }

      // Face target
      if (target.x < this.sprite.x) {
        this.sprite.setFlipX(true);
      } else {
        this.sprite.setFlipX(false);
      }

      this.shootTornado(target);

    } else if (distance < minAttackDistance) {
      // TOO CLOSE
      if (isIceMonster) {
        // Don't retreat from ice monster - stand ground and keep attacking
        this.state = 'attack';
        this.sprite.setVelocity(0, 0);

        const currentAnim = this.sprite.anims.currentAnim;
        if (!currentAnim || currentAnim.key !== 'forest_guardian_idle') {
          this.playIdleAnimation();
        }

        // Face target
        if (target.x < this.sprite.x) {
          this.sprite.setFlipX(true);
        } else {
          this.sprite.setFlipX(false);
        }

        this.shootTornado(target);
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
      if (!currentAnim || currentAnim.key !== 'forest_guardian_idle') {
        this.playIdleAnimation();
      }
    }

    // Cập nhật health bar
    this.updateHealthBar();

    // Cập nhật depth để render đúng thứ tự
    this.sprite.setDepth(this.sprite.y);
  }

  retreatFromTarget(target) {
    const angle = Phaser.Math.Angle.Between(target.x, target.y, this.sprite.x, this.sprite.y);

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

  chaseTarget(target) {
    const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, target.x, target.y);

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
    this.spawnBloodPuddle();
    this.scene.time.delayedCall(100, () => {
      if (!this.isDead) {
        this.sprite.clearTint();
      }
    });

    console.log(`🌲 Forest Guardian health: ${this.health}/${this.maxHealth}`);

    // Cập nhật health bar
    this.updateHealthBar();

    if (this.health <= 0) {
      this.die();
    }
  }

  getHitbox() {
    // Hitbox lớn hơn để dễ bị trúng đòn cận chiến (ví dụ Mino)
    return new Phaser.Geom.Rectangle(
      this.sprite.x - 18,
      this.sprite.y - 24,
      36,
      48
    );
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
    Economy.addExp(100);
    console.log('💀 Forest Guardian died!');

    // Ẩn health bar
    if (this.healthBar) this.healthBar.setVisible(false);
    if (this.healthBarBg) this.healthBarBg.setVisible(false);

    // Xóa tất cả projectiles
    this.projectiles.forEach(proj => {
      if (proj && proj.active) {
        proj.destroy();
      }
    });
    this.projectiles = [];

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
    this.scene.dropLoot(this.sprite.x, this.sprite.y, Phaser.Math.Between(5, 10), 'coin');
    if (Math.random() < 0.1)
      this.scene.dropLoot(this.sprite.x, this.sprite.y, 1, 'frag_common');
    if (Math.random() < 0.04)
      this.scene.dropLoot(this.sprite.x, this.sprite.y, 1, 'frag_rare');
  }

  get x() {
    return this.sprite.x;
  }

  get y() {
    return this.sprite.y;
  }
}
