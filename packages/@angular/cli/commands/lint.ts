import { Command, CommandScope } from '../models/command';
import { oneLine } from 'common-tags';
import { CliConfig } from '../models/config';


export interface LintCommandOptions {
  fix?: boolean;
  typeCheck?: boolean;
  format?: string;
  force?: boolean;
}

export default class LintCommand extends Command {
  public readonly name = 'lint';
  public readonly description = 'Lints code in existing project.';
  public static aliases = ['l'];
  public readonly scope = CommandScope.inProject;
  public readonly arguments: string[] = [];
  public readonly options = [
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
      aliases: ['t'],
      type: String,
      default: 'prose',
      description: oneLine`
        Output format (prose, json, stylish, verbose, pmd, msbuild, checkstyle, vso, fileslist).
      `
    }
  ];

  public async run(options: LintCommandOptions) {
    const LintTask = require('../tasks/lint').default;

    const lintTask = new LintTask({
      ui: this.ui,
      project: this.project
    });

    const lintResults: number = await lintTask.run({
      ...options,
      configs: CliConfig.fromProject().config.lint
    });

    if (lintResults != 0) {
      throw '';
    }

    return lintResults;
  }
}
