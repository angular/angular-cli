import { CommandScope, Option } from '../models/command';
import { ArchitectCommand, ArchitectCommandOptions } from '../models/architect-command';


export default class RunCommand extends ArchitectCommand {
  public readonly name = 'run';
  public readonly description = 'Runs Architect targets.';
  public readonly scope = CommandScope.inProject;
  public readonly arguments: string[] = ['target'];
  public readonly options: Option[] = [
    this.configurationOption
  ];

  public async run(options: ArchitectCommandOptions) {
    if (options.target) {
      return this.runArchitectTarget(options);
    } else {
      throw new Error('Invalid architect target.');
    }
  }
}
