const path = require('path');

const config = require('./webpack.config.common.js');


const dist = path.resolve(__dirname, 'dist-no-ngo/');

config.output.path = dist;
config.module.rules.push({ test: /\.ts$/, loader: '@ngtools/webpack' })

module.exports = config;