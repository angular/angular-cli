var jasmine = require('gulp-jasmine');
var reporters = require('jasmine-reporters');
var KarmaServer = require('karma').Server;

module.exports = function (gulp, opts) {
  return {
    karma: function (done) {
      var karmaCode = 'examples/preboot/preboot_karma.js';
      var karmaConfig = {
        port: 9201,
        runnerPort: 9301,
        captureTimeout: 20000,
        growl: true,
        colors: true,
        browsers: [].concat(opts.browser || 'PhantomJS'),
        reporters: [].concat(opts.reporter || 'progress'),
        plugins: [
          'karma-jasmine',
          'karma-phantomjs-launcher',
          'karma-chrome-launcher'
        ],
        frameworks: ['jasmine'],
        preprocessors: {},
        coverageReporter: { type: 'text-summary', dir: 'test/coverage/' },
        singleRun: !opts.watch,
        autoWatch: !!opts.watch,
        files: [karmaCode]
      };

      // add coverage reporter and preprocessor if param set at command line
      if (opts.cov) {
        karmaConfig.reporters.push('coverage');
        karmaConfig.preprocessors[karmaCode] = 'coverage';
      }

      var server = new KarmaServer(karmaConfig, function () { done(); });
      server.start();
    },
    
    // server side unit tests for preboot using jasmine
    unit: function () {
      return gulp.src('dist/modules/preboot/test/**/*_spec.js')
        .pipe(jasmine({
          reporter: new reporters.TerminalReporter({
            verbose: 3,
            showStack: true,
            color: true
          })
        }));
    },
    '': ['test.unit']
  };
};
