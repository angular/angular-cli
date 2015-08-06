/// <reference path="../tsd_typings/tsd.d.ts"/>

var source = require('vinyl-source-stream');

/**
 * This task is used to build all resources need to run examples
 */
module.exports = function (gulp) {
  return {
    
    // build a version of preboot to examples so we can do manual tests and karma unit tests
    preboot: function () {
      var preboot = require('../dist/modules/preboot/server');
      return preboot.getClientCodeStream({
        appRoot:  'app',         // selector for root element
        freeze:   'spinner',     // show spinner w button click & freeze page
        replay:   'rerender',    // rerender replay strategy
        buffer:   true,          // client app will write to hidden div until bootstrap complete
        debug:    true,
        uglify:   false,
        presets:  ['keyPress', 'buttonPress', 'focus']
      })
      .pipe(gulp.dest('./examples/preboot')); 
    },
    
    // this is for building a package that is used for karma testing
    karma: function () {
      var browserify = require('browserify');
      var b = browserify({
        entries: [__dirname + '/../dist/modules/preboot/test/preboot_karma'],
        basedir: __dirname + '/../dist/modules/preboot/src/client',
        browserField: false
      });
      
      return b.bundle()
        .pipe(source('preboot_karma.js'))
        .pipe(gulp.dest(__dirname + '/../examples/preboot'));
    },
    '': ['build.preboot', 'build.karma']
  };
};
