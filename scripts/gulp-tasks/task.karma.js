/// <reference path="../../typings/node/node.d.ts"/>
'use strict';

// https://github.com/karma-runner/gulp-karma

module.exports = function (gulp) {
  
  return function(done) {
    
    var path = require('path');
    var Server = require('karma').Server;

    return new Server({
      configFile: path.resolve(__dirname + '/../../karma.conf.js'),
      singleRun: true
    }, done).start();
    
  }
  
};
