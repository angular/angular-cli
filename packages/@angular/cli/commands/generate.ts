import * as chalk from 'chalk';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { oneLine } from 'common-tags';
import { CliConfig } from '../models/config';

const Command = require('../ember-cli/lib/models/command');
const Blueprint = require('../ember-cli/lib/models/blueprint');
const parseOptions = require('../ember-cli/lib/utilities/parse-options');
const SilentError = require('silent-error');

function loadBlueprints(): Array<any> {
  const blueprintList = fs.readdirSync(path.join(__dirname, '..', 'blueprints'));
  const blueprints = blueprintList
    .filter(bp => bp.indexOf('-test') === -1)
    .filter(bp => bp !== 'ng')
    .map(bp => Blueprint.load(path.join(__dirname, '..', 'blueprints', bp)));

  return blueprints;
}

export default Command.extend({
  name: 'generate',
  description: 'Generates and/or modifies files based on a blueprint.',
  aliases: ['g'],

  availableOptions: [
    {
      name: 'dry-run',
      type: Boolean,
      default: false,
      aliases: ['d'],
      description: 'Run through without making any changes.'
    },
    {
      name: 'lint-fix',
      type: Boolean,
      aliases: ['lf'],
      description: 'Use lint to fix files after generation.'
    },
    {
      name: 'verbose',
      type: Boolean,
      default: false,
      aliases: ['v'],
      description: 'Adds more details to output logging.'
    }
  ],

  anonymousOptions: [
    '<blueprint>'
  ],

  beforeRun: function (rawArgs: string[]) {
    if (!rawArgs.length) {
      return;
    }

    const isHelp = ['--help', '-h'].includes(rawArgs[0]);
    if (isHelp) {
      return;
    }

    this.blueprints = loadBlueprints();

    const name = rawArgs[0];
    const blueprint = this.blueprints.find((bp: any) => bp.name === name
      || (bp.aliases && bp.aliases.includes(name)));

    if (!blueprint) {
      SilentError.debugOrThrow('@angular/cli/commands/generate',
        `Invalid blueprint: ${name}`);
    }

    if (!rawArgs[1]) {
      SilentError.debugOrThrow('@angular/cli/commands/generate',
        `The \`ng generate ${name}\` command requires a name to be specified.`);
    }

    if (/^\d/.test(rawArgs[1])) {
      SilentError.debugOrThrow('@angular/cli/commands/generate',
          `The \`ng generate ${name} ${rawArgs[1]}\` file name cannot begin with a digit.`);
    }

    rawArgs[0] = blueprint.name;
    this.registerOptions(blueprint);
  },

  printDetailedHelp: function () {
    if (!this.blueprints) {
      this.blueprints = loadBlueprints();
    }
    this.ui.writeLine(chalk.cyan('  Available blueprints'));
    this.ui.writeLine(this.blueprints.map((bp: any) => bp.printBasicHelp(false)).join(os.EOL));
  },

  run: function (commandOptions: any, rawArgs: string[]) {
    const name = rawArgs[0];
    if (!name) {
      return Promise.reject(new SilentError(oneLine`
          The "ng generate" command requires a
          blueprint name to be specified.
          For more details, use "ng help".
      `));
    }

    const blueprint = this.blueprints.find((bp: any) => bp.name === name
      || (bp.aliases && bp.aliases.includes(name)));

    const projectName = CliConfig.getValue('project.name');
    const blueprintOptions = {
      target: this.project.root,
      entity: {
        name: rawArgs[1],
        options: parseOptions(rawArgs.slice(2))
      },
      projectName,
      ui: this.ui,
      project: this.project,
      settings: this.settings,
      testing: this.testing,
      args: rawArgs,
      ...commandOptions
    };

    return blueprint.install(blueprintOptions)
      .then(() => {
        const lintFix = commandOptions.lintFix !== undefined ?
          commandOptions.lintFix : CliConfig.getValue('defaults.lintFix');

        if (lintFix && blueprint.modifiedFiles) {
            const LintTask = require('../tasks/lint').default;
            const lintTask = new LintTask({
              ui: this.ui,
              project: this.project
            });

            return lintTask.run({
              fix: true,
              force: true,
              silent: true,
              configs: [{
                files: blueprint.modifiedFiles.filter((file: string) => /.ts$/.test(file))
              }]
            });
        }
      });
  }
});
