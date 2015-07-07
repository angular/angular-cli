var jasmine = require('gulp-jasmine');
var reporters = require('jasmine-reporters');

module.exports = function (gulp) {
    return function () {
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
