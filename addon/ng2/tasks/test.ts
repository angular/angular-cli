const Promise = require('ember-cli/lib/ext/promise');
const Task = require('ember-cli/lib/models/task');
const path = require('path');
const webpackTestConfig = require('../models/webpack-build-test').getWebpackTestConfig;

// require dependencies within the target project
function requireDependency(root, moduleName) {
  const packageJson = require(path.join(root, 'node_modules', moduleName, 'package.json'));
  const main = path.normalize(packageJson.main);
  return require(path.join(root, 'node_modules', moduleName, main));
}

module.exports = Task.extend({ 
  run: function (options) {
    const projectRoot = this.project.root;
    return new Promise((resolve) => {
      const karma = requireDependency(projectRoot, 'karma');
      const karmaConfig = path.join(projectRoot, this.project.ngConfig.test.karma.config);
      const testFile = `./${this.project.ngConfig.defaults.sourceDir}/test.ts`;

      options.plugins = [
        require('karma-webpack'),
        require('karma-jasmine'),
        require('karma-chrome-launcher'),
        require('karma-coverage'),
        require('karma-mocha-reporter'),
        require('karma-sourcemap-loader')
      ];
      options.reporters = ['coverage', 'mocha', 'progress'];

      // Abstract the webpack concepts from the local karma config.
      // Add those details here.

      // Single test entry file. Will run the test.ts bundle and track it.
      options.files = [{ pattern: testFile, watched: false }];
      options.preprocessors = { [testFile]: ['webpack','sourcemap'] };
      options.webpack = webpackTestConfig(projectRoot);
      options.webpackMiddleware = {
        noInfo: true, // Hide webpack output because its noisy.
        stats: { // Also prevent chunk and module display output, cleaner look. Only emit errors.
          assets: false,
          colors: true,
          version: false,
          hash: false,
          timings: false,
          chunks: false,
          chunkModules: false
        }
      };

      // Convert browsers from a string to an array
      if (options.browsers) {
        options.browsers = options.browsers.split(',');
      }

      // Assign additional karmaConfig options to the local ngapp config
      options.configFile = karmaConfig;

      // :shipit:
      const karmaServer = new karma.Server(options, resolve);
      karmaServer.start();
    });
  }
});
