var gulp = require('gulp');
var tslint = require('gulp-tslint');
var path = require('path');

module.exports = function (opts) {
  gulp.task('lint', function () {
    var tslintConfig = require(path.join(opts.rootDir, 'tslint.json'));

    return gulp.src(opts.tsFiles).
      pipe(tslint({
        configuration: tslintConfig
      })).
      pipe(tslint.report('verbose'));
  });
};
