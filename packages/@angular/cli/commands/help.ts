import * as fs from 'fs';
import * as path from 'path';

const Command = require('../ember-cli/lib/models/command');
const stringUtils = require('ember-cli-string-utils');
const lookupCommand = require('../ember-cli/lib/cli/lookup-command');

const HelpCommand = Command.extend({
  name: 'help',
  description: 'Shows help for the CLI.',
  works: 'everywhere',

  availableOptions: [
    {
      name: 'short',
      type: Boolean,
      default: false,
      aliases: ['s'],
      description: 'Display command name and description only.'
    },
  ],

  anonymousOptions: ['command-name (Default: all)'],

  run: function (commandOptions: any, rawArgs: any) {
    let commandFiles = fs.readdirSync(__dirname)
      // Remove files that are not JavaScript or Typescript
      .filter(file => file.match(/\.(j|t)s$/) && !file.match(/\.d.ts$/))
      .map(file => path.parse(file).name)
      .map(file => file.toLowerCase());

    let commandMap = commandFiles.reduce((acc: any, curr: string) => {
      let classifiedName = stringUtils.classify(curr);
      let defaultImport = require(`./${curr}`).default;

      acc[classifiedName] = defaultImport;

      return acc;
    }, {});

    if (rawArgs.indexOf('all') !== -1) {
      rawArgs = []; // just act as if command not specified
    }

    commandFiles.forEach(cmd => {
      const Command = lookupCommand(commandMap, cmd);

      const command = new Command({
        ui: this.ui,
        project: this.project,
        commands: this.commands,
        tasks: this.tasks
      });

      if (command.hidden || command.unknown) {
        return;
      }

      if (rawArgs.length > 0) {
        let commandInput = rawArgs[0];
        const aliases = Command.prototype.aliases;
        if (aliases && aliases.indexOf(commandInput) > -1) {
          commandInput = Command.prototype.name;
        }

        if (cmd === commandInput) {
          if (commandOptions.short) {
            this.ui.writeLine(command.printShortHelp(commandOptions));
          } else if (command.printDetailedHelp(commandOptions)) {
            this.ui.writeLine(command.printDetailedHelp(commandOptions));
          } else {
            this.ui.writeLine(command.printBasicHelp(commandOptions));
          }
        }
      } else {
        if (commandOptions.short) {
          this.ui.writeLine(command.printShortHelp(commandOptions));
        } else {
          this.ui.writeLine(command.printBasicHelp(commandOptions));
        }
      }

    });
  }
});

HelpCommand.overrideCore = true;
export default HelpCommand;
