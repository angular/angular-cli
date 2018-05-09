import { CommandScope, Option } from '../models/command';
import { ArchitectCommand, ArchitectCommandOptions } from '../models/architect-command';


export default class TestCommand extends ArchitectCommand {
  public readonly name = 'test';
  public readonly target = 'test';
  public readonly description = 'Run unit tests in existing project.';
  public static aliases = ['t'];
  public readonly scope = CommandScope.inProject;
  public readonly multiTarget = true;
  public readonly options: Option[] = [
    this.prodOption,
    this.configurationOption
  ];

  public async run(options: ArchitectCommandOptions) {
    return this.runArchitectTarget(options);
  }
}
