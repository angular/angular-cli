var gulp = require('gulp');
var del = require('del');

module.exports = function (opts) {
  gulp.task('clean', function() {
    return del('dist', function (err, paths) {
      return paths.length <= 0 ?
        console.log('Nothing to clean.') :
        console.log('Deleted folders:\n', paths.join('\n'));
    });
  });
};
