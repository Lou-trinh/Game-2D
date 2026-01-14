import Phaser from 'phaser';
import PhaserMatterCollisionPlugin from 'phaser-matter-collision-plugin';
import MenuScene from "./MenuScene";
import CharacterSelectScene from "./CharacterSelectScene";
import MainScene from "./MainScene";

const config = {
  width: 512,
  height: 512,
  backgroundColor: '#ffffff',
  type: Phaser.AUTO,
  parent: 'survival-game',
  scene: [MenuScene, CharacterSelectScene, MainScene],
  scale: {
    zoom: 2,
  },
  physics: {
    default: 'matter',
    matter: {
      debug: true,
      gravity: { x: 0, y: 0 },
    }
  },
  plugins: {
    scene: [
      {
        plugin: PhaserMatterCollisionPlugin,
        key: 'matterCollision',
        mapping: 'matterCollision'
      }
    ]
  }
}

new Phaser.Game(config);
