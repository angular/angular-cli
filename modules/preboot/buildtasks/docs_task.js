var gulp = require('gulp');
var typedoc = require('gulp-typedoc');

module.exports = function (opts) {
  gulp.task('docs', function() {
    return gulp.src(['src/**/*.ts'])
      .pipe(typedoc({

        // typescript options
        module: 'commonjs',
        target: 'es5',
        includeDeclarations: true,

        // typedoc options
        out: './docs',
        name: 'Preboot',
        theme: 'default',
        ignoreCompilerErrors: true,
        version: true
      }));
  });
};
