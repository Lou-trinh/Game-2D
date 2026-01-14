// @ts-nocheck
/* eslint-disable */
const path = require('path');

module.exports = {
  entry: {
    app: './js/survival-game.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    clean: true,
    filename: 'js/[name].js',
  },
};
