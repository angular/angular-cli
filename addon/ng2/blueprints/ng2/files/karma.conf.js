module.exports = function(config) {
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
      },
    },
    files: [
      {pattern: 'node_modules/es6-shim/es6-shim.js', included: true, watched: true},
      {pattern: 'node_modules/systemjs/dist/system-polyfills.js', included: true, watched: true},
      {pattern: 'node_modules/angular2/bundles/angular2-polyfills.js', included: true, watched: true},
      {pattern: 'node_modules/systemjs/dist/system.src.js', included: true, watched: true},
      {pattern: 'node_modules/rxjs/bundles/Rx.js', included: true, watched: true},
      {pattern: 'node_modules/angular2/bundles/angular2.js', included: true, watched: true},
      {pattern: 'node_modules/angular2/bundles/http.dev.js', included: true, watched: true},
      {pattern: 'node_modules/angular2/bundles/router.dev.js', included: true, watched: true},
      {pattern: 'node_modules/angular2/bundles/testing.dev.js', included: true, watched: true},

      {pattern: 'node_modules/typescript/lib/typescript.js', included: true, watched: true},
      {pattern: 'karma-test-shim.js', included: true, watched: true},

      {pattern: 'src/app/**/*.ts', included: false, watched: true},
      {pattern: 'src/app/**/*.html', included: false, watched: true},
      {pattern: 'src/app/**/*.css', included: false, watched: true},
    ],
    proxies: {
      // required for component assets fetched by Angular's compiler
      "/app": "/base/src/app"
    },
    exclude: [],
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
