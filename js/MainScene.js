import Phaser from 'phaser';
import Player from './Player';
import { CharacterTypes, getCharacterConfig } from './Character';
import { auth, updatePlayerState, onOtherPlayersChange, removePlayerState, updateGameState, onGameStateChange, sendEnemyKill, onEnemyKills, updatePlayerInRoom, leaveRoom } from './firebase';
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
import MobileControls from './MobileControls';

class GuestEnemyProxy {
  constructor(sprite, mpId, hp, scene, roomCode) {
    this.sprite = sprite;
    this.mpId = mpId;
    this.hp = hp;
    this.maxHp = hp;
    this.isDead = false;
    this._scene = scene;
    this._roomCode = roomCode;
  }
  get x() { return this.sprite?.x || 0; }
  get y() { return this.sprite?.y || 0; }
  getHitbox() {
    return new Phaser.Geom.Rectangle(this.x - 24, this.y - 24, 48, 48);
  }
  takeDamage(dmg) {
    if (this.isDead) return;
    this.hp -= dmg;
    const sp = this.sprite;
    if (sp?.active) {
      sp.setTint(0xff0000);
      this._scene.time.delayedCall(100, () => { if (sp?.active) sp.clearTint(); });
      // Blood puddle
      if (this._scene.textures.exists('blood2')) {
        const blood = this._scene.add.image(sp.x + Phaser.Math.Between(-10, 10), sp.y + 15, 'blood2')
          .setDepth(0).setScale(Phaser.Math.FloatBetween(0.2, 0.4));
        this._scene.tweens.add({ targets: blood, alpha: 0, duration: 5000, ease: 'Power2', onComplete: () => { try { blood.destroy(); } catch (_) {} } });
      }
    }
    if (this.hp <= 0) {
      this.isDead = true;
      this._scene._sessionKills++;
      sendEnemyKill(this._roomCode, this.mpId).catch(() => {});
      this._scene.dropLoot(this.x, this.y, 1, 'coin');
      if (sp?.active) {
        try { if (sp._hpGfx?.active) sp._hpGfx.destroy(); } catch (_) {}
        this._scene.tweens.add({
          targets: sp, alpha: 0, duration: 300,
          onComplete: () => { try { sp.destroy(); } catch (_) {} },
        });
      }
      this._scene.guestEnemies = this._scene.guestEnemies.filter(p => p !== this);
    }
  }
}

export default class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene');
    this.player = null;
    this._mpIdCounter = 0;
    this.guestEnemies = [];
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
    this.load.atlas('gate', 'assets/images/teleport/skill_3/gate.png', 'assets/images/teleport/skill_3/gate_atlas.json');
    this.load.animation('gate_anim', 'assets/images/teleport/skill_3/gate_anim.json');
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
      enemy.mpId = ++this._mpIdCounter;
      enemy.mpType = type;
      console.log(`👾 Spawned ${type} from gate!`);
    }
  }

  _createPlaceholderTextures() {
    if (this.textures.exists('health_potion')) return;
    const g = this.make.graphics({ add: false });

    // Common fragment — orange crystal diamond
    g.fillStyle(0xff8800);
    g.fillTriangle(16, 2, 30, 16, 16, 30); g.fillTriangle(16, 2, 2, 16, 16, 30);
    g.fillStyle(0xffcc44);
    g.fillTriangle(16, 7, 24, 16, 16, 24); g.fillTriangle(16, 7, 8, 16, 16, 24);
    g.generateTexture('frag_common', 32, 32); g.clear();

    // Rare fragment — purple crystal diamond with gold shine
    g.fillStyle(0x9900cc);
    g.fillTriangle(16, 0, 32, 16, 16, 32); g.fillTriangle(16, 0, 0, 16, 16, 32);
    g.fillStyle(0xdd44ff);
    g.fillTriangle(16, 5, 26, 16, 16, 26); g.fillTriangle(16, 5, 6, 16, 16, 26);
    g.fillStyle(0xffffff); g.fillTriangle(16, 5, 22, 14, 18, 10);
    g.generateTexture('frag_rare', 32, 32); g.clear();

    // Stone placeholder — gray circle
    g.fillStyle(0x999999);
    g.fillCircle(16, 16, 14);
    g.fillStyle(0x777777);
    g.fillCircle(12, 12, 6);
    g.generateTexture('stone', 32, 32); g.clear();

    // Wood placeholder — brown rectangle (sprite is always invisible in Tree.js)
    g.fillStyle(0x8B4513);
    g.fillRect(2, 2, 28, 28);
    g.generateTexture('wood', 32, 32); g.clear();

    g.destroy();
  }

  create() {
    this._createPlaceholderTextures();
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
    this._sessionKills = 0;
    this._sessionDamage = 0;
    this._sessionHeal = 0;
    this._sessionFrag = 0;
    this._sessionFragCommon = 0;
    this._sessionFragRare = 0;
    this._allPlayersDead = false;
    this._mpDeathOverlay = null;

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
    this._spawnTimer = this.time.addEvent({
      delay: 1500,
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
    this.guestEnemies = [];

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
      space: Phaser.Input.Keyboard.KeyCodes.SPACE
    });

    // Shooting is handled exclusively by the Space bar in Player.js update()

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
    this.mobileControls = new MobileControls(this, this.player);

    /* ===============================
       SPAWN CHESTS
    =============================== */
    this.time.delayedCall(15000, () => {
      this.spawnChest();
    });

    console.log('✅ MainScene with Bears, TreeMan, ForestGuardian, GnollBrute, GnollShaman, Wolves, Mushrooms, Chests and Stones loaded');

    this._initMultiplayer();
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

    // Smoothed velocity interpolation for other player sprites
    if (this._otherPlayerSprites) {
      Object.values(this._otherPlayerSprites).forEach(entry => {
        const { sprite, nameText, hpBg, hpBar } = entry;
        if (!sprite?.active || entry.prevAlive === false || entry._targetX === undefined) return;

        // Dead-reckoning: advance target between Firestore updates using last known velocity
        const staleness = Date.now() - (entry._lastUpdateAt || 0);
        if (staleness < 500 && (entry._vx || entry._vy)) {
          entry._targetX += entry._vx * delta / 16.67;
          entry._targetY += entry._vy * delta / 16.67;
        }

        const dist = Phaser.Math.Distance.Between(sprite.x, sprite.y, entry._targetX, entry._targetY);
        if (dist > 300) {
          sprite.setPosition(entry._targetX, entry._targetY);
        } else {
          const lerpT = 1 - Math.pow(0.5, delta / 80);
          sprite.x += (entry._targetX - sprite.x) * lerpT;
          sprite.y += (entry._targetY - sprite.y) * lerpT;
        }
        sprite.setDepth(sprite.y);
        const sx = sprite.x, sy = sprite.y;
        if (nameText?.active) nameText.setPosition(sx, sy - 38).setDepth(sy + 2);
        if (hpBg?.active) hpBg.setPosition(sx, sy - 28).setDepth(sy + 2);
        if (hpBar?.active) hpBar.setPosition(sx - 16, sy - 28).setDepth(sy + 3);
        // Weapon image follows sprite
        if (entry.weaponImg?.active && entry.prevAlive !== false) {
          const wFlip = sprite.flipX;
          const offX = wFlip ? -10 : 10;
          entry.weaponImg.setPosition(sx + offX, sy + 2);
          entry.weaponImg.setFlipX(wFlip);
          entry.weaponImg.setAngle(wFlip ? -(entry._weaponAngle || 0) : (entry._weaponAngle || 0));
          entry.weaponImg.setDepth(sy + 1);
        }
      });
    }

    // Move remote bullets + apply damage to host's real enemies
    if (this._remoteBullets?.length) {
      const dt_s = delta / 1000;
      const hostEnemyGroups = this._isHost ? [
        this.bears, this.wolves, this.treeMen, this.forestGuardians,
        this.gnollBrutes, this.gnollShamans, this.mushrooms, this.smallMushrooms, this.golems,
      ] : null;
      const guestEnemyProxies = !this._isHost ? Object.values(this._guestEnemyProxies || {}) : null;
      for (let i = this._remoteBullets.length - 1; i >= 0; i--) {
        const rb = this._remoteBullets[i];
        if (!rb.sprite?.active) { this._remoteBullets.splice(i, 1); continue; }
        const moved = Math.sqrt(rb.vx * rb.vx + rb.vy * rb.vy) * dt_s;
        rb.sprite.x += rb.vx * dt_s;
        rb.sprite.y += rb.vy * dt_s;
        rb.distLeft -= moved;

        // Host: check hit against real enemies
        if (hostEnemyGroups && rb.distLeft > 0) {
          outer: for (const group of hostEnemyGroups) {
            for (const enemy of (group || [])) {
              if (!enemy || enemy.isDead || !enemy.sprite?.active) continue;
              if (rb.hitIds.has(enemy.mpId)) continue;
              const d = Phaser.Math.Distance.Between(rb.sprite.x, rb.sprite.y, enemy.sprite.x, enemy.sprite.y);
              if (d < 28) {
                rb.hitIds.add(enemy.mpId);
                enemy.takeDamage(rb.dmg);
                this.spawnBloodEffect(rb.sprite.x, rb.sprite.y, rb.vx, rb.vy);
                rb.distLeft = 0;
                break outer;
              }
            }
          }
        }

        // Guest: check hit against guest enemy proxies (host's bullets)
        if (guestEnemyProxies && rb.distLeft > 0) {
          for (const proxy of guestEnemyProxies) {
            if (!proxy || proxy.isDead || !proxy.sprite?.active) continue;
            if (rb.hitIds.has(proxy.mpId)) continue;
            const d = Phaser.Math.Distance.Between(rb.sprite.x, rb.sprite.y, proxy.sprite.x, proxy.sprite.y);
            if (d < 28) {
              rb.hitIds.add(proxy.mpId);
              proxy.takeDamage(rb.dmg);
              this.spawnBloodEffect(rb.sprite.x, rb.sprite.y, rb.vx, rb.vy);
              rb.distLeft = 0;
              break;
            }
          }
        }

        if (rb.distLeft <= 0) { try { rb.sprite.destroy(); } catch (_) {} this._remoteBullets.splice(i, 1); }
      }
    }

    // Lerp guest enemy sprites toward host-broadcast target positions
    if (this._guestEnemySprites) {
      Object.values(this._guestEnemySprites).forEach(sp => {
        if (!sp?.active || sp._targetX === undefined) return;

        // Dead-reckoning: advance target by last known velocity between host broadcasts
        const staleness = Date.now() - (sp._lastUpdateAt || 0);
        if (staleness < 1000 && (sp._vx || sp._vy)) {
          sp._targetX += sp._vx * delta / 16.67;
          sp._targetY += sp._vy * delta / 16.67;
        }

        // Delta-time lerp — half-life 30ms for snappier enemy movement
        const dist = Phaser.Math.Distance.Between(sp.x, sp.y, sp._targetX, sp._targetY);
        if (dist > 300) {
          sp.setPosition(sp._targetX, sp._targetY);
        } else {
          const lerpT = 1 - Math.pow(0.5, delta / 30);
          sp.x += (sp._targetX - sp.x) * lerpT;
          sp.y += (sp._targetY - sp.y) * lerpT;
        }

        sp.setDepth(sp.y);
        if (sp._hpGfx?.active && sp._proxy) {
          const pct = Math.max(0, sp._proxy.hp / Math.max(sp._proxy.maxHp, 1));
          const bx = sp.x - 15, by = sp.y - 20;
          sp._hpGfx.clear();
          sp._hpGfx.setDepth(sp.y + 10);
          sp._hpGfx.fillStyle(0x000000, 0.75);
          sp._hpGfx.fillRect(bx, by, 30, 5);
          sp._hpGfx.fillStyle(0xff2222, 1);
          sp._hpGfx.fillRect(bx, by, pct * 30, 5);
        }

        // Guest-side melee damage: enemy sprite close to local player
        if (this.player && !this.player.isDead && sp._dmg) {
          const dist = Phaser.Math.Distance.Between(sp.x, sp.y, this.player.x, this.player.y);
          if (dist < 48) {
            const now = Date.now();
            if (now - (sp._lastHitPlayer || 0) >= (sp._cooldown || 1000)) {
              sp._lastHitPlayer = now;
              if (this.player.takeDamage) this.player.takeDamage(sp._dmg);
            }
          }
        }
      });
    }

    if (!this._allPlayersDead) {
      this.bears.forEach(bear => { bear.update(); });
      this.treeMen.forEach(treeMan => { treeMan.update(); });
      this.forestGuardians.forEach(forestGuardian => { forestGuardian.update(); });
      this.gnollBrutes.forEach(gnollBrute => { gnollBrute.update(); });
      this.gnollShamans.forEach(gnollShaman => { gnollShaman.update(time, delta); });
      this.wolves.forEach(wolf => { wolf.update(); });
      this.mushrooms.forEach(mushroom => { mushroom.update(); });
      this.smallMushrooms.forEach(smallMushroom => { smallMushroom.update(); });
      this.golems.forEach(golem => { golem.update(); });
      this.stones.forEach(stone => { stone.update(); });
      this.trees.forEach(tree => { tree.update(); });
      this.chests.forEach(chest => { chest.update(); });

      if (this.summonedMonsters && this.summonedMonsters.length > 0) {
        this.summonedMonsters = this.summonedMonsters.filter(summon => {
          if (!summon || summon.isDead) {
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

        if (itemType === 'diamond') {
          this.pickupDiamond();
        } else if (itemType === 'blood') {
          this.pickupBlood();
        } else if (itemType === 'frag_common') {
          this.pickupFragCommon();
        } else if (itemType === 'frag_rare') {
          this.pickupFragRare();
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
    this._sessionHeal += actualHeal;
    console.log(`💊 Picked up blood! Healed ${actualHeal} HP`);

    this.player.setTint(0x00ff00);
    this.time.delayedCall(150, () => {
      this.player.clearTint();
    });
  }

  pickupFragCommon() {
    this._sessionFrag++;
    this._sessionFragCommon++;
    if (this.resourceUI) this.resourceUI.updateResources();
    this.player.setTint(0xff8800);
    this.time.delayedCall(200, () => this.player.clearTint());
  }

  pickupFragRare() {
    this._sessionFrag++;
    this._sessionFragRare++;
    if (this.resourceUI) this.resourceUI.updateResources();
    this.player.setTint(0xcc44ff);
    this.time.delayedCall(200, () => this.player.clearTint());
  }

  pickupDiamond() {
    if (!this.player.diamondCount) this.player.diamondCount = 0;
    this.player.diamondCount += 1;
    if (this.resourceUI) this.resourceUI.updateResources();
    this.player.setTint(0x00ffff);
    this.time.delayedCall(150, () => this.player.clearTint());
  }

  pickupCoin() {
    if (!this.player.coinCount) this.player.coinCount = 0;
    this.player.coinCount += 1;
    if (this.resourceUI) this.resourceUI.updateResources();
    this.player.setTint(0xffff00);
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

      const scaleMap = { coin: 0.15, blood: 0.06, frag_common: 0.7, frag_rare: 0.75 };
      item.setScale(scaleMap[type] ?? 0.8);

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

  spawnRemoteGrenade(fromX, fromY, s) {
    const tex = s.tex || 'Grenade';
    if (!this.textures.exists(tex)) return;
    const ox = s.startX ?? fromX;
    const oy = s.startY ?? fromY;
    const grenade = this.add.sprite(ox, oy, tex).setScale(0.6).setDepth(oy + 50);
    const targetX = s.targetX ?? ox;
    const targetY = s.targetY ?? oy;
    const arcHeight = s.arcHeight || 100;
    const duration = s.duration || 700;
    this.tweens.addCounter({
      from: 0, to: 1, duration,
      onUpdate: (tween) => {
        const t = tween.getValue();
        const cx = ox + (targetX - ox) * t;
        const cy = oy + (targetY - oy) * t;
        grenade.setPosition(cx, cy - 4 * arcHeight * t * (1 - t));
        grenade.angle += 15;
      },
      onComplete: () => {
        const ex = grenade.x, ey = grenade.y;
        try { grenade.destroy(); } catch (_) {}
        const wKey = s.weaponKey || 'Grenade';
        const isFireBomb = wKey === 'Gasoline_Bomb' || wKey === 'Electric_Bomb';
        if (isFireBomb) {
          // Glass break effect
          if (this.textures.exists('effect_5')) {
            const burst = this.add.sprite(ex, ey, 'effect_5').setScale(1.2).setDepth(ey + 100);
            if (this.anims.exists('effect_5')) {
              burst.play({ key: 'effect_5', repeat: 0 });
              burst.once('animationcomplete', () => { try { burst.destroy(); } catch (_) {} });
            } else {
              this.time.delayedCall(1500, () => { try { burst.destroy(); } catch (_) {} });
            }
          }
          this.spawnRemoteFireZone(ex, ey, wKey);
        } else {
          // Regular grenade explosion
          if (this.textures.exists('effect_4')) {
            const explosion = this.add.sprite(ex, ey, 'effect_4').setScale(1.5).setDepth(ey + 100);
            if (this.anims.exists('effect_4')) {
              explosion.play('effect_4');
              explosion.once('animationcomplete', () => { try { explosion.destroy(); } catch (_) {} });
            } else {
              this.time.delayedCall(1000, () => { try { explosion.destroy(); } catch (_) {} });
            }
          }
          // AoE damage — host side only
          if (!this._isHost) return;
          const aoeRadius = 80;
          const aoeDamage = 120;
          const groups = [
            this.bears, this.wolves, this.treeMen, this.forestGuardians,
            this.gnollBrutes, this.gnollShamans, this.mushrooms, this.smallMushrooms, this.golems,
          ];
          for (const group of groups) {
            for (const enemy of (group || [])) {
              if (!enemy || enemy.isDead || !enemy.sprite?.active) continue;
              const d = Phaser.Math.Distance.Between(ex, ey, enemy.sprite.x, enemy.sprite.y);
              if (d <= aoeRadius) enemy.takeDamage(aoeDamage);
            }
          }
        }
      }
    });
  }

  _applyBurnToSprite(targetSprite, fireEffect) {
    if (!targetSprite?.active || targetSprite._isBurning) return;
    const bodyEffectKey = fireEffect === 'effect_8' ? 'effect_9' : fireEffect;
    if (!this.textures.exists(bodyEffectKey)) return;
    targetSprite._isBurning = true;
    const burnSprite = this.add.sprite(targetSprite.x, targetSprite.y - 10, bodyEffectKey)
      .setScale(bodyEffectKey === 'effect_9' ? 0.8 : 1.2)
      .setDepth(targetSprite.depth + 1);
    if (this.anims.exists(bodyEffectKey)) burnSprite.play(bodyEffectKey);
    const onUpdate = () => {
      if (!targetSprite?.active || !burnSprite?.active) {
        this.events.off('update', onUpdate);
        try { if (burnSprite?.active) burnSprite.destroy(); } catch (_) {}
        return;
      }
      burnSprite.setPosition(targetSprite.x, targetSprite.y - 10);
      burnSprite.setDepth(targetSprite.depth + 1);
    };
    this.events.on('update', onUpdate);
    this.time.delayedCall(7000, () => {
      this.events.off('update', onUpdate);
      try { if (burnSprite?.active) burnSprite.destroy(); } catch (_) {}
      if (targetSprite) targetSprite._isBurning = false;
    });
  }

  spawnRemoteFireZone(x, y, weaponKey) {
    const fireEffect = weaponKey === 'Electric_Bomb' ? 'effect_8' : 'effect_6';
    if (!this.textures.exists(fireEffect)) return;
    const fireRadius = 90;
    const damagePerTick = 10;
    const duration = 7000;
    const tickInterval = 500;

    const fireSprites = [];
    for (let i = 0; i < 10; i++) {
      const ox = (Math.random() - 0.5) * 80;
      const oy = (Math.random() - 0.5) * 80;
      const fire = this.add.sprite(x + ox, y + oy, fireEffect)
        .setDepth(y + oy)
        .setScale(fireEffect === 'effect_8' ? 0.5 + Math.random() * 0.3 : 1.8 + Math.random() * 0.7);
      if (this.anims.exists(fireEffect)) fire.play(fireEffect);
      fireSprites.push(fire);
    }

    const startTime = this.time.now;
    const zoneTimer = this.time.addEvent({
      delay: tickInterval,
      repeat: Math.floor(duration / tickInterval),
      callback: () => {
        const elapsed = this.time.now - startTime;
        if (this._isHost) {
          const groups = [
            this.bears, this.wolves, this.treeMen, this.forestGuardians,
            this.gnollBrutes, this.gnollShamans, this.mushrooms, this.smallMushrooms, this.golems,
          ];
          for (const group of groups) {
            for (const enemy of (group || [])) {
              if (!enemy || enemy.isDead || !enemy.sprite?.active) continue;
              if (Phaser.Math.Distance.Between(x, y, enemy.sprite.x, enemy.sprite.y) <= fireRadius) {
                enemy.takeDamage(damagePerTick);
                this._applyBurnToSprite(enemy.sprite, fireEffect);
              }
            }
          }
        }
        if (!this._isHost && this.guestEnemies?.length) {
          for (const proxy of this.guestEnemies) {
            if (!proxy || proxy.isDead || !proxy.sprite?.active) continue;
            if (Phaser.Math.Distance.Between(x, y, proxy.sprite.x, proxy.sprite.y) <= fireRadius) {
              proxy.takeDamage(damagePerTick);
              this._applyBurnToSprite(proxy.sprite, fireEffect);
            }
          }
        }
        if (elapsed >= duration) {
          fireSprites.forEach(s => {
            this.tweens.add({ targets: s, alpha: 0, duration: 500, onComplete: () => { try { s.destroy(); } catch (_) {} } });
          });
          zoneTimer.remove();
        }
      }
    });
  }

  spawnMuzzleFlash(x, y, rad) {
    if (!this.textures.exists('effect_7')) return;
    const flash = this.add.sprite(x, y, 'effect_7')
      .setScale(0.5).setAngle(Phaser.Math.RadToDeg(rad)).setDepth(y + 100);
    if (this.anims.exists('shoot')) {
      flash.play('shoot');
      flash.once('animationcomplete', () => { try { flash.destroy(); } catch (_) {} });
    } else {
      this.time.delayedCall(200, () => { try { flash.destroy(); } catch (_) {} });
    }
  }

  spawnBloodEffect(x, y, vx, vy) {
    if (!this.textures.exists('effect_3')) return;
    const blood = this.add.sprite(x, y, 'effect_3', 'blood15')
      .setScale(0.4).setDepth(y + 5).setFlipX((vx || 0) < 0);
    if (this.anims.exists('blood')) {
      blood.play('blood');
      blood.once('animationcomplete', () => { try { blood.destroy(); } catch (_) {} });
    } else {
      this.time.delayedCall(300, () => { try { blood.destroy(); } catch (_) {} });
    }
  }

  getNearestPlayer(fromX, fromY) {
    let nearest = null;
    let nearestDist = Infinity;
    if (this.player && !this.player.isDead) {
      nearestDist = Phaser.Math.Distance.Between(fromX, fromY, this.player.x, this.player.y);
      nearest = this.player;
    }
    if (this._otherPlayerSprites) {
      Object.values(this._otherPlayerSprites).forEach(entry => {
        if (!entry.sprite?.active || entry.prevAlive === false) return;
        const dist = Phaser.Math.Distance.Between(fromX, fromY, entry.sprite.x, entry.sprite.y);
        if (dist < nearestDist) { nearestDist = dist; nearest = entry.sprite; }
      });
    }
    return nearest || this.player;
  }

  _initMultiplayer() {
    const roomCode = this.registry.get('roomCode');
    if (!roomCode) return;
    const user = auth.currentUser;
    if (!user) return;

    const isHost = this.registry.get('isMultiplayerHost') !== false;
    this._isHost = isHost;
    const selectedCharKey = this.registry.get('selectedCharacter') || 'player_1';
    this._otherPlayerSprites = {};
    this._guestEnemySprites = {};
    this._pendingShots = [];
    this._shotSeq = 0;

    // Mark player as in-game (merge preserves displayName, characterKey, isHost from lobby)
    const _roomUser = auth.currentUser;
    if (_roomUser) updatePlayerInRoom(roomCode, _roomUser.uid, { inGame: true }).catch(() => {});

    // Sync own player position every 200ms (reduced from 100ms to avoid Firestore quota)
    this._lastSentX = null;
    this._lastSentY = null;
    this._lastSentHealth = null;
    this._lastSentAlive = null;
    this._syncTimer = this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        if (!this.player || !this.player.active) return;
        const newX = Math.round(this.player.x);
        const newY = Math.round(this.player.y);
        const newHealth = this.player.health || 0;
        const newAlive = !this.player.isDead;
        const hasPendingShots = this._pendingShots.length > 0;
        if (hasPendingShots) this._shotSeq++;
        const hasChanged = hasPendingShots
          || newX !== this._lastSentX
          || newY !== this._lastSentY
          || newHealth !== this._lastSentHealth
          || newAlive !== this._lastSentAlive;
        if (!hasChanged) return;
        this._lastSentX = newX;
        this._lastSentY = newY;
        this._lastSentHealth = newHealth;
        this._lastSentAlive = newAlive;
        const vel = this.player.body?.velocity || { x: 0, y: 0 };
        const state = {
          x: newX,
          y: newY,
          vx: vel.x,
          vy: vel.y,
          flipX: this.player.flipX,
          animKey: this.player.anims?.currentAnim?.key || '',
          weaponKey: this.player.weaponSlots?.[this.player.activeSlot] || null,
          weaponAngle: this.player.weapon?.angle || 0,
          characterKey: selectedCharKey,
          displayName: user.displayName || 'Player',
          alive: !this.player.isDead,
          health: this.player.health || 0,
          maxHealth: this.player.maxHealth || 100,
          updatedAt: Date.now(),
          shots: this._pendingShots.splice(0),
          shotsSeq: this._shotSeq,
        };
        updatePlayerState(roomCode, user.uid, state).catch(err => console.warn('[MP] playerState write failed:', err?.code));
      },
    });

    // Listen for other players' positions
    this._otherPlayersUnsub = onOtherPlayersChange(roomCode, user.uid, (others) => {
      if (!this.scene.isActive('MainScene')) return;
      const now = Date.now();
      const activeUids = new Set(others.map(p => p.uid));
      Object.keys(this._otherPlayerSprites).forEach(uid => {
        if (!activeUids.has(uid)) {
          const { sprite, nameText, weaponImg } = this._otherPlayerSprites[uid];
          try { if (sprite.active) sprite.destroy(); } catch (_) {}
          try { if (nameText.active) nameText.destroy(); } catch (_) {}
          try { if (weaponImg?.active) weaponImg.destroy(); } catch (_) {}
          delete this._otherPlayerSprites[uid];
        }
      });
      others.forEach(p => {
        if (!p.x || now - (p.updatedAt || 0) > 8000) return;
        if (!this._otherPlayerSprites[p.uid]) {
          const sprite = this.add.sprite(p.x, p.y, p.characterKey || 'player_1').setDepth(p.y);
          const nameText = this.add.text(p.x, p.y - 38, p.displayName || '?', {
            fontSize: '8px', color: '#ffff88', stroke: '#000000', strokeThickness: 3,
          }).setOrigin(0.5).setDepth(p.y + 2);
          const hpBg = this.add.rectangle(p.x, p.y - 28, 32, 4, 0x000000).setDepth(p.y + 2);
          const hpBar = this.add.rectangle(p.x - 16, p.y - 28, 32, 4, 0x00ff00).setOrigin(0, 0.5).setDepth(p.y + 3);
          this._otherPlayerSprites[p.uid] = { sprite, nameText, hpBg, hpBar, weaponImg: null, _weaponKey: null, prevAlive: true, _targetX: p.x, _targetY: p.y, _lastShotsSeq: -1 };
        }

        const entry = this._otherPlayerSprites[p.uid];
        const { sprite, nameText, hpBg, hpBar } = entry;
        const isDead = p.alive === false;

        // Handle death transition
        if (isDead && entry.prevAlive !== false) {
          entry.prevAlive = false;
          this._checkAllPlayersDead();
          sprite.setTexture('ghost').setScale(0.3).stop();
          if (entry.floatTween) entry.floatTween.stop();
          entry.floatTween = this.tweens.add({
            targets: sprite, y: p.y - 10,
            duration: 800, ease: 'Sine.easeInOut', yoyo: true, repeat: -1,
          });
          hpBg.setVisible(false);
          hpBar.setVisible(false);
          if (entry.weaponImg?.active) entry.weaponImg.setVisible(false);
        } else if (!isDead && entry.prevAlive === false) {
          entry.prevAlive = true;
          sprite.setTexture(p.characterKey || 'player_1').setScale(1);
          if (entry.floatTween) { entry.floatTween.stop(); entry.floatTween = null; }
          hpBg.setVisible(true);
          hpBar.setVisible(true);
          if (entry.weaponImg?.active) entry.weaponImg.setVisible(true);
        }

        // Update lerp target + dead-reckoning data
        if (!isDead) {
          entry._targetX = p.x;
          entry._targetY = p.y;
          entry._vx = p.vx || 0;
          entry._vy = p.vy || 0;
          entry._lastUpdateAt = now;
          entry._weaponAngle = p.weaponAngle || 0;
          sprite.setFlipX(p.flipX || false);
          if (p.animKey && this.anims.exists(p.animKey) && sprite.anims?.currentAnim?.key !== p.animKey) {
            sprite.play(p.animKey, true);
          }
          // Create or swap weapon image when weaponKey changes
          if (p.weaponKey && p.weaponKey !== entry._weaponKey && this.textures.exists(p.weaponKey)) {
            try { if (entry.weaponImg?.active) entry.weaponImg.destroy(); } catch (_) {}
            entry.weaponImg = this.add.image(sprite.x, sprite.y, p.weaponKey)
              .setScale(0.5).setOrigin(0.3, 0.7).setDepth(sprite.depth + 1);
            entry._weaponKey = p.weaponKey;
          }
        } else {
          sprite.setX(p.x).setDepth(p.y);
        }

        nameText.setColor(isDead ? '#aaaaaa' : '#ffff88');

        // Health bar (width/color only — position follows sprite in update())
        if (!isDead) {
          const pct = Math.max(0, (p.health || 0) / (p.maxHealth || 100));
          hpBar.width = pct * 32;
          hpBar.setFillStyle(pct > 0.5 ? 0x00ff00 : pct > 0.25 ? 0xffaa00 : 0xff3300);
        }

        // Spawn remote bullets — only when alive, shots non-empty, AND shotsSeq is new
        const incomingShotsSeq = p.shotsSeq ?? -1;
        if (!isDead && p.shots?.length && incomingShotsSeq !== entry._lastShotsSeq) {
          entry._lastShotsSeq = incomingShotsSeq;
          if (!this._remoteBullets) this._remoteBullets = [];
          p.shots.forEach(s => {
            const startX = sprite.x, startY = sprite.y;
            if (s.type === 'grenade') {
              this.spawnRemoteGrenade(startX, startY, s);
              return;
            }
            const b = this.add.sprite(startX, startY, s.tex || 'bullet')
              .setScale(0.4).setAngle(s.angle || 0).setDepth(startY + 50);
            this._remoteBullets.push({
              sprite: b,
              vx: Math.cos(s.rad) * (s.speed || 1000),
              vy: Math.sin(s.rad) * (s.speed || 1000),
              distLeft: s.range || 600,
              dmg: s.dmg || 25,
              hitIds: new Set(),
            });
            this.spawnMuzzleFlash(startX + Math.cos(s.rad) * 20, startY + Math.sin(s.rad) * 20, s.rad);
          });
        }
      });
    });

    if (isHost) {
      // Host: broadcast all enemy states every 250ms
      this._enemyBroadcastTimer = this.time.addEvent({
        delay: 250,
        loop: true,
        callback: () => {
          const allEnemyGroups = [
            this.bears, this.wolves, this.treeMen, this.forestGuardians,
            this.gnollBrutes, this.gnollShamans, this.mushrooms, this.smallMushrooms, this.golems,
          ];
          const enemies = [];
          allEnemyGroups.forEach(group => {
            group.forEach(e => {
              if (!e || e.isDead || !e.sprite || !e.sprite.active) return;
              enemies.push({
                id: e.mpId,
                t: e.mpType || '',
                x: Math.round(e.sprite.x),
                y: Math.round(e.sprite.y),
                vx: e.sprite.body?.velocity?.x || 0,
                vy: e.sprite.body?.velocity?.y || 0,
                flipX: e.sprite.flipX,
                animKey: e.sprite.anims?.currentAnim?.key || '',
                hp: Math.round(e.health || 100),
                maxHp: e.maxHealth || 100,
                dmg: e.damageAmount || 10,
                cd: e.damageCooldown || 1000,
              });
            });
          });
          updateGameState(roomCode, { enemies, updatedAt: Date.now() }).catch(err => console.warn('[MP] gameState write failed:', err?.code));
        },
      });

      // Listen for guest kill events and apply them
      this._killsUnsub = onEnemyKills(roomCode, (mpId) => {
        if (!this.scene.isActive('MainScene')) return;
        const allGroups = [
          this.bears, this.wolves, this.treeMen, this.forestGuardians,
          this.gnollBrutes, this.gnollShamans, this.mushrooms, this.smallMushrooms, this.golems,
        ];
        for (const group of allGroups) {
          const enemy = group.find(e => e && e.mpId === mpId && !e.isDead);
          if (enemy) { enemy.takeDamage(9999); break; }
        }
      });
    } else {
      // Guest: disable own spawn timer, render enemies from host
      if (this._spawnTimer) { this._spawnTimer.remove(); this._spawnTimer = null; }

      this._gameStateUnsub = onGameStateChange(roomCode, (state) => {
        if (!this.scene.isActive('MainScene')) return;
        const enemies = state.enemies || [];
        const activeIds = new Set(enemies.map(e => String(e.id)));

        // Remove sprites for dead/gone enemies
        Object.keys(this._guestEnemySprites).forEach(id => {
          if (!activeIds.has(id)) {
            const _sp = this._guestEnemySprites[id];
            try { if (_sp?._hpGfx?.active) _sp._hpGfx.destroy(); } catch (_) {}
            try { _sp.destroy(); } catch (_) {}
            delete this._guestEnemySprites[id];
            const proxy = this._guestEnemyProxies?.[id];
            if (proxy) {
              proxy.isDead = true;
              this.guestEnemies = this.guestEnemies.filter(p => p !== proxy);
              delete this._guestEnemyProxies[id];
            }
          }
        });

        // Create/update enemy sprites
        this._guestEnemyProxies = this._guestEnemyProxies || {};
        enemies.forEach(e => {
          try {
            const key = String(e.id);
            if (!this._guestEnemySprites[key]) {
              // Map mpType to texture key (same as spawn pool names)
              const texMap = {
                bear: 'bear', treeman: 'treeman', forestguardian: 'forest_guardian',
                gnollbrute: 'gnoll_brute', gnollshaman: 'gnoll_shaman',
                wolf: 'wolf', mushroom: 'mushroom', smallmushroom: 'small_mushroom',
                golem: 'golem',
              };
              const texKey = (e.t && texMap[e.t]) ? texMap[e.t] : (e.textureKey || 'bear');
              const sp = this.add.sprite(e.x, e.y, texKey).setDepth(e.y);
              sp._targetX = e.x;
              sp._targetY = e.y;
              sp._hpGfx = this.add.graphics().setDepth(e.y + 10);
              sp._dmg = e.dmg || 10;
              sp._cooldown = e.cd || e.cooldown || 1000;
              sp._lastHitPlayer = 0;
              this._guestEnemySprites[key] = sp;
              const proxy = new GuestEnemyProxy(sp, e.id, e.hp || 100, this, roomCode);
              proxy.maxHp = e.maxHp || e.hp || 100;
              sp._proxy = proxy;
              this._guestEnemyProxies[key] = proxy;
              this.guestEnemies.push(proxy);
            }
            const sp = this._guestEnemySprites[key];
            sp._lastUpdateAt = Date.now();
            sp._targetX = e.x;
            sp._targetY = e.y;
            sp._vx = e.vx || 0;
            sp._vy = e.vy || 0;
            sp.setFlipX(e.flipX || false);
            if (e.animKey && this.anims.exists(e.animKey) && sp.anims?.currentAnim?.key !== e.animKey) {
              sp.play(e.animKey, true);
            }
            const proxy = this._guestEnemyProxies[key];
            if (proxy && !proxy.isDead && e.hp !== undefined) {
              proxy.hp = Math.min(proxy.hp, e.hp);
              if (e.maxHp) proxy.maxHp = e.maxHp;
            }
          } catch (err) {
            console.warn('[Guest] enemy sprite error id=' + e.id, err);
          }
        });
      });
    }

    this.events.once('shutdown', () => this._cleanupMultiplayer(roomCode, user.uid));
    this.events.once('destroy', () => this._cleanupMultiplayer(roomCode, user.uid));
  }

  _checkAllPlayersDead() {
    if (!this.player?.isDead) return;
    const others = this._otherPlayerSprites || {};
    if (Object.keys(others).length === 0) return;
    if (Object.values(others).every(e => e.prevAlive === false)) {
      this._allPlayersDead = true;
    }
  }

  _showDeathOverlay() {
    if (this._mpDeathOverlay) return;
    const isMultiplayer = !!this.registry.get('roomCode');
    if (isMultiplayer) {
      this._checkAllPlayersDead();
    } else {
      this._allPlayersDead = true;
      if (this._spawnTimer) this._spawnTimer.paused = true;
    }

    // Commit session economy gains — only on death
    Economy.addCoins(this.player?.coinCount || 0);
    Economy.addDiamonds(this.player?.diamondCount || 0);
    Economy.addFragCommon(this._sessionFragCommon);
    Economy.addFragRare(this._sessionFragRare);
    Economy.forceSave(); // Save updated values to cloud immediately
    const { width, height } = this.scale;
    const D = 25000;
    const sf = 0;

    const dim = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.72).setDepth(D).setScrollFactor(sf);

    // Panel
    const pW = 300, pH = 248;
    const pX = (width - pW) / 2, pY = (height - pH) / 2 - 10;
    const bg = this.add.graphics().setDepth(D + 1).setScrollFactor(sf);
    bg.fillStyle(0x1a2533, 0.97);
    bg.fillRoundedRect(pX, pY, pW, pH, 12);
    bg.lineStyle(2, 0x76c442, 1);
    bg.strokeRoundedRect(pX, pY, pW, pH, 12);

    // Title
    const title = this.add.text(width / 2, pY + 18, '💀 KẾT QUẢ TRẬN ĐẤU', {
      fontSize: '13px', fontStyle: 'bold', color: '#ff4444',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(D + 2).setScrollFactor(sf);

    const subLabel = isMultiplayer ? 'Trận đấu vẫn tiếp tục...' : 'Bạn đã bị đánh bại!';
    const sub = this.add.text(width / 2, pY + 34, subLabel, {
      fontSize: '9px', color: '#888888',
    }).setOrigin(0.5).setDepth(D + 2).setScrollFactor(sf);

    // Divider
    const div = this.add.graphics().setDepth(D + 2).setScrollFactor(sf);
    div.lineStyle(1, 0x4a5a6a, 0.8);
    div.lineBetween(pX + 12, pY + 44, pX + pW - 12, pY + 44);

    // Stats
    const stats = [
      { icon: '💀', label: 'Quái diệt được', value: (this._sessionKills || 0).toLocaleString() },
      { icon: '⚔️', label: 'Damage gây ra',  value: (this._sessionDamage || 0).toLocaleString() },
      { icon: '💊', label: 'Máu đã hồi',      value: (this._sessionHeal || 0).toLocaleString() },
      { icon: '🪙', label: 'Xu đã nhặt',      value: (this.player?.coinCount || 0).toLocaleString() },
      { icon: '💎', label: 'Kim cương nhặt',  value: (this.player?.diamondCount || 0).toLocaleString() },
      { icon: '🔩', label: 'Mảnh đã nhặt',    value: (this._sessionFrag || 0).toLocaleString() },
    ];

    const statObjs = [];
    stats.forEach((s, i) => {
      const rowY = pY + 56 + i * 24;
      const lbl = this.add.text(pX + 16, rowY, `${s.icon} ${s.label}`, {
        fontSize: '10px', color: '#cccccc',
      }).setDepth(D + 2).setScrollFactor(sf);
      const val = this.add.text(pX + pW - 16, rowY, s.value, {
        fontSize: '10px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(1, 0).setDepth(D + 2).setScrollFactor(sf);
      statObjs.push(lbl, val);
    });

    // Buttons
    const btnY = pY + pH - 34;
    const makeBtn = (cx, label, color, hoverColor, onClick) => {
      const bW = 120, bH = 28;
      const g = this.add.graphics().setDepth(D + 2).setScrollFactor(sf);
      g.fillStyle(color, 1);
      g.fillRoundedRect(cx - bW / 2, btnY - bH / 2, bW, bH, 7);
      const t = this.add.text(cx, btnY, label, {
        fontSize: '11px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(D + 3).setScrollFactor(sf);
      const hit = this.add.rectangle(cx, btnY, bW, bH, 0, 0)
        .setDepth(D + 4).setScrollFactor(sf).setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => { g.clear(); g.fillStyle(hoverColor, 1); g.fillRoundedRect(cx - bW / 2, btnY - bH / 2, bW, bH, 7); });
      hit.on('pointerout',  () => { g.clear(); g.fillStyle(color, 1);      g.fillRoundedRect(cx - bW / 2, btnY - bH / 2, bW, bH, 7); });
      hit.on('pointerdown', onClick);
      return [g, t, hit];
    };

    const btn1Label = isMultiplayer ? '🏠 Về sảnh'   : '🔄 Chơi lại';
    const btn2Label = isMultiplayer ? '🚪 Thoát game' : '🏠 Menu';
    const btn1Action = isMultiplayer
      ? () => {
          // Return to lobby — keep player in room, mark inGame false
          const _u = auth.currentUser;
          const _rc = this.registry.get('roomCode');
          if (_u && _rc) updatePlayerInRoom(_rc, _u.uid, { inGame: false }).catch(() => {});
          this.registry.set('returnToLobbyCode', _rc);
          this.scene.stop('MainScene');
          this.scene.start('MenuScene');
        }
      : () => { this.scene.stop('MainScene'); this.scene.start('MainScene'); };
    const btn2Action = isMultiplayer
      ? () => {
          // Quit game — leave room entirely
          const _u = auth.currentUser;
          const _rc = this.registry.get('roomCode');
          if (_u && _rc) leaveRoom(_rc, _u.uid).catch(() => {});
          this.registry.remove('roomCode');
          this.registry.remove('isMultiplayerHost');
          this.scene.stop('MainScene');
          this.scene.start('MenuScene');
        }
      : () => { this.scene.stop('MainScene'); this.scene.start('MenuScene'); };

    const btn1 = makeBtn(width / 2 - 68, btn1Label, 0x1e6b3e, 0x28a85c, btn1Action);
    const btn2 = makeBtn(width / 2 + 68, btn2Label, 0x7f1e1e, 0xb03030, btn2Action);

    this._mpDeathOverlay = [dim, bg, title, sub, div, ...statObjs, ...btn1, ...btn2];
  }

  _cleanupMultiplayer(roomCode, uid) {
    if (this._syncTimer) { this._syncTimer.remove(); this._syncTimer = null; }
    if (this._enemyBroadcastTimer) { this._enemyBroadcastTimer.remove(); this._enemyBroadcastTimer = null; }
    if (this._otherPlayersUnsub) { this._otherPlayersUnsub(); this._otherPlayersUnsub = null; }
    if (this._gameStateUnsub) { this._gameStateUnsub(); this._gameStateUnsub = null; }
    if (this._killsUnsub) { this._killsUnsub(); this._killsUnsub = null; }
    if (this._guestEnemyProxies) { this._guestEnemyProxies = null; }
    this.guestEnemies = [];
    if (this._otherPlayerSprites) {
      Object.values(this._otherPlayerSprites).forEach(entry => {
        try { if (entry.floatTween) entry.floatTween.stop(); } catch (_) {}
        try { if (entry.sprite?.active) entry.sprite.destroy(); } catch (_) {}
        try { if (entry.nameText?.active) entry.nameText.destroy(); } catch (_) {}
        try { if (entry.hpBg?.active) entry.hpBg.destroy(); } catch (_) {}
        try { if (entry.hpBar?.active) entry.hpBar.destroy(); } catch (_) {}
      });
      this._otherPlayerSprites = null;
    }
    if (this._guestEnemySprites) {
      Object.values(this._guestEnemySprites).forEach(sp => { try { sp.destroy(); } catch (_) {} });
      this._guestEnemySprites = null;
    }
    removePlayerState(roomCode, uid).catch(() => {});
    this.registry.remove('roomCode');
    this.registry.remove('isMultiplayerHost');
  }
}
