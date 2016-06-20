var gulp = require('gulp');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var replace = require('gulp-replace');

module.exports = function (opts) {

  gulp.task('dist.min', ['tsc'], function () {
    return gulp.src([
      'dist/src/browser/preboot_browser.js',
      'dist/src/inline/preboot_inline.js'
    ])
      .pipe(replace(/exports\..*;/, ''))
      .pipe(uglify())
      .pipe(rename(function (path) {
        path.extname = '.min.js';
        return path;
      }))
      .pipe(gulp.dest('dist'));
  });

  gulp.task('dist.client', [ 'tsc' ], function () {
    return gulp.src([
      'dist/src/browser/preboot_browser.js',
      'dist/src/inline/preboot_inline.js'
    ])
      .pipe(replace(/exports\..*;/, ''))
      .pipe(gulp.dest('dist'));
  });

  gulp.task('dist.server', [ 'tsc' ], function () {
    return gulp.src([
      'dist/src/node/preboot_node.js'
    ])
      .pipe(gulp.dest('dist'));
  });

  gulp.task('dist', ['dist.min', 'dist.client', 'dist.server']);
};
