const path = require('path');

const config = require('./webpack.config.common.js');

const dist = path.resolve(__dirname, 'dist-old-ngo/');


config.output.path = dist;
config.module.rules.push({ test: /\.ts$/, loader: '@ngtools/webpack' })
config.module.rules.push({ test: /(\\|\/)@angular(\\|\/).*\.js$/, loader: 'ngo-loader' })
config.plugins.unshift(new (require('purify/purify-webpack-plugin'))());

module.exports = config;
