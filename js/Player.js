import Phaser from 'phaser';
import { preloadCharacters, getCharacterConfig, CharacterTypes } from './Character';

export default class Player extends Phaser.Physics.Matter.Sprite {
  constructor(data) {
    const { scene, x, y, texture, frame, characterType = CharacterTypes.PLAYER_1 } = data;
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
    this.isInvulnerable = false; // Invulnerability after revive
    this.invulnerabilityDuration = 3000; // 3 seconds
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
    this.isAttacking = false;
    this.weaponRotation = 0;
    this.weaponKick = 0; // Recoil offset

    // =====================
    // INVENTORY
    // =====================
    this.stoneCount = 0;
    this.woodCount = 0;
    this.meatCount = 0;
    this.diamondCount = 0;

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
    // AMMO SYSTEM (Player 1)
    // =====================
    this.maxAmmo = this.characterConfig.weapon?.ammo?.max || 30;
    this.currentAmmo = this.maxAmmo;
    this.isReloading = false;
    this.reloadTimer = null;

    // =====================
    // ARCHER SKILL (Arrow Rain)
    // =====================
    this.isAimingSkill = false;
    this.skillTargetIndicator = null;
    this.arrowRainCooldown = false;
    this.arrowRainCooldownTime = 5000; // 5 seconds

    // =====================
    // MOUSE INPUT
    // =====================
    this.setupMouseInput(scene);

    // =====================
    // KEYBOARD INPUT (F key for dash)
    // =====================
    this.setupKeyboardInput(scene);
    // Track space key for auto-fire
    this.keySpace = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
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
    scene.load.image('magic_circle', 'assets/images/weapons/magic_circle.png');
    scene.load.image('magic_circle_1', 'assets/images/weapons/magic_circle_1.png');
    scene.load.image('bullet', 'assets/images/weapons/bullet.png');
    scene.load.image('bullet_1', 'assets/images/weapons/bullet_1.png');
    scene.load.image('ammo_pickup', 'assets/images/weapons/ammo_pickup.png');

    // Load common assets
    scene.load.image('ghost', 'assets/images/die/ghost.png');

    // Load reload sound
    scene.load.audio('reload_sound', 'assets/sounds/reload.mp3');
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

    // Load effect_5 for Mage R skill
    scene.load.atlas(
      'effect_5',
      'assets/images/effects/effect_5/effect_5.png',
      'assets/images/effects/effect_5/effect_5_atlas.json'
    );
    scene.load.animation('effect_5_anim', 'assets/images/effects/effect_5/effect_5_anim.json');

    // Load effect_6 for Warrior R skill
    scene.load.atlas(
      'effect_6',
      'assets/images/effects/effect_6/effect_6.png',
      'assets/images/effects/effect_6/effect_6_atlas.json'
    );
    scene.load.animation('effect_6_anim', 'assets/images/effects/effect_6/effect_6_anim.json');

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
    // Track mouse movement for skill aiming
    scene.input.on('pointermove', (pointer) => {
      if (this.isAimingSkill && this.skillTargetIndicator) {
        const worldX = pointer.worldX;
        const worldY = pointer.worldY;
        this.skillTargetIndicator.setPosition(worldX, worldY);
      }
    });

    // Bắt sự kiện click chuột
    scene.input.on('pointerdown', (pointer) => {
      if (this.isDead) return;

      // Handle Archer Arrow Rain Cast
      if (this.characterType === CharacterTypes.ARCHER && this.isAimingSkill) {
        const worldX = pointer.worldX;
        const worldY = pointer.worldY;
        this.castArrowRain(worldX, worldY);
        return;
      }



      if (this.isAttacking) return;

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
      // DISABLE mouse attack for PLAYER_1 (uses Space + Auto-aim)
      if (this.characterType !== CharacterTypes.PLAYER_1) {
        this.attack();
      }
    });
  }

  setupKeyboardInput(scene) {
    // Setup SPACE key for dash (Assassin only)
    scene.input.keyboard.on('keydown-SPACE', () => {
      // Assassin Dash Logic
      if (this.characterType === CharacterTypes.ASSASSIN) {
        if (this.isDashing || this.dashCooldown || this.isDead || this.isAttacking) return;

        console.log('⌨️ SPACE key pressed - triggering dash!');

        // Get current movement direction
        const vel = new Phaser.Math.Vector2(0, 0);
        if (this.inputKeys?.left?.isDown) vel.x = -1;
        else if (this.inputKeys?.right?.isDown) vel.x = 1;
        if (this.inputKeys?.up?.isDown) vel.y = -1;
        else if (this.inputKeys?.down?.isDown) vel.y = 1;

        this.performDash(vel);
      }
      // Player 1 shooting is handled in update() method for auto-fire
    });

    // Setup R key for Assassin backstab, Wizard summon, Taoist transform AND Reload
    scene.input.keyboard.on('keydown-R', () => {
      // Player 1 Reload
      if (this.characterType === CharacterTypes.PLAYER_1) {
        this.reloadWeapon();
      }
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

      // Archer - Arrow Rain (Toggle aiming)
      if (this.characterType === CharacterTypes.ARCHER) {
        if (this.arrowRainCooldown || this.isDead) return;

        this.isAimingSkill = !this.isAimingSkill;

        if (this.isAimingSkill) {
          console.log('⌨️ R key pressed - Archer aiming skill!');
          // Show indicator
          if (!this.skillTargetIndicator) {
            this.skillTargetIndicator = this.scene.add.image(this.scene.input.activePointer.worldX, this.scene.input.activePointer.worldY, 'magic_circle');
            this.skillTargetIndicator.setDepth(this.depth + 100);
            this.skillTargetIndicator.setAlpha(0.7);
            this.skillTargetIndicator.setScale(0.5); // Adjust scale as needed
          } else {
            this.skillTargetIndicator.setTexture('magic_circle');
          }
          this.skillTargetIndicator.setVisible(true);

        } else {
          console.log('⌨️ R key pressed - Archer canceled aiming!');
          // Hide indicator
          if (this.skillTargetIndicator) {
            this.skillTargetIndicator.setVisible(false);
          }
        }
      }



      // Warrior - Spin Skill
      if (this.characterType === CharacterTypes.WARRIOR) {
        if (this.spinCooldown || this.isDead || this.isSpinning) return;
        console.log('⌨️ R key pressed - Warrior Spin!');
        this.performWarriorSpin();
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
    if (this.isDead || this.isInvulnerable) return;
    this.health -= amount;
    if (this.health < 0) this.health = 0;
    this.updateHealthBar();
    if (this.health <= 0) this.die();
  }

  shootArrow() {
    const projectileConfig = this.characterConfig.weapon?.projectile;
    if (!projectileConfig) return;

    // Decrement ammo for Player 1
    if (this.characterType === CharacterTypes.PLAYER_1) {
      this.currentAmmo--;
      console.log(`Ammo: ${this.currentAmmo}/${this.maxAmmo}`);
      // Update UI if any
    }

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
      if (projectileConfig.tint) {
        projectile.setTint(projectileConfig.tint);
      }
      projectile.setDepth(this.depth + 50);

      // Calculate velocity from angle
      const velocity = {
        x: Math.cos(projectileAngle) * projectileConfig.speed,
        y: Math.sin(projectileAngle) * projectileConfig.speed
      };

      // Rotate projectile to face flight direction (add 90° offset for bullet sprite)
      projectile.setAngle(Phaser.Math.RadToDeg(projectileAngle) + 90);

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

    // Player 1 specific check for ammo before attacking
    if (this.characterType === CharacterTypes.PLAYER_1) {
      if (this.currentAmmo <= 0) {
        console.log('❌ Out of ammo! Cannot attack.');
        // Optional: Play empty click sound
        return;
      }
      if (this.isReloading) {
        console.log('❌ Reloading! Cannot attack.');
        return;
      }
    }

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
    } else if (attackType === 'gun_fire') {
      // Recoil attack (for guns/rifles)
      // Fast kickback, slow return

      // Recoil attack (for guns/rifles)

      // Consume ammo if Player 1
      if (this.characterType === CharacterTypes.PLAYER_1) {
        if (this.currentAmmo > 0) {
          this.currentAmmo--;
          // Update HUD if exists
          if (this.scene.resourceUI) {
            this.scene.resourceUI.updatePlayerHUD();
          }
        }
      }

      // Find nearest enemy within range
      const projectileRange = this.characterConfig.weapon?.projectile?.range || 250;
      const nearestEnemy = this.findNearestEnemy(projectileRange);

      if (nearestEnemy) {
        // Enemy in range, aim at them
        this.lastAttackAngle = Phaser.Math.Angle.Between(this.x, this.y, nearestEnemy.x, nearestEnemy.y);

        // Face the target
        if (nearestEnemy.x < this.x) {
          this.setFlipX(true);
        } else {
          this.setFlipX(false);
        }
      } else {
        // No enemy in range, shoot straight in facing direction
        this.lastAttackAngle = this.flipX ? Math.PI : 0;
      }

      // Launch projectile (shoot bullet)
      this.shootArrow();

      // Play rifle gunshot sound
      try {
        this.scene.sound.play('rifle_shot', {
          volume: 0.5,
          detune: Math.random() * 100 - 50
        });
      } catch (e) {
        console.warn('Could not play rifle sound:', e);
      }

      // Show muzzle flash effect (effect_7) at gun barrel
      this.showMuzzleFlash();

      this.scene.tweens.add({
        targets: this,
        weaponKick: 6, // Kick back 6 pixels
        duration: 20,   // Extremely fast kick (Rapid fire)
        ease: 'Power2',
        onComplete: () => {
          this.scene.tweens.add({
            targets: this,
            weaponKick: 0, // Return to normal
            duration: 60, // Fast return (Total ~80ms cycle)
            ease: 'Power1',
            onComplete: () => {
              this.isAttacking = false;
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
      this.scene.trees,
      this.scene.chests
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
      this.scene.stones,
      this.scene.chests
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

  showMuzzleFlash() {
    // Calculate muzzle position at the gun barrel tip
    // The weapon is positioned at an offset from the player
    const weaponLength = 20; // Distance from player to gun barrel tip

    // Calculate muzzle position based on attack angle
    const muzzleX = this.x + Math.cos(this.lastAttackAngle) * weaponLength;
    const muzzleY = this.y + Math.sin(this.lastAttackAngle) * weaponLength;

    // Create muzzle flash sprite
    const muzzleFlash = this.scene.add.sprite(muzzleX, muzzleY, 'effect_7');
    muzzleFlash.setScale(0.5); // Adjust size as needed
    muzzleFlash.setDepth(this.depth + 100);

    // Rotate to match gun angle
    const angleDegrees = Phaser.Math.RadToDeg(this.lastAttackAngle);
    muzzleFlash.setAngle(angleDegrees);

    // Play animation - the key is 'shoot' from effect_7_anim.json
    if (this.scene.anims.exists('shoot')) {
      muzzleFlash.play('shoot');
    }

    // Auto-destroy after animation completes
    muzzleFlash.on('animationcomplete', () => {
      muzzleFlash.destroy();
    });

    // Fallback destroy in case animation doesn't complete
    this.scene.time.delayedCall(400, () => {
      if (muzzleFlash && muzzleFlash.active) {
        muzzleFlash.destroy();
      }
    });
  }

  findNearestEnemy(maxRange = Infinity) {
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
      this.scene.chests
    ];

    let nearestEnemy = null;
    let nearestDistance = Infinity;

    enemyGroups.forEach(group => {
      if (!group) return;
      (Array.isArray(group) ? group : []).forEach(enemy => {
        if (!enemy || enemy.isDead) return;

        const distance = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
        if (distance <= maxRange && distance < nearestDistance) {
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

  reloadWeapon() {
    if (this.isReloading || this.currentAmmo === this.maxAmmo) {
      console.log('Already reloading or full ammo.');
      return;
    }

    console.log('Reloading weapon...');
    this.isReloading = true;
    this.isAttacking = false; // Stop attacking while reloading

    // Play reload sound immediately
    try {
      this.scene.sound.play('reload_sound', {
        volume: 0.3
      });
    } catch (e) {
      console.warn('Could not play reload sound:', e);
    }

    // Play ammo bounce animation
    this.playReloadAnimation();

    // Clear any existing reload timer if R is pressed again
    if (this.reloadTimer) {
      this.reloadTimer.remove();
    }

    // Clear any existing reload indicator
    if (this.reloadIndicator) {
      this.reloadIndicator.destroy();
      this.reloadIndicator = null;
    }

    const reloadTime = this.characterConfig.weapon?.ammo?.reloadTime || 1500; // Default 1.5 seconds

    // Create loading circle indicator above player
    this.reloadIndicator = this.scene.add.graphics();
    this.reloadIndicator.setDepth(this.depth + 100);

    // Draw a circular loading indicator
    const circleRadius = 8;
    const circleY = -40; // Above player's head

    // Background circle (gray)
    this.reloadIndicator.lineStyle(3, 0x666666, 0.5);
    this.reloadIndicator.strokeCircle(this.x, this.y + circleY, circleRadius);

    // Progress circle (white/yellow)
    this.reloadIndicator.lineStyle(3, 0xffff00, 1);

    // Animate the progress circle
    let progress = 0;
    const progressInterval = 50; // Update every 50ms
    const totalSteps = reloadTime / progressInterval;

    const progressTimer = this.scene.time.addEvent({
      delay: progressInterval,
      repeat: totalSteps - 1,
      callback: () => {
        progress += (1 / totalSteps);

        // Clear and redraw
        this.reloadIndicator.clear();

        // Background circle
        this.reloadIndicator.lineStyle(3, 0x666666, 0.5);
        this.reloadIndicator.strokeCircle(this.x, this.y + circleY, circleRadius);

        // Progress arc
        this.reloadIndicator.lineStyle(3, 0xffff00, 1);
        this.reloadIndicator.beginPath();
        this.reloadIndicator.arc(
          this.x,
          this.y + circleY,
          circleRadius,
          Phaser.Math.DegToRad(-90), // Start from top
          Phaser.Math.DegToRad(-90 + (360 * progress)), // Progress
          false
        );
        this.reloadIndicator.strokePath();
      }
    });

    // Store progress timer for cleanup
    this.reloadProgressTimer = progressTimer;

    this.reloadTimer = this.scene.time.delayedCall(reloadTime, () => {
      this.currentAmmo = this.maxAmmo;
      this.isReloading = false;
      this.reloadTimer = null;

      // Clean up reload indicator
      if (this.reloadIndicator) {
        this.reloadIndicator.destroy();
        this.reloadIndicator = null;
      }

      // Clean up progress timer
      if (this.reloadProgressTimer) {
        this.reloadProgressTimer.remove();
        this.reloadProgressTimer = null;
      }

      console.log('Reload complete! Ammo: ' + this.currentAmmo);

      // Update UI
      if (this.scene.resourceUI) {
        this.scene.resourceUI.updatePlayerHUD();
      }
    });
  }

  playReloadAnimation() {
    // Create 1 slightly smaller ammo pack sprite
    const ammo = this.scene.add.image(this.x, this.y - 10, 'ammo_pickup');
    ammo.setScale(0.7); // Slightly smaller as requested
    ammo.setDepth(this.depth + 10);
    ammo.setAlpha(0.8);

    // Calculate target position (near the player)
    const angle = Math.random() * Math.PI * 2;
    const distance = 15 + Math.random() * 10;
    const targetX = this.x + Math.cos(angle) * distance;
    const targetY = this.y + Math.sin(angle) * distance;

    // Bounce effect - fly up then drop down (matches Chest.js)
    this.scene.tweens.add({
      targets: ammo,
      x: targetX,
      y: targetY - 30, // Peak height
      alpha: 1,
      duration: 300,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: ammo,
          y: targetY,
          duration: 450,
          ease: 'Bounce.easeOut',
          onComplete: () => {
            // Fade out and destroy after landing
            this.scene.time.delayedCall(500, () => {
              this.scene.tweens.add({
                targets: ammo,
                alpha: 0,
                duration: 300,
                onComplete: () => ammo.destroy()
              });
            });
          }
        });
      }
    });

    // Rotation effect
    this.scene.tweens.add({
      targets: ammo,
      angle: 360,
      duration: 750,
      ease: 'Linear'
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
    this.isReloading = false; // Reset reloading state
    if (this.reloadTimer) { // Clear reload timer if any
      this.reloadTimer.remove();
      this.reloadTimer = null;
    }
    this.currentAmmo = this.maxAmmo; // Restore full ammo

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

    // Grant 3-second invulnerability
    this.isInvulnerable = true;
    console.log('🛡️ Player is invulnerable for 3 seconds!');

    // Create flashing effect to indicate invulnerability
    const flashTween = this.scene.tweens.add({
      targets: this,
      alpha: 0.4,
      duration: 200,
      yoyo: true,
      repeat: -1 // Infinite repeat
    });

    // Remove invulnerability after 3 seconds
    this.scene.time.delayedCall(this.invulnerabilityDuration, () => {
      this.isInvulnerable = false;
      flashTween.stop();
      this.setAlpha(1); // Restore full opacity
      console.log('🛡️ Invulnerability period ended');
    });

    console.log('✨ Player revived with health:', this.health, '/', this.maxHealth);
  }

  update() {
    if (this.isDead) return;

    // Chỉ block movement khi đang tấn công với Mino (transformed)
    const blockMovementForMino = this.characterType === CharacterTypes.TAOIST && this.isTransformed && this.isAttacking;
    if (blockMovementForMino) return;

    // Check for auto-fire (Space held down)
    if (this.characterType === CharacterTypes.PLAYER_1 && this.keySpace?.isDown) {
      if (this.currentAmmo > 0 && !this.isReloading) {
        this.attack();
      }
    }

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

    if (this.characterType === CharacterTypes.PLAYER_1) {
      // --- PLAYER 1 SPECIFIC DIRECTIONAL ANIMATION LOGIC ---
      if (vel.length() > 0 && !this.isDashing) {
        vel.normalize().scale(speed);
        this.setVelocity(vel.x, vel.y);

        // Determine animation based on direction
        let animToPlay = 'run_front'; // Default

        if (vel.y < 0) {
          animToPlay = 'run_top';
          this.setFlipX(false);
        } else if (vel.y > 0) {
          animToPlay = 'run_front';
          this.setFlipX(false);
        } else if (vel.x > 0) {
          animToPlay = 'run_right_left';
          this.setFlipX(false);
        } else if (vel.x < 0) {
          animToPlay = 'run_right_left';
          this.setFlipX(true); // Flip for left
        }

        // Prioritize vertical movement if moving diagonally? 
        // Let's refine: if moving vertically, use top/front. If mostly horizontal, use right/left.
        if (Math.abs(vel.y) >= Math.abs(vel.x)) {
          if (vel.y < 0) animToPlay = 'run_top';
          else animToPlay = 'run_front';
          this.setFlipX(false); // Reset flip for vertical
        } else {
          animToPlay = 'run_right_left';
          if (vel.x < 0) this.setFlipX(true);
          else this.setFlipX(false);
        }

        this.anims.play(animToPlay, true);
      } else if (!this.isDashing) {
        this.setVelocity(0, 0);
        this.anims.play('idle', true);
      }
    } else {
      // --- EXISTING LOGIC FOR OTHER CHARACTERS ---
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
    }

    // Space key now used for dash (removed attack on space)

    if (this.weapon?.visible) {
      // Use weapon config offsets or defaults
      const weaponConfig = this.characterConfig.weapon || {};
      const baseOffsetX = weaponConfig.offsetX || 10;
      // Apply kickback opposite to facing direction (recoil pushes weapon back)
      // weaponKick is positive value, we subtract it from offset relative to player
      const kickOffset = this.weaponKick;

      const offsetX = this.flipX
        ? -(baseOffsetX - kickOffset)
        : (baseOffsetX - kickOffset);

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
    this.updateRainArrows();

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
    // Update spin effect position if active
    if (this.isSpinning && this.spinEffectSprite && this.spinEffectSprite.active) {
      this.spinEffectSprite.setPosition(this.x, this.y + 5);
      this.spinEffectSprite.setDepth(this.depth + 10);
    }

    // Update reload indicator position if active
    if (this.isReloading && this.reloadIndicator) {
      // The reload indicator is redrawn each frame in the progress timer
      // but we need to ensure it's positioned correctly if player moves
      // Since we're using graphics.arc with absolute coordinates,
      // the position is already updated in the progress callback
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
        this.scene.trees,
        this.scene.chests
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

  castArrowRain(targetX, targetY) {
    if (this.arrowRainCooldown) return;

    console.log('🏹 Archer casting Arrow Rain!');

    // Start cooldown
    this.arrowRainCooldown = true;
    this.isAimingSkill = false;

    // Hide indicator
    if (this.skillTargetIndicator) {
      this.skillTargetIndicator.setVisible(false);
    }

    // Number of arrows
    const arrowCount = 20;
    const areaRadius = 25; // Random spread within circle

    // Create rain active array if not exists
    if (!this.activeRainArrows) {
      this.activeRainArrows = [];
    }

    // Create a fading target marker on the ground
    const targetMarker = this.scene.add.image(targetX, targetY, 'magic_circle');
    targetMarker.setDepth(targetY - 1); // Ground level
    targetMarker.setAlpha(0.5);
    targetMarker.setScale(0.5); // Matches cursor scale

    this.scene.tweens.add({
      targets: targetMarker,
      alpha: 0,
      scaleX: 0.2,
      scaleY: 0.2,
      duration: 2000,
      onComplete: () => targetMarker.destroy()
    });

    for (let i = 0; i < arrowCount; i++) {
      // Random start time for each arrow to create "rain" effect
      this.scene.time.delayedCall(i * 100, () => {
        // Random position within circle
        const r = areaRadius * Math.sqrt(Math.random());
        const theta = Math.random() * 2 * Math.PI;

        const offsetX = r * Math.cos(theta);
        const offsetY = r * Math.sin(theta); // This is for landing position

        const landX = targetX + offsetX;
        const landY = targetY + offsetY; // Removed 0.5 factor to make it a perfect circle

        // Spawn high above
        const startY = landY - 600;

        const arrow = this.scene.add.sprite(landX, startY, 'arrow');
        arrow.setAngle(90); // Point down
        arrow.setScale(0.7);
        arrow.setDepth(landY + 100); // High depth

        // Data for update loop
        arrow.setData('velocity', { x: 0, y: 800 }); // Fast falling speed
        arrow.setData('landY', landY);
        arrow.setData('damage', 8 + (this.bonusDamage || 0));

        this.activeRainArrows.push(arrow);
      });
    }

    // Reset cooldown
    this.scene.time.delayedCall(this.arrowRainCooldownTime, () => {
      this.arrowRainCooldown = false;
      console.log('✅ Arrow Rain ready!');
    });
  }

  updateRainArrows() {
    if (!this.activeRainArrows) return;

    for (let i = this.activeRainArrows.length - 1; i >= 0; i--) {
      const arrow = this.activeRainArrows[i];

      if (!arrow || !arrow.active) {
        this.activeRainArrows.splice(i, 1);
        continue;
      }

      // Move arrow
      const velocity = arrow.getData('velocity');
      arrow.y += velocity.y * (1 / 60);

      const landY = arrow.getData('landY');

      // Only check collision if arrow is near the ground (simulate Z-axis)
      // If arrow is too high (y < landY - 40), it shouldn't hit enemies
      if (arrow.y < landY - 40) {
        continue;
      }

      // Check collision with enemies
      const damage = arrow.getData('damage');
      const arrowRect = new Phaser.Geom.Rectangle(arrow.x - 5, arrow.y - 20, 10, 40); // Taller hitbox for falling arrow

      let hitOb = false;

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

      for (const group of enemyGroups) {
        if (!group || hitOb) break;

        const enemies = Array.isArray(group) ? group : [group];
        for (const enemy of enemies) {
          if (!enemy || enemy.isDead) continue;

          const enemyHitbox = enemy.getHitbox ? enemy.getHitbox() :
            new Phaser.Geom.Rectangle(enemy.x - 12, enemy.y - 12, 24, 24);

          if (Phaser.Geom.Rectangle.Overlaps(arrowRect, enemyHitbox)) {
            enemy.takeDamage(damage);
            hitOb = true;
            break;
          }
        }
      }

      // If hit enemy OR reached ground
      if (hitOb || arrow.y >= landY) {
        // Show impact effect (reuse whatever or just simple fade)
        // Reuse teleport particle for now as dust/impact
        this.createTeleportEffect(arrow.x, arrow.y, 0xffffff);

        arrow.destroy();
        this.activeRainArrows.splice(i, 1);
      }
    }
  }

  castMageExplosion(targetX, targetY) {
    if (this.arrowRainCooldown) return;

    console.log('🔥 Mage casting Explosion (Multi-strike)!');

    // Start cooldown
    this.arrowRainCooldown = true;
    this.isAimingSkill = false;

    // Hide indicator
    if (this.skillTargetIndicator) {
      this.skillTargetIndicator.setVisible(false);
    }

    // Check if animation exists, if not create it
    if (!this.scene.anims.exists('effect_5')) {
      this.scene.anims.create({
        key: 'effect_5',
        frames: this.scene.anims.generateFrameNames('effect_5', {
          start: 0,
          end: 14,
          zeroPad: 0,
          prefix: '',
          suffix: ''
        }),
        frameRate: 15,
        repeat: 0
      });
    }

    // Settings for multi-strike
    const strikeCount = 3;
    const spreadRadius = 45; // Random area around click
    const damage = 20 + (this.bonusDamage || 0); // User requested values
    const explosionRadius = 30; // User requested values

    for (let i = 0; i < strikeCount; i++) {
      // Staggered delays for "barrage" feel (more separated now)
      const delay = i * 400 + Math.random() * 100;

      this.scene.time.delayedCall(delay, () => {
        // All strikes hit the exact target location
        const strikeX = targetX;
        const strikeY = targetY;

        // 1. Visual Effect
        const explosion = this.scene.add.sprite(strikeX, strikeY - 50, 'effect_5'); // Keep -50 offset
        explosion.setDepth(strikeY + 50);
        explosion.setScale(0.5); // Keep 0.5 scale
        explosion.play({ key: 'effect_5', repeat: 0 });

        explosion.once('animationcomplete', () => {
          explosion.destroy();
        });

        // 2. Damage Logic (Sync with impact)
        this.scene.time.delayedCall(100, () => {
          const explosionCircle = new Phaser.Geom.Circle(strikeX, strikeY, explosionRadius);

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

          let hitCount = 0;
          enemyGroups.forEach(group => {
            if (!group) return;
            const enemies = Array.isArray(group) ? group : [group];

            enemies.forEach(enemy => {
              if (!enemy || enemy.isDead) return;

              const dist = Phaser.Math.Distance.Between(strikeX, strikeY, enemy.x, enemy.y);
              if (dist <= explosionRadius) {
                enemy.takeDamage(damage);
                this.createTeleportEffect(enemy.x, enemy.y, 0xff4400);
                hitCount++;
              }
            });
          });
          console.log(`💥 Strike ${i + 1} hit ${hitCount} enemies`);
        });
      });
    }

    // Reset cooldown
    this.scene.time.delayedCall(this.arrowRainCooldownTime, () => {
      this.arrowRainCooldown = false;
      console.log('✅ Mage Explosion ready!');
    });
  }

  performWarriorSpin() {
    this.isSpinning = true;
    this.spinCooldown = true;

    console.log('🌪️ Warrior Spin Started!');

    // Define spin duration and damage interval
    const duration = 8000; // 8 seconds 
    const damageInterval = 500; // Deal damage every 0.5s
    const spinRadius = 60; // Further reduced radius (tight hitbox)
    const damagePerTick = 15 + (this.bonusDamage || 0);

    // Create effect_6 sprite attached to player
    this.spinEffectSprite = this.scene.add.sprite(this.x, this.y + 5, 'effect_6');
    this.spinEffectSprite.setScale(3.5); // Increased scale to make it wider
    this.spinEffectSprite.setDepth(this.depth + 10);
    this.spinEffectSprite.setAlpha(0.9);

    // Play effect animation
    if (this.scene.anims.exists('effect_6')) {
      this.spinEffectSprite.play('effect_6');
    } else {
      // Create anim if not exists (fallback logic)
      this.scene.anims.create({
        key: 'effect_6',
        frames: this.scene.anims.generateFrameNames('effect_6', { start: 0, end: 5, zeroPad: 0 }),
        frameRate: 15,
        repeat: -1
      });
      this.spinEffectSprite.play('effect_6');
    }

    // Damage loop
    let elapsedTime = 0;
    const damageEvent = this.scene.time.addEvent({
      delay: damageInterval,
      loop: true,
      callback: () => {
        elapsedTime += damageInterval;
        if (elapsedTime >= duration || this.isDead || !this.isSpinning) {
          damageEvent.remove();
          this.isSpinning = false;

          if (this.spinEffectSprite) {
            this.spinEffectSprite.destroy();
            this.spinEffectSprite = null;
          }

          // Reset cooldown (e.g. 10s after finish)
          this.scene.time.delayedCall(10000, () => {
            this.spinCooldown = false;
            console.log('✅ Warrior Spin Ready!');
          });
          return;
        }

        // Check collisions
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

        let hitSomething = false;

        enemyGroups.forEach(group => {
          if (!group) return;
          const enemies = Array.isArray(group) ? group : [group];
          enemies.forEach(enemy => {
            if (!enemy || enemy.isDead) return;
            const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
            if (dist <= spinRadius) {
              enemy.takeDamage(damagePerTick);
              this.createTeleportEffect(enemy.x, enemy.y, 0xffffff);
              hitSomething = true;
            }
          });
        });
      }
    });
  }
}
