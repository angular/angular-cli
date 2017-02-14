import { availableOptions } from './init.options';

const Command = require('../ember-cli/lib/models/command');

const InitCommand: any = Command.extend({
  name: 'init',
  description: 'Creates a new Angular CLI project in the current folder.',
  works: 'everywhere',

  availableOptions: availableOptions,

  anonymousOptions: ['<glob-pattern>'],

  run: function (commandOptions: any, rawArgs: string[]) {
    const InitTask = require('../tasks/init').default;

    const initTask = new InitTask({
      cliProject: this.project,
      project: this.project,
      tasks: this.tasks,
      ui: this.ui,
    });

    return initTask.run(commandOptions, rawArgs);
  }
});

InitCommand.overrideCore = true;
export default InitCommand;
