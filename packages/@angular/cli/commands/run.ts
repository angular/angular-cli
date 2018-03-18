import { CommandScope, Option } from '../models/command';
import { ArchitectCommand } from '../models/architect-command';

export interface RunOptions {
  target: string;
}

export default class RunCommand extends ArchitectCommand {
  public readonly name = 'run';
  public readonly description = 'Runs Architect targets.';
  public readonly scope = CommandScope.inProject;
  public readonly arguments: string[] = ['target'];
  public readonly options: Option[] = [
    this.configurationOption
  ];

  public async run(options: RunOptions) {
    if (options.target) {
      const [project, target, configuration] = options.target.split(':');
      const overrides = { ...options };
      delete overrides.target;
      return this.runArchitectTarget({
        project,
        target,
        configuration,
        overrides
      });
    } else {
      throw new Error('Invalid architect target.');
    }
  }
}
