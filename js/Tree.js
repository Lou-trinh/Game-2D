import Phaser from 'phaser';

export default class Tree {
  constructor(data) {
    const { scene, x, y, tileX, tileY, layer, aboveLayer } = data;
    this.scene = scene;

    this.tileX = tileX;
    this.tileY = tileY;
    this.layer = layer;
    this.aboveLayer = aboveLayer;

    /* =========================
        MATTER BODY (STATIC)
    ========================== */
    this.sprite = scene.matter.add.sprite(x, y, 'wood');
    this.sprite.setVisible(false);

    // ⚠️ QUAN TRỌNG: set shape TRƯỚC – static SAU
    this.sprite.setCircle(10);
    this.sprite.setStatic(true);

    this.sprite.setIgnoreGravity(true);
    this.sprite.setFixedRotation();

    this.sprite.setCollisionCategory(0x0002); // Tree
    this.sprite.setCollidesWith(0x0001);      // Player

    /* =========================
        STATS
    ========================== */
    this.maxHealth = 80;
    this.health = 80;
    this.isDead = false;

    this.createHealthBar(scene);
    this.sprite.treeInstance = this;

    console.log(`🌲 Tree spawned at (${x}, ${y})`);
  }

  static preload(scene) {
    scene.load.image('wood', 'assets/images/item/wood.png');
  }

  /* =========================
        HEALTH BAR
  ========================== */
  createHealthBar(scene) {
    this.healthBarBg = scene.add
      .rectangle(this.sprite.x, this.sprite.y - 25, 35, 5, 0x000000)
      .setDepth(10000)
      .setVisible(false);

    this.healthBar = scene.add
      .rectangle(this.sprite.x, this.sprite.y - 25, 35, 5, 0x8B4513)
      .setOrigin(0, 0.5)
      .setDepth(10001)
      .setVisible(false);
  }

  updateHealthBar() {
    if (this.isDead) return;

    this.healthBarBg.setVisible(true);
    this.healthBar.setVisible(true);

    this.healthBarBg.setPosition(this.sprite.x, this.sprite.y - 25);

    const w = (this.health / this.maxHealth) * 35;
    this.healthBar.width = w;
    this.healthBar.setPosition(this.sprite.x - 17.5, this.sprite.y - 25);
  }

  update() {
    if (this.isDead) return;
    this.sprite.setDepth(this.sprite.y);
  }

  /* =========================
        DAMAGE
  ========================== */
  takeDamage(amount) {
    if (this.isDead) return;

    this.health -= amount;
    if (this.health < 0) this.health = 0;

    this.sprite.setTint(0xffffff);
    this.scene.time.delayedCall(80, () => {
      if (!this.isDead) this.sprite.clearTint();
    });

    this.updateHealthBar();

    if (this.health <= 0) {
      this.destroy();
    }
  }

  /* =========================
        DESTROY – FIX COLLISION
  ========================== */
  destroy() {
    if (this.isDead) return;
    this.isDead = true;

    console.log('💥 Tree chopped down!');

    // 1️⃣ Tắt collision tile
    if (this.layer) {
      const tile = this.layer.getTileAt(this.tileX, this.tileY);
      tile?.setCollision(false);
      this.layer.removeTileAt(this.tileX, this.tileY);
    }

    if (this.aboveLayer) {
      const tileAbove = this.aboveLayer.getTileAt(this.tileX, this.tileY - 1);
      tileAbove?.setCollision(false);
      this.aboveLayer.removeTileAt(this.tileX, this.tileY);
      this.aboveLayer.removeTileAt(this.tileX, this.tileY - 1);
    }

    // 2️⃣ Rebuild Matter tile collision
    if (this.layer?.body) {
      this.scene.matter.world.remove(this.layer.body);
      this.scene.matter.world.convertTilemapLayer(this.layer);
    }

    if (this.aboveLayer?.body) {
      this.scene.matter.world.remove(this.aboveLayer.body);
      this.scene.matter.world.convertTilemapLayer(this.aboveLayer);
    }

    // 3️⃣ Remove tree body
    if (this.sprite?.body) {
      this.scene.matter.world.remove(this.sprite.body);
    }

    this.healthBar?.setVisible(false);
    this.healthBarBg?.setVisible(false);

    this.dropItems();

    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        this.sprite.destroy();
        this.healthBar?.destroy();
        this.healthBarBg?.destroy();
      }
    });
  }

  /* =========================
        DROP ITEMS
  ========================== */
  dropItems() {
    const dropX = this.sprite.x;
    const dropY = this.sprite.y;
    const count = Phaser.Math.Between(2, 3); // 2 hoặc 3 khúc gỗ giống stone

    console.log(`🌲 Dropped ${count} wood pieces!`);

    // Tạo từng khúc gỗ rơi ra
    for (let i = 0; i < count; i++) {
      this.scene.time.delayedCall(i * 60, () => {  // delay nhỏ giữa các khúc để đẹp hơn
        const wood = this.scene.add.image(dropX, dropY, 'wood');
        wood.setScale(0.1);                    // scale tương đối giống stone (điều chỉnh nếu cần)
        wood.setDepth(dropY - 1);               // nằm trên mặt đất một chút
        wood.setAlpha(0.85);
        wood.setData('itemType', 'wood');

        // Hướng văng ngẫu nhiên nhưng có xu hướng phân tán đều
        const angle = (Math.PI * 2 * i) / count + Phaser.Math.FloatBetween(-0.4, 0.4);
        const dist = 25 + Phaser.Math.Between(0, 18);
        const targetX = dropX + Math.cos(angle) * dist;
        const targetY = dropY + Math.sin(angle) * dist + Phaser.Math.Between(-8, 12);

        // Hiệu ứng bay lên rồi rơi xuống + nảy
        this.scene.tweens.add({
          targets: wood,
          x: targetX,
          y: targetY - 30,                    // bay lên cao một chút
          alpha: 1,
          duration: 220,
          ease: 'Quad.easeOut'
        });

        this.scene.tweens.add({
          targets: wood,
          y: targetY,
          duration: 380,
          delay: 220,
          ease: 'Bounce.easeOut',             // nảy xuống giống stone
          onComplete: () => {
            if (this.scene.items) {
              this.scene.items.push(wood);
            }
          }
        });

        // Thêm xoay nhẹ (giống stone)
        this.scene.tweens.add({
          targets: wood,
          angle: Phaser.Math.Between(-180, 180),
          duration: 600 + Phaser.Math.Between(-100, 100),
          ease: 'Linear'
        });
      });
    }
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }
}
