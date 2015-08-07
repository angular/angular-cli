/// <reference path="../../typings/node/node.d.ts"/>
'use strict';

module.exports = function (gulp) {
  
  return function () {

    var $ = require('gulp-load-plugins')();  

    var tsProject = $.typescript.createProject('tsconfig.json');
  
    return gulp.watch(tsProject.config.files, function(){
      
      return gulp.start('build.typescript');

    });
  
  };
  
};
