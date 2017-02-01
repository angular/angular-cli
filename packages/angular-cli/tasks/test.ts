const Task = require('../ember-cli/lib/models/task');
import { TestOptions } from '../commands/test';
import * as path from 'path';
import { requireDependency } from '../utilities/require-project-module';

export default Task.extend({
  run: function (options: TestOptions) {
    const projectRoot = this.project.root;
    return new Promise((resolve) => {
      const karma = requireDependency(projectRoot, 'karma');
      const karmaConfig = path.join(projectRoot, this.project.ngConfig.config.test.karma.config);

      let karmaOptions: any = Object.assign({}, options);

      // Convert browsers from a string to an array
      if (options.browsers) {
        karmaOptions.browsers = options.browsers.split(',');
      }

      karmaOptions.angularCli = {
        codeCoverage: options.codeCoverage,
        sourcemap: options.sourcemap,
        progress: options.progress
      };

      // Assign additional karmaConfig options to the local ngapp config
      karmaOptions.configFile = karmaConfig;

      options.files = [
        {pattern: './src/test.ts', watched: false}
      ];

      // get the project's global scripts
      const scripts = this.project.ngConfig.config.apps[0].scripts;
      // if scripts exist, we should add them to Karma files
      if (scripts.length) {
        // add each script to the files array
        options.files.push.apply(options.files, scripts.map((script: any) => {
          // if script has node modules in it, we assume it is something local
          // otherwise we just take it as a URL

          if (script.indexOf('node_modules') > -1) {
            // script = path.resolve(path.join(rootPath, script));
            script = script.replace('..', '.');
          }

          return {pattern: script, watched: false, included: true, served: true};
        }));
      }
      // :shipit:
      const karmaServer = new karma.Server(karmaOptions, resolve);
      karmaServer.start();
    });
  }
});
