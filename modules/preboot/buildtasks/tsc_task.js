var gulp = require('gulp');
var size = require('gulp-size');
var typescript = require('gulp-typescript');
var path = require('path');

module.exports = function (opts) {
  gulp.task('tsc', [ 'clean' ], function () {
    var tsConfig = path.join(opts.rootDir, 'tsconfig.json');
    var tsProject = typescript.createProject(tsConfig, {
      declaration: true
    });
    // TODO(gdi2290): missing declaration file stream
    return tsProject.src().
      pipe(typescript(tsProject)).
      pipe(size()).
      pipe(gulp.dest(tsProject.config.compilerOptions.outDir));
  });
};
