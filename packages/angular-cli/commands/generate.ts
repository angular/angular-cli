import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const chalk = require('chalk');
const EmberGenerateCommand = require('../ember-cli/lib/commands/generate');
const Blueprint = require('../ember-cli/lib/models/blueprint');
const SilentError = require('silent-error');


const GenerateCommand = EmberGenerateCommand.extend({
  name: 'generate',

  beforeRun: function(rawArgs: string[]) {
    if (!rawArgs.length) {
      return;
    }
    // map the blueprint name to allow for aliases
    rawArgs[0] = mapBlueprintName(rawArgs[0]);

    if (rawArgs[0] !== '--help' &&
      !fs.existsSync(path.join(__dirname, '..', 'blueprints', rawArgs[0]))) {
      SilentError.debugOrThrow('angular-cli/commands/generate', `Invalid blueprint: ${rawArgs[0]}`);
    }

    if (!rawArgs[1]) {
      SilentError.debugOrThrow('angular-cli/commands/generate',
        `The \`ng generate ${rawArgs[0]}\` command requires a name to be specified.`);
    }
    // verify file name does not contain suffix word
    rawArgs[1] = mapSufix(rawArgs[1]);

    // Override default help to hide ember blueprints
    EmberGenerateCommand.prototype.printDetailedHelp = function() {
      const blueprintList = fs.readdirSync(path.join(__dirname, '..', 'blueprints'));
      const blueprints = blueprintList
        .filter(bp => bp.indexOf('-test') === -1)
        .filter(bp => bp !== 'ng2')
        .filter(bp => bp !== 'mobile')
        .map(bp => Blueprint.load(path.join(__dirname, '..', 'blueprints', bp)));

      let output = '';
      blueprints
        .forEach(function (bp) {
          output += bp.printBasicHelp(false) + os.EOL;
        });
      this.ui.writeLine(chalk.cyan('  Available blueprints'));
      this.ui.writeLine(output);
    };

    return EmberGenerateCommand.prototype.beforeRun.apply(this, arguments);
  }
});

function mapBlueprintName(name: string): string {
  let mappedName: string = aliasMap[name];
  return mappedName ? mappedName : name;
}

function mapSufix(name: string): string {
  for(let alias in aliasMap){
    if(name.indexOf(aliasMap[alias]) !== -1){
      // make sure that the suffix name is in the end of the string
      let regex = new RegExp('([\\-]*)' + aliasMap[alias] +'$');
      console.log(regex);
      name = name.replace(regex, '');
    }
  }
  return name;
}

const aliasMap: { [alias: string]: string } = {
  'cl': 'class',
  'c': 'component',
  'd': 'directive',
  'e': 'enum',
  'm': 'module',
  'p': 'pipe',
  'r': 'route',
  's': 'service'
};

export default GenerateCommand;
GenerateCommand.overrideCore = true;
