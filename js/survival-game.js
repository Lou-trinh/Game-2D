import Phaser from 'phaser';
import PhaserMatterCollisionPlugin from 'phaser-matter-collision-plugin';
import MenuScene from "./MenuScene";
import CharacterSelectScene from "./CharacterSelectScene";
import MainScene from "./MainScene";
import GameOverScene from "./GameOverScene.js";
import ReviveScene from './ReviveScene.js';
import SceneLoading from './SceneLoading.js';
import SceneShop from './SceneShop.js';

const config = {
  width: 512,
  height: 512,
  backgroundColor: '#ffffff',
  type: Phaser.AUTO,
  parent: 'survival-game',
  scene: [SceneLoading, MenuScene, CharacterSelectScene, MainScene, GameOverScene, ReviveScene, SceneShop],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 512,
    height: 512
  },
  pixelArt: true,
  roundPixels: true,
  physics: {
    default: 'matter',
    matter: {
      debug: false,
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
