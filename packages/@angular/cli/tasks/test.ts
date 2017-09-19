import * as path from 'path';

import { TestOptions } from '../commands/test';
import { CliConfig } from '../models/config';
import { requireProjectModule } from '../utilities/require-project-module';
import { getAppFromConfig } from '../utilities/app-utils';
import {bazelBinDirectory, buildBazel, buildIBazel} from '../utilities/bazel-utils';

const Task = require('../ember-cli/lib/models/task');
const SilentError = require('silent-error');

// This is temporary.
// Once Alex E implement a karma bazel rule, this should get much simpler
export default Task.extend({
  run: function (options: TestOptions) {
    const projectConfig = CliConfig.fromProject().config;
    const projectRoot = this.project.root;
    const appConfig = getAppFromConfig(this.app);

    if (projectConfig.project && projectConfig.project.ejected) {
      throw new SilentError('An ejected project cannot use the build command anymore.');
    }
    if (appConfig.platform === 'server') {
      throw new SilentError('ng test for platform server applications is coming soon!');
    }

    return new Promise((resolve) => {
      const karma = requireProjectModule(projectRoot, 'karma');
      const karmaConfig = path.join(projectRoot, options.config ||
        CliConfig.getValue('test.karma.config'));

      let karmaOptions: any = Object.assign({}, options);

      // Convert browsers from a string to an array
      if (options.browsers) {
        karmaOptions.browsers = options.browsers.split(',');
      }

      karmaOptions.opts = {
        bin_dir: bazelBinDirectory(),
        app: appConfig.root,
        color: options.colors,
        progress: options.progress,
        log: options.log,
        port: options.port,
        reporters: options.reporters,
        sourcemaps: options.sourcemaps // TODO check that it works
      };

      // Assign additional karmaConfig options to the local ngapp config
      karmaOptions.configFile = karmaConfig;
      const karmaServer = new karma.Server(karmaOptions, resolve);

      const bazelTarget = path.parse(appConfig.root).dir;

      if (options.singleRun) {
        buildBazel(this.ui, `${bazelTarget}:compile_and_static`).then(() => {
          karmaServer.start();
        }).catch(() => {
          process.exit(1);
        });
      } else {
        buildIBazel(this.ui, `${bazelTarget}:compile_and_static`);
        karmaServer.start();
      }
    });
  }
});
