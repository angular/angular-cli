var gulp = require('gulp');

module.exports = function (opts) {
  gulp.task('watch', function(){
    gulp.watch(opts.tsFiles, ['tsc']);
    gulp.watch(opts.testFiles, ['jasmine']);
  });
};
