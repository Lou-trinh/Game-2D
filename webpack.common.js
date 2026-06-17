// @ts-nocheck
/* eslint-disable */
const path = require('path');
const webpack = require('webpack');
const dotenv = require('dotenv');

// Merge .env file (local) with actual process.env (Cloudflare build vars)
dotenv.config();
const env = {
  FIREBASE_API_KEY: process.env.FIREBASE_API_KEY || '',
  FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN || '',
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
  FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || '',
  FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
  FIREBASE_APP_ID: process.env.FIREBASE_APP_ID || '',
};

module.exports = {
  entry: {
    app: './js/survival-game.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    clean: true,
    filename: 'js/[name].js',
  },
  plugins: [
    new webpack.DefinePlugin({ 'process.env': JSON.stringify(env) }),
  ],
};
