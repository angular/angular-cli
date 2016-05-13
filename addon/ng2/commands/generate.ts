import * as EmberGenerateCommand from 'ember-cli/lib/commands/generate';
import * as fs from 'fs';
import * as path from 'path';
import * as SilentError from 'silent-error';
var chalk = require('chalk');
import * as Blueprint from 'ember-cli/lib/models/blueprint';
var EOL = require('os').EOL;

const GenerateCommand = EmberGenerateCommand.extend({
  name: 'generate',

  beforeRun: function(rawArgs) {
    if (!rawArgs.length) {
      return;
    }

    // map the blueprint name to allow for aliases
    rawArgs[0] = mapBlueprintName(rawArgs[0]);

    if (rawArgs[0] !== '--help' &&
      !fs.existsSync(path.join(__dirname, '..', 'blueprints', rawArgs[0]))) {
      SilentError.debugOrThrow('angular-cli/commands/generate', `Invalid blueprint: ${rawArgs[0]}`);
    }
    
    // Override default help to hide ember blueprints
    EmberGenerateCommand.prototype.printDetailedHelp = function (options) {
      var blueprintList = fs.readdirSync(path.join(__dirname, '..', 'blueprints'));
      var blueprints = blueprintList
        .filter(bp => bp.indexOf('-test') === -1)
        .filter(bp => bp !== 'ng2')
        .map(bp => Blueprint.load(path.join(__dirname, '..', 'blueprints', bp)));
      
      var output = '';
      blueprints
        .forEach(function (bp) {
          output += bp.printBasicHelp(false) + EOL;
        });
      this.ui.writeLine(chalk.cyan('  Available blueprints'));
      this.ui.writeLine(output);
    };
    
    return EmberGenerateCommand.prototype.beforeRun.apply(this, arguments);
  }
});

function mapBlueprintName(name) {
  let mappedName = aliasMap[name];
  return mappedName ? mappedName : name;
}

const aliasMap = {
  'cl': 'class',
  'c': 'component',
  'd': 'directive',
  'e': 'enum',
  'p': 'pipe',
  'r': 'route',
  's': 'service'
};

module.exports = GenerateCommand;
module.exports.overrideCore = true;
