/// <reference path="../../typings/node/node.d.ts"/>
'use strict';

module.exports = function (gulp) {
  
  return function () {

    var $ = require('gulp-load-plugins')();  

    var tsProject = $.typescript.createProject('tsconfig.json');
  
    return tsProject.src()
      .pipe($.typescript(tsProject))
      .pipe(gulp.dest(tsProject.config.compilerOptions.outDir));
  
  };
  
};
