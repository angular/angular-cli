import { CommandScope, Option } from '../models/command';
import { ArchitectCommand } from '../models/architect-command';

export interface RunOptions {
  app?: string;
  configuration?: string;
  prod: boolean;
}

export default class E2eCommand extends ArchitectCommand {
  public readonly name = 'e2e';
  public readonly target = 'protractor';
  public readonly description = 'Run e2e tests in existing project.';
  public static aliases: string[] = ['e'];
  public readonly scope = CommandScope.inProject;
  public readonly arguments: string[] = ['app'];
  public readonly options: Option[] = [
    this.prodOption,
    this.configurationOption
  ];

  public run(options: RunOptions) {
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
