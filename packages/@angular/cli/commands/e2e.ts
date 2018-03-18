import { CommandScope, Option } from '../models/command';
import { ArchitectCommand } from '../models/architect-command';

export interface Options {
  project?: string;
  configuration?: string;
  prod: boolean;
}

export default class E2eCommand extends ArchitectCommand {
  public readonly name = 'e2e';
  public readonly target = 'e2e';
  public readonly description = 'Run e2e tests in existing project.';
  public static aliases: string[] = ['e'];
  public readonly scope = CommandScope.inProject;
  public readonly options: Option[] = [
    this.prodOption,
    this.configurationOption
  ];

  public run(options: Options) {
    let configuration = options.configuration;
    if (!configuration && options.prod) {
      configuration = 'production';
    }

    const overrides = { ...options };
    delete overrides.project;
    delete overrides.prod;

    return this.runArchitectTarget({
      project: options.project,
      target: this.target,
      configuration,
      overrides
    });
  }
}
