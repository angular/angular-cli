import { CommandScope, Option } from '../models/command';
import { ArchitectCommand, ArchitectCommandOptions } from '../models/architect-command';


export default class LintCommand extends ArchitectCommand {
  public readonly name = 'lint';
  public readonly target = 'lint';
  public readonly description = 'Lints code in existing project.';
  public static aliases = ['l'];
  public readonly scope = CommandScope.inProject;
  public readonly multiTarget = true;
  public readonly options: Option[] = [
    this.configurationOption
  ];

  public async run(options: ArchitectCommandOptions) {
    return this.runArchitectTarget(options);
  }
}
