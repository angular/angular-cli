const Task = require('ember-cli/lib/models/task');
import * as path from 'path';

// require dependencies within the target project
function requireDependency(root: string, moduleName: string) {
  const packageJson = require(path.join(root, 'node_modules', moduleName, 'package.json'));
  const main = path.normalize(packageJson.main);
  return require(path.join(root, 'node_modules', moduleName, main));
}

export default Task.extend({
  run: function (options: any) {
    const projectRoot = this.project.root;
    return new Promise((resolve) => {
      const karma = requireDependency(projectRoot, 'karma');
      const karmaConfig = path.join(projectRoot, this.project.ngConfig.config.test.karma.config);

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
