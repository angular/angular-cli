var webpack = require('webpack');
var path = require('path');

var UglifyJsPlugin = require('webpack/lib/optimize/UglifyJsPlugin');

module.exports = function(config) {
  config.target = 'node';
  config.entry =  {
    server: './src/server.ts',
    express: './src/server-express.ts'
  },
  config.output.filename = '[name]-bundle.js';
  config.output.library = 'universal';
  config.output.libraryTarget = 'commonjs2';

  config.externals = ignoreAlias(config);

  config.plugins.push(
    new UglifyJsPlugin()
  )
  config.node = {
    global: true,
    __dirname: true,
    __filename: true,
    process: true,
    Buffer: true
  };


  return config;
}


function ignoreAlias (config, log) {
  var aliass = []
  if (config && config.resolve && config.resolve.alias) {
    aliass = Object.keys(config.resolve.alias);
  }

  return function(context, request, cb) {
    if (aliass.includes(request)) {
      if (log) {
        console.log('resolve.alias', request);
      }
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
