import * as fs from 'fs';
import * as path from 'path';

const Command = require('ember-cli/lib/models/command');
const stringUtils = require('ember-cli-string-utils');
const lookupCommand = require('ember-cli/lib/cli/lookup-command');

const commandsToIgnore = [
  'help',
  'easter-egg',
  'completion',
  'github-pages-deploy'
];

const HelpCommand = Command.extend({
  name: 'help',
  description: 'Shows help for the CLI',
  works: 'outsideProject',

  availableOptions: [],

  run: function (commandOptions: any) {
    let commandFiles = fs.readdirSync(__dirname)
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

    commandFiles.forEach(cmd => {
      let Command = lookupCommand(commandMap, cmd);

      let command = new Command({
        ui: this.ui,
        project: this.project,
        commands: this.commands,
        tasks: this.tasks
      });

      this.ui.writeLine(command.printBasicHelp(commandOptions));
    });
  }
});

HelpCommand.overrideCore = true;
export default HelpCommand;
