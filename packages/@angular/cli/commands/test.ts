import { CommandScope, Option } from '../models/command';
import { ArchitectCommand } from '../models/architect-command';

export interface Options {
  app?: string;
  configuration?: string;
  prod: boolean;
}

export default class TestCommand extends ArchitectCommand {
  public readonly name = 'test';
  public readonly target = 'karma';
  public readonly description = 'Run unit tests in existing project.';
  public static aliases = ['t'];
  public readonly scope = CommandScope.inProject;
  public readonly arguments: string[] = [];
  public readonly options: Option[] = [
    this.prodOption,
    this.configurationOption
  ];

  public async run(options: Options) {
    let configuration = options.configuration;
    if (!configuration && options.prod) {
      configuration = 'production';
    }
    const overrides = {...options};
    delete overrides.app;
    delete overrides.prod;
    return this.runArchitect({
      app: options.app,
      configuration,
      overrides
    });
  }
}
