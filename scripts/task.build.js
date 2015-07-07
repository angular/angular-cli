/**
 * This task is used to build all resources need to run examples
 */
module.exports = function (gulp) {
  return function () {
    return gulp.start('build.server')
  };
};
