import { Command, CommandScope, Option } from '../models/command';

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
  public readonly options: Option[] = [];

  public async run(options: any) {
    const {Extracti18nTask} = require('../tasks/extract-i18n');

    const xi18nTask = new Extracti18nTask({
      ui: this.ui,
      project: this.project
    });

    return await xi18nTask.run(options);
  }
}
