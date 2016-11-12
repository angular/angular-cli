const Task = require('../ember-cli/lib/models/task');
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

      options.angularCli = {
        codeCoverage: options.codeCoverage,
        lint: options.lint,
      };

      // Assign additional karmaConfig options to the local ngapp config
      options.configFile = karmaConfig;

      options.files = [
        { pattern: './src/test.ts', watched: false }
      ];

      // get the project's global scripts
      const scripts = this.project.ngConfig.config.apps[0].scripts;
      // if scripts exist, we should add them to Karma files
      if (scripts.length){
        // add each script to the files array
        options.files.push.apply(options.files, scripts.map((script) => {
          // if script has node modules in it, we assume it is something local
          // otherwise we just take it as a URL

          if (script.indexOf('node_modules') > -1){
            //script = path.resolve(path.join(rootPath, script));
            script = script.replace('..', '.');
          }

          return { pattern: script, watched: false, included: true, served: true };
        }));
      }
      // :shipit:
      const karmaServer = new karma.Server(options, resolve);
      karmaServer.start();
    });
  }
});
