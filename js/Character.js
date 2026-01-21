import Phaser from 'phaser';

// Character configurations
export const CharacterTypes = {
    PLAYER_1: 'player_1'
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
            atlas: 'assets/images/player_1/player_1.png',
            atlasJson: 'assets/images/player_1/player_1_atlas.json',
            anim: 'assets/images/player_1/player_1_anim.json'
        },
        weapon: {
            texture: 'm4a1',
            path: 'assets/images/weapons/M4A1.png',
            scale: 0.6,
            offsetX: 7,
            offsetY: 5,
            attackType: 'gun_fire',
            showSkillEffect: false,
            projectile: {
                texture: 'bullet', // Use specific bullet texture
                speed: 1000,
                range: 150,
                damage: 25,
                scale: 0.3 // Smaller bullet size
            },
            ammo: {
                max: 60
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
