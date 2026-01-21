import Phaser from 'phaser';
import Player from './Player';
import { CharacterTypes, getCharacterConfig } from './Character';
import Bear from './Bear';
import Stone from './Stone';
import Tree from './Tree';
import TreeMan from './TreeMan';
import ForestGuardian from './ForestGuardian';
import GnollBrute from './GnollBrute';
import GnollShaman from './GnollShaman';
import Wolf from './Wolf';
import LargeMushRoom from './LargeMushRoom';
import SmallMushRoom from './SmallMushRoom';
import Golem from './Golem';
import IceMonster from './IceMonster';
import Chest from './Chest';
import { Economy } from './utils/Economy';
import ResourceUI from './ResourceUI';

export default class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene');
    this.player = null;
    this.bears = [];
    this.stones = [];
    this.trees = [];
    this.treeMen = [];
    this.forestGuardians = [];
    this.gnollBrutes = [];
    this.gnollShamans = [];
    this.wolves = [];
    this.mushrooms = [];
    this.smallMushrooms = [];
    this.golems = [];
    this.summonedMonsters = []; // Track wizard summons
    this.chests = []; // Track chests
    this.items = [];
  }

  preload() {
    Player.preload(this);
    this.load.image('button_out', 'assets/images/inventory/button/button_out.png');
    this.load.image('backpack', 'assets/images/inventory/backpack.png');
    Bear.preload(this);
    Stone.preload(this);
    Tree.preload(this);
    TreeMan.preload(this);
    ForestGuardian.preload(this);
    GnollBrute.preload(this);
    GnollShaman.preload(this);
    Wolf.preload(this);
    LargeMushRoom.preload(this);
    SmallMushRoom.preload(this);
    Golem.preload(this);
    Chest.preload(this);



    this.load.image('tiles', 'assets/images/RPG Nature Tileset.png');
    this.load.tilemapTiledJSON('map', 'assets/images/map.json');

    // Load inventory images
    this.load.image('backpack', 'assets/images/inventory/backpack.png');
    this.load.image('diamond', 'assets/images/item/diamon.png');

    // Skill 3 (Gate)
    this.load.atlas('gate', 'assets/images/skill/skill_3/gate.png', 'assets/images/skill/skill_3/gate_atlas.json');
    this.load.animation('gate_anim', 'assets/images/skill/skill_3/gate_anim.json');
  }

  getSpawnPool() {
    const elapsedSeconds = (this.time.now - (this.startTime || 0)) / 1000;
    let pool = [];

    // Weights (Chance ~ Count in pool)

    // Phase 1: 0-25s : Bear, Treeman
    const basicPool = ['bear', 'treeman'];

    // Phase 2: 25s+ : Add few GnollBrute, GnollShaman, Wolf
    const midPool = ['gnollbrute', 'gnollshaman', 'wolf'];

    // Phase 4: 75s+ : Add few LargeMushRoom
    const mushPool = ['mushroom'];

    // Phase 6: 125s+ : Add few ForestGuardian
    const guardianPool = ['forestguardian'];

    // Phase 8: 175s+ : Add few Golem
    const golemPool = ['golem'];


    // Base Layout (Always include basics to keep variety)
    pool = pool.concat(basicPool, basicPool, basicPool); // 6 items

    // Phase 2 (25s+)
    if (elapsedSeconds > 25) {
      pool = pool.concat(midPool); // +3 items (Low chance)
    }

    // Phase 3 (50s+)
    if (elapsedSeconds > 50) {
      pool = pool.concat(midPool, midPool); // +6 items (Total 9 mid items - High chance)
    }

    // Phase 4 (75s+)
    if (elapsedSeconds > 75) {
      pool = pool.concat(mushPool); // +1 item (Low chance)
    }

    // Phase 5 (100s+)
    if (elapsedSeconds > 100) {
      pool = pool.concat(mushPool, mushPool, mushPool); // +3 items (High chance relative to before)
    }

    // Phase 6 (125s+)
    if (elapsedSeconds > 125) {
      pool = pool.concat(guardianPool); // +1 item
    }

    // Phase 7 (150s+)
    if (elapsedSeconds > 150) {
      pool = pool.concat(guardianPool, guardianPool, guardianPool); // +3 items
    }

    // Phase 8 (175s+)
    if (elapsedSeconds > 175) {
      pool = pool.concat(golemPool); // +1 item
    }

    // Phase 9 (200s+)
    if (elapsedSeconds > 200) {
      pool = pool.concat(golemPool, golemPool, golemPool); // +3 items
    }

    return pool;
  }

  spawnEnemyFromGate() {
    // Alternating spawn mechanism to ensure even distribution
    if (this.lastSpawnLeft === undefined) {
      this.lastSpawnLeft = false;
    }
    this.lastSpawnLeft = !this.lastSpawnLeft;

    const gateX = this.lastSpawnLeft ? 100 : 860;
    const gateY = 260; // Same Y for both

    // Get dynamic monster pool based on time
    const enemies = this.getSpawnPool();
    const type = Phaser.Utils.Array.GetRandom(enemies);

    let enemy;

    switch (type) {
      case 'bear':
        enemy = new Bear({ scene: this, x: gateX, y: gateY });
        this.bears.push(enemy);
        break;
      case 'treeman':
        enemy = new TreeMan({ scene: this, x: gateX, y: gateY });
        this.treeMen.push(enemy);
        break;
      case 'forestguardian':
        enemy = new ForestGuardian({ scene: this, x: gateX, y: gateY });
        this.forestGuardians.push(enemy);
        break;
      case 'gnollbrute':
        enemy = new GnollBrute({ scene: this, x: gateX, y: gateY });
        this.gnollBrutes.push(enemy);
        break;
      case 'gnollshaman':
        enemy = new GnollShaman({ scene: this, x: gateX, y: gateY });
        this.gnollShamans.push(enemy);
        break;
      case 'wolf':
        enemy = new Wolf({ scene: this, x: gateX, y: gateY });
        this.wolves.push(enemy);
        break;
      case 'mushroom':
        enemy = new LargeMushRoom({ scene: this, x: gateX, y: gateY });
        this.mushrooms.push(enemy);
        break;
      case 'smallmushroom':
        enemy = new SmallMushRoom({ scene: this, x: gateX, y: gateY });
        this.smallMushrooms.push(enemy);
        break;
      case 'golem':
        enemy = new Golem({ scene: this, x: gateX, y: gateY });
        this.golems.push(enemy);
        break;
    }

    if (enemy) {
      console.log(`👾 Spawned ${type} from gate!`);
    }
  }

  create() {
    this.player = null;
    this.bears = [];
    this.stones = [];
    this.trees = [];
    this.treeMen = [];
    this.forestGuardians = [];
    this.gnollBrutes = [];
    this.gnollShamans = [];
    this.wolves = [];
    this.mushrooms = [];
    this.smallMushrooms = [];
    this.golems = [];
    this.summonedMonsters = [];
    this.items = [];
    this.diamondCount = 0; // Track session diamonds
    this.coinCount = 0;    // Track session coins

    const map = this.make.tilemap({ key: 'map' });

    const tileset = map.addTilesetImage(
      'RPG Nature Tileset',
      'tiles',
      32,
      32,
      0,
      0
    );

    const groundLayer = map.createLayer('Ground', tileset, 0, 0);
    const roadLayer = map.createLayer('Road', tileset, 0, 0);
    const bushLayer = map.createLayer('Bush', tileset, 0, 0);
    const decorLayer = map.createLayer('Decor', tileset, 0, 0);
    const aboveLayer = map.createLayer('Above', tileset, 0, 0);

    groundLayer.setCollisionByProperty({ collides: true });
    this.matter.world.convertTilemapLayer(groundLayer);

    groundLayer.setDepth(0);
    roadLayer.setDepth(0);
    bushLayer.setDepth(0);
    decorLayer.setDepth(500);
    aboveLayer.setDepth(1000);

    // Store map dimensions for bounds checking
    this.mapWidth = map.widthInPixels;
    this.mapHeight = map.heightInPixels;

    /* ===============================
       COLLISION (MATTER + OBJECT LAYER)
    =============================== */
    const collisionLayer = map.getObjectLayer('Collision');

    if (collisionLayer) {
      collisionLayer.objects.forEach((obj) => {
        this.matter.add.rectangle(
          obj.x + obj.width / 2,
          obj.y + obj.height / 2,
          obj.width,
          obj.height,
          {
            isStatic: true,
            label: 'treeCollider'
          }
        );
      });
    }

    /* ===============================
       SPAWN PLAYER
    =============================== */
    // Get selected character from registry, default to mage
    const selectedCharKey = this.registry.get('selectedCharacter') || CharacterTypes.MAGE;
    const charConfig = getCharacterConfig(selectedCharKey);

    this.player = new Player({
      scene: this,
      x: 230,
      y: 230,
      texture: charConfig.texture,
      frame: charConfig.idleFrame,
      characterType: selectedCharKey
    });
    this.player.diamondCount = 0;
    this.player.coinCount = 0;

    // Gate 1 (Left)
    this.gate1 = this.add.sprite(100, 260, 'gate');
    this.gate1.setScale(1.5);
    this.gate1.play('gate');
    this.gate1.setDepth(299);

    // Gate 2 (Right - Opposite to Gate 1)
    // Map width is 960px (30 tiles * 32px). 960 - 100 = 860.
    this.gate2 = this.add.sprite(860, 260, 'gate');
    this.gate2.setScale(1.5);
    this.gate2.setFlipX(true); // Flip horizontally
    this.gate2.play('gate');
    this.gate2.setDepth(299);

    console.log('✨ Spawned Gates at (100,260) and (860,260)');

    // Prevent player from going outside map bounds
    this.matter.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    /* ===============================
       SPAWN BEARS (ENEMIES)
    =============================== */
    // const bear = new Bear({
    //   scene: this,
    //   x: 150,
    //   y: 400
    // });
    // this.bears.push(bear);

    /* ===============================
       SPAWN TREEMAN
    =============================== */
    // const treeMan = new TreeMan({
    //   scene: this,
    //   x: 150,
    //   y: 120
    // });
    // this.treeMen.push(treeMan);

    /* ===============================
       SPAWN FOREST GUARDIAN
    =============================== */
    // const forestGuardian = new ForestGuardian({
    //   scene: this,
    //   x: 590,
    //   y: 210
    // });
    // this.forestGuardians.push(forestGuardian);

    /* ===============================
       SPAWN GNOLL BRUTE
    =============================== */
    // const gnollBrute = new GnollBrute({
    //   scene: this,
    //   x: 350,
    //   y: 330
    // });
    // this.gnollBrutes.push(gnollBrute);

    /* ===============================
       SPAWN GNOLL SHAMAN
    =============================== */
    // const gnollShaman = new GnollShaman({
    //   scene: this,
    //   x: 400,
    //   y: 120
    // });
    // this.gnollShamans.push(gnollShaman);

    /* ===============================
       SPAWN WOLF
    =============================== */
    // const wolf1 = new Wolf({
    //   scene: this,
    //   x: 390,
    //   y: 520
    // });
    // this.wolves.push(wolf1);

    // const wolf2 = new Wolf({
    //   scene: this,
    //   x: 350,
    //   y: 500
    // });
    // this.wolves.push(wolf2);

    // const wolf3 = new Wolf({
    //   scene: this,
    //   x: 350,
    //   y: 540
    // });
    // this.wolves.push(wolf3);

    /* ===============================
       SPAWN LARGE MUSHROOM
    =============================== */
    // const mushroom = new LargeMushRoom({
    //   scene: this,
    //   x: 680,
    //   y: 430
    // });
    // this.mushrooms.push(mushroom);

    /* ===============================
   SPAWN GOLEM
    =============================== */
    // const golem = new Golem({
    //   scene: this,
    //   x: 800,
    //   y: 120
    // });
    // this.golems.push(golem);


    // Start Wave Spawning from Gate - Reduced spawn rate
    this.time.addEvent({
      delay: 1500, // Spawn every 1.5 seconds (reduced from 0.8s for less density)
      loop: true,
      callback: () => {
        this.spawnEnemyFromGate();
      }
    });
    const layers = [groundLayer, decorLayer, bushLayer];

    layers.forEach(layer => {
      if (!layer) return;

      layer.layer.data.forEach((tileRow, y) => {
        tileRow.forEach((tile, x) => {
          if (tile && tile.properties && tile.properties.stone) {
            const worldX = tile.pixelX + tile.width / 2;
            const worldY = tile.pixelY + tile.height / 2;

            const stone = new Stone({
              scene: this,
              x: worldX,
              y: worldY,
              tileX: x,
              tileY: y,
              layer: layer,
              tile: tile
            });
            this.stones.push(stone);
          }
        });
      });
    });

    console.log(`🪨 Spawned ${this.stones.length} stones from tiles`);

    /* ===============================
       SPAWN TREES (FROM TILES)
    =============================== */
    const treeLayers = [decorLayer];

    treeLayers.forEach(layer => {
      if (!layer) return;

      layer.layer.data.forEach((tileRow, y) => {
        tileRow.forEach((tile, x) => {
          if (tile && tile.properties && tile.properties.tree) {
            const worldX = tile.pixelX + tile.width / 2;
            const worldY = tile.pixelY + tile.height / 2;

            const tree = new Tree({
              scene: this,
              x: worldX,
              y: worldY,
              tileX: x,
              tileY: y,
              layer: layer,
              tile: tile,
              aboveLayer: aboveLayer
            });
            this.trees.push(tree);
          }
        });
      });
    });

    console.log(`🌲 Spawned ${this.trees.length} trees from tiles`);

    /* ===============================
       SPAWN STONES FROM SPAWN LAYER
    =============================== */
    const spawnLayer = map.getObjectLayer('Spawn');

    if (spawnLayer) {
      spawnLayer.objects.forEach((obj) => {
        if (obj.type === 'stone') {
          const stone = new Stone({
            scene: this,
            x: obj.x + obj.width / 2,
            y: obj.y + obj.height / 2,
            tileX: 0,
            tileY: 0,
            layer: null,
            tile: null
          });
          this.stones.push(stone);
          console.log(`🪨 Spawned stone from Spawn layer at (${obj.x}, ${obj.y})`);
        }
      });

      const stoneObjectCount = spawnLayer.objects.filter(o => o.type === 'stone').length;
      console.log(`🪨 Total stones from Spawn layer: ${stoneObjectCount}`);
    }

    /* ===============================
       INPUT
    =============================== */
    // Reset arrays to ensure no leftovers from previous session
    this.bears = [];
    this.stones = [];
    this.trees = [];
    this.treeMen = [];
    this.forestGuardians = [];
    this.gnollBrutes = [];
    this.gnollShamans = [];
    this.wolves = [];
    this.mushrooms = [];
    this.smallMushrooms = [];
    this.golems = [];
    this.summonedMonsters = [];
    this.chests = [];
    this.items = [];

    // Initialize inputs
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = {
      up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    };
    this.player.inputKeys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      shift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      f: Phaser.Input.Keyboard.KeyCodes.F
    });

    this.input.on('pointerdown', (pointer) => {
      if (pointer.leftButtonDown()) {
        this.player.attack();
      }
    });

    /* ===============================
       CAMERA
    =============================== */
    this.cameras.main.setBounds(
      0,
      0,
      map.widthInPixels,
      map.heightInPixels
    );

    this.cameras.main.centerOn(this.player.x, this.player.y);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    /* ===============================
       RESOURCE UI
    =============================== */
    this.resourceUI = new ResourceUI(this, this.player);

    /* ===============================
       SPAWN CHESTS
    =============================== */
    this.time.delayedCall(15000, () => {
      this.spawnChest();
    });

    console.log('✅ MainScene with Bears, TreeMan, ForestGuardian, GnollBrute, GnollShaman, Wolves, Mushrooms, Chests and Stones loaded');
  }

  update(time, delta) {
    if (!this.player) return;

    const playerDepth = this.player.y;
    this.player.setDepth(playerDepth);

    if (this.player.weapon) {
      this.player.weapon.setDepth(playerDepth + 100);
    }

    // Đặt health bar ở depth cao để luôn hiển thị trên cây/đá
    if (this.player.healthBar) {
      this.player.healthBar.setDepth(20001);
    }
    if (this.player.healthBarBg) {
      this.player.healthBarBg.setDepth(20000);
    }

    this.player.update();

    this.bears.forEach(bear => {
      bear.update();
    });

    this.treeMen.forEach(treeMan => {
      treeMan.update();
    });

    this.forestGuardians.forEach(forestGuardian => {
      forestGuardian.update();
    });

    this.gnollBrutes.forEach(gnollBrute => {
      gnollBrute.update();
    });

    this.gnollShamans.forEach(gnollShaman => {
      gnollShaman.update(time, delta);
    });

    this.wolves.forEach(wolf => {
      wolf.update();
    });

    this.mushrooms.forEach(mushroom => {
      mushroom.update();
    });

    this.smallMushrooms.forEach(smallMushroom => {
      smallMushroom.update();
    });

    this.golems.forEach(golem => {
      golem.update();
    });

    this.stones.forEach(stone => {
      stone.update();
    });

    this.trees.forEach(tree => {
      tree.update();
    });

    this.chests.forEach(chest => {
      chest.update();
    });

    // Update summoned monsters
    if (this.summonedMonsters && this.summonedMonsters.length > 0) {
      // Clean up dead summons
      this.summonedMonsters = this.summonedMonsters.filter(summon => {
        if (!summon || summon.isDead) {
          // Remove from player's active summons too
          if (this.player && this.player.activeSummons) {
            const index = this.player.activeSummons.indexOf(summon);
            if (index > -1) {
              this.player.activeSummons.splice(index, 1);
              console.log(`🗑️ Removed dead summon. Active summons: ${this.player.activeSummons.length}`);
            }
          }
          return false;
        }
        summon.update();
        return true;
      });
    }

    this.checkItemPickup();
  }

  checkItemPickup() {
    if (!this.player || this.items.length === 0) return;

    const pickupRange = 20;

    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];

      if (!item || !item.active) {
        this.items.splice(i, 1);
        continue;
      }

      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        item.x,
        item.y
      );

      // Magnet effect range check
      const magnetRange = 30; // Very close range (pickup is 20)
      if (distance <= magnetRange && distance > pickupRange) {
        // Move item towards player
        const speed = 4 + (magnetRange - distance) / 10; // Faster as it gets closer
        const angle = Phaser.Math.Angle.Between(item.x, item.y, this.player.x, this.player.y);

        item.x += Math.cos(angle) * speed;
        item.y += Math.sin(angle) * speed;
      }

      if (distance <= pickupRange) {
        const itemType = item.getData('itemType');

        this.tweens.add({
          targets: item,
          x: this.player.x,
          y: this.player.y - 10,
          scale: 0,
          alpha: 0,
          duration: 200,
          ease: 'Power2',
          onComplete: () => {
            item.destroy();
          }
        });

        // Blood, meat, stone, and wood pickups disabled - only diamonds work
        if (itemType === 'diamond') {
          this.pickupDiamond();
        } else if (itemType === 'blood') {
          this.pickupBlood();
        } else if (itemType === 'meat') {
          this.pickupMeat();
        } else if (itemType === 'coin') {
          this.pickupCoin();
        }

        this.items.splice(i, 1);
      }
    }
  }

  pickupBlood() {
    const healAmount = 30;
    const oldHealth = this.player.health;

    this.player.health = Math.min(this.player.health + healAmount, this.player.maxHealth);
    this.player.updateHealthBar();

    const actualHeal = this.player.health - oldHealth;
    console.log(`💊 Picked up blood! Healed ${actualHeal} HP`);

    this.player.setTint(0x00ff00);
    this.time.delayedCall(150, () => {
      this.player.clearTint();
    });
  }

  pickupMeat() {
    if (!this.player.bonusDamage) {
      this.player.bonusDamage = 0;
    }

    if (!this.player.meatCount) {
      this.player.meatCount = 0;
    }

    this.player.bonusDamage += 5;
    this.player.meatCount += 1;
    console.log(`🥩 Picked up meat! Bonus damage: +${this.player.bonusDamage}, Total meat: ${this.player.meatCount}`);

    // Update UI if exists
    if (this.resourceUI) {
      this.resourceUI.updateResources();
    }

    this.player.setTint(0xff9900);
    this.time.delayedCall(150, () => {
      this.player.clearTint();
    });
  }

  pickupStone() {
    if (!this.player.stoneCount) {
      this.player.stoneCount = 0;
    }

    this.player.stoneCount += 1;
    console.log(`🪨 Picked up stone! Total: ${this.player.stoneCount}`);

    // Update UI if exists
    if (this.resourceUI) {
      this.resourceUI.updateResources();
    }

    this.player.setTint(0xcccccc);
    this.time.delayedCall(150, () => {
      this.player.clearTint();
    });
  }

  pickupWood() {
    if (!this.player.woodCount) {
      this.player.woodCount = 0;
    }

    this.player.woodCount += 1;
    console.log(`🪵 Picked up wood! Total: ${this.player.woodCount}`);

    // Update UI if exists
    if (this.resourceUI) {
      this.resourceUI.updateResources();
    }

    this.player.setTint(0x8B4513);
    this.time.delayedCall(150, () => {
      this.player.clearTint();
    });
  }

  pickupDiamond() {
    if (!this.player.diamondCount) {
      this.player.diamondCount = 0;
    }

    this.player.diamondCount += 1;
    Economy.addDiamonds(1); // Persistent save
    console.log(`💎 Picked up diamond! Total: ${this.player.diamondCount} (Persistent: ${Economy.getDiamonds()})`);

    // Update UI
    if (this.resourceUI) {
      this.resourceUI.updateResources();
    }

    this.player.setTint(0x00ffff);
    this.time.delayedCall(150, () => {
      this.player.clearTint();
    });
  }

  pickupCoin() {
    if (!this.player.coinCount) {
      this.player.coinCount = 0;
    }

    this.player.coinCount += 1;
    Economy.addCoins(1); // Persistent save
    console.log(`💰 Picked up coin! Total: ${this.player.coinCount} (Persistent: ${Economy.getCoins()})`);

    // Update UI
    if (this.resourceUI) {
      this.resourceUI.updateResources();
    }

    this.player.setTint(0xffff00); // Yellow tint for coin
    this.time.delayedCall(150, () => {
      this.player.clearTint();
    });
  }

  dropLoot(x, y, count = 1, type = 'coin') {
    for (let i = 0; i < count; i++) {
      // Random target offset for the bounce
      const offsetX = Phaser.Math.Between(-30, 30);
      const offsetY = Phaser.Math.Between(-30, 30);
      const targetX = x + offsetX;
      const targetY = y + offsetY;

      const item = this.add.sprite(x, y, type);
      item.setData('itemType', type);

      // Much smaller scale for coins
      if (type === 'coin') {
        item.setScale(0.15);
      } else {
        item.setScale(0.8);
      }

      item.setAlpha(0.8);
      item.setDepth(y + offsetY);

      // Bounce effect - fly up then drop down (matched from Chest.js)
      this.tweens.add({
        targets: item,
        x: targetX,
        y: targetY - 30,
        alpha: 1,
        duration: 250,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: item,
            y: targetY,
            duration: 400,
            ease: 'Bounce.easeOut',
            onComplete: () => {
              // Only push to collection list after landing
              this.items.push(item);
            }
          });
        }
      });

      // Added rotation for dynamic feel
      this.tweens.add({
        targets: item,
        angle: 360,
        duration: 650,
        ease: 'Linear'
      });
    }
  }

  /* ===============================
     CHEST SPAWNING LOGIC
  =============================== */
  spawnChest() {
    // Ensure map dimensions are available
    const width = this.mapWidth || 1600;
    const height = this.mapHeight || 1200;

    let chestX, chestY;
    let isValidPosition = false;
    let attempts = 0;
    const minDistance = 60; // Minimum distance from obstacles

    // Try finding a valid position up to 15 times
    while (!isValidPosition && attempts < 15) {
      attempts++;

      // Random position, avoiding edges
      chestX = Phaser.Math.Between(100, width - 100);
      chestY = Phaser.Math.Between(100, height - 100);

      isValidPosition = true;

      // Check distance to Stones
      for (const stone of this.stones) {
        if (!stone || !stone.sprite || !stone.sprite.active) continue;
        const dist = Phaser.Math.Distance.Between(chestX, chestY, stone.x, stone.y);
        if (dist < minDistance) {
          isValidPosition = false;
          break;
        }
      }

      if (!isValidPosition) continue;

      // Check distance to Trees
      for (const tree of this.trees) {
        if (!tree || !tree.sprite || !tree.sprite.active) continue;
        const dist = Phaser.Math.Distance.Between(chestX, chestY, tree.x, tree.y);
        if (dist < minDistance) {
          isValidPosition = false;
          break;
        }
      }
    }

    if (!isValidPosition) {
      console.warn('⚠️ Could not find perfect spot for chest, spawning anyway at last pos');
    } else {
      console.log(`✅ Found valid chest position after ${attempts} attempts`);
    }

    const chest = new Chest({
      scene: this,
      x: chestX,
      y: chestY
    });

    this.chests.push(chest);

    console.log(`📦 Spawned NEW chest at (${chestX}, ${chestY})`);
  }

  onChestOpened() {
    console.log('⏳ Chest opened! Next chest will spawn in 30 seconds...');

    // Clean up destroyed chests from array
    this.chests = this.chests.filter(c => !c.isOpened && !c.isOpening);

    this.time.delayedCall(30000, () => {
      this.spawnChest();
    });
  }

  revivePlayer() {
    if (this.player) {
      this.player.revive();
    }
  }
}
