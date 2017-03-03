const SilentError = require('silent-error');

import { overrideOptions } from '../utilities/override-options';
import { CliConfig } from '../models/config';
import { ServeTaskOptions, baseServeCommandOptions } from './serve';
import { checkPort } from '../utilities/check-port';
import { oneLine } from 'common-tags';
const Command = require('../ember-cli/lib/models/command');


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
  description: 'Run e2e tests in existing project.',
  works: 'insideProject',
  availableOptions: overrideOptions([
    ...baseServeCommandOptions,
    {
      name: 'config',
      type: String,
      aliases: ['c'],
      description: oneLine`
        Use a specific config file.
        Defaults to the protractor config file in angular-cli.json.
      `
    },
    {
      name: 'specs',
      type: Array,
      default: [],
      aliases: ['sp'],
      description: oneLine`
        Override specs in the protractor config.
        Can send in multiple specs by repeating flag (ng e2e --specs=spec1.ts --specs=spec2.ts).
      `
    },
    {
      name: 'element-explorer',
      type: Boolean,
      default: false,
      aliases: ['ee'],
      description: 'Start Protractor\'s Element Explorer for debugging.'
    },
    {
      name: 'webdriver-update',
      type: Boolean,
      default: true,
      aliases: ['wu'],
      description: 'Try to update webdriver.'
    },
    {
      name: 'serve',
      type: Boolean,
      default: true,
      aliases: ['s'],
      description: oneLine`
        Compile and Serve the app.
        All non-reload related serve options are also available (e.g. --port=4400).
      `
    }
  ], [
    {
      name: 'port',
      default: 0,
      description: 'The port to use to serve the application.'
    },
    {
      name: 'watch',
      default: false,
      description: 'Run build when files change.'
    },
  ]),
  run: function (commandOptions: E2eTaskOptions) {
    const E2eTask = require('../tasks/e2e').E2eTask;

    const e2eTask = new E2eTask({
      ui: this.ui,
      project: this.project
    });

    if (!commandOptions.config) {
      const e2eConfig = CliConfig.fromProject().config.e2e;

      if (!e2eConfig.protractor.config) {
        throw new SilentError('No protractor config found in .angular-cli.json.');
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

        checkPort(commandOptions.port, commandOptions.host)
          .then((port: number) => commandOptions.port = port)
          .then(() => serve.run(commandOptions, rebuildCb))
          .catch(reject);
      });
    } else {
      return e2eTask.run(commandOptions);
    }
  }
});


export default E2eCommand;
