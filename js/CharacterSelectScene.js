import Phaser from 'phaser';
import { getAllCharacters, preloadCharacters } from './Character';

export default class CharacterSelectScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CharacterSelectScene' });
        this.selectedIndex = 0;
        this.particleEmitters = [];
    }

    preload() {
        // Load all available character assets
        preloadCharacters(this);
        this.load.image('button_ok', 'assets/images/inventory/button/button_ok.png');
        this.load.image('button_back', 'assets/images/inventory/button/button_back.png');
    }

    create() {
        const { width, height } = this.scale;

        // Enhanced gradient background with darker tones
        const graphics = this.add.graphics();
        graphics.fillGradientStyle(0x0f0c29, 0x0f0c29, 0x302b63, 0x302b63, 1);
        graphics.fillRect(0, 0, width, height);

        // Add animated background particles
        this.createBackgroundParticles();

        // Title with glow effect
        const title = this.add.text(width / 2, 50, 'CHỌN NHÂN VẬT', {
            fontFamily: 'Verdana, sans-serif',
            fontSize: '36px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#2c3e50',
            strokeThickness: 2
        });
        title.setOrigin(0.5);

        // Floating animation for title
        this.tweens.add({
            targets: title,
            y: title.y - 3,
            duration: 2000,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });

        // Get character data from Character.js
        this.characters = getAllCharacters();

        // Create character cards - 3x2 grid
        this.characterCards = [];
        const cardWidth = 80;
        const cardHeight = 110;
        const cols = 3;
        const spacingX = 15;
        const spacingY = 15;
        const gridWidth = cols * cardWidth + (cols - 1) * spacingX;
        const startX = (width - gridWidth) / 2 + cardWidth / 2;
        const startY = height / 2 - 95;

        this.characters.forEach((char, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const cardX = startX + col * (cardWidth + spacingX);
            const cardY = startY + row * (cardHeight + spacingY);
            const card = this.createCharacterCard(cardX, cardY, char, index);
            this.characterCards.push(card);
        });

        // Select first unlocked character by default
        const firstUnlocked = this.characters.findIndex(c => c.unlocked);
        this.selectCharacter(firstUnlocked >= 0 ? firstUnlocked : 0);

        // Stylish navigation arrows
        const leftArrow = this.add.text(35, height / 2 + 10, '◀', {
            fontSize: '40px',
            color: '#ffffff'
        });
        leftArrow.setOrigin(0.5);
        leftArrow.setInteractive({ useHandCursor: true });
        leftArrow.on('pointerdown', () => this.navigateCharacter(-1));
        leftArrow.on('pointerover', () => {
            leftArrow.setScale(1.2);
            leftArrow.setColor('#4a90d9');
        });
        leftArrow.on('pointerout', () => {
            leftArrow.setScale(1);
            leftArrow.setColor('#ffffff');
        });

        const rightArrow = this.add.text(width - 35, height / 2 + 10, '▶', {
            fontSize: '40px',
            color: '#ffffff'
        });
        rightArrow.setOrigin(0.5);
        rightArrow.setInteractive({ useHandCursor: true });
        rightArrow.on('pointerdown', () => this.navigateCharacter(1));
        rightArrow.on('pointerover', () => {
            rightArrow.setScale(1.2);
            rightArrow.setColor('#4a90d9');
        });
        rightArrow.on('pointerout', () => {
            rightArrow.setScale(1);
            rightArrow.setColor('#ffffff');
        });

        // Enhanced confirm button
        this.createImageButton(width / 2 - 100, height * 0.78, 'button_ok', () => {
            const selectedChar = this.characters[this.selectedIndex];
            if (selectedChar.unlocked) {
                // Store selected character
                this.registry.set('selectedCharacter', selectedChar.key);
                this.cameras.main.fadeOut(500, 0, 0, 0);
                this.time.delayedCall(500, () => {
                    this.scene.start('MainScene');
                });
            }
        }, 0.7);

        // Back button
        this.createImageButton(width / 2 + 100, height * 0.78, 'button_back', () => {
            this.scene.start('MenuScene');
        }, 0.7);

        // Fade in
        this.cameras.main.fadeIn(500, 0, 0, 0);
    }

    createBackgroundParticles() {
        const { width, height } = this.scale;
        const particles = this.add.particles(0, 0, 'arrow', {
            x: { min: 0, max: width },
            y: { min: 0, max: height },
            scale: { start: 0.01, end: 0.03 },
            alpha: { start: 0.1, end: 0 },
            speed: 20,
            lifespan: 3000,
            blendMode: 'ADD',
            frequency: 200,
            tint: 0x4a90d9
        });
        particles.setDepth(-1);
    }

    createCharacterCard(x, y, charData, index) {
        const container = this.add.container(x, y);
        const cardWidth = 75;
        const cardHeight = 105;

        // Glass morphism card background
        const cardBg = this.add.rectangle(0, 0, cardWidth, cardHeight, 0x000000, 0.3);
        const cardBorder = this.add.rectangle(0, 0, cardWidth, cardHeight);
        cardBorder.setStrokeStyle(2, charData.color, 0.6);
        cardBorder.setFillStyle(0xffffff, 0.05);

        // Glow effect for card
        const glow = this.add.rectangle(0, 0, cardWidth + 6, cardHeight + 6);
        glow.setStrokeStyle(6, charData.color, 0);
        glow.setFillStyle(0xffffff, 0);

        container.add([glow, cardBg, cardBorder]);

        // Character preview
        let preview;
        if (charData.unlocked && charData.idleAnim) {
            // Adjust Y position for mage to align with other characters
            const yPos = charData.key === 'mage' ? -11 : -25;
            preview = this.add.sprite(0, yPos, charData.texture);
            preview.setScale(1.4);
            preview.play(charData.idleAnim);
        } else {
            preview = this.add.text(0, -25, charData.icon, {
                fontSize: '26px'
            });
            preview.setOrigin(0.5);
        }
        container.add(preview);

        // Lock overlay for locked characters
        if (!charData.unlocked) {
            const lockOverlay = this.add.rectangle(0, -25, 42, 42, 0x000000, 0.7);
            const lockIcon = this.add.text(0, -25, '🔒', {
                fontSize: '18px'
            });
            lockIcon.setOrigin(0.5);
            container.add([lockOverlay, lockIcon]);
        }

        // Character name with background
        const nameBg = this.add.rectangle(0, 10, cardWidth - 5, 18, 0x000000, 0.5);
        const nameText = this.add.text(0, 10, charData.name, {
            fontFamily: 'Tahoma, Verdana, sans-serif',
            fontSize: '11px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 1,
            wordWrap: { width: 65 },
            align: 'center'
        });
        nameText.setOrigin(0.5);
        container.add([nameBg, nameText]);

        // Description
        const descText = this.add.text(0, 27, charData.description, {
            fontFamily: 'Georgia, serif',
            fontSize: '7px',
            color: '#ecf0f1',
            align: 'center',
            lineSpacing: -1,
            wordWrap: { width: 70 }
        });
        descText.setOrigin(0.5);
        container.add(descText);



        // Interactive behavior
        cardBorder.setInteractive({ useHandCursor: charData.unlocked });

        cardBorder.on('pointerdown', () => {
            if (charData.unlocked) {
                this.selectCharacter(index);
            }
        });

        cardBorder.on('pointerover', () => {
            if (charData.unlocked && this.selectedIndex !== index) {
                container.setScale(1.05);
                glow.setStrokeStyle(6, charData.color, 0.3);
            }
        });

        cardBorder.on('pointerout', () => {
            if (this.selectedIndex !== index) {
                container.setScale(1);
                glow.setStrokeStyle(6, charData.color, 0);
            }
        });

        return {
            container,
            glow,
            cardBorder,
            preview,
            nameText,
            descText,
            index
        };
    }

    selectCharacter(index) {
        // Clear previous particles
        this.particleEmitters.forEach(emitter => emitter.destroy());
        this.particleEmitters = [];

        this.selectedIndex = index;
        const selectedChar = this.characters[index];

        // Update card styles
        this.characterCards.forEach((card, i) => {
            if (i === index) {
                // Selected card styling
                card.cardBorder.setStrokeStyle(3, selectedChar.color, 1);
                card.glow.setStrokeStyle(10, selectedChar.color, 0.8);

                // Smooth scale up animation
                this.tweens.add({
                    targets: card.container,
                    scale: 1.12,
                    duration: 300,
                    ease: 'Back.easeOut'
                });

                // Add particle effect for selected card
                if (selectedChar.unlocked) {
                    const particles = this.add.particles(card.container.x, card.container.y - 25, 'arrow', {
                        speed: { min: 10, max: 25 },
                        scale: { start: 0.015, end: 0 },
                        alpha: { start: 0.5, end: 0 },
                        lifespan: 1000,
                        blendMode: 'ADD',
                        frequency: 100,
                        tint: selectedChar.color,
                        angle: { min: 0, max: 360 }
                    });
                    this.particleEmitters.push(particles);
                }
            } else {
                // Unselected card styling
                card.cardBorder.setStrokeStyle(2, this.characters[i].color, 0.6);
                card.glow.setStrokeStyle(6, this.characters[i].color, 0);

                // Scale back
                this.tweens.add({
                    targets: card.container,
                    scale: 1,
                    duration: 200,
                    ease: 'Power2'
                });
            }
        });
    }

    navigateCharacter(direction) {
        let newIndex = this.selectedIndex + direction;
        if (newIndex < 0) newIndex = this.characters.length - 1;
        if (newIndex >= this.characters.length) newIndex = 0;
        this.selectCharacter(newIndex);
    }

    createImageButton(x, y, key, callback, scale = 1) {
        const button = this.add.sprite(x, y, key);
        button.setScale(scale);
        button.setInteractive({ useHandCursor: true });

        button.on('pointerover', () => {
            button.setTint(0xdddddd);
            button.setScale(scale * 1.05);
        });

        button.on('pointerout', () => {
            button.clearTint();
            button.setScale(scale);
        });

        button.on('pointerdown', () => {
            this.tweens.add({
                targets: button,
                scale: 0.95,
                duration: 50,
                yoyo: true,
                onComplete: callback
            });
        });

        return button;
    }
}
