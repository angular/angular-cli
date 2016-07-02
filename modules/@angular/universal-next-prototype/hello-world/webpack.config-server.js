var webpack = require('webpack');
var path = require('path');

module.exports = function(config) {
  config.target = 'node';
  config.entry =  './src/server.ts',
  config.output.filename = 'server-bundle.js';
  config.output.library = 'universal';
  config.output.libraryTarget = 'commonjs2';

  config.externals = checkNodeImport;
  config.node = {
    global: true,
    __dirname: true,
    __filename: true,
    process: true,
    Buffer: true
  };


  return config;
}


function checkNodeImport(context, request, cb) {
  if (!path.isAbsolute(request) && request.charAt(0) !== '.') {
    cb(null, 'commonjs ' + request); return;
  }
  cb();
}
