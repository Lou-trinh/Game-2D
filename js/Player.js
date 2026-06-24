import Phaser from 'phaser';
import { preloadCharacters, getCharacterConfig, CharacterTypes } from './Character';
import { getWeaponByKey, WeaponCategories } from './data/WeaponData';
import { Economy } from './utils/Economy';

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
    // WEAPON SLOTS SYSTEM
    // =====================
    this.weaponSlots = {
      slot1: null,
      slot2: null,
      slot3: null,
      slot4: null
    };
    this.activeSlot = 'slot1';

    // Load equipped weapons
    this.loadEquippedWeapons(scene);

    // Initial weapon setup
    this.setupActiveWeapon(scene);

    // =====================
    // INVENTORY
    // =====================
    this.stoneCount = 0;
    this.woodCount = 0;
    this.meatCount = 0;
    this.diamondCount = 0;

    // =====================
    // PROJECTILES (for archer & player 1)
    // =====================
    this.activeArrows = [];

    // =====================
    // AMMO SYSTEM (Player 1)
    // =====================
    // Ammo will be managed per weapon slot if possible, but for now global or per slot
    this.ammoData = {
      slot1: { current: 0, max: 0 },
      slot2: { current: 0, max: 0 },
      slot3: { current: 0, max: 0 },
      slot4: { current: 0, max: 0 }
    };

    // Populate ammoData based on loaded weapons
    Object.keys(this.weaponSlots).forEach(slot => {
      const weaponKey = this.weaponSlots[slot];
      if (weaponKey) {
        const weapon = getWeaponByKey(weaponKey);
        if (weapon && weapon.maxAmmo) {
          this.ammoData[slot] = { current: weapon.maxAmmo, max: weapon.maxAmmo };
        }
      }
    });

    this.isReloading = false;
    this.reloadTimer = null;

    // =====================
    // MOUSE INPUT
    // =====================
    this.setupMouseInput(scene);

    // =====================
    // KEYBOARD INPUT (1-4 for slots, R for reload)
    // =====================
    this.setupKeyboardInput(scene);
    // Track space key for auto-fire
    this.inputKeys = scene.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      skillR: Phaser.Input.Keyboard.KeyCodes.R,
      slot1: Phaser.Input.Keyboard.KeyCodes.ONE,
      slot2: Phaser.Input.Keyboard.KeyCodes.TWO,
      slot3: Phaser.Input.Keyboard.KeyCodes.THREE,
      slot4: Phaser.Input.Keyboard.KeyCodes.FOUR
    });

    this.inputKeys.slot1.on('down', () => this.switchWeapon(1));
    this.inputKeys.slot2.on('down', () => this.switchWeapon(2));
    this.inputKeys.slot3.on('down', () => this.switchWeapon(3));
    this.inputKeys.slot4.on('down', () => this.switchWeapon(4));
    this.keySpace = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Fire rate tracking
    this.lastFireTime = 0;
  }

  static preload(scene) {
    preloadCharacters(scene);
  }

  loadEquippedWeapons(scene) {
    const equipped = JSON.parse(localStorage.getItem('equipped_weapons') || '{}');

    const owned = (key) => key && Economy.isWeaponOwned(key) ? key : null;

    this.weaponSlots = {
      slot1: owned(equipped.slot1) || 'Glock_17',
      slot2: owned(equipped.slot2) || 'MP5',
      slot3: owned(equipped.slot3) || null,
      slot4: owned(equipped.slot4) || 'Grenade',
    };
  }

  setupActiveWeapon(scene) {
    if (!this.weaponSlots) return; // Wait for loadEquippedWeapons

    const weaponKey = this.weaponSlots[this.activeSlot];

    // Destroy old weapon if exists
    if (this.weapon) {
      this.weapon.destroy();
      this.weapon = null;
    }

    this.isAttacking = false;
    this.weaponRotation = 0;
    this.weaponKick = 0;

    // Empty slot — no weapon to show
    if (!weaponKey) return;

    const weapon = getWeaponByKey(weaponKey);
    const texture = weapon ? weapon.texture : weaponKey;

    // Setup weapon sprite
    this.weapon = scene.add.image(0, 0, texture);
    const weaponScale = weapon?.scale || 0.6;
    this.weapon.setScale(weaponScale);

    // Set origin based on weapon type to hold at handle/stock
    if (weapon && weapon.category === WeaponCategories.MELEE) {
      this.weapon.setOrigin(0.0, 1.0); // Held at bottom-left handle end for melee
    } else {
      this.weapon.setOrigin(0.3, 0.7); // Held at handle/grip for guns
    }

    this.weapon.setDepth(this.depth + 1);

    // Synchronize weapon stats and projectiles from Character configuration or WeaponData
    // For now, Player 1 logic uses CharacterConfig.weapon
  }

  switchWeapon(slotIndex) {
    if (this.isDead || this.isReloading) return;

    const newSlot = `slot${slotIndex}`;
    if (this.activeSlot === newSlot) return;

    this.activeSlot = newSlot;
    this.setupActiveWeapon(this.scene);

    // Notify UI of change
    if (this.scene.resourceUI) {
      this.scene.resourceUI.updateActiveSlot(slotIndex);
      this.scene.resourceUI.updateAmmoUI();
    }
  }

  setupMouseInput(scene) {
    // Track mouse movement
    // (Aiming logic removed)

    // Bắt sự kiện click chuột
    scene.input.on('pointerdown', (pointer) => {
      if (this.isDead) return;





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
      // Flip player theo hướng chuột
      if (worldX < this.x) {
        // Player 1 defaults to facing right? No, Player is left by default in atlas?
        // Let's assume standard behavior:
        this.setFlipX(true); // Left
      } else {
        this.setFlipX(false); // Right
      }

      // Attack logic removed from mouse click (now uses Space ONLY)
    });
  }

  setupKeyboardInput(scene) {
    // Setup R key for reload.
    scene.input.keyboard.on('keydown-R', () => {
      // Gun character reload
      if (this.characterType === CharacterTypes.PLAYER_1 || this.characterType === CharacterTypes.CHARACTER_02 || this.characterType === CharacterTypes.PLAYER_3) {
        this.reloadWeapon();
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

    // Decrement ammo for gun characters
    if (this.characterType === CharacterTypes.PLAYER_1 || this.characterType === CharacterTypes.CHARACTER_02 || this.characterType === CharacterTypes.PLAYER_3) {
      const ammo = this.ammoData[this.activeSlot];
      if (ammo) {
        // Reduced decrement here as it's now handled in attack() for gun_fire
        // But for other characters/archers, we still want a log
      }
    }

    // Get weapon specific properties
    const weaponKey = this.weaponSlots[this.activeSlot];
    const weapon = getWeaponByKey(weaponKey);

    // Get number of projectiles - prioritize weapon data over character config
    const projectileCount = weapon?.projectileCount || projectileConfig.count || 1;
    const spreadAngle = weapon?.spread || projectileConfig.spread || 0; // degrees

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

      // Get weapon specific projectile texture override
      const textureOverride = weapon?.projectileTexture;

      // Create projectile sprite
      const projectile = this.scene.add.sprite(this.x, this.y, textureOverride || projectileConfig.texture || 'bullet');

      // Rocket bullets are larger for visibility
      const defaultScale = weapon?.key === 'Rocket' ? 0.8 : 0.4;
      projectile.setScale(projectileConfig.scale || defaultScale);

      if (projectileConfig.tint) {
        projectile.setTint(projectileConfig.tint);
      }
      projectile.setDepth(this.depth + 50);

      // Calculate velocity from angle
      const speed = weapon?.speed || projectileConfig.speed || 1000;
      const velocity = {
        x: Math.cos(projectileAngle) * speed,
        y: Math.sin(projectileAngle) * speed
      };

      // Rotate projectile to face flight direction
      // Rocket bullets point horizontally by default, so no 90° offset needed
      // Regular bullets are vertical sprites and need 90° offset
      const isRocket = weapon?.key === 'Rocket';
      const rotationOffset = isRocket ? 0 : 90;
      projectile.setAngle(Phaser.Math.RadToDeg(projectileAngle) + rotationOffset);

      // Store projectile data - prioritize weapon damage over character config
      const baseDamage = weapon?.damage || projectileConfig.damage;
      projectile.setData('velocity', velocity);
      projectile.setData('startX', this.x);
      projectile.setData('startY', this.y);
      projectile.setData('damage', baseDamage + (this.bonusDamage || 0));
      projectile.setData('range', weapon?.range || projectileConfig.range);
      projectile.setData('isExplosive', !!weapon?.isExplosive);
      projectile.setData('weaponKey', weapon?.key); // Store weapon type for explosion sound
      projectile.setData('pierce', !!weapon?.pierce);
      projectile.setData('hitEnemies', []); // Track hit enemies for piercing

      this.activeArrows.push(projectile);

      // Record shot for remote players to render
      if (this.scene._pendingShots) {
        this.scene._pendingShots.push({
          x: Math.round(this.x), y: Math.round(this.y),
          rad: projectileAngle,
          angle: Phaser.Math.RadToDeg(projectileAngle) + (isRocket ? 0 : 90),
          speed: speed,
          range: weapon?.range || projectileConfig.range || 600,
          tex: textureOverride || projectileConfig.texture || 'bullet',
          dmg: baseDamage + (this.bonusDamage || 0),
        });
      }
    }
  }

  attack() {
    if (this.isAttacking || this.isDead) return;

    // Gun character ammo check before attacking
    if (this.characterType === CharacterTypes.PLAYER_1 || this.characterType === CharacterTypes.CHARACTER_02 || this.characterType === CharacterTypes.PLAYER_3) {
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

    const weaponKey = this.weaponSlots[this.activeSlot];
    const weapon = getWeaponByKey(weaponKey);

    // Get current weapon's attack type, fallback to character default
    const attackType = weapon?.attackType || this.characterConfig.weapon?.attackType;

    // BOMB handling (Slot 4 / Throwables)
    if (weapon && weapon.category === WeaponCategories.BOMB) {
      // Find nearest enemy to aim grenade
      const nearestEnemy = this.findNearestEnemy(180);
      if (nearestEnemy) {
        this.lastAttackAngle = Phaser.Math.Angle.Between(this.x, this.y, nearestEnemy.x, nearestEnemy.y);
        this.setFlipX(nearestEnemy.x < this.x);
      } else {
        this.lastAttackAngle = this.flipX ? Math.PI : 0;
      }

      // Consume ammo
      const ammo = this.ammoData[this.activeSlot];
      if (ammo && ammo.current > 0) {
        ammo.current--;
        if (this.scene.resourceUI) this.scene.resourceUI.updateAmmoUI();
      }

      // Throwing animation
      this.scene.tweens.add({
        targets: this,
        weaponRotation: -45,
        duration: 150,
        ease: 'Power2',
        onComplete: () => {
          this.throwGrenade();
          this.scene.tweens.add({
            targets: this,
            weaponRotation: 0,
            duration: 150,
            ease: 'Power2',
            onComplete: () => {
              this.isAttacking = false;
            }
          });
        }
      });
      return;
    }

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

      // Find nearest enemy within range
      const projectileRange = this.characterConfig.weapon?.projectile?.range || 180;
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

      // Consume ammo for gun characters
      if (this.characterType === CharacterTypes.PLAYER_1 || this.characterType === CharacterTypes.CHARACTER_02 || this.characterType === CharacterTypes.PLAYER_3) {
        const ammo = this.ammoData[this.activeSlot];
        if (ammo && ammo.current > 0) {
          ammo.current--;
          // Update HUD instantly
          if (this.scene.resourceUI) {
            this.scene.resourceUI.updateAmmoUI();
          }
        }
      }

      // Launch projectile (shoot bullet)
      this.shootArrow();

      // Play weapon sound (default to rifle_shot)
      const isRocketWeapon = weapon?.key === 'Rocket';
      if (!isRocketWeapon) {
        try {
          const soundKey = weapon?.audio || 'rifle_shot';
          this.scene.sound.play(soundKey, {
            volume: 0.5,
            detune: Math.random() * 100 - 50
          });
        } catch (e) {
          console.warn('Could not play rifle sound:', e);
        }
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
    } else if (attackType === 'melee') {
      // Find nearest enemy for melee auto-targeting (within 100px)
      const nearestEnemy = this.findNearestEnemy(100);
      if (nearestEnemy) {
        this.lastAttackAngle = Phaser.Math.Angle.Between(this.x, this.y, nearestEnemy.x, nearestEnemy.y);
        this.setFlipX(nearestEnemy.x < this.x);
      } else {
        // Default to facing direction
        this.lastAttackAngle = this.flipX ? Math.PI : 0;
      }

      // Improved Realistic "Overhead Chop" (Simple Vertical)

      // Ensure we have the weapon data for audio
      const weaponKey = this.weaponSlots[this.activeSlot];
      const weapon = getWeaponByKey(weaponKey);

      // Robust melee sound playback
      let soundKey = 'shovel_swing';
      if (weapon && weapon.audio) {
        soundKey = weapon.audio;
      }

      // Check cache and play
      if (this.scene.cache.audio.exists(soundKey)) {
        this.scene.sound.play(soundKey, { volume: 0.8 });
      } else {
        // Fallback if specific sound missing
        if (this.scene.cache.audio.exists('shovel_swing')) {
          this.scene.sound.play('shovel_swing', { volume: 0.8 });
        }
      }

      // 1. Raise High (Giơ thẳng lên trời)
      this.scene.tweens.add({
        targets: this,
        weaponRotation: -90, // Giơ thẳng lên (-90 độ)
        duration: 120,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          // 2. The Smash (Bổ thẳng xuống đất)
          this.checkAttackHit(); // Gây dame

          this.scene.tweens.add({
            targets: this,
            weaponRotation: 0, // Bổ xuống ngang người (0 độ)
            duration: 80, // Bổ nhanh dứt khoát
            ease: 'Bounce.easeOut', // Hiệu ứng nảy nhẹ khi dừng lại
            onComplete: () => {
              // 3. Recovery
              this.scene.tweens.add({
                targets: this,
                weaponRotation: 0,
                duration: 200,
                ease: 'Cubic.easeOut',
                onComplete: () => {
                  this.isAttacking = false;
                }
              });
            }
          });
        }
      });
    } else {
      // Default swing attack (for scepter or other defaults)
      this.scene.tweens.add({
        targets: this,
        weaponRotation: -30,
        duration: 100,
        ease: 'Power2',
        onComplete: () => {
          // Only check melee hit if character doesn't have skill effect (not Mage)
          const showSkillEffect = this.characterConfig.weapon?.showSkillEffect;
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
    const attackDistance = 25;
    const hitWidth = 50;
    const hitHeight = 50;

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
          if (this.scene?._sessionDamage !== undefined) this.scene._sessionDamage += damage;
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

  throwGrenade() {
    const weaponKey = this.weaponSlots[this.activeSlot];
    const weapon = getWeaponByKey(weaponKey);
    const texture = weapon ? weapon.texture : 'Grenade';

    const grenade = this.scene.add.sprite(this.x, this.y, texture);
    const throwScale = weapon?.scale || 0.6;
    grenade.setScale(throwScale);
    grenade.setDepth(this.depth + 50);

    // Dynamic target: Land on nearest enemy or fixed distance
    const nearestEnemy = this.findNearestEnemy(180);
    const startX = this.x;
    const startY = this.y;
    let targetX, targetY;

    if (nearestEnemy) {
      targetX = nearestEnemy.x;
      targetY = nearestEnemy.y;
    } else {
      const throwDistance = 180;
      targetX = this.x + Math.cos(this.lastAttackAngle) * throwDistance;
      targetY = this.y + Math.sin(this.lastAttackAngle) * throwDistance;
    }

    const duration = 700;
    const arcHeight = 100;

    if (this.scene._pendingShots) {
      this.scene._pendingShots.push({
        type: 'grenade',
        tex: texture,
        startX: Math.round(startX),
        startY: Math.round(startY),
        targetX: Math.round(targetX),
        targetY: Math.round(targetY),
        weaponKey: weaponKey || 'Grenade',
        duration,
        arcHeight,
        rad: 0, angle: 0, speed: 0, range: 0, dmg: 0,
      });
    }

    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: duration,
      onUpdate: (tween) => {
        const t = tween.getValue();
        const currentX = startX + (targetX - startX) * t;
        const currentY = startY + (targetY - startY) * t;

        // Parabolic arc: h = 4 * height * t * (1 - t)
        const yOffset = 4 * arcHeight * t * (1 - t);

        grenade.setPosition(currentX, currentY - yOffset);
        grenade.angle += 15;
      },
      onComplete: () => {
        this.explodeGrenade(grenade, weaponKey);
      }
    });
  }

  explodeGrenade(grenade, weaponKey = null) {
    const ex = grenade.x;
    const ey = grenade.y;

    // Get weapon key from projectile data if not provided
    const explosiveWeapon = weaponKey || grenade.getData('weaponKey');

    grenade.destroy();

    if (explosiveWeapon === 'Gasoline_Bomb' || explosiveWeapon === 'Electric_Bomb') {
      this.explodeGasolineBomb(ex, ey, explosiveWeapon);
      return;
    }

    // Explosion Effect (effect_4)
    const explosion = this.scene.add.sprite(ex, ey, 'effect_4');
    explosion.setScale(1.5);
    explosion.setDepth(this.depth + 100);
    explosion.play('effect_4');

    explosion.on('animationcomplete', () => {
      explosion.destroy();
    });

    // Play explosion sound based on weapon type
    try {
      // Rocket uses grenade sound for now (can be changed when rocket-specific sound is added)
      // But we keep the logic separate for future customization
      const soundKey = explosiveWeapon === 'Rocket' ? 'grenade_explosion' : 'grenade_explosion';
      this.scene.sound.play(soundKey, { volume: 0.6 });
    } catch (e) {
      console.warn('Could not play explosion sound:', e);
    }

    // Auto-destroy fallback
    this.scene.time.delayedCall(1000, () => {
      if (explosion && explosion.active) explosion.destroy();
    });

    // AOE Logic - Reduced radius
    const aoeRadius = 80;
    const aoeDamage = 120;

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

    enemyGroups.forEach(group => {
      if (!group) return;
      const enemies = Array.isArray(group) ? group : [];
      enemies.forEach(enemy => {
        // Fix: Check enemy.sprite.active instead of enemy.active
        if (enemy && enemy.sprite && enemy.sprite.active && !enemy.isDead) {
          const dist = Phaser.Math.Distance.Between(ex, ey, enemy.sprite.x, enemy.sprite.y);
          if (dist <= aoeRadius) {
            enemy.takeDamage(aoeDamage);
            if (this.scene?._sessionDamage !== undefined) this.scene._sessionDamage += aoeDamage;
          }
        }
      });
    });

    // AOE for guest enemy proxies (guest side)
    if (this.scene.guestEnemies?.length) {
      this.scene.guestEnemies.forEach(proxy => {
        if (!proxy || proxy.isDead || !proxy.sprite?.active) return;
        const dist = Phaser.Math.Distance.Between(ex, ey, proxy.sprite.x, proxy.sprite.y);
        if (dist <= aoeRadius) {
          proxy.takeDamage(aoeDamage);
          if (this.scene?._sessionDamage !== undefined) this.scene._sessionDamage += aoeDamage;
        }
      });
    }

    // AOE Logic for Player (Self damage)
    if (!this.isDead) {
      const playerDist = Phaser.Math.Distance.Between(ex, ey, this.x, this.y);
      if (playerDist <= aoeRadius) {
        this.takeDamage(aoeDamage);
      }
    }
  }

  explodeGasolineBomb(ex, ey, weaponKey = 'Gasoline_Bomb') {
    // 1. Play glass broken sound
    try {
      this.scene.sound.play('glass_broken', { volume: 0.8 });
    } catch (e) {
      console.warn('Could not play glass_broken sound:', e);
    }

    // 2. Show effect_5 (Burst/Explosion)
    const explosion = this.scene.add.sprite(ex, ey, 'effect_5');
    explosion.setScale(1.2);
    explosion.setDepth(this.depth + 100);

    // Play once (repeat: 0)
    explosion.play({ key: 'effect_5', repeat: 0 });

    explosion.on('animationcomplete', () => {
      explosion.destroy();
    });

    // Fallback destroy just in case
    this.scene.time.delayedCall(1500, () => {
      if (explosion && explosion.active) explosion.destroy();
    });

    // 3. Play fire/electric sound
    try {
      const soundKey = weaponKey === 'Electric_Bomb' ? 'electric_sound' : 'fire_sound';
      this.scene.sound.play(soundKey, { volume: 0.6 });
    } catch (e) {
      console.warn('Could not play area damage sound:', e);
    }

    // 4. Create Zone — Electric_Bomb dùng effect_8, các bomb khác dùng effect_6
    const fireEffect = weaponKey === 'Electric_Bomb' ? 'effect_8' : 'effect_6';
    this.createFireZone(ex, ey, 7000, fireEffect);
  }

  createFireZone(x, y, duration, fireEffect = 'effect_6') {
    const fireRadius = 90; // Increased from 60
    const damagePerTick = 10;
    const tickInterval = 500; // Damage every 0.5s

    // Add visual effect for the zone
    const fireSprites = [];
    const spriteCount = 10; // Increased from 5
    for (let i = 0; i < spriteCount; i++) {
      const offsetX = (Math.random() - 0.5) * 80; // Increased spread
      const offsetY = (Math.random() - 0.5) * 80;
      const fire = this.scene.add.sprite(x + offsetX, y + offsetY, fireEffect);

      // Giảm kích thước effect_8 vì sprite tia sét gốc rất to
      if (fireEffect === 'effect_8') {
        fire.setScale(0.5 + Math.random() * 0.3);
      } else {
        fire.setScale(1.8 + Math.random() * 0.7);
      }

      fire.setDepth(y + offsetY);
      fire.play(fireEffect);
      fireSprites.push(fire);
    }

    const startTime = this.scene.time.now;

    // Timer for periodic damage and visual persistence
    const zoneTimer = this.scene.time.addEvent({
      delay: tickInterval,
      repeat: Math.floor(duration / tickInterval),
      callback: () => {
        const elapsed = this.scene.time.now - startTime;

        // Damage enemies in zone, truyền tên effect vào thay vì biến boolean true
        this.damageEnemiesInArea(x, y, fireRadius, damagePerTick, fireEffect);

        // Check if finished
        if (elapsed >= duration) {
          fireSprites.forEach(s => {
            this.scene.tweens.add({
              targets: s,
              alpha: 0,
              duration: 500,
              onComplete: () => s.destroy()
            });
          });
          zoneTimer.remove();
        }
      }
    });
  }

  damageEnemiesInArea(x, y, radius, damage, applyBurnEffect = false) {
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

    // 1. Check Enemies
    enemyGroups.forEach(group => {
      if (!group) return;
      const enemies = Array.isArray(group) ? group : [];
      enemies.forEach(enemy => {
        if (enemy && enemy.sprite && enemy.sprite.active && !enemy.isDead) {
          const dist = Phaser.Math.Distance.Between(x, y, enemy.sprite.x, enemy.sprite.y);
          if (dist <= radius) {
            enemy.takeDamage(damage);
            if (applyBurnEffect) {
              const effectKey = typeof applyBurnEffect === 'string' ? applyBurnEffect : 'effect_6';
              this.applyBurningEffect(enemy, effectKey);
            }
          }
        }
      });
    });

    // 2. Check Player (Self damage)
    if (!this.isDead) {
      const distToPlayer = Phaser.Math.Distance.Between(x, y, this.x, this.y);
      if (distToPlayer <= radius) {
        this.takeDamage(damage);
        if (applyBurnEffect) {
          const effectKey = typeof applyBurnEffect === 'string' ? applyBurnEffect : 'effect_6';
          this.applyBurningEffect(this, effectKey);
        }
      }
    }
  }

  applyBurningEffect(enemy, effectKey = 'effect_6') {
    // Prevent multiple burning effects if already burning
    if (enemy.isBurning) return;

    enemy.isBurning = true;
    const scene = this.scene;
    if (!scene) return;

    // Nếu đứng trong vùng nổ điện (effect_8), hiệu ứng bám trên người là tia sét (effect_9)
    const bodyEffectKey = effectKey === 'effect_8' ? 'effect_9' : effectKey;

    // Visual effect: attach bodyEffectKey to enemy
    const burnSprite = scene.add.sprite(0, 0, bodyEffectKey);
    // Increase scale slightly based on effect type to be visible but not overwhelming
    const scale = bodyEffectKey === 'effect_9' ? 0.8 : 1.2;
    burnSprite.setScale(scale);
    burnSprite.play(bodyEffectKey);

    // Determine the sprite to track (enemy.sprite for monsters, this for player)
    const isPlayer = (enemy === this);
    const targetSprite = isPlayer ? this : enemy.sprite;

    if (!targetSprite) {
      enemy.isBurning = false;
      return;
    }
    burnSprite.setDepth(targetSprite.depth + 1);

    // XỬ LÝ STUN CHO BOM ĐIỆN (effect_9)
    if (bodyEffectKey === 'effect_9' && !enemy.isStunned) {
      enemy.isStunned = true;
      const targetObj = isPlayer ? this : enemy;
      const originalUpdate = targetObj.update;

      // Ghi đè hàm update để đóng băng (không di chuyển, không tấn công)
      targetObj.update = function () {
        // Nếu đã chết thì không làm gì cả
        if (this.isDead) return;

        if (typeof this.setVelocity === 'function' && this.body) {
          this.setVelocity(0, 0);
          if (this.anims) this.anims.pause();
        } else if (this.sprite && typeof this.sprite.setVelocity === 'function' && this.sprite.body) {
          this.sprite.setVelocity(0, 0);
          if (this.sprite.anims) this.sprite.anims.pause();
        }
      };

      // Hết 4 giây thì phục hồi lại
      scene.time.delayedCall(4000, () => {
        const isDead = isPlayer ? targetObj.isDead : (targetObj.isDead || !targetObj.sprite || !targetObj.sprite.active);
        if (isDead) return;

        targetObj.update = originalUpdate;
        targetObj.isStunned = false;
        if (typeof targetObj.resume === 'function') targetObj.resume();
        else if (targetObj.sprite && targetObj.sprite.anims) targetObj.sprite.anims.resume();
        else if (targetObj.anims) targetObj.anims.resume();
        console.log('⚡ Hết bị điện giật!');
      });
    }

    // SMOTH TRACKING: Update position every frame
    const updateListener = () => {
      // Defensive check: if scene is gone
      if (!scene || !scene.events) return;

      const isDead = isPlayer ? enemy.isDead : (enemy.isDead || !enemy.sprite || !enemy.sprite.active);
      if (isDead || !burnSprite.active) {
        scene.events.off('update', updateListener);
        if (burnSprite.active) burnSprite.destroy();
        return;
      }
      burnSprite.setPosition(targetSprite.x, targetSprite.y - 10);
      burnSprite.setDepth(targetSprite.depth + 1);
    };
    scene.events.on('update', updateListener);

    // Duration: 7 seconds
    const burnDuration = 7000;
    const damagePerTick = isPlayer ? 1 : 5; // Reduced damage for player
    const tickInterval = 1000;

    const burnTimer = scene.time.addEvent({
      delay: tickInterval,
      repeat: Math.floor(burnDuration / tickInterval),
      callback: () => {
        const isDead = isPlayer ? enemy.isDead : (enemy.isDead || !enemy.sprite || !enemy.sprite.active);
        if (isDead) {
          burnTimer.remove();
          enemy.isBurning = false;
          return;
        }

        enemy.takeDamage(damagePerTick);
      }
    });

    // Cleanup after duration
    scene.time.delayedCall(burnDuration, () => {
      if (scene && scene.events) scene.events.off('update', updateListener);
      if (burnSprite && burnSprite.active) {
        scene.tweens.add({
          targets: burnSprite,
          alpha: 0,
          duration: 500,
          onComplete: () => {
            burnSprite.destroy();
            enemy.isBurning = false;
          }
        });
      } else {
        enemy.isBurning = false;
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
      this.scene.chests,
      this.scene.guestEnemies || [],
    ];

    let nearestEnemy = null;
    let nearestDistance = Infinity;

    enemyGroups.forEach(group => {
      if (!group) return;
      (Array.isArray(group) ? group : []).forEach(enemy => {
        // Fix: Consistent active check
        if (!enemy || enemy.isDead || !enemy.sprite || !enemy.sprite.active) return;

        const distance = Phaser.Math.Distance.Between(this.x, this.y, enemy.sprite.x, enemy.sprite.y);
        if (distance <= maxRange && distance < nearestDistance) {
          nearestDistance = distance;
          nearestEnemy = enemy;
        }
      });
    });

    return nearestEnemy;
  }

  createBloodSplatter(x, y, velocity, enemy) {
    // Create blood splatter effect using effect_3
    if (!this.scene.textures.exists('effect_3')) {
      console.warn('effect_3 texture not found for blood splatter');
      return;
    }

    // Calculate offset behind enemy based on bullet direction
    let offsetX = x;
    let offsetY = y;

    if (velocity) {
      // Normalize velocity and offset behind enemy
      const angle = Math.atan2(velocity.y, velocity.x);
      const offsetDistance = 15; // Distance behind enemy
      offsetX = x + Math.cos(angle) * offsetDistance;
      offsetY = y + Math.sin(angle) * offsetDistance;
    }

    const bloodEffect = this.scene.add.sprite(offsetX, offsetY, 'effect_3', 'blood15');
    bloodEffect.setScale(0.4);

    // Set depth below enemy so blood appears behind
    if (enemy && enemy.depth !== undefined) {
      bloodEffect.setDepth(enemy.depth - 1);
    } else {
      bloodEffect.setDepth(this.depth - 1);
    }

    // Flip based on bullet direction
    // If bullet is moving to the left (velocity.x < 0), flip the blood
    if (velocity && velocity.x < 0) {
      bloodEffect.setFlipX(true);
    } else {
      bloodEffect.setFlipX(false);
    }

    // Play blood animation
    if (this.scene.anims.exists('blood')) {
      bloodEffect.play('blood');

      // Destroy after animation completes
      bloodEffect.once('animationcomplete', () => {
        bloodEffect.destroy();
      });
    } else {
      // Fallback: just destroy after a short delay
      this.scene.time.delayedCall(400, () => {
        if (bloodEffect && bloodEffect.active) {
          bloodEffect.destroy();
        }
      });
    }
  }


  reloadWeapon() {
    // Check if weapon allows reload
    const weaponKey = this.weaponSlots[this.activeSlot];
    const weapon = getWeaponByKey(weaponKey);
    if (weapon && weapon.category === WeaponCategories.BOMB) {
      return; // Bombs cannot be reloaded
    }

    const ammo = this.ammoData[this.activeSlot];
    if (!ammo || this.isReloading || ammo.current === ammo.max) {
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
      const ammo = this.ammoData[this.activeSlot];
      if (ammo) ammo.current = ammo.max;
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

      console.log('Reload complete! Ammo: ' + ammo.current);

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
        }
      });
    });
  }

  createSurfTrail(angle) {
    // Create multiple surf effect sprites along the trail
    const trailCount = 5;
    const spacing = 15;


    for (let i = 0; i < trailCount; i++) {
      // Delay each trail sprite slightly for smooth effect
      this.scene.time.delayedCall(i * 40, () => {
        // Position behind player
        const offsetX = -Math.cos(angle) * spacing * (i * 0.5);
        const offsetY = -Math.sin(angle) * spacing * (i * 0.5);


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


        // Play surf animation if available
        if (this.scene.anims.exists('effect_3')) {
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
      this.scene._showDeathOverlay();
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
    const ammo = this.ammoData[this.activeSlot];
    if (ammo) ammo.current = ammo.max; // Restore full ammo

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

    // Check for attack input (Space held down)
    if (this.keySpace?.isDown || this.mobileFireHeld) {
      if (this.characterType === CharacterTypes.PLAYER_1 || this.characterType === CharacterTypes.CHARACTER_02 || this.characterType === CharacterTypes.PLAYER_3) {
        const weaponKey = this.weaponSlots[this.activeSlot];
        const weapon = getWeaponByKey(weaponKey);
        const isMelee = weapon && weapon.category === WeaponCategories.MELEE;
        const ammo = this.ammoData[this.activeSlot];

        // Check fire rate cooldown
        const currentTime = this.scene.time.now;
        const fireRate = weapon?.fireRate || 100; // Default 100ms for rapid fire
        const canFire = (currentTime - this.lastFireTime) >= fireRate;

        // Allow attack if it's Melee OR if we have ammo and not reloading AND fire rate allows
        if ((isMelee || (ammo && ammo.current > 0)) && !this.isReloading && canFire) {
          this.attack();
          this.lastFireTime = currentTime;
        }
      } else {
        // Other characters also use Space to attack
        this.attack();
      }
    }

    const speed = this.characterConfig.stats.speed || 2.5;
    const vel = new Phaser.Math.Vector2(0, 0);

    if (this.inputKeys?.left?.isDown) vel.x = -1;
    else if (this.inputKeys?.right?.isDown) vel.x = 1;
    if (this.inputKeys?.up?.isDown) vel.y = -1;
    else if (this.inputKeys?.down?.isDown) vel.y = 1;

    if (this.mobileMoveVector?.lengthSq() > 0) {
      vel.copy(this.mobileMoveVector);
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

    // Helper: resolve facing direction from attack angle
    const _resolveFaceDir = () => {
      const _a = this.lastAttackAngle || 0;
      const _ac = Math.cos(_a), _as = Math.sin(_a);
      if (Math.abs(_as) > Math.abs(_ac)) return _as > 0 ? 'front' : 'back';
      return _ac < 0 ? 'left' : 'right';
    };
    const _applyFaceDir = (faceDir) => {
      if (faceDir === 'left') this.setFlipX(true);
      else if (faceDir === 'right') this.setFlipX(false);
    };

    if (this.characterType === CharacterTypes.PLAYER_1) {
      // --- CHARACTER_01: facing always follows attack angle ---
      const _moving = vel.length() > 0 && !this.isDashing;
      if (!this.isDashing) {
        if (_moving) { vel.normalize().scale(speed); this.setVelocity(vel.x, vel.y); }
        else { this.setVelocity(0, 0); }
        const _fd = _resolveFaceDir();
        _applyFaceDir(_fd);
        if (_moving) {
          if (_fd === 'back') this.anims.play('character_01_run_back', true);
          else if (_fd === 'front') this.anims.play('character_01_run_front', true);
          else this.anims.play('character_01_run_right', true);
        } else {
          if (_fd === 'back') this.anims.play('character_01_idle_back', true);
          else if (_fd === 'front') this.anims.play('character_01_idle', true);
          else this.anims.play('character_01_idle_right', true);
        }
      }
    } else if (this.characterType === CharacterTypes.CHARACTER_02) {
      // --- CHARACTER_02: facing always follows attack angle ---
      const _moving = vel.length() > 0 && !this.isDashing;
      if (!this.isDashing) {
        if (_moving) { vel.normalize().scale(speed); this.setVelocity(vel.x, vel.y); }
        else { this.setVelocity(0, 0); }
        const _fd = _resolveFaceDir();
        _applyFaceDir(_fd);
        if (_moving) {
          if (_fd === 'back') this.anims.play('character_02_run_back', true);
          else if (_fd === 'front') this.anims.play('character_02_run_front', true);
          else this.anims.play('character_02_run_right', true);
        } else {
          if (_fd === 'back') this.anims.play('character_02_idle_back', true);
          else if (_fd === 'front') this.anims.play('character_02_idle', true);
          else this.anims.play('character_02_idle_right', true);
        }
      }
    } else if (this.characterType === CharacterTypes.PLAYER_3) {
      // --- CHARACTER_03: facing always follows attack angle ---
      const _moving = vel.length() > 0 && !this.isDashing;
      if (!this.isDashing) {
        if (_moving) { vel.normalize().scale(speed); this.setVelocity(vel.x, vel.y); }
        else { this.setVelocity(0, 0); }
        const _fd = _resolveFaceDir();
        _applyFaceDir(_fd);
        if (_moving) {
          if (_fd === 'back') this.anims.play('character_03_run_back', true);
          else if (_fd === 'front') this.anims.play('character_03_run_front', true);
          else this.anims.play('character_03_run_right', true);
        } else {
          if (_fd === 'back') this.anims.play('character_03_idle_back', true);
          else if (_fd === 'front') this.anims.play('character_03_idle', true);
          else this.anims.play('character_03_idle_right', true);
        }
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

    if (this.weapon?.visible) {
      // Use weapon config offsets or defaults
      const weaponConfig = this.characterConfig.weapon || {};

      // Determine if current weapon is melee to adjust offset
      const currentWeaponKey = this.weaponSlots[this.activeSlot];
      const currentWeapon = getWeaponByKey(currentWeaponKey);
      const isMeleeWeapon = currentWeapon && currentWeapon.category === WeaponCategories.MELEE;

      // Melee weapons start at center (0 offset), Guns offset by 10
      const baseOffsetX = isMeleeWeapon ? 0 : (weaponConfig.offsetX || 10);

      // Dynamic Origin for Melee to handle flip correctly
      if (isMeleeWeapon) {
        // If facing left (flipX), handle is at bottom-right of flipped texture -> Origin (1, 1)
        // If facing right, handle is at bottom-left -> Origin (0, 1)
        this.weapon.setOrigin(this.flipX ? 1.0 : 0.0, 1.0);
      }

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
    // if (this.isSpinning && this.spinEffectSprite && this.spinEffectSprite.active) {
    //   this.spinEffectSprite.setPosition(this.x, this.y + 5);
    //   this.spinEffectSprite.setDepth(this.depth + 10);
    // }

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
        if (arrow.getData('isExplosive')) {
          this.explodeGrenade(arrow);
        } else {
          arrow.destroy();
        }
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
        this.scene.chests,
        this.scene.guestEnemies || [],
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
            // Check if already hit (for piercing projectiles)
            const hitEnemies = arrow.getData('hitEnemies');
            if (hitEnemies && hitEnemies.includes(enemy)) {
              continue;
            }

            // Get arrow velocity to calculate direction
            const velocity = arrow.getData('velocity');

            // Create blood splatter effect at hit location (with offset behind enemy)
            this.createBloodSplatter(enemy.x, enemy.y, velocity, enemy);

            enemy.takeDamage(damage);
            if (this.scene?._sessionDamage !== undefined) this.scene._sessionDamage += damage;

            // Handle Piercing vs Normal
            if (arrow.getData('pierce')) {
              if (hitEnemies) hitEnemies.push(enemy);
              hitEnemy = true;
              // Do NOT destroy, do NOT break loop (can hit multiple in one frame)
            } else {
              if (arrow.getData('isExplosive')) {
                this.explodeGrenade(arrow);
              } else {
                arrow.destroy();
              }

              this.activeArrows.splice(i, 1);
              hitEnemy = true;
              break; // Stop checking enemies for this arrow
            }
          }
        }
      }
    }
  }

  performTaoistTransformation() {
    console.log('Taoist transformation disabled.');
  }

  toggleTaoistTransform() {
    if (this.characterType !== CharacterTypes.TAOIST || !this.transformConfig) return;

    if (!this.isTransformed) {
      console.log('🔥 Starting Taoist transformation...');
      this.performTaoistTransformation();
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

    // Marker removal as asset is deleted

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

        // Visual Effect Removed (effect_5)

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
        });
      });
    }

    // Reset cooldown
    this.scene.time.delayedCall(this.arrowRainCooldownTime, () => {
      this.arrowRainCooldown = false;
    });
  }

  performWarriorSpin() {
    this.isSpinning = true;
    this.spinCooldown = true;


    // Define spin duration and damage interval
    const duration = 8000; // 8 seconds 
    const damageInterval = 500; // Deal damage every 0.5s
    const spinRadius = 60; // Further reduced radius (tight hitbox)
    const damagePerTick = 15 + (this.bonusDamage || 0);

    // Create effect_6 sprite attached to player
    // Effect removed

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

          // Reset cooldown (e.g. 10s after finish)
          this.scene.time.delayedCall(10000, () => {
            this.spinCooldown = false;
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
