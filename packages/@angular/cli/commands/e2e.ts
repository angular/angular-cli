const SilentError = require('silent-error');

import { CliConfig } from '../models/config';
import { ServeTaskOptions, baseServeCommandOptions } from './serve';
const Command = require('../ember-cli/lib/models/command');


export interface E2eTaskOptions extends ServeTaskOptions {
  config: string;
  serve: boolean;
  webdriverUpdate: boolean;
  specs: string[];
  elementExplorer: boolean;
}

export const e2eCommandOptions = baseServeCommandOptions.concat([
  { name: 'config', type: String, aliases: ['c'] },
  { name: 'specs', type: Array, default: [], aliases: ['sp'] },
  { name: 'element-explorer', type: Boolean, default: false, aliases: ['ee'] },
  { name: 'webdriver-update', type: Boolean, default: true, aliases: ['wu'] },
  { name: 'serve', type: Boolean, default: true, aliases: ['s'] }
]);


const E2eCommand = Command.extend({
  name: 'e2e',
  aliases: ['e'],
  description: 'Run e2e tests in existing project',
  works: 'insideProject',
  availableOptions: e2eCommandOptions,
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
      return serve.run(commandOptions, () => e2eTask.run(commandOptions));
    } else {
      return e2eTask.run(commandOptions);
    }
  }
});


export default E2eCommand;
