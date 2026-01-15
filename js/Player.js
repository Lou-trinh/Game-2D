import Phaser from 'phaser';
import { preloadCharacters, getCharacterConfig, CharacterTypes } from './Character';

export default class Player extends Phaser.Physics.Matter.Sprite {
  constructor(data) {
    const { scene, x, y, texture, frame, characterType = CharacterTypes.MAGE } = data;
    super(scene.matter.world, x, y, texture, frame);

    // Store character config
    this.characterType = characterType;
    this.characterConfig = getCharacterConfig(characterType);

    scene.add.existing(this);

    this.originalTexture = texture; // Store for revive
    this.setScale(1);
    this.setFixedRotation();
    this.setAngle(0);

    const { Body, Bodies } = Phaser.Physics.Matter.Matter;

    const collider = Bodies.circle(0, 0, 8, {
      label: 'playerCollider',
      friction: 0,
      frictionStatic: 0,
      frictionAir: 0
    });

    const sensor = Bodies.circle(0, 0, 16, {
      isSensor: true,
      label: 'playerSensor'
    });

    const compoundBody = Body.create({
      parts: [collider, sensor],
      frictionAir: 0.35,
      friction: 0,
      frictionStatic: 0,
      restitution: 0,
      inertia: Infinity
    });

    this.setExistingBody(compoundBody);
    this.setPosition(x, y);

    // Đặt category/mask rõ ràng để enemy nhận diện player qua collision filter
    // Category 0x0001 được enemy (0x0002) cấu hình collidesWith.
    this.setCollisionCategory(0x0001);
    this.setCollidesWith([0x0002]);

    // Store body parts for later scaling (Taoist transform)
    this.compoundBody = compoundBody;
    this.colliderBody = collider;
    this.sensorBody = sensor;
    // Lưu collision filter gốc để giữ hành vi va chạm khi biến hình
    this.defaultCollisionFilter = {
      category: this.body.collisionFilter.category,
      mask: this.body.collisionFilter.mask
    };
    // Mask bỏ enemy (0x0002) để tránh bị đẩy khi biến hình Mino
    this.noEnemyCollisionMask = this.defaultCollisionFilter.mask & ~0x0002;
    // Store original radii for restoration
    this.originalColliderRadius = 8;
    this.originalSensorRadius = 16;
    // Scale factor for Taoist -> Mino body size (affects 2 debug circles)
    // Giảm bớt để vòng tròn nhỏ lại một chút
    this.transformScaleFactor = 2.5;

    // =====================
    // ATTACK PROPERTIES
    // =====================
    this.attackDamage = this.characterConfig.stats.damage || 10;
    this.bonusDamage = 0;
    this.lastAttackAngle = 0; // Lưu góc tấn công

    // =====================
    // HEALTH
    // =====================
    this.maxHealth = this.characterConfig.stats.health || 100;
    this.health = this.characterConfig.stats.health || 100;
    this.isDead = false;
    this.createHealthBar(scene);

    // =====================
    // WEAPON
    // =====================
    const weaponConfig = this.characterConfig.weapon || { texture: 'scepter', scale: 0.09 };
    this.weapon = scene.add.image(0, 0, weaponConfig.texture);
    this.weapon.setScale(weaponConfig.scale);
    this.weapon.setOrigin(0.5, 0.9);
    this.weapon.setDepth(this.depth + 1);

    this.isAttacking = false;
    this.weaponRotation = 0;

    // =====================
    // INVENTORY
    // =====================
    this.stoneCount = 0;
    this.woodCount = 0;
    this.meatCount = 0;

    // =====================
    // PROJECTILES (for archer)
    // =====================
    this.activeArrows = [];

    // =====================
    // ASSASSIN SKILL
    // =====================
    this.backstabCooldown = false;
    this.backstabCooldownTime = 3000; // 3 seconds (changed from 5s)
    this.dashCooldown = false;
    this.dashCooldownTime = 2000; // 2 seconds (changed from 3s)
    this.isDashing = false;

    // =====================
    // WIZARD SKILL (Summon)
    // =====================
    this.summonCooldown = false;
    this.summonCooldownTime = 15000; // 15 seconds
    this.activeSummons = []; // Track active ice monsters
    this.maxSummons = 1; // Max number of summons at once

    // =====================
    // TAOIST TRANSFORMATION
    // =====================
    this.isTransformed = false;
    this.transformedSprite = null;
    this.originalTexture = texture;
    this.originalScale = 1;
    this.transformCooldown = false;
    this.transformCooldownTime = 5000; // 5 seconds
    this.transformConfig = this.characterConfig.transformSkill || null;
    this.transformDuration = 10000; // 10 seconds in ms
    this.transformDamageBonus = this.attackDamage || 10; // extra damage while transformed
    this.transformTimerEvent = null;
    this.transformDamageApplied = false;
    this.originalAnimKeys = {
      idle: this.characterConfig.idleAnim,
      walk: this.characterConfig.walkAnim
    };

    // =====================
    // MOUSE INPUT
    // =====================
    this.setupMouseInput(scene);

    // =====================
    // KEYBOARD INPUT (F key for dash)
    // =====================
    this.setupKeyboardInput(scene);
  }

  static preload(scene) {
    // Load all character assets
    preloadCharacters(scene);

    // Load character weapons
    scene.load.image('scepter', 'assets/images/weapons/scepter.png');
    scene.load.image('scepter_2', 'assets/images/weapons/scepter_2.png');
    scene.load.image('bow', 'assets/images/weapons/bow.png');
    scene.load.image('arrow', 'assets/images/weapons/arrow.png');
    scene.load.image('purple_orb', 'assets/images/weapons/purple_orb.png');
    scene.load.image('katana', 'assets/images/weapons/katana.png');
    scene.load.image('knife', 'assets/images/weapons/knife.png');

    // Load common assets
    scene.load.image('ghost', 'assets/images/die/ghost.png');
    scene.load.atlas(
      'lightning_skill_1',
      'assets/images/skill/skill_1/lightning_skill_1.png',
      'assets/images/skill/skill_1/lightning_skill_1_atlas.json'
    );
    scene.load.atlas(
      'surf',
      'assets/images/effects/effect_3/surf.png',
      'assets/images/effects/effect_3/surf_atlas.json'
    );
    scene.load.animation('effect_3_anim', 'assets/images/effects/effect_3/surf_anim.json');

    // Load effect_4 for Taoist transformation
    scene.load.atlas(
      'effect_4',
      'assets/images/effects/effect_4/effect_4.png',
      'assets/images/effects/effect_4/effect_4_atlas.json'
    );
    scene.load.animation('effect_4_anim', 'assets/images/effects/effect_4/effect_4_anim.json');

    // Load Wizard summon skill assets
    scene.load.atlas(
      'ice_monster',
      'assets/images/skill/ice_monster/ice_monster.png',
      'assets/images/skill/ice_monster/ice_monster_atlas.json'
    );
    scene.load.animation('ice_monster_anim', 'assets/images/skill/ice_monster/ice_monster_anim.json');
    scene.load.atlas(
      'tele_port',
      'assets/images/skill/skill_2/tele_port.png',
      'assets/images/skill/skill_2/tele_port_atlas.json'
    );
    scene.load.animation('tele_port_anim', 'assets/images/skill/skill_2/tele_port_anim.json');
  }

  setupMouseInput(scene) {
    // Bắt sự kiện click chuột
    scene.input.on('pointerdown', (pointer) => {
      if (this.isDead || this.isAttacking) return;

      // Tính góc từ player đến vị trí chuột (trong world coordinates)
      const worldX = pointer.worldX;
      const worldY = pointer.worldY;

      this.lastAttackAngle = Phaser.Math.Angle.Between(
        this.x,
        this.y,
        worldX,
        worldY
      );

      // Flip player theo hướng chuột
      // Nếu đang transform thành Mino, đảo ngược logic vì sprite bị ngược
      const isTaoist = this.characterType === CharacterTypes.TAOIST;
      const useTransformAnim = isTaoist && this.isTransformed && this.transformConfig;

      if (useTransformAnim) {
        // Mino: ngược lại
        if (worldX < this.x) {
          this.setFlipX(false); // Click trái → không flip
        } else {
          this.setFlipX(true);  // Click phải → flip
        }
      } else {
        // Taoist và các nhân vật khác: bình thường
        if (worldX < this.x) {
          this.setFlipX(true);
        } else {
          this.setFlipX(false);
        }
      }

      // Attack on mouse click (backstab now uses R key)
      this.attack();
    });
  }

  setupKeyboardInput(scene) {
    // Setup SPACE key for dash (only trigger once per press)
    scene.input.keyboard.on('keydown-SPACE', () => {
      if (this.characterType !== CharacterTypes.ASSASSIN) return;
      if (this.isDashing || this.dashCooldown || this.isDead || this.isAttacking) return;

      console.log('⌨️ SPACE key pressed - triggering dash!');

      // Get current movement direction
      const vel = new Phaser.Math.Vector2(0, 0);
      if (this.inputKeys?.left?.isDown) vel.x = -1;
      else if (this.inputKeys?.right?.isDown) vel.x = 1;
      if (this.inputKeys?.up?.isDown) vel.y = -1;
      else if (this.inputKeys?.down?.isDown) vel.y = 1;

      this.performDash(vel);
    });

    // Setup R key for Assassin backstab, Wizard summon and Taoist transform
    scene.input.keyboard.on('keydown-R', () => {
      // Assassin - Backstab
      if (this.characterType === CharacterTypes.ASSASSIN) {
        if (this.backstabCooldown || this.isAttacking || this.isDead || this.isDashing) return;
        console.log('⌨️ R key pressed - triggering backstab!');
        this.performBackstab();
      }

      // Wizard - Summon Ice Monster
      if (this.characterType === CharacterTypes.WIZARD) {
        if (this.summonCooldown || this.isDead || this.isAttacking) return;
        if (this.activeSummons.length >= this.maxSummons) {
          console.log('❌ Cannot summon: max summons reached');
          return;
        }
        console.log('⌨️ R key pressed - summoning ice monster!');
        this.summonIceMonster();
      }

      // Taoist - Transform into Mino (no manual revert)
      if (this.characterType === CharacterTypes.TAOIST) {
        // Chỉ cho bấm R nếu chưa biến hình và không cooldown
        if (this.transformCooldown || this.isDead || this.isTransformed) return;
        console.log('⌨️ R key pressed - Taoist transform to Mino!');
        this.toggleTaoistTransform();
      }
    });
  }

  createHealthBar(scene) {
    this.healthBarBg = scene.add.rectangle(this.x, this.y - 30, 50, 6, 0x000000);
    this.healthBar = scene.add.rectangle(this.x - 25, this.y - 30, 50, 6, 0x00ff00);
    this.healthBar.setOrigin(0, 0.5);
  }

  updateHealthBar() {
    this.healthBarBg.setPosition(this.x, this.y - 30);
    this.healthBar.setPosition(this.x - 25, this.y - 30);
    this.healthBar.width = (this.health / this.maxHealth) * 50;
  }

  takeDamage(amount) {
    if (this.isDead) return;
    this.health -= amount;
    if (this.health < 0) this.health = 0;
    this.updateHealthBar();
    if (this.health <= 0) this.die();
  }

  shootArrow() {
    const projectileConfig = this.characterConfig.weapon?.projectile;
    if (!projectileConfig) return;

    // Get number of projectiles (default to 1 for archer)
    const projectileCount = projectileConfig.count || 1;
    const spreadAngle = projectileConfig.spread || 0; // degrees

    // Calculate starting angle for spread
    const baseAngle = this.lastAttackAngle;

    for (let i = 0; i < projectileCount; i++) {
      // Calculate angle offset for this projectile
      let angleOffset = 0;
      if (projectileCount > 1) {
        // Distribute projectiles evenly across the spread
        const totalSpread = spreadAngle * (projectileCount - 1);
        angleOffset = Phaser.Math.DegToRad(-totalSpread / 2 + (spreadAngle * i));
      }

      const projectileAngle = baseAngle + angleOffset;

      // Create projectile sprite
      const projectile = this.scene.add.sprite(this.x, this.y, projectileConfig.texture);
      projectile.setScale(projectileConfig.scale);
      projectile.setDepth(this.depth + 50);

      // Calculate velocity from angle
      const velocity = {
        x: Math.cos(projectileAngle) * projectileConfig.speed,
        y: Math.sin(projectileAngle) * projectileConfig.speed
      };

      // Rotate projectile to face flight direction
      projectile.setAngle(Phaser.Math.RadToDeg(projectileAngle));

      // Store projectile data
      projectile.setData('velocity', velocity);
      projectile.setData('startX', this.x);
      projectile.setData('startY', this.y);
      projectile.setData('damage', projectileConfig.damage + (this.bonusDamage || 0));
      projectile.setData('range', projectileConfig.range);

      this.activeArrows.push(projectile);
    }
  }

  attack() {
    if (this.isAttacking || this.isDead) return;
    this.isAttacking = true;

    // Special attack handling for Taoist in transformed (Mino) form
    if (this.characterType === CharacterTypes.TAOIST && this.isTransformed && this.transformConfig) {
      const attackAnim = this.transformConfig.attackAnim || 'mino_attack';
      // Play Mino attack animation
      if (this.anims.exists && this.anims.exists(attackAnim)) {
        this.anims.play(attackAnim, true);
      } else {
        this.anims.play(attackAnim, true);
      }

      // Hide weapon while transformed
      if (this.weapon) {
        this.weapon.setVisible(false);
      }

      // Apply melee damage once during the attack
      this.scene.time.delayedCall(200, () => {
        this.checkAttackHit();
      });

      // End attack state after animation duration
      this.scene.time.delayedCall(500, () => {
        this.isAttacking = false;
      });

      return;
    }

    // Only show lightning effect if weapon config allows it
    const showSkillEffect = this.characterConfig.weapon?.showSkillEffect;
    if (showSkillEffect) {
      this.showSkillEffect();
    }

    const attackType = this.characterConfig.weapon?.attackType || 'swing';

    if (attackType === 'pull') {
      // Bow attack: pull back animation (toward player)
      this.scene.tweens.add({
        targets: this,
        weaponRotation: 25,  // Pull back toward player
        duration: 150,
        ease: 'Power2',
        onComplete: () => {
          // Shoot arrow on release
          this.shootArrow();

          // Release forward
          this.scene.tweens.add({
            targets: this,
            weaponRotation: -10,  // Forward motion (release)
            duration: 100,
            ease: 'Power3',
            onComplete: () => {
              // Return to normal
              this.scene.tweens.add({
                targets: this,
                weaponRotation: 0,
                duration: 100,
                ease: 'Power1',
                onComplete: () => {
                  this.isAttacking = false;
                }
              });
            }
          });
        }
      });
    } else {
      // Default swing attack (for scepter)
      this.scene.tweens.add({
        targets: this,
        weaponRotation: -30,
        duration: 100,
        ease: 'Power2',
        onComplete: () => {
          // Only check melee hit if character doesn't have skill effect (not Mage)
          if (!showSkillEffect) {
            this.checkAttackHit();
          }

          this.scene.tweens.add({
            targets: this,
            weaponRotation: 90,
            duration: 150,
            ease: 'Power2',
            onComplete: () => {
              this.scene.tweens.add({
                targets: this,
                weaponRotation: 0,
                duration: 100,
                ease: 'Power1',
                onComplete: () => {
                  this.isAttacking = false;
                }
              });
            }
          });
        }
      });
    }
  }

  checkAttackHit() {
    const damage = this.attackDamage + (this.bonusDamage || 0);

    // Tính vị trí tấn công theo góc
    const attackDistance = 20;
    const hitWidth = 40;
    const hitHeight = 30;

    const hitX = this.x + Math.cos(this.lastAttackAngle) * attackDistance;
    const hitY = this.y + Math.sin(this.lastAttackAngle) * attackDistance;

    const hitRect = new Phaser.Geom.Rectangle(
      hitX - hitWidth / 2,
      hitY - hitHeight / 2,
      hitWidth,
      hitHeight
    );

    const hitGroups = [
      this.scene.bears,
      this.scene.treeMen,
      this.scene.forestGuardians,
      this.scene.gnollBrutes,
      this.scene.gnollShamans,
      this.scene.wolves,
      this.scene.golems,
      this.scene.mushrooms,
      this.scene.smallMushrooms,
      this.scene.stones,
      this.scene.trees
    ];

    hitGroups.forEach(group => {
      if (!group) return;
      (Array.isArray(group) ? group : []).forEach(obj => {
        if (!obj || obj.isDead) return;

        const targetHitbox = obj.getHitbox ? obj.getHitbox() : new Phaser.Geom.Rectangle(obj.x - 12, obj.y - 12, 24, 24);
        if (Phaser.Geom.Rectangle.Overlaps(hitRect, targetHitbox)) {
          obj.takeDamage(damage);
        }
      });
    });
  }

  showSkillEffect() {
    const frames = [
      'lightning_skill1_frame1',
      'lightning_skill1_frame2',
      'lightning_skill1_frame3',
      'lightning_skill1_frame4'
    ];

    // Tính vị trí skill theo góc tấn công
    const skillDistance = 40;
    const lightningX = this.x + Math.cos(this.lastAttackAngle) * skillDistance;
    const lightningY = this.y + Math.sin(this.lastAttackAngle) * skillDistance;

    const skillEffect = this.scene.add.sprite(lightningX, lightningY, 'lightning_skill_1', frames[0]);
    skillEffect.setScale(0.3);
    skillEffect.setDepth(this.depth + 50);

    // Xoay skill theo góc tấn công
    const angleDegrees = Phaser.Math.RadToDeg(this.lastAttackAngle);
    skillEffect.setAngle(angleDegrees);

    let frameIndex = 0;
    const timer = this.scene.time.addEvent({
      delay: 80,
      repeat: frames.length - 1,
      callback: () => {
        skillEffect.setFrame(frames[frameIndex]);
        frameIndex++;
      }
    });

    this.applyLightningDamage(lightningX, lightningY);

    this.scene.time.delayedCall(350, () => {
      timer.remove();
      skillEffect.destroy();
    });
  }

  applyLightningDamage(x, y) {
    const totalDamage = 25 + (this.bonusDamage || 0);

    const hitWidth = 65;
    const hitHeight = 14;

    // Tính vị trí damage theo góc
    const damageDistance = 32;
    const hitX = this.x + Math.cos(this.lastAttackAngle) * damageDistance;
    const hitY = this.y + Math.sin(this.lastAttackAngle) * damageDistance;

    const hitRect = new Phaser.Geom.Rectangle(
      hitX - hitWidth / 2,
      hitY - hitHeight / 2,
      hitWidth,
      hitHeight
    );

    const damageTargets = [
      this.scene.bears,
      this.scene.treeMen,
      this.scene.forestGuardians,
      this.scene.gnollBrutes,
      this.scene.gnollShamans,
      this.scene.wolves,
      this.scene.golems,
      this.scene.mushrooms,
      this.scene.smallMushrooms,
      this.scene.trees,
      this.scene.stones
    ];

    damageTargets.forEach(group => {
      if (!group) return;
      (Array.isArray(group) ? group : []).forEach(target => {
        if (!target || target.isDead) return;

        const targetRect = target.getHitbox ? target.getHitbox() : new Phaser.Geom.Rectangle(target.x - 12, target.y - 12, 24, 24);
        if (Phaser.Geom.Rectangle.Overlaps(hitRect, targetRect)) {
          target.takeDamage(totalDamage);
        }
      });
    });
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

        const distance = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestEnemy = enemy;
        }
      });
    });

    return nearestEnemy;
  }

  performBackstab() {
    if (this.backstabCooldown || this.isAttacking) return;

    const target = this.findNearestEnemy();
    if (!target) {
      console.log('No enemy found for backstab');
      return;
    }

    // Check if target is within range (120 pixels)
    const distanceToTarget = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
    const backstabRange = 120;

    if (distanceToTarget > backstabRange) {
      console.log(`Enemy too far! Distance: ${Math.floor(distanceToTarget)}, Max range: ${backstabRange}`);
      return;
    }

    this.isAttacking = true;
    this.backstabCooldown = true;

    // Calculate position behind the enemy
    const angle = Phaser.Math.Angle.Between(target.x, target.y, this.x, this.y);
    const behindDistance = 25; // Position behind enemy
    const behindX = target.x + Math.cos(angle) * behindDistance;
    const behindY = target.y + Math.sin(angle) * behindDistance;

    // Store original position for effect
    const startX = this.x;
    const startY = this.y;

    // Create disappear effect at start position
    this.createTeleportEffect(startX, startY, 0x2c3e50);

    // Teleport instantly
    this.setPosition(behindX, behindY);

    // Face the enemy
    this.setFlipX(target.x < this.x);

    // Create appear effect at new position
    this.createTeleportEffect(behindX, behindY, 0xff0000);

    // Flash the player
    this.scene.tweens.add({
      targets: this,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
      repeat: 1
    });

    // Perform backstab attack after short delay
    this.scene.time.delayedCall(150, () => {
      this.performBackstabDamage(target);
    });

    // Reset cooldown
    this.scene.time.delayedCall(this.backstabCooldownTime, () => {
      this.backstabCooldown = false;
    });
  }

  performBackstabDamage(target) {
    if (!target || target.isDead) {
      this.isAttacking = false;
      return;
    }

    // Calculate if attacking from behind
    const angleToPlayer = Phaser.Math.Angle.Between(target.x, target.y, this.x, this.y);
    const targetFacing = target.flipX ? Math.PI : 0; // Assuming flipX indicates facing direction
    const angleDiff = Math.abs(Phaser.Math.Angle.Wrap(angleToPlayer - targetFacing));

    // Consider "behind" if angle difference is less than 90 degrees (π/2)
    const isFromBehind = angleDiff < Math.PI / 2;

    // Base damage for backstab
    const baseDamage = 40 + (this.bonusDamage || 0);
    const damage = isFromBehind ? baseDamage * 2 : baseDamage;

    // Create red slash effect
    this.createSlashEffect(target.x, target.y);

    // Apply damage
    const wasAlive = !target.isDead;
    target.takeDamage(damage);

    // If enemy died from this attack, create blood explosion
    if (wasAlive && target.isDead) {
      this.createBloodExplosion(target.x, target.y);
    }

    // Show damage number
    const damageText = this.scene.add.text(target.x, target.y - 20, `-${Math.floor(damage)}`, {
      fontSize: '16px',
      fontStyle: 'bold',
      color: isFromBehind ? '#ff0000' : '#ffaa00',
      stroke: '#000000',
      strokeThickness: 3
    });
    damageText.setOrigin(0.5);

    this.scene.tweens.add({
      targets: damageText,
      y: damageText.y - 30,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => damageText.destroy()
    });

    // Weapon swing animation
    this.scene.tweens.add({
      targets: this,
      weaponRotation: 120,
      duration: 150,
      ease: 'Power3',
      onComplete: () => {
        this.scene.tweens.add({
          targets: this,
          weaponRotation: 0,
          duration: 100,
          ease: 'Power1',
          onComplete: () => {
            this.isAttacking = false;
          }
        });
      }
    });
  }

  createTeleportEffect(x, y, color) {
    // Create particle burst for teleport
    const particleCount = 15;
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = 50 + Math.random() * 30;

      const particle = this.scene.add.rectangle(x, y, 3, 3, color);
      particle.setDepth(this.depth + 10);

      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        duration: 400,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }
  }

  createSlashEffect(x, y) {
    // Create pixel-style red slash
    const graphics = this.scene.add.graphics();
    graphics.lineStyle(4, 0xff0000, 1);
    graphics.setDepth(this.depth + 20);

    // Draw diagonal slash
    const slashLength = 40;
    const angle = -Math.PI / 4; // Diagonal slash
    graphics.beginPath();
    graphics.moveTo(
      x - Math.cos(angle) * slashLength / 2,
      y - Math.sin(angle) * slashLength / 2
    );
    graphics.lineTo(
      x + Math.cos(angle) * slashLength / 2,
      y + Math.sin(angle) * slashLength / 2
    );
    graphics.strokePath();

    // Flash effect
    this.scene.tweens.add({
      targets: graphics,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => graphics.destroy()
    });
  }

  createBloodExplosion(x, y) {
    // Create blood particle explosion
    const particleCount = 25;
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 50;
      const size = 2 + Math.random() * 3;

      // Red blood particles
      const particle = this.scene.add.rectangle(x, y, size, size, 0xff0000);
      particle.setDepth(this.depth + 15);

      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        duration: 500 + Math.random() * 300,
        ease: 'Cubic.easeOut',
        onComplete: () => particle.destroy()
      });
    }

    // Add some darker blood splatters
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 30;
      const size = 3 + Math.random() * 2;

      const particle = this.scene.add.rectangle(x, y, size, size, 0x8b0000);
      particle.setDepth(this.depth + 15);

      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        duration: 600 + Math.random() * 400,
        ease: 'Cubic.easeOut',
        onComplete: () => particle.destroy()
      });
    }
  }

  performDash(direction) {
    if (this.dashCooldown || this.isDashing || this.isDead || this.isAttacking) return;
    if (this.characterType !== CharacterTypes.ASSASSIN) return;

    console.log('🏃 Assassin performing dash!');

    this.isDashing = true;
    this.dashCooldown = true;

    // Calculate dash direction (use movement direction or facing direction)
    let dashAngle;
    if (direction.length() > 0) {
      dashAngle = Math.atan2(direction.y, direction.x);
    } else {
      // If no movement, dash in facing direction
      dashAngle = this.flipX ? Math.PI : 0;
    }

    // Dash distance and duration
    const dashDistance = 80;
    const dashDuration = 200;

    // Calculate target position
    let targetX = this.x + Math.cos(dashAngle) * dashDistance;
    let targetY = this.y + Math.sin(dashAngle) * dashDistance;

    // Clamp position within map bounds
    const mapBounds = this.scene.cameras.main.getBounds();
    const margin = 16; // Keep player slightly away from edge

    targetX = Phaser.Math.Clamp(targetX, mapBounds.x + margin, mapBounds.x + mapBounds.width - margin);
    targetY = Phaser.Math.Clamp(targetY, mapBounds.y + margin, mapBounds.y + mapBounds.height - margin);

    console.log(`Dash target: (${Math.floor(targetX)}, ${Math.floor(targetY)}), Map bounds: ${mapBounds.width}x${mapBounds.height}`);

    // Create surf trail effect behind player
    this.createSurfTrail(dashAngle);

    // Make player semi-transparent during dash
    this.setAlpha(0.6);

    // Dash movement
    this.scene.tweens.add({
      targets: this,
      x: targetX,
      y: targetY,
      duration: dashDuration,
      ease: 'Power2',
      onComplete: () => {
        this.isDashing = false;
        this.setAlpha(1);
      }
    });

    // Reset dash cooldown
    this.scene.time.delayedCall(this.dashCooldownTime, () => {
      this.dashCooldown = false;
    });
  }

  summonIceMonster() {
    if (this.summonCooldown || this.activeSummons.length >= this.maxSummons) return;

    console.log('🔮 Wizard summoning ice monster...');

    this.summonCooldown = true;

    // Calculate summon position in front of wizard
    const summonDistance = 40;
    const summonAngle = this.flipX ? Math.PI : 0; // Face direction
    const summonX = this.x + Math.cos(summonAngle) * summonDistance;
    const summonY = this.y + Math.sin(summonAngle) * summonDistance;

    // Create portal effect
    this.createPortalEffect(summonX, summonY, (portalX, portalY) => {
      // Spawn ice monster after portal animation at the portal's position
      const IceMonster = require('./IceMonster').default;
      const iceMonster = new IceMonster({
        scene: this.scene,
        x: portalX,
        y: portalY,
        owner: this
      });

      // Track active summon
      this.activeSummons.push(iceMonster);

      // Add to scene's summon group
      if (!this.scene.summonedMonsters) {
        this.scene.summonedMonsters = [];
      }
      this.scene.summonedMonsters.push(iceMonster);

      console.log(`❄️ Ice Monster spawned at portal position (${portalX}, ${portalY})! Active summons: ${this.activeSummons.length}/${this.maxSummons}`);
    });

    // Reset cooldown
    this.scene.time.delayedCall(this.summonCooldownTime, () => {
      this.summonCooldown = false;
      console.log('✅ Summon skill ready!');
    });
  }

  createPortalEffect(x, y, onComplete) {
    console.log(`🌀 Creating portal at (${Math.floor(x)}, ${Math.floor(y)})`);

    // Check if texture exists
    if (!this.scene.textures.exists('tele_port')) {
      console.error('❌ Texture "tele_port" not found!');
      if (onComplete) onComplete(x, y);
      return;
    }

    // Create portal sprite (smaller and higher)
    const portalY = y - 20;
    const portal = this.scene.add.sprite(x, portalY, 'tele_port', 'tele_port_1');
    portal.setScale(1.3);
    portal.setDepth(y);
    portal.setAlpha(0);

    console.log('✨ Portal sprite created, playing animation...');

    // Fade in portal
    this.scene.tweens.add({
      targets: portal,
      alpha: 1,
      duration: 200,
      ease: 'Power2'
    });

    // Play portal animation
    if (this.scene.anims.exists('skill_2')) {
      portal.play('skill_2');
      console.log('▶️ Playing skill_2 portal animation');
    } else {
      console.warn('⚠️ Animation "skill_2" not found, using manual frame animation');
      // Manual frame animation as fallback
      const frames = ['tele_port1', 'tele_port2', 'tele_port3', 'tele_port4'];
      let frameIndex = 0;
      const frameTimer = this.scene.time.addEvent({
        delay: 100,
        repeat: frames.length * 2 - 1,
        callback: () => {
          if (portal && portal.active) {
            portal.setFrame(frames[frameIndex % frames.length]);
            frameIndex++;
          }
        }
      });
    }

    // Complete summon after animation (1 second)
    this.scene.time.delayedCall(1000, () => {
      if (onComplete) {
        // Pass the portal's actual position to the callback
        onComplete(x, portalY);
      }

      // Fade out and destroy portal
      this.scene.tweens.add({
        targets: portal,
        alpha: 0,
        duration: 300,
        ease: 'Power2',
        onComplete: () => {
          portal.destroy();
          console.log('🌀 Portal closed');
        }
      });
    });
  }

  createSurfTrail(angle) {
    // Create multiple surf effect sprites along the trail
    const trailCount = 5;
    const spacing = 15;

    console.log('🌊 Creating surf trail effect...');

    for (let i = 0; i < trailCount; i++) {
      // Delay each trail sprite slightly for smooth effect
      this.scene.time.delayedCall(i * 40, () => {
        // Position behind player
        const offsetX = -Math.cos(angle) * spacing * (i * 0.5);
        const offsetY = -Math.sin(angle) * spacing * (i * 0.5);

        console.log(`Creating surf sprite ${i + 1}/${trailCount} at offset (${offsetX.toFixed(1)}, ${offsetY.toFixed(1)})`);

        // Check if texture exists
        if (!this.scene.textures.exists('surf')) {
          console.error('❌ Texture "surf" not found!');
          return;
        }

        const surf = this.scene.add.sprite(
          this.x + offsetX,
          this.y + offsetY + 10,  // Lower the effect by 10 pixels
          'surf',
          'tile1'
        );

        // INCREASED VISIBILITY - bigger, higher depth, more opaque
        surf.setScale(1.5);  // Larger size
        surf.setDepth(this.depth + 100);  // Well above player and all layers
        surf.setAlpha(0.9 - i * 0.1);  // More opaque

        // Rotate surf to match dash direction
        surf.setAngle(Phaser.Math.RadToDeg(angle));

        console.log(`✨ Surf sprite created at (${surf.x}, ${surf.y}), depth: ${surf.depth}, scale: ${surf.scale}, alpha: ${surf.alpha}`);
        console.log(` Surf sprite created. Checking for animation 'effect_3'...`);

        // Play surf animation if available
        if (this.scene.anims.exists('effect_3')) {
          console.log('✅ Animation effect_3 found, playing...');
          surf.play('effect_3');
        } else {
          console.warn('⚠️ Animation effect_3 not found! Available animations:', this.scene.anims.anims.entries);
        }

        // Fade out and destroy - LONGER DURATION
        this.scene.tweens.add({
          targets: surf,
          alpha: 0,
          scaleX: 1.0,
          scaleY: 1.0,
          duration: 800,  // Longer duration to see effect
          ease: 'Power2',
          onComplete: () => {
            console.log('Surf sprite destroyed');
            surf.destroy();
          }
        });
      });
    }
  }

  die() {
    this.isDead = true;
    this.setVelocity(0, 0);
    if (this.weapon) this.weapon.setVisible(false);
    if (this.healthBar) this.healthBar.setVisible(false);
    if (this.healthBarBg) this.healthBarBg.setVisible(false);

    console.log('💀 Player died! isTransformed:', this.isTransformed);

    // Cancel transform timer if dying while transformed
    if (this.transformTimerEvent) {
      console.log('⏰ Canceling transform timer on death');
      this.transformTimerEvent.remove(false);
      this.transformTimerEvent = null;
    }

    // Always change to ghost sprite when dying
    this.setTexture('ghost');
    this.stop(); // Stop any running animations
    this.setScale(0.3); // Make ghost smaller
    this.setAlpha(1); // Reset alpha to full opacity

    console.log('👻 Ghost sprite set. Texture:', this.texture.key, 'Scale:', this.scale);

    // Floating animation (up and down)
    this.scene.tweens.add({
      targets: this,
      y: this.y - 10,
      duration: 800,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1 // Loop forever
    });

    // Show game over menu after a short delay
    this.scene.time.delayedCall(1000, () => {
      this.scene.scene.pause('MainScene');
      this.scene.scene.launch('GameOverScene');
    });
  }

  revive() {
    console.log('✨ Player reviving!');
    this.isDead = false;
    this.health = this.maxHealth;

    // Stop any animations/tweens first
    this.scene.tweens.killTweensOf(this);
    this.stop(); // Stop ghost animation if playing

    // Restore texture and scale
    this.setTexture(this.originalTexture);
    this.setScale(this.originalScale);
    this.setAlpha(1);
    this.setAngle(0);

    // Ensure state flags are reset
    this.isAttacking = false;
    this.isDashing = false;
    this.backstabCooldown = false;
    this.transformCooldown = false;
    this.isTransformed = false;

    // Restore UI visibility
    if (this.weapon) this.weapon.setVisible(true);
    if (this.healthBar) this.healthBar.setVisible(true);
    if (this.healthBarBg) this.healthBarBg.setVisible(true);

    // Update health bar visual to full
    if (this.healthBar) {
      this.updateHealthBar();
      // Ensure width is set correctly immediately (redundancy for safety)
      this.healthBar.width = 50;
    }
    console.log('✨ Player revived with health:', this.health, '/', this.maxHealth);
  }

  update() {
    if (this.isDead) return;

    // Chỉ block movement khi đang tấn công với Mino (transformed)
    const blockMovementForMino = this.characterType === CharacterTypes.TAOIST && this.isTransformed && this.isAttacking;
    if (blockMovementForMino) return;

    const speed = this.characterConfig.stats.speed || 2.5;
    const vel = new Phaser.Math.Vector2(0, 0);

    if (this.inputKeys?.left?.isDown) vel.x = -1;
    else if (this.inputKeys?.right?.isDown) vel.x = 1;
    if (this.inputKeys?.up?.isDown) vel.y = -1;
    else if (this.inputKeys?.down?.isDown) vel.y = 1;

    // Check for dash skill (Shift key for Assassin)
    // Note: SPACE and R keys are handled by keyboard event listeners
    if (this.inputKeys?.shift?.isDown && this.characterType === CharacterTypes.ASSASSIN) {
      this.performDash(vel);
    }

    // Determine current animation set (normal vs transformed Taoist)
    const isTaoist = this.characterType === CharacterTypes.TAOIST;
    const useTransformAnim = isTaoist && this.isTransformed && this.transformConfig;
    const walkAnimKey = useTransformAnim
      ? this.transformConfig.walkAnim || this.characterConfig.walkAnim
      : this.characterConfig.walkAnim;
    const idleAnimKey = useTransformAnim
      ? this.transformConfig.idleAnim || this.characterConfig.idleAnim
      : this.characterConfig.idleAnim;

    if (vel.length() > 0 && !this.isDashing) {
      vel.normalize().scale(speed);
      this.setVelocity(vel.x, vel.y);
      // Do not override attack animation while transformed and attacking
      if (!(useTransformAnim && this.isAttacking)) {
        this.anims.play(walkAnimKey, true);
      }
      // Flip logic: invert for Mino since sprite faces opposite direction
      if (useTransformAnim) {
        this.setFlipX(vel.x > 0); // Ngược lại với Taoist
      } else {
        this.setFlipX(vel.x < 0); // Bình thường cho Taoist
      }
    } else if (!this.isDashing) {
      this.setVelocity(0, 0);
      // Do not override attack animation while transformed and attacking
      if (!(useTransformAnim && this.isAttacking)) {
        this.anims.play(idleAnimKey, true);
      }
    }

    // Space key now used for dash (removed attack on space)

    if (this.weapon?.visible) {
      // Use weapon config offsets or defaults
      const weaponConfig = this.characterConfig.weapon || {};
      const offsetX = this.flipX ? -(weaponConfig.offsetX || 10) : (weaponConfig.offsetX || 10);
      const offsetY = weaponConfig.offsetY !== undefined ? weaponConfig.offsetY : 2;

      this.weapon.setPosition(this.x + offsetX, this.y + offsetY);
      this.weapon.setFlipX(this.flipX);

      // Apply base rotation from weapon config (e.g., for bow)
      const baseRotation = weaponConfig.baseRotation || 0;
      this.weapon.setAngle(this.flipX ? -(this.weaponRotation + baseRotation) : this.weaponRotation + baseRotation);
    }

    this.updateHealthBar();

    // Update arrows (for archer)
    this.updateArrows();

    // Clamp player position to map bounds
    if (this.scene.mapWidth && this.scene.mapHeight) {
      const margin = 16; // Buffer to keep player fully inside
      let newX = this.x;
      let newY = this.y;
      let needsUpdate = false;

      if (this.x < margin) {
        newX = margin;
        needsUpdate = true;
      }
      if (this.x > this.scene.mapWidth - margin) {
        newX = this.scene.mapWidth - margin;
        needsUpdate = true;
      }
      if (this.y < margin) {
        newY = margin;
        needsUpdate = true;
      }
      if (this.y > this.scene.mapHeight - margin) {
        newY = this.scene.mapHeight - margin;
        needsUpdate = true;
      }

      if (needsUpdate) {
        this.setPosition(newX, newY);
      }
    }
  }

  updateArrows() {
    for (let i = this.activeArrows.length - 1; i >= 0; i--) {
      const arrow = this.activeArrows[i];

      if (!arrow || !arrow.active) {
        this.activeArrows.splice(i, 1);
        continue;
      }

      // Move arrow
      const velocity = arrow.getData('velocity');
      arrow.x += velocity.x * (1 / 60); // Assuming 60 FPS
      arrow.y += velocity.y * (1 / 60);

      // Check if arrow exceeded range
      const startX = arrow.getData('startX');
      const startY = arrow.getData('startY');
      const range = arrow.getData('range');
      const distance = Phaser.Math.Distance.Between(startX, startY, arrow.x, arrow.y);

      if (distance > range) {
        arrow.destroy();
        this.activeArrows.splice(i, 1);
        continue;
      }

      // Check collision with enemies
      const damage = arrow.getData('damage');
      const arrowRect = new Phaser.Geom.Rectangle(arrow.x - 5, arrow.y - 5, 10, 10);

      const enemyGroups = [
        this.scene.bears,
        this.scene.treeMen,
        this.scene.forestGuardians,
        this.scene.gnollBrutes,
        this.scene.gnollShamans,
        this.scene.wolves,
        this.scene.golems,
        this.scene.mushrooms,
        this.scene.smallMushrooms,
        this.scene.stones,
        this.scene.trees
      ];

      let hitEnemy = false;

      for (const group of enemyGroups) {
        if (!group || hitEnemy) break;

        const enemies = Array.isArray(group) ? group : [group];
        for (const enemy of enemies) {
          if (!enemy || enemy.isDead) continue;

          const enemyHitbox = enemy.getHitbox ? enemy.getHitbox() :
            new Phaser.Geom.Rectangle(enemy.x - 12, enemy.y - 12, 24, 24);

          if (Phaser.Geom.Rectangle.Overlaps(arrowRect, enemyHitbox)) {
            enemy.takeDamage(damage);
            arrow.destroy();
            this.activeArrows.splice(i, 1);
            hitEnemy = true;
            break;
          }
        }
      }
    }
  }

  performTaoistTransformation() {
    // Transform into Mino
    this.isTransformed = true;
    // Khóa phím R cho đến khi tự hết biến hình
    this.transformCooldown = true;

    // Lưu flipX hiện tại trước khi transform
    const currentFlipX = this.flipX;

    this.setTexture(this.transformConfig.texture || 'mino');
    this.setScale(this.transformConfig.scale || 1);

    // Đảo ngược hướng vì sprite Mino có hướng ngược với Taoist
    this.setFlipX(!currentFlipX);

    // Create larger physics body (two circles) while transformed
    if (this.compoundBody) {
      const { Body, Bodies } = Phaser.Physics.Matter.Matter;
      const currentX = this.x;
      const currentY = this.y;
      const currentVelocity = this.body.velocity;

      // Calculate new radii (much larger to match character size)
      const newColliderRadius = this.originalColliderRadius * this.transformScaleFactor;
      const newSensorRadius = this.originalSensorRadius * this.transformScaleFactor;

      // Create new larger collider and sensor
      const newCollider = Bodies.circle(0, 0, newColliderRadius, {
        label: 'playerCollider',
        friction: 0,
        frictionStatic: 0,
        frictionAir: 0
      });

      const newSensor = Bodies.circle(0, 0, newSensorRadius, {
        isSensor: true,
        label: 'playerSensor'
      });

      // Create new compound body
      const newCompoundBody = Body.create({
        parts: [newCollider, newSensor],
        frictionAir: 0.35,
        friction: 0,
        frictionStatic: 0,
        restitution: 0,
        inertia: Infinity
      });

      // Giữ nguyên collision filter như lúc chưa biến hình
      if (this.defaultCollisionFilter) {
        newCompoundBody.collisionFilter.category = this.defaultCollisionFilter.category;
        newCompoundBody.collisionFilter.mask = this.defaultCollisionFilter.mask;
      }

      // Remove old body and set new one
      this.scene.matter.world.remove(this.body);
      this.setExistingBody(newCompoundBody);
      this.setPosition(currentX, currentY);
      this.setVelocity(currentVelocity.x, currentVelocity.y);

      // Khi biến hình: bỏ va chạm với enemy để không bị đẩy (quái vẫn tìm và đánh theo khoảng cách)
      if (this.noEnemyCollisionMask !== undefined) {
        this.body.collisionFilter.mask = this.noEnemyCollisionMask;
      }

      // Update stored references
      this.compoundBody = newCompoundBody;
      this.colliderBody = newCollider;
      this.sensorBody = newSensor;
    }

    // Increase damage while transformed (apply once)
    if (!this.transformDamageApplied) {
      this.bonusDamage += this.transformDamageBonus;
      this.transformDamageApplied = true;
    }

    // Auto revert after duration
    if (this.transformTimerEvent) {
      this.transformTimerEvent.remove(false);
    }
    this.transformTimerEvent = this.scene.time.delayedCall(this.transformDuration, () => {
      if (this.isTransformed) {
        this.toggleTaoistTransform();
      }
    });

    // Hide weapon while transformed
    if (this.weapon) {
      this.weapon.setVisible(false);
    }

    // Play idle animation of transformed form
    const idleAnim = this.transformConfig.idleAnim || 'mino_idle';
    if (this.anims.exists && this.anims.exists(idleAnim)) {
      this.anims.play(idleAnim, true);
    } else {
      this.anims.play(idleAnim, true);
    }
  }

  toggleTaoistTransform() {
    if (this.characterType !== CharacterTypes.TAOIST || !this.transformConfig) return;

    if (!this.isTransformed) {
      console.log('🔥 Starting Taoist transformation...');

      // Show effect_4 animation first
      const effect = this.scene.add.sprite(this.x, this.y, 'effect_4');
      effect.setScale(3.0);
      effect.setDepth(this.depth + 100);

      console.log('✨ Effect sprite created, playing animation...');

      // Play effect_4 animation (key is 'effect_4', not 'effect_4_anim')
      if (this.scene.anims.exists('effect_4')) {
        effect.play('effect_4');
        console.log('▶️ Animation playing!');
      } else {
        console.log('❌ Animation effect_4 does not exist!');
      }

      // Listen for animation complete
      effect.once('animationcomplete', () => {
        console.log('✅ Animation complete, transforming now...');
        effect.destroy();

        // Now perform the actual transformation
        this.performTaoistTransformation();
      });

      // Fallback: destroy effect after 800ms if animation doesn't complete
      this.scene.time.delayedCall(800, () => {
        if (effect && effect.active) {
          console.log('⏰ Fallback timer triggered transformation');
          effect.destroy();
          this.performTaoistTransformation();
        }
      });
    } else {
      // Revert back to Taoist
      this.isTransformed = false;
      // Mở lại phím R sau khi hết trạng thái biến hình
      this.transformCooldown = false;

      // Lưu flipX hiện tại trước khi revert
      const currentFlipX = this.flipX;

      this.setTexture(this.originalTexture);
      this.setScale(this.originalScale || 1);

      // Đảo ngược lại hướng khi revert về Taoist
      this.setFlipX(!currentFlipX);

      // Restore original physics body size
      if (this.compoundBody) {
        const { Body, Bodies } = Phaser.Physics.Matter.Matter;
        const currentX = this.x;
        const currentY = this.y;
        const currentVelocity = this.body.velocity;

        // Create original size collider and sensor
        const originalCollider = Bodies.circle(0, 0, this.originalColliderRadius, {
          label: 'playerCollider',
          friction: 0,
          frictionStatic: 0,
          frictionAir: 0
        });

        const originalSensor = Bodies.circle(0, 0, this.originalSensorRadius, {
          isSensor: true,
          label: 'playerSensor'
        });

        // Create original compound body
        const originalCompoundBody = Body.create({
          parts: [originalCollider, originalSensor],
          frictionAir: 0.35,
          friction: 0,
          frictionStatic: 0,
          restitution: 0,
          inertia: Infinity
        });

        // Khôi phục collision filter gốc
        if (this.defaultCollisionFilter) {
          originalCompoundBody.collisionFilter.category = this.defaultCollisionFilter.category;
          originalCompoundBody.collisionFilter.mask = this.defaultCollisionFilter.mask;
        }

        // Remove transformed body and restore original
        this.scene.matter.world.remove(this.body);
        this.setExistingBody(originalCompoundBody);
        this.setPosition(currentX, currentY);
        this.setVelocity(currentVelocity.x, currentVelocity.y);

        // Khôi phục mask gốc để va chạm lại bình thường với enemy
        if (this.defaultCollisionFilter) {
          this.body.collisionFilter.mask = this.defaultCollisionFilter.mask;
        }

        // Update stored references
        this.compoundBody = originalCompoundBody;
        this.colliderBody = originalCollider;
        this.sensorBody = originalSensor;
      }

      // Remove transform damage bonus
      if (this.transformDamageApplied) {
        this.bonusDamage -= this.transformDamageBonus;
        this.transformDamageApplied = false;
      }

      // Clear auto-revert timer if any
      if (this.transformTimerEvent) {
        this.transformTimerEvent.remove(false);
        this.transformTimerEvent = null;
      }

      // Show weapon again
      if (this.weapon) {
        this.weapon.setVisible(true);
      }

      // Play original idle animation
      const idleAnim = this.originalAnimKeys?.idle || this.characterConfig.idleAnim;
      if (this.anims.exists && this.anims.exists(idleAnim)) {
        this.anims.play(idleAnim, true);
      } else {
        this.anims.play(idleAnim, true);
      }
    }
  }
}
