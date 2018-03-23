import { CommandScope, Option } from '../models/command';
import { ArchitectCommand } from '../models/architect-command';

export interface Options {
  project?: string;
  configuration?: string;
  prod: boolean;
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
    let configuration = options.configuration;
    if (!configuration && options.prod) {
      configuration = 'production';
    }

    const overrides = { ...options };
    delete overrides.project;
    delete overrides.configuration;
    delete overrides.prod;

    return this.runArchitectTarget({
      project: options.project,
      target: this.target,
      configuration,
      overrides
    });
  }
}
