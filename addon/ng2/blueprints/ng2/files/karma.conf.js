module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher')
    ],
    customLaunchers: {
      // chrome setup for travis CI using chromium
      Chrome_travis_ci: {
        base: 'Chrome',
        flags: ['--no-sandbox']
      }
    },
    files: [
      { pattern: 'vendor/es6-shim/es6-shim.js', included: true, watched: false },
      { pattern: 'vendor/zone.js/dist/zone.js', included: true, watched: false },
      { pattern: 'vendor/reflect-metadata/Reflect.js', included: true, watched: false },
      { pattern: 'https://code.angularjs.org/tools/system.js', included: true, watched: false },
      { pattern: 'https://code.angularjs.org/2.0.0-beta.16/Rx.js', included: true, watched: false },

      { pattern: 'karma-test-shim.js', included: true, watched: true },

      // paths loaded via module imports
      { pattern: 'dist/**/*.js', included: false, watched: true },

      // paths loaded via Angular's component compiler
      // (these paths need to be rewritten, see proxies section)
      { pattern: 'dist/**/*.html', included: false, watched: true },
      { pattern: 'dist/**/*.css', included: false, watched: true },

      // paths to support debugging with source maps in dev tools
      { pattern: 'dist/**/*.ts', included: false, watched: false },
      { pattern: 'dist/**/*.js.map', included: false, watched: false }
    ],
    proxies: {
      // required for component assets fetched by Angular's compiler
      '/': '/base/dist/'
    },
    exclude: [
      // Vendor packages might include spec files. We don't want to use those.
      'dist/vendor/**/*.spec.js'
    ],
    preprocessors: {},
    reporters: ['progress'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['Chrome'],
    singleRun: false
  });
};
