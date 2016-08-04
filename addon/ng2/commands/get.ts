import * as chalk from 'chalk';
import * as Command from 'ember-cli/lib/models/command';
import * as jp from 'jsonpath';
import * as chalk from 'chalk';
import * as path from 'path';
import {CliConfig} from '../models/config';


const GetCommand = Command.extend({
  name: 'get',
  description: 'Get a value from the configuration.',
  works: 'everywhere',

  availableOptions: [
    { name: 'global', type: Boolean, default: false, aliases: ['g'] }
  ],

  run: function (commandOptions, rawArgs): Promise<void> {
    return new Promise(resolve => {
      const cliConfig = new CliConfig();
      const config = commandOptions.global ? cliConfig.global : cliConfig.project;
      const value = cliConfig.get(rawArgs[0]);

      if (!value) {
        const lastProp = _lastProp(rawArgs[0]);
        let results = jp.query(config, `$..${lastProp}`);
        let paths = jp.paths(config, `$..${lastProp}`);
        if (results.length) {
          let result;
          let foundPath;
          this.ui.writeLine('We could not find value on the path you were requested.');
          if (results.length > 1) {
            this.ui.writeLine('But, we found values on other paths:');
            results.forEach((r, i) => {
              result = chalk.green(JSON.stringify(results[i]));
              foundPath = chalk.green(paths[i].filter((p, idx) => idx !== 0).join('.'));
              this.ui.writeLine(`${result} on path ${foundPath}?`);
            });
          } else {
            result = chalk.green(JSON.stringify(results[0]));
            foundPath = paths[0].filter((p, i) => i !== 0).join('.');
            this.ui.writeLine(`Looking for ${result} on path ${chalk.green(foundPath)}?`);
          }
        } else {
          this.ui.writeLine(chalk.red('Value not found.'));
        }
      } else {
        this.ui.writeLine(JSON.stringify(value, null, ' '));
      }

      resolve();
    });
  }
});

private static function _lastProp (jsonPath: string): string {
  return (jsonPath.match(/\./)) ? path.extname(jsonPath) : jsonPath;
}

module.exports = GetCommand;
