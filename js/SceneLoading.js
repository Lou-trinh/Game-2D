import Phaser from 'phaser';
import { onAuthChange, signInWithGoogle, checkRedirectResult } from './firebase.js';

export default class SceneLoading extends Phaser.Scene {
    constructor() {
        super('SceneLoading');
    }

    preload() {
        this.load.image('loading_bg', 'assets/images/inventory/background_load.png');
    }

    async create() {
        const { width, height } = this.cameras.main;

        this.add.image(width / 2, height / 2, 'loading_bg').setDisplaySize(width, height);

        this._loginElements = [];
        this._loginVisible = false;

        let started = false;

        // Keep listener active through the entire login flow —
        // handles both "already signed in" and "just signed in via popup"
        const unsubscribe = onAuthChange((user) => {
            if (user && !started) {
                started = true;
                unsubscribe();
                if (this._loginVisible) this._hideLoginPopup();
                this._startLoadingSequence();
            }
        });

        // Process any pending redirect result, then show login if still not signed in
        try { await checkRedirectResult(); } catch (_) {}

        if (!started) {
            this._showLoginPopup();
        }
    }

    _showLoginPopup() {
        if (this._loginVisible) return;
        this._loginVisible = true;

        const { width, height } = this.cameras.main;
        const cx = width / 2;
        const cy = height / 2 + 20;
        const pW = 340, pH = 220;

        // Outer glow
        const glow = this.add.graphics();
        glow.fillStyle(0x76c442, 0.07);
        glow.fillRoundedRect(cx - pW / 2 - 14, cy - pH / 2 - 14, pW + 28, pH + 28, 20);

        // Main panel
        const panel = this.add.graphics();
        panel.fillStyle(0x0d1b2a, 0.96);
        panel.fillRoundedRect(cx - pW / 2, cy - pH / 2, pW, pH, 14);
        panel.lineStyle(2, 0x76c442, 1);
        panel.strokeRoundedRect(cx - pW / 2, cy - pH / 2, pW, pH, 14);

        // Header bar
        panel.fillStyle(0x0f2a10, 1);
        panel.fillRoundedRect(cx - pW / 2 + 2, cy - pH / 2 + 2, pW - 4, 54,
            { tl: 12, tr: 12, bl: 0, br: 0 });

        // Inner subtle border
        panel.lineStyle(1, 0xffffff, 0.07);
        panel.strokeRoundedRect(cx - pW / 2 + 5, cy - pH / 2 + 5, pW - 10, pH - 10, 10);

        // Title
        const title = this.add.text(cx, cy - pH / 2 + 29, 'SURVIVAL GAME', {
            fontSize: '22px', color: '#76c442', fontStyle: 'bold',
            shadow: { offsetX: 0, offsetY: 3, color: '#000000', blur: 8, fill: true }
        }).setOrigin(0.5, 0.5);

        // Separator
        const sep = this.add.graphics();
        sep.lineStyle(1, 0x76c442, 0.35);
        sep.lineBetween(cx - pW / 2 + 24, cy - pH / 2 + 57, cx + pW / 2 - 24, cy - pH / 2 + 57);

        // Subtitle
        const sub = this.add.text(cx, cy - 18, 'Đăng nhập để lưu tiến trình\nvà đồng bộ trên mọi thiết bị', {
            fontSize: '13px', color: '#8899aa', align: 'center', lineSpacing: 5
        }).setOrigin(0.5, 0.5);

        // Button
        const btnW = 250, btnH = 46;
        const btnY = cy + 68;

        const btnBg = this.add.graphics();
        const drawBtn = (fill, border) => {
            btnBg.clear();
            btnBg.fillStyle(0x000000, 0.25);
            btnBg.fillRoundedRect(cx - btnW / 2 + 3, btnY - btnH / 2 + 3, btnW, btnH, 10);
            btnBg.fillStyle(fill, 1);
            btnBg.fillRoundedRect(cx - btnW / 2, btnY - btnH / 2, btnW, btnH, 10);
            btnBg.fillStyle(0xffffff, 0.1);
            btnBg.fillRoundedRect(cx - btnW / 2 + 2, btnY - btnH / 2 + 2, btnW - 4, btnH / 2,
                { tl: 9, tr: 9, bl: 0, br: 0 });
            btnBg.lineStyle(1.5, border, 0.9);
            btnBg.strokeRoundedRect(cx - btnW / 2, btnY - btnH / 2, btnW, btnH, 10);
        };
        drawBtn(0x1d4ed8, 0x60a5fa);

        const btnTxt = this.add.text(cx, btnY, 'Đăng nhập với Google', {
            fontSize: '15px', color: '#ffffff', fontStyle: 'bold',
            shadow: { offsetX: 0, offsetY: 2, color: '#000', blur: 4, fill: true }
        }).setOrigin(0.5, 0.5);

        // HTML button — iOS Safari requires touchend from a real DOM element
        // to open a popup (signInWithPopup uses window.open internally)
        const canvas = this.game.canvas;
        const htmlBtn = document.createElement('button');
        htmlBtn.id = 'google-login-btn';
        htmlBtn.textContent = 'Đăng nhập với Google';

        const syncPos = () => {
            const r = canvas.getBoundingClientRect();
            const sx = r.width / this.scale.width;
            const sy = r.height / this.scale.height;
            Object.assign(htmlBtn.style, {
                left:   `${r.left + (cx - btnW / 2) * sx}px`,
                top:    `${r.top  + (btnY - btnH / 2) * sy}px`,
                width:  `${btnW * sx}px`,
                height: `${btnH * sy}px`,
            });
        };

        Object.assign(htmlBtn.style, {
            position:   'fixed',
            background: 'transparent',
            border:     'none',
            color:      'transparent',
            cursor:     'pointer',
            zIndex:     '9999',
            touchAction:'manipulation',
            webkitTapHighlightColor: 'transparent',
            fontSize:   '1px',
        });
        syncPos();
        window.addEventListener('resize', syncPos);
        document.body.appendChild(htmlBtn);
        this._htmlLoginBtn  = htmlBtn;
        this._resizeLoginBtn = syncPos;

        let busy = false;
        const handleLogin = () => {
            if (busy) return;
            busy = true;
            btnTxt.setText('Đang đăng nhập...');
            drawBtn(0x374151, 0x6b7280);
            // signInWithGoogle (signInWithPopup) called synchronously from the gesture
            signInWithGoogle().catch(() => {
                busy = false;
                btnTxt.setText('Đăng nhập với Google');
                drawBtn(0x1d4ed8, 0x60a5fa);
            });
            // success handled by onAuthChange listener in create()
        };
        htmlBtn.addEventListener('touchend', (e) => { e.preventDefault(); handleLogin(); });
        htmlBtn.addEventListener('click', handleLogin);

        this._loginElements = [glow, panel, title, sep, sub, btnBg, btnTxt];
    }

    _hideLoginPopup() {
        this._loginElements.forEach(el => el.destroy());
        this._loginElements = [];
        this._loginVisible = false;
        if (this._htmlLoginBtn) {
            window.removeEventListener('resize', this._resizeLoginBtn);
            this._htmlLoginBtn.remove();
            this._htmlLoginBtn = null;
        }
    }

    _startLoadingSequence() {
        const { width, height } = this.cameras.main;
        const barWidth = 400;
        const barHeight = 30;
        const barX = width / 2 - barWidth / 2;
        const barY = height / 2 + 50;

        const glow = this.add.graphics();
        glow.fillStyle(0x00ff00, 0.2);
        glow.fillRoundedRect(barX - 5, barY - 5, barWidth + 10, barHeight + 10, 15);

        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x000000, 0.7);
        progressBox.fillRoundedRect(barX, barY, barWidth, barHeight, 10);
        progressBox.lineStyle(2, 0xffffff, 0.5);
        progressBox.strokeRoundedRect(barX, barY, barWidth, barHeight, 10);

        const progressBar = this.add.graphics();

        const loadingText = this.add.text(width / 2, barY + barHeight + 30, 'LOADING... 0%', {
            font: 'bold 24px monospace',
            fill: '#ffffff',
            shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 3, fill: true }
        }).setOrigin(0.5, 0.5);

        const updateBar = (value) => {
            loadingText.setText(`LOADING... ${Math.floor(value * 100)}%`);
            progressBar.clear();
            progressBar.fillStyle(0x00e055, 1);
            const w = barWidth * value;
            if (w > 0) {
                progressBar.fillRoundedRect(barX + 2, barY + 2, w - 4, barHeight - 4, 8);
                progressBar.fillStyle(0xffffff, 0.2);
                progressBar.fillRoundedRect(barX + 2, barY + 2, w - 4, (barHeight - 4) / 2, { tl: 8, tr: 8, bl: 0, br: 0 });
            }
        };

        this.load.on('progress', updateBar);
        this.load.on('complete', () => {
            updateBar(1);
            this.time.delayedCall(500, () => {
                console.log('✅ Loading complete, starting MenuScene');
                this.scene.start('MenuScene');
            });
        });

        this.loadFullAssets();
    }

    loadFullAssets() {
        this.load.atlas('player_1', 'assets/images/player_1/player_1.png', 'assets/images/player_1/player_1_atlas.json');
        this.load.animation('player_1_anim', 'assets/images/player_1/player_1_anim.json');
        this.load.image('M4A1', 'assets/images/weapons/M4A1.png');
        this.load.image('AK47', 'assets/images/weapons/AK47.png');
        this.load.image('Glock_17', 'assets/images/weapons/Glock_17.png');
        this.load.image('Astra_680', 'assets/images/weapons/Astra_680.png');
        this.load.image('Charter_Arms_Bulldog', 'assets/images/weapons/Charter_Arms_Bulldog.png');
        this.load.image('Colt_1911', 'assets/images/weapons/Colt_1911.png');
        this.load.image('Mark_23', 'assets/images/weapons/Mark_23.png');
        this.load.image('SIG_P250', 'assets/images/weapons/SIG_P250.png');
        this.load.image('P90', 'assets/images/weapons/P90.png');
        this.load.image('Pump_Shotgun', 'assets/images/weapons/Pump_Shotgun.png');
        this.load.image('DBS', 'assets/images/weapons/DBS.png');
        this.load.image('SKS', 'assets/images/weapons/SKS.png');
        this.load.image('Grenade', 'assets/images/weapons/Grenade.png');
        this.load.image('Minigun', 'assets/images/weapons/Minigun.png');
        this.load.image('Shovel', 'assets/images/weapons/Shovel.png');
        this.load.image('Knife', 'assets/images/weapons/knife.png');
        this.load.image('Katana', 'assets/images/weapons/katana.png');
        this.load.image('Rocket', 'assets/images/weapons/Rocket.png');
        this.load.image('AWM', 'assets/images/weapons/AWM.png');
        this.load.image('MP5', 'assets/images/weapons/MP5.png');
        this.load.image('MPK5', 'assets/images/weapons/MPK5.png');
        this.load.image('SMG', 'assets/images/weapons/SMG.png');
        this.load.image('M762', 'assets/images/weapons/M762.png');
        this.load.image('MK14', 'assets/images/weapons/MK14.png');
        this.load.image('AWP', 'assets/images/weapons/AWP.png');
        this.load.image('M24', 'assets/images/weapons/M24.png');
        this.load.image('Kar98K', 'assets/images/weapons/Kar98K.png');
        this.load.image('Win94', 'assets/images/weapons/Win94.png');
        this.load.image('SCAR-L', 'assets/images/weapons/SCAR-L.png');
        this.load.image('Vector', 'assets/images/weapons/Vector.png');
        this.load.image('MP9', 'assets/images/weapons/MP9.png');
        this.load.image('Thompson', 'assets/images/weapons/Thompson.png');
        this.load.image('Rocket_Bullet', 'assets/images/weapons/Rocket_Bullet.png');
        this.load.image('gasoline_bombs', 'assets/images/weapons/gasoline_bombs.png');
        this.load.image('electric_bomb', 'assets/images/weapons/electric_bomb.png');
        this.load.image('AUG', 'assets/images/weapons/AUG.png');
        this.load.image('FAMAS', 'assets/images/weapons/FAMAS.png');
        this.load.image('Mini14', 'assets/images/weapons/Mini14.png');
        this.load.image('QBZ', 'assets/images/weapons/QBZ.png');
        this.load.image('UK_SA80', 'assets/images/weapons/UK_SA80.png');
        this.load.image('ISR_TAR21', 'assets/images/weapons/ISR_TAR21.png');
        this.load.image('Benelli_M3', 'assets/images/weapons/Benelli_M3.png');
        this.load.image('S1897', 'assets/images/weapons/S1897.png');
        this.load.image('SPAS-12', 'assets/images/weapons/SPAS-12.png');
        this.load.image('Desert_Eagle', 'assets/images/weapons/Desert_Eagle.png');
        this.load.image('QBU', 'assets/images/weapons/QBU.png');
        this.load.image('SLR', 'assets/images/weapons/SLR.png');
        this.load.image('VSS', 'assets/images/weapons/VSS.png');
        this.load.image('GER_MP5', 'assets/images/weapons/GER_MP5.png');
        this.load.image('ammo_pickup', 'assets/images/weapons/ammo_pickup.png');
        this.load.image('bullet_1', 'assets/images/weapons/bullet_1.png');
        this.load.image('bullet_2', 'assets/images/weapons/bullet_2.png');
        this.load.image('bullet_3', 'assets/images/weapons/bullet_3.png');
        this.load.image('bullet_4', 'assets/images/weapons/bullet_4.png');
        this.load.image('bullet', 'assets/images/weapons/bullet.png');
        this.load.image('ghost', 'assets/images/die/ghost.png');
        this.load.atlas('effect_7', 'assets/images/effects/effect_7/effect_7.png', 'assets/images/effects/effect_7/effect_7_atlas.json');
        this.load.animation('effect_7_anim', 'assets/images/effects/effect_7/effect_7_anim.json');
        this.load.atlas('effect_4', 'assets/images/effects/effect_4/effect_4.png', 'assets/images/effects/effect_4/effect_4_atlas.json');
        this.load.animation('effect_4_anim', 'assets/images/effects/effect_4/effect_4_anim.json');
        this.load.atlas('effect_5', 'assets/images/effects/effect_5/fire.png', 'assets/images/effects/effect_5/fire_atlas.json');
        this.load.animation('effect_5_anim', 'assets/images/effects/effect_5/fire_anim.json');
        this.load.atlas('effect_6', 'assets/images/effects/effect_6/fire.png', 'assets/images/effects/effect_6/fire_atlas.json');
        this.load.animation('effect_6_anim', 'assets/images/effects/effect_6/fire_anim.json');
        this.load.atlas('effect_8', 'assets/images/effects/effect_8/electric.png', 'assets/images/effects/effect_8/electric_atlas.json');
        this.load.animation('effect_8_anim', 'assets/images/effects/effect_8/electric_anim.json');
        this.load.atlas('effect_9', 'assets/images/effects/effect_9/electron.png', 'assets/images/effects/effect_9/electron_atlas.json');
        this.load.animation('effect_9_anim', 'assets/images/effects/effect_9/electron_anim.json');
        this.load.atlas('effect_3', 'assets/images/effects/effect_3/blood.png', 'assets/images/effects/effect_3/blood_atlas.json');
        this.load.animation('effect_3_anim', 'assets/images/effects/effect_3/blood_anim.json');
        this.load.atlas('tele_port', 'assets/images/skill/skill_2/tele_port.png', 'assets/images/skill/skill_2/tele_port_atlas.json');
        this.load.animation('tele_port_anim', 'assets/images/skill/skill_2/tele_port_anim.json');
        this.load.atlas('bear', 'assets/images/bear/bear.png', 'assets/images/bear/bear_atlas.json');
        this.load.animation('bear_anim', 'assets/images/bear/bear_anim.json');
        this.load.atlas('tree_man', 'assets/images/tree_man/tree_man.png', 'assets/images/tree_man/tree_man_atlas.json');
        this.load.animation('treeman_anim', 'assets/images/tree_man/tree_man_anim.json');
        this.load.atlas('forest_guardian', 'assets/images/forest_guardian/forest_guardian.png', 'assets/images/forest_guardian/forest_guardian_atlas.json');
        this.load.animation('forestguardian_anim', 'assets/images/forest_guardian/forest_guardian_anim.json');
        this.load.atlas('gnollbrute', 'assets/images/gnoll_brute/gnollbrute.png', 'assets/images/gnoll_brute/gnollbrute_atlas.json');
        this.load.animation('gnollbrute_anim', 'assets/images/gnoll_brute/gnollbrute_anim.json');
        this.load.atlas('gnollshaman', 'assets/images/gnoll_shaman/gnollshaman.png', 'assets/images/gnoll_shaman/gnollshaman_atlas.json');
        this.load.animation('gnollshaman_anim', 'assets/images/gnoll_shaman/gnollshaman_anim.json');
        this.load.atlas('wolf', 'assets/images/wolf/wolf.png', 'assets/images/wolf/wolf_atlas.json');
        this.load.animation('wolf_anim', 'assets/images/wolf/wolf_anim.json');
        this.load.atlas('largemushroom', 'assets/images/large_mush_room/largemushroom.png', 'assets/images/large_mush_room/largemushroom_atlas.json');
        this.load.animation('largemushroom_anim', 'assets/images/large_mush_room/largemushroom_anim.json');
        this.load.atlas('smallmushroom', 'assets/images/small_mush_room/smallmushroom.png', 'assets/images/small_mush_room/smallmushroom_atlas.json');
        this.load.animation('smallmushroom_anim', 'assets/images/small_mush_room/smallmushroom_anim.json');
        this.load.atlas('golem', 'assets/images/golem/golem.png', 'assets/images/golem/golem_atlas.json');
        this.load.animation('golem_anim', 'assets/images/golem/golem_anim.json');
        this.load.image('stone', 'assets/images/item/stone.png');
        this.load.atlas('chest', 'assets/images/item/chest/chest.png', 'assets/images/item/chest/chest_atlas.json');
        this.load.image('blood', 'assets/images/item/blood.png');
        this.load.image('blood2', 'assets/images/item/blood2.png');
        this.load.animation('chest_anim', 'assets/images/item/chest/chest_anim.json');
        this.load.image('wood', 'assets/images/item/wood.png');
        this.load.image('meat', 'assets/images/item/meat.png');
        this.load.image('button_out', 'assets/images/inventory/button/button_out.png');
        this.load.image('backpack', 'assets/images/inventory/backpack.png');
        this.load.image('diamond', 'assets/images/item/diamon.png');
        this.load.atlas('gate', 'assets/images/skill/skill_3/gate.png', 'assets/images/skill/skill_3/gate_atlas.json');
        this.load.animation('gate_anim', 'assets/images/skill/skill_3/gate_anim.json');
        this.load.audio('rifle_shot', 'assets/sounds/rifle.mp3');
        this.load.audio('reload_sound', 'assets/sounds/reload.mp3');
        this.load.audio('grenade_explosion', 'assets/sounds/grenade.wav');
        this.load.audio('glass_broken', 'assets/sounds/glass_broken.mp3');
        this.load.audio('fire_sound', 'assets/sounds/fire.wav');
        this.load.audio('shovel_swing', 'assets/sounds/shovels.wav');
        this.load.audio('pistol', 'assets/sounds/pistol.wav');
        this.load.audio('DMR', 'assets/sounds/DMR.wav');
        this.load.audio('minigun', 'assets/sounds/minigun.wav');
        this.load.audio('sniper', 'assets/sounds/sniper.wav');
        this.load.audio('SMG', 'assets/sounds/SMG.wav');
        this.load.audio('electric_sound', 'assets/sounds/electric.mp3');
        this.load.audio('shotgun', 'assets/sounds/shotgun.wav');
        this.load.audio('MK14', 'assets/sounds/MK14.wav');
        this.load.audio('katana', 'assets/sounds/katana.wav');
        this.load.image('tiles', 'assets/images/RPG Nature Tileset.png');
        this.load.tilemapTiledJSON('map', 'assets/images/map.json');
        this.load.image('button_play', 'assets/images/inventory/button/button_play.png');
        this.load.image('button_settings', 'assets/images/inventory/button/button_settings.png');
        this.load.image('cart3', 'assets/images/inventory/cart3.png');
        this.load.image('coin', 'assets/images/ui/coin.png');
        this.load.image('map_1', 'assets/images/ui/map_1.jpg');
        this.load.image('map_2', 'assets/images/ui/map_2.jpg');
        this.load.image('map_3', 'assets/images/ui/map_3.jpg');
        this.load.image('map_4', 'assets/images/ui/map_4.jpg');
        this.load.image('map_5', 'assets/images/ui/map_5.jpg');
        this.load.image('menu_bg', 'assets/images/inventory/background.png');
        this.load.image('button_start', 'assets/images/inventory/button/button_start.png');

        this.load.start();
    }
}
