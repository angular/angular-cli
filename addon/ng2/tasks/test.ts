import * as Promise from 'ember-cli/lib/ext/promise';
import * as Task from 'ember-cli/lib/models/task';
import * as path from 'path';
import { getWebpackTestConfig } from '../models/webpack-build-test';

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
