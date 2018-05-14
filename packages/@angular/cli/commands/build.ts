import { Option, CommandScope } from '../models/command';
import { Version } from '../upgrade/version';
import { ArchitectCommand, ArchitectCommandOptions } from '../models/architect-command';

export default class BuildCommand extends ArchitectCommand {
  public readonly name = 'build';
  public readonly target = 'build';
  public readonly description =
    'Builds your app and places it into the output path (dist/ by default).';
  public static aliases = ['b'];
  public scope = CommandScope.inProject;
  public options: Option[] = [
    this.prodOption,
    this.configurationOption
  ];

  public validate(options: ArchitectCommandOptions) {
    // Check Angular and TypeScript versions.
    Version.assertCompatibleAngularVersion(this.project.root);
    Version.assertTypescriptVersion(this.project.root);
    return super.validate(options);
  }

  public async run(options: ArchitectCommandOptions) {
    return this.runArchitectTarget(options);
  }
}
