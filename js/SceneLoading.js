import Phaser from 'phaser';

export default class SceneLoading extends Phaser.Scene {
    constructor() {
        super('SceneLoading');
    }

    preload() {
        // Load background first (no progress bar yet)
        this.load.image('loading_bg', 'assets/images/inventory/background_load.png');

        // Use a small loader to wait for background
        this.load.once('complete', () => {
            this.createLoadingUI();
            this.loadFullAssets(); // Start loading everything else
        });
        this.load.start();
    }

    loadFullAssets() {
        // -----------------------------------
        // LOAD ALL GAME ASSETS HERE (MANUALLY TO AVOID CIRCULAR DEPS)
        // -----------------------------------

        // Player 1
        this.load.atlas('player_1', 'assets/images/player_1/player_1.png', 'assets/images/player_1/player_1_atlas.json');
        this.load.animation('player_1_anim', 'assets/images/player_1/player_1_anim.json');

        // 2. Weapons & Effects (Manually copied from Player.js preload)
        this.load.image('m4a1', 'assets/images/weapons/M4A1.png');
        this.load.image('ammo_pickup', 'assets/images/weapons/ammo_pickup.png');
        this.load.image('ghost', 'assets/images/die/ghost.png');

        // Effects
        this.load.atlas('effect_7', 'assets/images/effects/effect_7/effect_7.png', 'assets/images/effects/effect_7/effect_7_atlas.json');
        this.load.animation('effect_7_anim', 'assets/images/effects/effect_7/effect_7_anim.json');

        // Blood splatter effect
        this.load.atlas('effect_3', 'assets/images/effects/effect_3/blood.png', 'assets/images/effects/effect_3/blood_atlas.json');
        this.load.animation('effect_3_anim', 'assets/images/effects/effect_3/blood_anim.json');

        // Wizard Skills
        this.load.atlas('tele_port', 'assets/images/skill/skill_2/tele_port.png', 'assets/images/skill/skill_2/tele_port_atlas.json');
        this.load.animation('tele_port_anim', 'assets/images/skill/skill_2/tele_port_anim.json');

        // 3. Enemies (Manual Load)
        // Bear
        this.load.atlas('bear', 'assets/images/bear/bear.png', 'assets/images/bear/bear_atlas.json');
        this.load.animation('bear_anim', 'assets/images/bear/bear_anim.json');
        // TreeMan
        this.load.atlas('tree_man', 'assets/images/tree_man/tree_man.png', 'assets/images/tree_man/tree_man_atlas.json');
        this.load.animation('treeman_anim', 'assets/images/tree_man/tree_man_anim.json');
        // ForestGuardian
        this.load.atlas('forest_guardian', 'assets/images/forest_guardian/forest_guardian.png', 'assets/images/forest_guardian/forest_guardian_atlas.json');
        this.load.animation('forestguardian_anim', 'assets/images/forest_guardian/forest_guardian_anim.json');
        // GnollBrute
        this.load.atlas('gnollbrute', 'assets/images/gnoll_brute/gnollbrute.png', 'assets/images/gnoll_brute/gnollbrute_atlas.json');
        this.load.animation('gnollbrute_anim', 'assets/images/gnoll_brute/gnollbrute_anim.json');
        // GnollShaman
        this.load.atlas('gnollshaman', 'assets/images/gnoll_shaman/gnollshaman.png', 'assets/images/gnoll_shaman/gnollshaman_atlas.json');
        this.load.animation('gnollshaman_anim', 'assets/images/gnoll_shaman/gnollshaman_anim.json');
        // Wolf
        this.load.atlas('wolf', 'assets/images/wolf/wolf.png', 'assets/images/wolf/wolf_atlas.json');
        this.load.animation('wolf_anim', 'assets/images/wolf/wolf_anim.json');
        // Mushrooms
        this.load.atlas('largemushroom', 'assets/images/large_mush_room/largemushroom.png', 'assets/images/large_mush_room/largemushroom_atlas.json');
        this.load.animation('largemushroom_anim', 'assets/images/large_mush_room/largemushroom_anim.json');
        this.load.atlas('smallmushroom', 'assets/images/small_mush_room/smallmushroom.png', 'assets/images/small_mush_room/smallmushroom_atlas.json');
        this.load.animation('smallmushroom_anim', 'assets/images/small_mush_room/smallmushroom_anim.json');
        // Golem
        this.load.atlas('golem', 'assets/images/golem/golem.png', 'assets/images/golem/golem_atlas.json');
        this.load.animation('golem_anim', 'assets/images/golem/golem_anim.json');

        // 4. Resources & Items
        this.load.image('stone', 'assets/images/item/stone.png'); // Stone.js
        this.load.atlas('chest', 'assets/images/item/chest/chest.png', 'assets/images/item/chest/chest_atlas.json');
        this.load.animation('chest_anim', 'assets/images/item/chest/chest_anim.json');
        this.load.image('wood', 'assets/images/item/wood.png');
        this.load.image('meat', 'assets/images/item/meat.png');
        this.load.image('blood', 'assets/images/item/blood.png');

        // 5. MainScene Specific Assets
        this.load.image('button_out', 'assets/images/inventory/button/button_out.png');
        this.load.image('backpack', 'assets/images/inventory/backpack.png');
        this.load.image('diamond', 'assets/images/item/diamon.png');



        // Skill 3 Gate
        this.load.atlas('gate', 'assets/images/skill/skill_3/gate.png', 'assets/images/skill/skill_3/gate_atlas.json');
        this.load.animation('gate_anim', 'assets/images/skill/skill_3/gate_anim.json');

        // Sounds - Load rifle gunshot sound
        this.load.audio('rifle_shot', 'assets/sounds/rifle.mp3');
        this.load.audio('reload_sound', 'assets/sounds/reload.mp3');

        // Map
        this.load.image('tiles', 'assets/images/RPG Nature Tileset.png');
        this.load.tilemapTiledJSON('map', 'assets/images/map.json');

        // UI Asset Correction (SceneLoad specific or Menu)
        this.load.image('button_play', 'assets/images/inventory/button/button_play.png');
        this.load.image('button_settings', 'assets/images/inventory/button/button_settings.png');
        this.load.image('cart3', 'assets/images/inventory/cart3.png');

        // Dashboard assets
        this.load.image('coin', 'assets/images/ui/coin.png');
        this.load.image('map_1', 'assets/images/ui/map_1.jpg');
        this.load.image('map_2', 'assets/images/ui/map_2.jpg');
        this.load.image('map_3', 'assets/images/ui/map_3.jpg');
        this.load.image('map_4', 'assets/images/ui/map_4.jpg');
        this.load.image('map_5', 'assets/images/ui/map_5.jpg');

        // Trigger the load
        this.load.start();
    }

    createLoadingUI() {
        // Set background color fallback
        this.cameras.main.setBackgroundColor('#000000');

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Add background
        const bg = this.add.image(width / 2, height / 2, 'loading_bg');
        bg.setDisplaySize(width, height);

        // --- PROGRESS BAR DESIGN ---
        const barWidth = 400;
        const barHeight = 30;
        const barX = width / 2 - barWidth / 2;
        const barY = height / 2 + 50; // Moved down slightly

        // 1. Glow effect (Outer)
        const glow = this.add.graphics();
        glow.fillStyle(0x00ff00, 0.2);
        glow.fillRoundedRect(barX - 5, barY - 5, barWidth + 10, barHeight + 10, 15);

        // 2. Container (Background of the bar)
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x000000, 0.7);
        progressBox.fillRoundedRect(barX, barY, barWidth, barHeight, 10);
        progressBox.lineStyle(2, 0xffffff, 0.5);
        progressBox.strokeRoundedRect(barX, barY, barWidth, barHeight, 10);

        // 3. The Fill (Dynamic)
        const progressBar = this.add.graphics();

        // --- TEXT DESIGN ---
        // Combined Text: "LOADING... 45%"
        // Positioned BELOW the bar
        const loadingText = this.make.text({
            x: width / 2,
            y: barY + barHeight + 30, // 30px below the bar
            text: 'LOADING... 0%',
            style: {
                font: 'bold 24px monospace',
                fill: '#ffffff',
                shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 3, fill: true }
            }
        });
        loadingText.setOrigin(0.5, 0.5);

        // --- FAKE LOADING LOGIC ---
        let progressValue = 0;

        const updateProgressBar = () => {
            const percentage = parseInt(progressValue * 100);

            // Update UI Text
            loadingText.setText(`LOADING... ${percentage}%`);

            // Update Progress Bar Fill
            progressBar.clear();

            // Gradient effect by drawing multiple lines (simple imitation) or using fillGradientStyle if supported for rect (phaser 3 usually supports basic gradient fills in newer versions, but fillStyle is safer for generic rects)
            // We'll use a solid vibrant green for now, maybe add a shine
            progressBar.fillStyle(0x00e055, 1);

            const w = barWidth * progressValue;
            if (w > 0) {
                // Limit width to container
                // Draw rounded rect
                progressBar.fillRoundedRect(barX + 2, barY + 2, w - 4, barHeight - 4, 8);

                // Add a "shine" or highlight at the top half
                progressBar.fillStyle(0xffffff, 0.2);
                progressBar.fillRoundedRect(barX + 2, barY + 2, w - 4, (barHeight - 4) / 2, { tl: 8, tr: 8, bl: 0, br: 0 });
            }
        };

        // Use a timer to fake the progress smooth visuals
        this.time.addEvent({
            delay: 30, // Speed of loading
            repeat: 100, // 0 to 100 steps approximately
            callback: () => {
                progressValue += 0.01;
                if (progressValue > 1) progressValue = 1;
                updateProgressBar();

                // Extra delay at 100% before starting
                if (progressValue >= 1) {
                    this.time.delayedCall(500, () => {
                        console.log('✅ Loading complete, starting MenuScene');
                        this.scene.start('MenuScene');
                    });
                }
            }
        });
    }
}
