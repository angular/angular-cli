/// <reference path="../../typings/node/node.d.ts"/>
'use strict';

module.exports = function (gulp) {
  
  return function() {
    return gulp.start('build.preboot');
  }
  
};
