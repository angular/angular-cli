import { CommandScope, Option } from '../models/command';
import { ArchitectCommand } from '../models/architect-command';

export interface Options {
  project?: string;
  configuration?: string;
}

export default class TestCommand extends ArchitectCommand {
  public readonly name = 'test';
  public readonly target = 'test';
  public readonly description = 'Run unit tests in existing project.';
  public static aliases = ['t'];
  public readonly scope = CommandScope.inProject;
  public readonly options: Option[] = [
    this.prodOption,
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
