import Phaser from 'phaser';

// Character configurations
export const CharacterTypes = {
    PLAYER_1: 'player_1',
    CHARACTER_02: 'character_02',
};

export const CharacterConfigs = {
    [CharacterTypes.PLAYER_1]: {
        key: 'player_1',
        name: 'PHOENIX',
        icon: '👤',
        color: 0x34495e,
        description: '',
        texture: 'player_1',
        idleFrame: 'player_1', // Using first frame of idle
        walkAnim: 'run_front', // Default walk for generic logic (will be overridden)
        idleAnim: 'idle',
        stats: {
            health: 100,
            damage: 25,
            speed: 3.0,
            defense: 8
        },
        assets: {
            atlas: 'assets/images/players/player_1/player_1.png',
            atlasJson: 'assets/images/players/player_1/player_1_atlas.json',
            anim: 'assets/images/players/player_1/player_1_anim.json'
        },
        weapon: {
            texture: 'M4A1',
            path: 'assets/images/weapons/M4A1.png',
            scale: 0.6,
            offsetX: 7,
            offsetY: 5,
            attackType: 'gun_fire',
            showSkillEffect: false,
            projectile: {
                texture: 'bullet', // bullet.png
                speed: 1000,
                range: 180,
                damage: 25,
                scale: 0.4
            },
            ammo: {
                max: 60
            }
        },
        unlocked: true
    },
    [CharacterTypes.CHARACTER_02]: {
        key: 'character_02',
        name: 'CHARACTER 02',
        icon: '👧',
        color: 0xe74c3c,
        description: '',
        texture: 'character_02_idle',
        idleFrame: 'Sprite-0002 0.',
        walkAnim: 'character_02_run_front',
        idleAnim: 'character_02_idle',
        stats: {
            health: 100,
            damage: 20,
            speed: 3.5,
            defense: 5
        },
        assets: {
            atlas: 'assets/images/players/player_2/character_02_idle.png',
            atlasJson: 'assets/images/players/player_2/character_02_idle_atlas.json',
            anim: 'assets/images/players/player_2/character_02_idle_anim.json'
        },
        extraAssets: [
            {
                key: 'character_02_idle_back',
                atlas: 'assets/images/players/player_2/character_02_idle_back.png',
                atlasJson: 'assets/images/players/player_2/character_02_idle_back_atlas.json',
                anim: 'assets/images/players/player_2/character_02_idle_back_anim.json'
            },
            {
                key: 'character_02_idle_right',
                atlas: 'assets/images/players/player_2/character_02_idle_right.png',
                atlasJson: 'assets/images/players/player_2/character_02_idle_right_atlas.json',
                anim: 'assets/images/players/player_2/character_02_idle_right_anim.json'
            },
            {
                key: 'character_02_run_front',
                atlas: 'assets/images/players/player_2/character_02_run_front.png',
                atlasJson: 'assets/images/players/player_2/character_02_run_front_atlas.json',
                anim: 'assets/images/players/player_2/character_02_run_front_anim.json'
            },
            {
                key: 'character_02_run_back',
                atlas: 'assets/images/players/player_2/character_02_run_back.png',
                atlasJson: 'assets/images/players/player_2/character_02_run_back_atlas.json',
                anim: 'assets/images/players/player_2/character_02_run_back_anim.json'
            },
            {
                key: 'character_02_run_right',
                atlas: 'assets/images/players/player_2/character_02_run_right.png',
                atlasJson: 'assets/images/players/player_2/character_02_run_right_atlas.json',
                anim: 'assets/images/players/player_2/character_02_run_right_anim.json'
            },
        ],
        weapon: {
            texture: 'Glock_17',
            path: 'assets/images/weapons/Glock_17.png',
            scale: 0.6,
            offsetX: 7,
            offsetY: 5,
            attackType: 'gun_fire',
            showSkillEffect: false,
            projectile: {
                texture: 'bullet',
                speed: 900,
                range: 200,
                damage: 20,
                scale: 0.4
            },
            ammo: {
                max: 30
            }
        },
        unlocked: true
    }
};

// Helper function to preload all available character assets
export function preloadCharacters(scene) {
    Object.values(CharacterConfigs).forEach(config => {
        if (config.assets && config.unlocked) {
            scene.load.atlas(config.key, config.assets.atlas, config.assets.atlasJson);
            scene.load.animation(`${config.key}_anim`, config.assets.anim);
        }

        // Preload extra assets (e.g., character_02 has separate atlas per animation)
        if (config.extraAssets) {
            config.extraAssets.forEach(extra => {
                scene.load.atlas(extra.key, extra.atlas, extra.atlasJson);
                scene.load.animation(`${extra.key}_anim`, extra.anim);
            });
        }

        // Preload transform form assets (e.g., Taoist -> Mino)
        if (config.transformSkill) {
            const t = config.transformSkill;
            if (t.atlas && t.atlasJson) {
                scene.load.atlas(t.texture, t.atlas, t.atlasJson);
            }
            if (t.anim) {
                // Key name is not important here; the JSON file defines actual animation keys
                const animKey = `${t.formKey || t.texture}_anim`;
                scene.load.animation(animKey, t.anim);
            }
        }
    });
}

// Get character config by key
export function getCharacterConfig(key) {
    return CharacterConfigs[key] || CharacterConfigs[CharacterTypes.PLAYER_1];
}

// Get all unlocked characters
export function getUnlockedCharacters() {
    return Object.values(CharacterConfigs).filter(c => c.unlocked);
}

// Get all characters
export function getAllCharacters() {
    return Object.values(CharacterConfigs);
}
