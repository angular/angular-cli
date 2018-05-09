import { CommandScope, Option } from '../models/command';
import { ArchitectCommand, ArchitectCommandOptions } from '../models/architect-command';


export default class E2eCommand extends ArchitectCommand {
  public readonly name = 'e2e';
  public readonly target = 'e2e';
  public readonly description = 'Run e2e tests in existing project.';
  public static aliases: string[] = ['e'];
  public readonly scope = CommandScope.inProject;
  public readonly multiTarget = true;
  public readonly options: Option[] = [
    this.prodOption,
    this.configurationOption
  ];

  public run(options: ArchitectCommandOptions) {
    return this.runArchitectTarget(options);
  }
}
