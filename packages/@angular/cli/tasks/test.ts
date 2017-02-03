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

      // :shipit:
      const karmaServer = new karma.Server(karmaOptions, resolve);
      karmaServer.start();
    });
  }
});
