import { CommandScope, Option } from '../models/command';
import { ArchitectCommand } from '../models/architect-command';

export interface Options {
  project?: string;
  configuration?: string;
}

export default class Xi18nCommand extends ArchitectCommand {
  public readonly name = 'xi81n';
  public readonly target = 'extract-i18n';
  public readonly description = 'Extracts i18n messages from source code.';
  public readonly scope = CommandScope.inProject;
  public readonly options: Option[] = [
    this.configurationOption
  ];

  public async run(options: Options) {
    const overrides = { ...options };
    delete overrides.project;
    return this.runArchitectTarget({
      project: options.project,
      target: this.target,
      configuration: options.configuration,
      overrides
    });
  }
}
