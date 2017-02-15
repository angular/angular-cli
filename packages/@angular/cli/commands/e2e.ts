const SilentError = require('silent-error');

import { CliConfig } from '../models/config';
import { availableOptions } from './e2e.options';
const Command = require('../ember-cli/lib/models/command');

import { ServeTaskOptions } from './serve';

export interface E2eTaskOptions extends ServeTaskOptions {
  config: string;
  serve: boolean;
  webdriverUpdate: boolean;
  specs: string[];
  elementExplorer: boolean;
}

const E2eCommand = Command.extend({
  name: 'e2e',
  aliases: ['e'],
  description: 'Run e2e tests in existing project',
  works: 'insideProject',
  availableOptions: availableOptions,
  run: function (commandOptions: E2eTaskOptions) {
    const E2eTask = require('../tasks/e2e').E2eTask;
    this.project.ngConfig = this.project.ngConfig || CliConfig.fromProject();

    const e2eTask = new E2eTask({
      ui: this.ui,
      project: this.project
    });

    if (!commandOptions.config) {
      const e2eConfig = CliConfig.fromProject().config.e2e;

      if (!e2eConfig.protractor.config) {
        throw new SilentError('No protractor config found in angular-cli.json.');
      }

      commandOptions.config = e2eConfig.protractor.config;
    }

    if (commandOptions.serve) {
      const ServeTask = require('../tasks/serve').default;

      const serve = new ServeTask({
        ui: this.ui,
        project: this.project,
      });

      // Protractor will end the proccess, so we don't need to kill the dev server
      return new Promise((resolve, reject) => {
        let firstRebuild = true;
        function rebuildCb() {
          // don't run re-run tests on subsequent rebuilds
          if (firstRebuild) {
            firstRebuild = false;
            return resolve(e2eTask.run(commandOptions));
          }
        }

        serve.run(commandOptions, rebuildCb)
          .catch(reject);
      });
    } else {
      return e2eTask.run(commandOptions);
    }
  }
});


export default E2eCommand;
