const SilentError = require('silent-error');

import { Command, CommandScope } from '../models/command';
import { overrideOptions } from '../utilities/override-options';
import { CliConfig } from '../models/config';
import { ServeTaskOptions, baseServeCommandOptions } from './serve';
import { checkPort } from '../utilities/check-port';
import { oneLine } from 'common-tags';


export interface E2eTaskOptions extends ServeTaskOptions {
  config: string;
  serve: boolean;
  webdriverUpdate: boolean;
  specs: string[];
  suite: string;
  elementExplorer: boolean;
}

export default class E2eCommand extends Command {
  public readonly name = 'e2e';
  public readonly description = 'Run e2e tests in existing project.';
  public static aliases: string[] = ['e'];
  public readonly scope = CommandScope.inProject;
  public readonly arguments: string[] = [];

  public options = overrideOptions([
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
      name: 'suite',
      type: String,
      aliases: ['su'],
      description: oneLine`
        Override suite in the protractor config.
        Can send in multiple suite by comma separated values (ng e2e --suite=suiteA,suiteB).
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
  ]);

  validate(options: E2eTaskOptions) {
    if (!options.config) {
      const e2eConfig = CliConfig.fromProject().config.e2e;
      if (!e2eConfig.protractor.config) {
        throw new SilentError('No protractor config found in .angular-cli.json.');
      }
    }
    return true;
  }

  run(options: E2eTaskOptions) {
    const E2eTask = require('../tasks/e2e').E2eTask;

    const e2eTask = new E2eTask({
      ui: this.ui,
      project: this.project
    });

    if (!options.config) {
      const e2eConfig = CliConfig.fromProject().config.e2e;

      options.config = e2eConfig.protractor.config;
    }

    if (options.serve) {
      const ServeTask = require('../tasks/serve').default;

      const serve = new ServeTask({
        ui: this.ui,
        project: this.project,
      });

      // Protractor will end the proccess, so we don't need to kill the dev server
      // TODO: Convert this promise to use observables which will allow for retries.
      return new Promise((resolve, reject) => {
        let firstRebuild = true;
        function rebuildCb(stats: any) {
          // don't run re-run tests on subsequent rebuilds
          const cleanBuild = !!!stats.compilation.errors.length;
          if (firstRebuild && cleanBuild) {
            firstRebuild = false;
            return resolve(e2eTask.run(options));
          } else {
            return reject('Build did not succeed. Please fix errors before running e2e task');
          }
        }

        checkPort(options.port, options.host)
          .then((port: number) => options.port = port)
          .then(() => serve.run(options, rebuildCb))
          .catch(reject);
      });
    } else {
      return e2eTask.run(options);
    }
  }
}
