var gulp = require('gulp');
var size = require('gulp-size');

module.exports = function (opts) {

  // build version of preboot to be used in a simple example
  gulp.task('example.build', [ 'tsc' ], function() {
    var exec = require('child_process').exec;
    var distExampleDir = 'dist/example';

    // need to clear out preboot in require cache for when we are watching
    for (var key in require.cache) {
      if (require.cache.hasOwnProperty(key) && key.indexOf(opts.distDir) >= 0) {
        delete require.cache[key];
      }
    }

    // now pull in the latest preboot code
    var preboot = require(opts.prebootNode);

    // copy static files to dist
    exec('mkdir -p ./dist');
    exec('mkdir -p ./' + distExampleDir);
    exec('cp -fR example/. ' + distExampleDir);

    return preboot.getBrowserCodeStream({
      appRoot:  'app',         // selector for root element
      freeze:   'spinner',     // show spinner w button click & freeze page
      replay:   'rerender',    // rerender replay strategy
      buffer:   true,          // client app will write to hidden div until bootstrap complete
      debug:    true,
      uglify:   false,
      presets:  [ 'keyPress', 'buttonPress', 'focus' ]
    }).
      pipe(size()).
      pipe(gulp.dest(distExampleDir));
  });

  gulp.task('example', [ 'example.build' ], function() {
    var express = require('express');
    var livereload = require('connect-livereload');
    var reloader = require('gulp-livereload');
    var serveStatic = require('serve-static');
    var exec = require('child_process').exec;
    var open = require('open');
    var server = express();
    var LIVERELOAD_PORT = 35729;
    var PORT = 3000;

    server.use(livereload({
      port: LIVERELOAD_PORT
    }));

    server.use(serveStatic('dist/example'));

    server.listen(PORT);
    reloader.listen({
      port: LIVERELOAD_PORT,
      reloadPage: '/preboot_example.html'
    });
    open('http://localhost:3000/preboot_example.html');

    exec('tsc -w');
    gulp.watch(opts.tsFiles, [ 'example.build' ]);
    gulp.watch('dist/example/preboot.js', function () {
      reloader.reload();
    });
  });
};
