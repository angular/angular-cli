export default function(config) {
  var testWebpackConfig = require('./webpack.test.js');
  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    exclude: [ ],
    files: [ { pattern: './config/spec-bundle.js', watched: false } ],
    coverageReporter: {
      dir : 'coverage/',
      reporters: [
        { type: 'text-summary' },
        { type: 'json' },
        { type: 'html' }
      ]
    },
    preprocessors: { './config/spec-bundle.js': ['coverage', 'webpack', 'sourcemap'] },
    webpack: testWebpackConfig,
    webpackServer: { noInfo: true },
    reporters: ['progress', 'mocha', 'coverage' ],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: false,
    browsers: [
      // 'Chrome',
      'PhantomJS'
    ],
    singleRun: true
  });
};
