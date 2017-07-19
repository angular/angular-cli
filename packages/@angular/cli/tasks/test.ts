import * as path from 'path';

import { TestOptions } from '../commands/test';
import { CliConfig } from '../models/config';
import { requireProjectModule } from '../utilities/require-project-module';
import { getAppFromConfig } from '../utilities/app-utils';

const Task = require('../ember-cli/lib/models/task');
const SilentError = require('silent-error');


export default Task.extend({
  run: function (options: TestOptions) {
    const projectConfig = CliConfig.fromProject().config;
    const projectRoot = this.project.root;
    const app = getAppFromConfig(options.app);

    if (projectConfig.project && projectConfig.project.ejected) {
      throw new SilentError('An ejected project cannot use the build command anymore.');
    }

    let appKarmaConfig = CliConfig.getValue('test.karma.config');
    if (app.test.karma && app.test.karma.config ) {
      appKarmaConfig = app.test.karma.config;
    }

    return new Promise((resolve) => {
      const karma = requireProjectModule(projectRoot, 'karma');
      const karmaConfig = path.join(projectRoot, options.config || appKarmaConfig);

      let karmaOptions: any = Object.assign({}, options);

      // Convert browsers from a string to an array
      if (options.browsers) {
        karmaOptions.browsers = options.browsers.split(',');
      }

      karmaOptions.angularCli = {
        codeCoverage: options.codeCoverage,
        sourcemaps: options.sourcemaps,
        progress: options.progress,
        poll: options.poll,
        environment: options.environment,
        app: options.app
      };

      // Assign additional karmaConfig options to the local ngapp config
      karmaOptions.configFile = karmaConfig;

      // :shipit:
      const karmaServer = new karma.Server(karmaOptions, resolve);
      karmaServer.start();
    });
  }
});
