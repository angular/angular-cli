/// <reference path="../../typings/node/node.d.ts"/>
'use strict';

module.exports = function (gulp) {
  
  return function() {
    
    var nodeInspector = require('gulp-node-inspector');
    
    return gulp.src('../index.js').pipe(nodeInspector());
    
  }
  
};
