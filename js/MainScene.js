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
    this.items = [];
  }

  preload() {
    Player.preload(this);
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

    // Load cluthu transformation assets for Taoist
    this.load.atlas('cluthu', 'assets/images/skill/cluthu/cluthu.png', 'assets/images/skill/cluthu/cluthu_atlas.json');
    this.load.animation('cluthu_anim', 'assets/images/skill/cluthu/cluthu_anim.json');

    // Load mace weapon for Taoist
    this.load.image('mace', 'assets/images/weapons/mace.png');

    this.load.image('tiles', 'assets/images/RPG Nature Tileset.png');
    this.load.tilemapTiledJSON('map', 'assets/images/map.json');
  }

  create() {
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

    /* ===============================
       SPAWN BEARS (ENEMIES)
    =============================== */
    const bear = new Bear({
      scene: this,
      x: 150,
      y: 400
    });
    this.bears.push(bear);

    /* ===============================
       SPAWN TREEMAN
    =============================== */
    const treeMan = new TreeMan({
      scene: this,
      x: 150,
      y: 120
    });
    this.treeMen.push(treeMan);

    /* ===============================
       SPAWN FOREST GUARDIAN
    =============================== */
    const forestGuardian = new ForestGuardian({
      scene: this,
      x: 590,
      y: 210
    });
    this.forestGuardians.push(forestGuardian);

    /* ===============================
       SPAWN GNOLL BRUTE
    =============================== */
    const gnollBrute = new GnollBrute({
      scene: this,
      x: 350,
      y: 330
    });
    this.gnollBrutes.push(gnollBrute);

    /* ===============================
       SPAWN GNOLL SHAMAN
    =============================== */
    const gnollShaman = new GnollShaman({
      scene: this,
      x: 400,
      y: 120
    });
    this.gnollShamans.push(gnollShaman);

    /* ===============================
       SPAWN WOLF
    =============================== */
    const wolf1 = new Wolf({
      scene: this,
      x: 390,
      y: 520
    });
    this.wolves.push(wolf1);

    const wolf2 = new Wolf({
      scene: this,
      x: 350,
      y: 500
    });
    this.wolves.push(wolf2);

    const wolf3 = new Wolf({
      scene: this,
      x: 350,
      y: 540
    });
    this.wolves.push(wolf3);

    /* ===============================
       SPAWN LARGE MUSHROOM
    =============================== */
    const mushroom = new LargeMushRoom({
      scene: this,
      x: 680,
      y: 430
    });
    this.mushrooms.push(mushroom);

    /* ===============================
   SPAWN GOLEM
    =============================== */
    const golem = new Golem({
      scene: this,
      x: 800,
      y: 120
    });
    this.golems.push(golem);


    /* ===============================
       SPAWN STONES (FROM TILES)
    =============================== */
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

    console.log('✅ MainScene with Bears, TreeMan, ForestGuardian, GnollBrute, GnollShaman, Wolves, Mushrooms and Stones loaded');
  }

  update(time, delta) {
    if (!this.player) return;

    const playerDepth = this.player.y;
    this.player.setDepth(playerDepth);

    if (this.player.weapon) {
      this.player.weapon.setDepth(playerDepth + 100);
    }

    if (this.player.healthBar) {
      this.player.healthBar.setDepth(playerDepth + 200);
    }
    if (this.player.healthBarBg) {
      this.player.healthBarBg.setDepth(playerDepth + 200);
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

        if (itemType === 'blood') {
          this.pickupBlood();
        } else if (itemType === 'meat') {
          this.pickupMeat();
        } else if (itemType === 'stone') {
          this.pickupStone();
        } else if (itemType === 'wood') {
          this.pickupWood();
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
}
