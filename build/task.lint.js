var tslint = require('gulp-tslint');

module.exports = function (gulp) {
    return function () {
        return gulp.src(['modules/**/*.ts'])
            .pipe(tslint())
						.pipe(tslint.report('verbose'));
    };
};