var gulp = require('gulp');
var size = require('gulp-size');
var replace = require('gulp-replace');
var codeRegex = /\/\/prebootInlineHere/;

module.exports = function (opts) {

  function runExample(name, opts) {
    var preboot = require('../dist/src/node/preboot_node');
    return gulp.src('examples/' + name + '.html')
      .pipe(replace(codeRegex, preboot.getInlineCode(opts)))
      .pipe(gulp.dest('dist'));
  }

  gulp.task('example.bufferAuto', ['dist'], function () {
    return runExample('preboot_buffer_auto', {
      buffer: true,
      appRoot: 'app'
    });
  });

  gulp.task('example.bufferManual', ['dist'], function () {
    return runExample('preboot_buffer_manual', {
      buffer: false,
      uglify: true,
      serverClientRoot: [
        { serverSelector: '.viewMainServer', clientSelector: '.viewMainClient' },
        { serverSelector: '#viewSideServer', clientSelector: '#viewSideClient' }
      ]
    });
  });

  gulp.task('example.bufferNone', ['dist'], function () {
    return runExample('preboot_buffer_none', {
      buffer: false,
      appRoot: 'app'
    });
  });

  gulp.task('example.bufferMultiapp', ['dist'], function () {
    return runExample('preboot_multiapp', {
      buffer: true,
      appRoot: ['app#app1', 'app#app2', 'app#app3']
    });
  });

    gulp.task('example.templates', [
    'example.bufferAuto',
    'example.bufferManual',
    'example.bufferNone',
    'example.bufferMultiapp'
  ], function () {
    return gulp.src('examples/preboot_examples.html').pipe(gulp.dest('dist'));
  });

  gulp.task('examples', [ 'dist', 'example.templates' ], function() {
    var express = require('express');
    var livereload = require('connect-livereload');
    var reloader = require('gulp-livereload');
    var serveStatic = require('serve-static');
    var open = require('open');
    var server = express();
    var LIVERELOAD_PORT = 35729;
    var PORT = 3000;

    server.use(livereload({
      port: LIVERELOAD_PORT
    }));

    server.use(serveStatic('dist'));

    server.listen(PORT);
    reloader.listen({
      port: LIVERELOAD_PORT,
      reloadPage: '/preboot_examples.html'
    });
    open('http://localhost:3000/preboot_examples.html');

    // if any TypeScript files change, run build again
    var watchFiles = opts.tsFiles;
    watchFiles.push('examples/*.html');
    watchFiles.push('buildtasks/*.js');
    gulp.watch(watchFiles, [ 'dist', 'example.templates' ]);

    // if dist stuff changes, reload
    gulp.watch(['dist/*'], function () { reloader.reload(); });
  });
};
