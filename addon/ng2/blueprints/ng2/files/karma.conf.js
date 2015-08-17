module.exports = function(config) {
  config.set({
    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['jasmine'],

    // list of files / patterns to load in the browser
    files: [
      'spec.bundle.js'
    ],

    // list of files to exclude
    exclude: [
    ],

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      'spec.bundle.js': ['webpack', 'sourcemap']
    },

    webpack: {
      resolve: {
        root: __dirname,
        extensions: ['','.ts','.js','.json']
      },
      devtool: 'inline-source-map',
      module: {
        loaders: [
          { test: /\.ts$/,   loader: 'typescript-simple?ignoreWarnings[]=2304', exclude: [
            /web_modules/,
            /node_modules/
          ]
          },
          { test: /\.json$/, loader: 'json' },
          { test: /\.html$/, loader: 'raw' },
          { test: /\.css$/,  loader: 'raw' }
        ]
      },
      stats: { colors: true, reasons: true },
      debug: false
    },

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress'],

    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,

    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['ChromeCanary'],

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true
  })
};