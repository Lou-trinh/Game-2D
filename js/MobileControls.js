import Phaser from 'phaser';

export default class MobileControls {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.pointerId = null;
    this.radius = 54;
    this.knobRadius = 22;
    this.center = new Phaser.Math.Vector2(78, scene.cameras.main.height - 78);

    this.player.mobileMoveVector = new Phaser.Math.Vector2(0, 0);
    this.player.mobileFireHeld = false;

    if (!this.shouldShow()) return;

    this.createJoystick();
    this.createActionButtons();
  }

  shouldShow() {
    const os = this.scene.sys.game.device.os;
    return os.android || os.iOS || window.innerWidth <= 900 || 'ontouchstart' in window;
  }

  createJoystick() {
    this.base = this.scene.add.circle(this.center.x, this.center.y, this.radius, 0x000000, 0.35);
    this.base.setStrokeStyle(3, 0xffffff, 0.4);
    this.base.setScrollFactor(0);
    this.base.setDepth(30000);
    this.base.setInteractive(
      new Phaser.Geom.Circle(this.radius, this.radius, this.radius),
      Phaser.Geom.Circle.Contains
    );

    this.knob = this.scene.add.circle(this.center.x, this.center.y, this.knobRadius, 0xffffff, 0.45);
    this.knob.setStrokeStyle(2, 0xffffff, 0.75);
    this.knob.setScrollFactor(0);
    this.knob.setDepth(30001);

    this.base.on('pointerdown', (pointer, _x, _y, event) => {
      event?.stopPropagation();
      this.pointerId = pointer.id;
      this.updateJoystick(pointer);
    });

    this.scene.input.on('pointermove', (pointer) => {
      if (pointer.id === this.pointerId) {
        this.updateJoystick(pointer);
      }
    });

    this.scene.input.on('pointerup', (pointer) => {
      if (pointer.id === this.pointerId) {
        this.pointerId = null;
        this.player.mobileMoveVector.set(0, 0);
        this.knob.setPosition(this.center.x, this.center.y);
      }
    });
  }

  updateJoystick(pointer) {
    const pointerPos = new Phaser.Math.Vector2(pointer.x, pointer.y);
    const delta = pointerPos.subtract(this.center);

    if (delta.length() > this.radius) {
      delta.setLength(this.radius);
    }

    this.knob.setPosition(this.center.x + delta.x, this.center.y + delta.y);
    this.player.mobileMoveVector.copy(delta).scale(1 / this.radius);
  }

  createActionButtons() {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;

    this.createButton(width - 72, height - 78, 52, 'FIRE', () => {
      this.player.mobileFireHeld = true;
    }, () => {
      this.player.mobileFireHeld = false;
    });

    this.createButton(width - 142, height - 76, 34, 'R', () => {
      this.player.reloadWeapon?.();
    });

    this.createButton(width - 72, height - 150, 34, 'SW', () => {
      this.switchToNextWeapon();
    });

    this.createButton(width - 142, height - 146, 34, 'D', () => {
      const direction = this.player.mobileMoveVector?.clone() || new Phaser.Math.Vector2(0, 0);
      this.player.performDash?.(direction);
    });
  }

  createButton(x, y, radius, label, onDown, onUp = null) {
    const button = this.scene.add.circle(x, y, radius, 0x111827, 0.55);
    button.setStrokeStyle(3, 0xffffff, 0.55);
    button.setScrollFactor(0);
    button.setDepth(30000);
    button.setInteractive();

    const text = this.scene.add.text(x, y, label, {
      fontSize: radius > 40 ? '13px' : '11px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    });
    text.setOrigin(0.5);
    text.setScrollFactor(0);
    text.setDepth(30001);

    button.on('pointerdown', (pointer, _x, _y, event) => {
      event?.stopPropagation();
      button.setAlpha(0.85);
      onDown?.(pointer);
    });

    button.on('pointerup', (pointer, _x, _y, event) => {
      event?.stopPropagation();
      button.setAlpha(1);
      onUp?.(pointer);
    });

    button.on('pointerout', () => {
      button.setAlpha(1);
      onUp?.();
    });

    return { button, text };
  }

  switchToNextWeapon() {
    const current = parseInt(this.player.activeSlot.replace('slot', ''), 10) || 1;

    for (let offset = 1; offset <= 4; offset++) {
      const next = ((current - 1 + offset) % 4) + 1;
      if (this.player.weaponSlots[`slot${next}`]) {
        this.player.switchWeapon(next);
        return;
      }
    }
  }
}
