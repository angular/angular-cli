import { CommandScope, Option } from '../models/command';
import { ArchitectCommand } from '../models/architect-command';

export interface Options {
  project?: string;
  configuration?: string;
}

export default class LintCommand extends ArchitectCommand {
  public readonly name = 'lint';
  public readonly target = 'lint';
  public readonly description = 'Lints code in existing project.';
  public static aliases = ['l'];
  public readonly scope = CommandScope.inProject;
  public readonly options: Option[] = [
    this.configurationOption
  ];

  public async run(options: Options) {
    const overrides = { ...options };
    delete overrides.project;
    return this.runArchitectTarget({
      project: options.project,
      target: this.target,
      configuration: options.configuration,
      overrides
    });
  }
}
