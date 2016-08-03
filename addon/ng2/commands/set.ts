import * as Command from 'ember-cli/lib/models/command';
import {CliConfig} from '../models/config';
import * as chalk from 'chalk';

const SetCommand = Command.extend({
  name: 'set',
  description: 'Set a value in the configuration.',
  works: 'everywhere',

  availableOptions: [
    { name: 'global', type: Boolean, default: false, aliases: ['g'] }
  ],

  run: function (commandOptions, rawArgs): Promise<void> {
    return new Promise((resolve, reject) => {
      if (rawArgs.length < 2) {
        this.ui.writeLine(`
        ${chalk.red.bold('Error: not enough parameters provided.')}
        'Examples:'
        ${chalk.yellow('ng set project.name "My awesome project"')}
        ${chalk.yellow('ng set defaults.styleExt sass')}
        ${chalk.yellow('ng set apps[0].mobile true')}
        ${chalk.yellow('ng set "apps[0].styles[\'src/styles.css\'].autoImported" = false')}
        ${chalk.yellow('ng set "apps[0].styles[\'src/app.sass\']" = "{ output: \'app.css\', autoImported: true }"')}
        `);
        reject();
      }

      const config = new CliConfig();
      const value = rawArgs[1] === '=' ? rawArgs[2] : rawArgs[1];

      config.set(rawArgs[0], value, commandOptions.force);
      config.save();
      resolve();
    });
  }
});

module.exports = SetCommand;
