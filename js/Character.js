import Phaser from 'phaser';

// Character configurations
export const CharacterTypes = {
    ARCHER: 'archer',
    WARRIOR: 'warrior',
    ASSASSIN: 'assassin',
    WIZARD: 'wizard',
    TAOIST: 'taoist',
    PLAYER_1: 'player_1'
};

export const CharacterConfigs = {
    [CharacterTypes.ARCHER]: {
        key: 'archer',
        name: 'SILVANUS',
        icon: '🏹',
        color: 0x27ae60,
        description: '',
        texture: 'archer',
        idleFrame: 'archer_idle_1',
        walkAnim: 'archer_walk',
        idleAnim: 'archer_idle',
        stats: {
            health: 90,
            damage: 12,
            speed: 3.0,
            defense: 6
        },
        assets: {
            atlas: 'assets/images/archer/archer.png',
            atlasJson: 'assets/images/archer/archer_atlas.json',
            anim: 'assets/images/archer/archer_anim.json'
        },
        weapon: {
            texture: 'bow',
            path: 'assets/images/weapons/bow.png',
            scale: 0.5,
            baseRotation: 120,
            offsetX: 2,   // Gần người hơn
            offsetY: 3,
            attackType: 'pull',  // Giật lại như kéo dây cung
            projectile: {
                texture: 'arrow',
                speed: 400,
                range: 120,
                damage: 20,
                scale: 0.6
            }
        },
        unlocked: true
    },

    [CharacterTypes.WARRIOR]: {
        key: 'warrior',
        name: 'VANGUARD',
        icon: '⚔️',
        color: 0xe74c3c,
        description: '',
        texture: 'warrior',
        idleFrame: 'blacksmith_idle_1',
        walkAnim: 'warrior_walk',
        idleAnim: 'warrior_idle',
        stats: {
            health: 130,
            damage: 40,
            speed: 2.2,
            defense: 12
        },
        assets: {
            atlas: 'assets/images/warrior/warrior.png',
            atlasJson: 'assets/images/warrior/warrior_atlas.json',
            anim: 'assets/images/warrior/warrior_anim.json'
        },
        weapon: {
            texture: 'katana',
            path: 'assets/images/weapons/katana.png',
            scale: 0.5,
            offsetX: 12,
            offsetY: 4,
            attackType: 'swing',
            showSkillEffect: false  // Warrior no magic effect
        },
        unlocked: true
    },

    [CharacterTypes.ASSASSIN]: {
        key: 'assassin',
        name: 'NIGHTFALL',
        icon: '🗡️',
        color: 0x2c3e50,
        description: '',
        texture: 'assassin',
        idleFrame: 'thief_idle_1',
        walkAnim: 'assassin_walk',
        idleAnim: 'assassin_idle',
        stats: {
            health: 75,
            damage: 22,
            speed: 3.5,
            defense: 4
        },
        assets: {
            atlas: 'assets/images/assassin/assassin.png',
            atlasJson: 'assets/images/assassin/assassin_atlas.json',
            anim: 'assets/images/assassin/assassin_anim.json'
        },
        weapon: {
            texture: 'knife',
            path: 'assets/images/weapons/knife.png',
            scale: 0.5,
            offsetX: 10,
            offsetY: 10,
            attackType: 'swing',
            showSkillEffect: false  // Assassin no magic effect
        },
        unlocked: true
    },


    [CharacterTypes.WIZARD]: {
        key: 'wizard',
        name: 'AETHER',
        icon: '✨',
        color: 0x3498db,
        description: '',
        texture: 'wizard',
        idleFrame: 'wizard_idle_1',
        walkAnim: 'wizard_walk',
        idleAnim: 'wizard_idle',
        stats: {
            health: 85,
            damage: 18,
            speed: 2.6,
            defense: 6
        },
        assets: {
            atlas: 'assets/images/wizard/wizard.png',
            atlasJson: 'assets/images/wizard/wizard_atlas.json',
            anim: 'assets/images/wizard/wizard_anim.json'
        },
        weapon: {
            texture: 'scepter_2',
            path: 'assets/images/weapons/scepter_2.png',
            scale: 0.5,
            offsetX: 10,
            offsetY: 10,
            attackType: 'pull',  // Changed to use projectile system
            showSkillEffect: false,
            projectile: {
                texture: 'purple_orb',
                speed: 180,
                range: 150,
                damage: 20,
                scale: 0.2,
                count: 3,  // Shoot 3 orbs
                spread: 15  // 15 degree spread between orbs
            }
        },
        unlocked: true
    },

    [CharacterTypes.TAOIST]: {
        key: 'taoist',
        name: 'ECLIPSE',
        icon: '☯️',
        color: 0xf39c12,
        description: '',
        texture: 'taoist',
        idleFrame: 'taoist_idle_1',
        walkAnim: 'taoist_walk',
        idleAnim: 'taoist_idle',
        stats: {
            health: 100,
            damage: 15,
            speed: 2.5,
            defense: 8
        },
        assets: {
            atlas: 'assets/images/taoist/taoist.png',
            atlasJson: 'assets/images/taoist/taoist_atlas.json',
            anim: 'assets/images/taoist/taoist_anim.json'
        },
        weapon: {
            texture: 'mace',
            path: 'assets/images/weapons/mace.png',
            scale: 0.5,
            offsetX: 10,
            offsetY: 10,
            attackType: 'swing',
            showSkillEffect: false
        },
        transformSkill: {
            formKey: 'mino',
            texture: 'mino',
            idleAnim: 'mino_idle',
            walkAnim: 'mino_walk',
            attackAnim: 'mino_attack',
            scale: 0.75,
            atlas: 'assets/images/skill/mino/mino.png',
            atlasJson: 'assets/images/skill/mino/mino_atlas.json',
            anim: 'assets/images/skill/mino/mino_anim.json'
        },
        unlocked: true
    },

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
