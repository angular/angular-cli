/// <reference path="../../typings/node/node.d.ts"/>
'use strict';

// This task is used to lint TypeScript files.
module.exports = function (gulp) {
  
  return function () {
    
    var $ = require('gulp-load-plugins')();
    
    return gulp.src(['modules/**/*.ts'])
      .pipe($.tslint())
			.pipe($.tslint.report('verbose'));

  };
  
};
