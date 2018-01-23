import { Command, CommandScope, Option } from '../models/command';

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
  public readonly options: Option[] = [];

  public async run(options: LintCommandOptions) {
    const LintTask = require('../tasks/lint').default;

    const lintTask = new LintTask({
      ui: this.ui,
      project: this.project
    });

    return await lintTask.run(options);
  }
}
