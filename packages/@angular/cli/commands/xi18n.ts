import { Command, CommandScope } from '../models/command';

export interface Xi18nOptions {
  outputPath?: string;
  verbose?: boolean;
  i18nFormat?: string;
  locale?: string;
  outFile?: string;
}

export default class Xi18nCommand extends Command {
  public readonly name = 'xi18n';
  public readonly description = 'Extracts i18n messages from source code.';
  public static aliases: string[] = [];
  public readonly scope = CommandScope.inProject;
  public readonly arguments: string[] = [];
  public readonly options = [
    {
      name: 'i18n-format',
      type: String,
      default: 'xlf',
      // TODO: re-add options for removed aliases:
      // aliases: ['f', {'xmb': 'xmb'}, {'xlf': 'xlf'}, {'xliff': 'xlf'}, {'xliff2': 'xliff2'} ],
      aliases: ['f'],
      description: 'Output format for the generated file.'
    },
    {
      name: 'output-path',
      type: 'Path',
      default: null as string,
      aliases: ['op'],
      description: 'Path where output will be placed.'
    },
    {
      name: 'verbose',
      type: Boolean,
      default: false,
      description: 'Adds more details to output logging.'
    },
    {
      name: 'progress',
      type: Boolean,
      description: 'Log progress to the console while running.',
      default: process.stdout.isTTY === true,
    },
    {
      name: 'app',
      type: String,
      aliases: ['a'],
      description: 'Specifies app name to use.'
    },
    {
      name: 'locale',
      type: String,
      aliases: ['l'],
      description: 'Specifies the source language of the application.'
    },
    {
      name: 'out-file',
      type: String,
      aliases: ['of'],
      description: 'Name of the file to output.'
    },
  ];

  public async run(options: any) {
    const {Extracti18nTask} = require('../tasks/extract-i18n');

    const xi18nTask = new Extracti18nTask({
      ui: this.ui,
      project: this.project
    });

    return await xi18nTask.run(options);
  }
}
