import { ArchitectCommand, ArchitectCommandOptions } from '../models/architect-command';
import { CommandScope, Option } from '../models/command';


export default class Xi18nCommand extends ArchitectCommand {
  public readonly name = 'xi18n';
  public readonly target = 'extract-i18n';
  public readonly description = 'Extracts i18n messages from source code.';
  public readonly scope = CommandScope.inProject;
  public readonly multiTarget: true;
  public readonly options: Option[] = [
    this.configurationOption,
  ];

  public async run(options: ArchitectCommandOptions) {
    return this.runArchitectTarget(options);
  }
}
