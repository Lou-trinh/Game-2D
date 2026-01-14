const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  stats: 'minimal',
  devServer: {
    liveReload: true,
    hot: true,
    open: true,
    static: ['./'],
    client: {
      logging: 'warn',
    },
  },
});
