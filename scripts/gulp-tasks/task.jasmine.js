/// <reference path="../../typings/node/node.d.ts"/>
'use strict';

module.exports = function (gulp) {
  
  return function () {
  
    var jasmine = require('gulp-jasmine');
    var reporters = require('jasmine-reporters');

    return gulp.src('dist/**/*_spec.js')
      .pipe(jasmine({
        reporter: new reporters.TerminalReporter({
          verbose: 3,
          showStack: true,
          color: true
        })
      }));
  
  };
  
};
