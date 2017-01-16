import * as fs from 'fs';
import * as path from 'path';

const Command = require('../ember-cli/lib/models/command');
const stringUtils = require('ember-cli-string-utils');
const lookupCommand = require('../ember-cli/lib/cli/lookup-command');

const commandsToIgnore = [
  'easter-egg',
  'destroy',
  'github-pages-deploy' // errors because there is no base github-pages command
];

const HelpCommand = Command.extend({
  name: 'help',
  description: 'Shows help for the CLI',
  works: 'everywhere',

  availableOptions: [],

  anonymousOptions: ['command-name (Default: all)'],

  run: function (commandOptions: any, rawArgs: any) {
    let commandFiles = fs.readdirSync(__dirname)
      // Remove files that are not JavaScript or Typescript
      .filter(file => file.match(/\.(j|t)s$/) && !file.match(/\.d.ts$/) && !file.match(/\.run.ts$/))
      .map(file => path.parse(file).name)
      .map(file => file.toLowerCase());

    commandFiles = commandFiles.filter(file => {
      return commandsToIgnore.indexOf(file) < 0;
    });

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
      let Command = lookupCommand(commandMap, cmd);

      let command = new Command({
        ui: this.ui,
        project: this.project,
        commands: this.commands,
        tasks: this.tasks
      });

      if (rawArgs.length > 0) {
        if (cmd === rawArgs[0]) {
          this.ui.writeLine(command.printBasicHelp(commandOptions));
        }
      } else {
        this.ui.writeLine(command.printBasicHelp(commandOptions));
      }

    });
  }
});

HelpCommand.overrideCore = true;
export default HelpCommand;
