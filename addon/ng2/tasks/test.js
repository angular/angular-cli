/* jshint node: true */
'use strict';

var Promise = require('ember-cli/lib/ext/promise');
var Task = require('ember-cli/lib/models/task');
var path = require('path');

// require dependencies within the target project
function requireDependency(root, moduleName) {
  var packageJson = require(path.join(root, 'node_modules', moduleName, 'package.json'));
  var main = path.normalize(packageJson.main);
  return require(path.join(root, 'node_modules', moduleName, main));
}

module.exports = Task.extend({

  run: function (options) {
    var projectRoot = this.project.root;
    return new Promise((resolve) => {
      var karma = requireDependency(projectRoot, 'karma');
      var karmaConfig = path.join(projectRoot, this.project.ngConfig.test.karma.config);

      // Convert browsers from a string to an array
      if (options.browsers) {
        options.browsers = options.browsers.split(',');
      }
      options.configFile = karmaConfig;
      var karmaServer = new karma.Server(options, resolve);

      karmaServer.start();
    });
  }
});
