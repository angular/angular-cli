/// <reference path="../../typings/node/node.d.ts"/>
'use strict';

// This task is used to generate a changelog.
module.exports = function (gulp, opts) {
  
  return function () {
    
    var conventionalChangelog = require('conventional-changelog'),
      fs = require('fs');
      
    return conventionalChangelog({
      preset: 'angular'
    })
    .pipe(fs.createWriteStream(opts.paths.changelog.filename));

  };
  
};
