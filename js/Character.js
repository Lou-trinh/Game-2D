import Phaser from 'phaser';

// Character configurations
export const CharacterTypes = {
    MAGE: 'mage',
    ARCHER: 'archer',
    WARRIOR: 'warrior',
    ASSASSIN: 'assassin',
    WIZARD: 'wizard',
    TAOIST: 'taoist'
};

export const CharacterConfigs = {
    [CharacterTypes.MAGE]: {
        key: 'mage',
        name: 'Pháp Sư',
        icon: '🧙',
        color: 0x9b59b6,
        description: 'Sát thương phép cao\nMáu thấp',
        texture: 'mage',
        idleFrame: 'townsfolk_f_idle_1',
        walkAnim: 'mage_walk',
        idleAnim: 'mage_idle',
        stats: {
            health: 80,
            damage: 0,
            speed: 2.5,
            defense: 5
        },
        assets: {
            atlas: 'assets/images/mage/mage.png',
            atlasJson: 'assets/images/mage/mage_atlas.json',
            anim: 'assets/images/mage/mage_anim.json'
        },
        weapon: {
            texture: 'scepter',
            path: 'assets/images/weapons/scepter.png',
            scale: 0.5,
            offsetX: 10,
            offsetY: 2,
            attackType: 'swing',
            showSkillEffect: true  // Mage shows lightning
        },
        unlocked: true
    },

    [CharacterTypes.ARCHER]: {
        key: 'archer',
        name: 'Cung Thủ',
        icon: '🏹',
        color: 0x27ae60,
        description: 'Tấn công tầm xa\nDi chuyển nhanh',
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
        name: 'Chiến Binh',
        icon: '⚔️',
        color: 0xe74c3c,
        description: 'Cân bằng tấn công\nvà phòng thủ',
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
        name: 'Sát Thủ',
        icon: '🗡️',
        color: 0x2c3e50,
        description: 'Chém từ sau lưng\\nClick phải: Dịch chuyển',
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
        name: 'Thuật Sĩ',
        icon: '✨',
        color: 0x3498db,
        description: 'Phép thuật đa dạng\nHỗ trợ đồng đội',
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
            attackType: 'swing',
            showSkillEffect: false  // Wizard uses summon skill instead
        },
        unlocked: true
    },

    [CharacterTypes.TAOIST]: {
        key: 'taoist',
        name: 'Đạo Sĩ',
        icon: '☯️',
        color: 0xf39c12,
        description: 'Phép thuật đa dạng\nBiến hình Cluthu (R)',
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
            formKey: 'cluthu',
            texture: 'cluthu',
            idleAnim: 'cluthu_idle',
            walkAnim: 'cluthu_walk',
            attackAnim: 'cluthu_1atk',
            scale: 1.0,
            atlas: 'assets/images/skill/cluthu/cluthu.png',
            atlasJson: 'assets/images/skill/cluthu/cluthu_atlas.json',
            anim: 'assets/images/skill/cluthu/cluthu_anim.json'
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

        // Preload transform form assets (e.g., Taoist -> Cluthu)
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
    return CharacterConfigs[key] || CharacterConfigs[CharacterTypes.MAGE];
}

// Get all unlocked characters
export function getUnlockedCharacters() {
    return Object.values(CharacterConfigs).filter(c => c.unlocked);
}

// Get all characters
export function getAllCharacters() {
    return Object.values(CharacterConfigs);
}
