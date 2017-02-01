const Command = require('../ember-cli/lib/models/command');
import { availableOptions } from './init.options';

const InitCommand: any = Command.extend({
  name: 'init',
  description: 'Creates a new angular-cli project in the current folder.',
  aliases: ['u', 'update', 'i'],
  works: 'everywhere',

  availableOptions: availableOptions,

  anonymousOptions: ['<glob-pattern>'],

  run: function (commandOptions: any, rawArgs: string[]) {
    return require('./init.run').default.call(this, commandOptions, rawArgs);
  }
});

InitCommand.overrideCore = true;
export default InitCommand;
