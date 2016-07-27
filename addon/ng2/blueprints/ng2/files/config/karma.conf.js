// Karma configuration file, see link for more information		
// https://karma-runner.github.io/0.13/config/configuration-file.html

module.exports = function (config) {
  config.set({
    basePath: '..',
    frameworks: ['jasmine', 'angular-cli'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-coverage'),
      require('angular-cli/plugins/karma'),
      require('karma-remap-istanbul')
    ],
    customLaunchers: {
      // chrome setup for travis CI using chromium
      Chrome_travis_ci: {
        base: 'Chrome',
        flags: ['--no-sandbox']
      }
    },
    files: [
      { pattern: './src/test.ts', watched: false }
    ],
    preprocessors: {
      './src/**/**/*.ts': ['angular-cli-coverage'],
      './src/test.ts': ['angular-cli']
    },
    coverageReporter: {
      dir: 'coverage',
      reporters: [
        {
          type: 'text-summary'
        },
        {
          type: 'json',
          subdir: '.',
          file: 'coverage-final.json'
        }
      ]
    },

    remapIstanbulReporter: {
      src: 'coverage/coverage-final.json',
      reports: {
        lcovonly: 'coverage/lcov.info',
        html: 'coverage/report'
      },
      timeoutNotCreated: 5000,
      timeoutNoMoreFiles: 1000
    },
    angularCliConfig: './angular-cli.json',
    reporters: ['coverage', 'progress', 'karma-remap-istanbul'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['Chrome'],
    singleRun: false
  });
};
