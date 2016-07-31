import * as EmberGenerateCommand from 'ember-cli/lib/commands/generate';
import * as fs from 'fs';
import * as path from 'path';
import * as SilentError from 'silent-error';
var chalk = require('chalk');
import * as Blueprint from 'ember-cli/lib/models/blueprint';
var EOL = require('os').EOL;
const dynamicPathParser = require('../utilities/dynamic-path-parser');
const stringUtils = require('ember-cli-string-utils');
const config = require('../models/config');

import {FileSource, LodashCompiler, PathRemapper, PrependRoot, OnOverwriteDo, WriteFile} from 'schematics/src';

import 'rxjs/add/operator/do';
import 'rxjs/add/operator/let';
import Entry = webpack.Entry;


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
  },

  run: function(options, rawArgs) {
    this.project.ngConfig = this.project.ngConfig || config.CliConfig.fromProject();

    if (rawArgs[0] == 'class') {
      const entityName = rawArgs[1];
      const dynamicPath = dynamicPathParser(this.project, entityName);
      const options = {
        path: dynamicPath.dir,
        name: stringUtils.dasherize(entityName),
        classifiedModuleName: stringUtils.camelize(entityName),
        fileName: stringUtils.dasherize(entityName)
      };

      function _promptUserForOverwrite(entry: Entry) {
        console.log(entry.path);
        return {
          action: 'overwrite'
        };
      }

      return FileSource(path.join(__dirname, `../blueprints/${rawArgs[0]}/files`))
        .let(PathRemapper(options))
        .let(LodashCompiler(options))
        .let(PrependRoot(process.cwd()))
        .let(OnOverwriteDo(_promptUserForOverwrite))
        .let(WriteFile())
        .toPromise();
    } else {
      return EmberGenerateCommand.prototype.run.apply(this, arguments);
    }
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
