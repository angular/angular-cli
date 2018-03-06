import { ServeTaskOptions } from './serve';
const Command = require('../ember-cli/lib/models/command');


export interface E2eTaskOptions extends ServeTaskOptions {
  config: string;
  serve: boolean;
  webdriverUpdate: boolean;
  specs: string[];
  suite: string;
  elementExplorer: boolean;
}

const E2eCommand = Command.extend({
  name: 'e2e',
  aliases: ['e'],
  description: 'Run e2e tests in existing project.',
  works: 'insideProject',
  availableOptions: [],
  run: function (commandOptions: E2eTaskOptions) {
    const E2eTask = require('../tasks/e2e').E2eTask;

    const e2eTask = new E2eTask({
      ui: this.ui,
      project: this.project
    });

    // if (!commandOptions.config) {
    //   const e2eConfig = CliConfig.fromProject().config.e2e;

    //   if (!e2eConfig.protractor.config) {
    //     throw new SilentError('No protractor config found in .angular-cli.json.');
    //   }

    //   commandOptions.config = e2eConfig.protractor.config;
    // }


      return e2eTask.run(commandOptions);
  }
});


export default E2eCommand;
