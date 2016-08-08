var webpack = require('webpack');
var path = require('path');

module.exports = function(config) {
  config.target = 'web';
  config.entry =  './src/client.ts',
  config.output.filename = 'public/browser-bundle.js';
  config.output.library = 'universal';
  config.output.libraryTarget = 'var';

  config.node = {
    global: true,
    __dirname: true,
    __filename: true,
    process: true,
    Buffer: false,
    module: false,
  };

  return config;
};
