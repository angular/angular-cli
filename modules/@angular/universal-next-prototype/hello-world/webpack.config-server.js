var webpack = require('webpack');
var path = require('path');

module.exports = function(config) {
  config.target = 'node';
  config.entry =  './src/server.ts',
  config.output.filename = 'server-bundle.js';
  config.output.library = 'universal';
  config.output.libraryTarget = 'commonjs2';

  config.externals = ignoreAlias(config);
  config.node = {
    global: true,
    __dirname: true,
    __filename: true,
    process: true,
    Buffer: true
  };


  return config;
}


function ignoreAlias (config) {
  var aliass = []
  if (config && config.resolve && config.resolve.alias) {
    aliass = Object.keys(config.resolve.alias);
  }

  return function(context, request, cb) {
    if (aliass.includes(request)) {
      console.log('resolve.alias', request)
      return cb();
    }
    return checkNodeImport(context, request, cb);
  }
}

function checkNodeImport(context, request, cb) {
  if (!path.isAbsolute(request) && request.charAt(0) !== '.') {
    return cb(null, 'commonjs ' + request);
  }
  return cb();
}
