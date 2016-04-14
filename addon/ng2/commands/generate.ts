import * as EmberGenerateCommand from 'ember-cli/lib/commands/generate';
import * as fs from 'fs';
import * as path from 'path';
import * as SilentError from 'silent-error';


const GenerateCommand = EmberGenerateCommand.extend({
  name: 'generate',

  beforeRun: function(rawArgs) {
    if (!rawArgs.length) {
      return;
    }

    // map the blueprint name to allow for aliases
    rawArgs[0] = mapBlueprintName(rawArgs[0]);

    if (!fs.existsSync(path.join(__dirname, '..', 'blueprints', rawArgs[0]))) {
      SilentError.debugOrThrow('angular-cli/commands/generate', `Invalid blueprint: ${rawArgs[0]}`);
    }

    return EmberGenerateCommand.prototype.beforeRun.apply(this, arguments);
  }
});

function mapBlueprintName(name) {
  let mappedName = aliasMap[name];
  return mappedName ? mappedName : name;
}

const aliasMap = {
  'c': 'component',
  'd': 'directive',
  'p': 'pipe',
  'r': 'route',
  's': 'service'
};

module.exports = GenerateCommand;
module.exports.overrideCore = true;
