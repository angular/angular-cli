import { CommandScope, Option } from '../models/command';
import { ArchitectCommand } from '../models/architect-command';

export interface RunOptions {
  app?: string;
  configuration?: string;
}

export default class LintCommand extends ArchitectCommand {
  public readonly name = 'lint';
  public readonly target = 'tslint';
  public readonly description = 'Lints code in existing project.';
  public static aliases = ['l'];
  public readonly scope = CommandScope.inProject;
  public readonly arguments: string[] = ['app'];
  public readonly options: Option[] = [
    this.configurationOption
  ];

  public async run(options: RunOptions) {
    const overrides = {...options};
    delete overrides.app;
    return this.runArchitect({
      app: options.app,
      configuration: options.configuration,
      overrides
    });
  }
}
