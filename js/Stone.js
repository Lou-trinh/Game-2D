import Phaser from 'phaser';

export default class Stone {
  constructor(data) {
    const { scene, x, y, tileX, tileY, layer, tile } = data;
    this.scene = scene;

    // Lưu thông tin tile để xóa sau
    this.tileX = tileX;
    this.tileY = tileY;
    this.layer = layer;
    this.tile = tile;

    // Tạo sprite với Matter Physics (để hiển thị khi đập)
    this.sprite = scene.matter.add.sprite(x, y, 'stone');
    this.sprite.setScale(1.5);

    // QUAN TRỌNG: Chỉ hiện sprite nếu KHÔNG CÓ TILE
    // Nếu có tile (đá từ map) thì ẩn sprite, chỉ hiện tile gốc
    // Nếu là object (đá spawn từ Spawn layer) thì hiện sprite
    if (tile) {
      this.sprite.setVisible(false); // Ẩn sprite vì tile đã hiển thị rồi
      console.log(`🪨 Creating stone from TILE at (${x}, ${y}) - Sprite HIDDEN`);
    } else {
      this.sprite.setVisible(true); // Hiện sprite vì object không có tile
      this.sprite.setDepth(y); // Set depth theo Y position
      console.log(`🪨 Creating stone from OBJECT at (${x}, ${y}) - Sprite VISIBLE`);
    }

    // Cấu hình physics body - QUAN TRỌNG: static để không bị đẩy
    this.sprite.setStatic(true);

    // Set body shape - THU NHỎ collision radius
    const radius = 12; // Giảm từ 16 xuống 12 (nhỏ hơn ~25%)
    this.sprite.setCircle(radius);

    // FORCE static lại một lần nữa để chắc chắn
    this.sprite.body.isStatic = true;

    // Set collision - đá phải va chạm với player
    // Category 0x0002 (giống enemy) để player (0x0001) không đi xuyên qua
    this.sprite.setCollisionCategory(0x0002);
    this.sprite.setCollidesWith([0x0001]); // Collide với player

    // Thuộc tính của Stone
    this.maxHealth = 50;
    this.health = 50;
    this.isDead = false;

    // Tạo health bar
    this.createHealthBar(scene);

    // Lưu reference vào sprite
    this.sprite.stoneInstance = this;

    // DEBUG: Log vị trí spawn
    console.log(`🪨 Stone ready - Visible: ${this.sprite.visible} - HasTile: ${tile ? 'YES' : 'NO'}`);
  }

  static preload(_scene) {}

  createHealthBar(scene) {
    // Tạo background cho health bar
    this.healthBarBg = scene.add.rectangle(
      this.sprite.x,
      this.sprite.y - 20,
      30,
      4,
      0x000000
    );
    this.healthBarBg.setDepth(10000);
    this.healthBarBg.setVisible(false);

    // Tạo thanh máu
    this.healthBar = scene.add.rectangle(
      this.sprite.x,
      this.sprite.y - 20,
      30,
      4,
      0x888888
    );
    this.healthBar.setOrigin(0, 0.5);
    this.healthBar.setDepth(10001);
    this.healthBar.setVisible(false);
  }

  updateHealthBar() {
    if (!this.healthBar || !this.healthBarBg || this.isDead) return;

    // Hiện health bar khi bị đánh
    this.healthBar.setVisible(true);
    this.healthBarBg.setVisible(true);

    // Cập nhật vị trí health bar theo stone
    this.healthBarBg.setPosition(this.sprite.x, this.sprite.y - 20);

    // Cập nhật độ rộng thanh máu
    const healthWidth = (this.health / this.maxHealth) * 30;
    this.healthBar.width = healthWidth;

    // Đặt vị trí thanh máu
    this.healthBar.setPosition(this.sprite.x - 15, this.sprite.y - 20);

    // Đổi màu thanh máu theo tỷ lệ HP
    if (this.health > 30) {
      this.healthBar.setFillStyle(0x888888);
    } else if (this.health > 15) {
      this.healthBar.setFillStyle(0x666666);
    } else {
      this.healthBar.setFillStyle(0x444444);
    }
  }

  update() {
    if (!this.sprite || this.isDead) return;

    // Cập nhật depth để render đúng thứ tự
    this.sprite.setDepth(this.sprite.y);
  }

  takeDamage(amount) {
    // Stone farming disabled - stones are now permanent obstacles
    return;
  }

  destroy() {
    // Stone farming disabled - stones cannot be destroyed
    return;
    if (this.isDead) return;

    this.isDead = true;
    console.log('💥 Stone destroyed!');

    // Xóa tile khỏi map (nếu có)
    if (this.layer && this.tile) {
      this.layer.removeTileAt(this.tileX, this.tileY);
    }

    // Ẩn health bar
    if (this.healthBar) this.healthBar.setVisible(false);
    if (this.healthBarBg) this.healthBarBg.setVisible(false);

    // Rơi vật phẩm
    this.dropItems();

    // Hiệu ứng phá hủy - vỡ vụn
    this.sprite.setTint(0x666666);

    // Tạo các mảnh vỡ nhỏ (particles effect)
    for (let i = 0; i < 6; i++) {
      const particle = this.scene.add.rectangle(
        this.sprite.x,
        this.sprite.y,
        4,
        4,
        0x888888
      );
      particle.setDepth(this.sprite.y);

      const angle = (Math.PI * 2 * i) / 6;
      const speed = 50 + Math.random() * 30;

      this.scene.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * speed,
        y: particle.y + Math.sin(angle) * speed - 20,
        alpha: 0,
        duration: 500,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }

    // Fade out và xóa
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      scale: 0.5,
      duration: 300,
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

    // Rơi stone 1 - văng sang trái
    const stone1 = this.scene.add.image(dropX, dropY, 'stone');
    stone1.setScale(0.25);
    stone1.setDepth(dropY - 1);
    stone1.setAlpha(0.8);
    stone1.setData('itemType', 'stone');
    stone1.setFlipY(true); // Lật lại để đúng hướng

    const stone1TargetX = dropX - 20 - Math.random() * 10;
    const stone1TargetY = dropY + Math.random() * 10;

    this.scene.tweens.add({
      targets: stone1,
      x: stone1TargetX,
      y: stone1TargetY - 25,
      alpha: 1,
      duration: 200,
      ease: 'Quad.easeOut'
    });

    this.scene.tweens.add({
      targets: stone1,
      y: stone1TargetY,
      duration: 300,
      delay: 200,
      ease: 'Bounce.easeOut',
      onComplete: () => {
        if (this.scene.items) {
          this.scene.items.push(stone1);
        }
      }
    });

    // Xoay nhẹ stone 1
    this.scene.tweens.add({
      targets: stone1,
      angle: 180,
      duration: 500,
      ease: 'Linear'
    });

    // Rơi stone 2 - văng sang phải (delay một chút)
    this.scene.time.delayedCall(80, () => {
      const stone2 = this.scene.add.image(dropX, dropY, 'stone');
      stone2.setScale(0.25);
      stone2.setDepth(dropY - 1);
      stone2.setAlpha(0.8);
      stone2.setData('itemType', 'stone');
      stone2.setFlipY(true); // Lật lại để đúng hướng

      const stone2TargetX = dropX + 20 + Math.random() * 10;
      const stone2TargetY = dropY + Math.random() * 10;

      this.scene.tweens.add({
        targets: stone2,
        x: stone2TargetX,
        y: stone2TargetY - 30,
        alpha: 1,
        duration: 200,
        ease: 'Quad.easeOut'
      });

      this.scene.tweens.add({
        targets: stone2,
        y: stone2TargetY,
        duration: 350,
        delay: 200,
        ease: 'Bounce.easeOut',
        onComplete: () => {
          if (this.scene.items) {
            this.scene.items.push(stone2);
          }
        }
      });

      // Xoay nhẹ stone 2
      this.scene.tweens.add({
        targets: stone2,
        angle: -180,
        duration: 550,
        ease: 'Linear'
      });
    });

    console.log('🪨🪨 Dropped 2 stones!');
  }

  get x() {
    return this.sprite.x;
  }

  get y() {
    return this.sprite.y;
  }
}
