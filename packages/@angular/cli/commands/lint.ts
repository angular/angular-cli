import { oneLine } from 'common-tags';
import { CliConfig } from '../models/config';

const Command = require('../ember-cli/lib/models/command');


export interface LintCommandOptions {
  fix?: boolean;
  typeCheck?: boolean;
  format?: string;
  force?: boolean;
}

export default Command.extend({
  name: 'lint',
  aliases: ['l'],
  description: 'Lints code in existing project.',
  works: 'insideProject',
  availableOptions: [
    {
      name: 'fix',
      type: Boolean,
      default: false,
      description: 'Fixes linting errors (may overwrite linted files).'
    },
    {
      name: 'type-check',
      type: Boolean,
      default: false,
      description: 'Controls the type check for linting.'
    },
    {
      name: 'force',
      type: Boolean,
      default: false,
      description: 'Succeeds even if there was linting errors.'
    },
    {
      name: 'format',
      alias: 't',
      type: String,
      default: 'prose',
      description: oneLine`
        Output format (prose, json, stylish, verbose, pmd, msbuild, checkstyle, vso, fileslist).
      `
    }
  ],
  run: function (commandOptions: LintCommandOptions) {
    const LintTask = require('../tasks/lint').default;

    const lintTask = new LintTask({
      ui: this.ui,
      project: this.project
    });

    return lintTask.run({
      ...commandOptions,
      configs: CliConfig.fromProject().config.lint
    });
  }
});
