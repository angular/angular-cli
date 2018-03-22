import { ArchitectCommand } from '../models/architect-command';
import { Option, CommandScope } from '../models/command';
import { Version } from '../upgrade/version';

export interface Options {
  project?: string;
  configuration?: string;
  prod: boolean;
}

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

  public validate(options: Options) {
    // Check Angular and TypeScript versions.
    Version.assertCompatibleAngularVersion(this.project.root);
    Version.assertTypescriptVersion(this.project.root);
    return super.validate(options);
  }

  public async run(options: Options) {
    let configuration = options.configuration;
    if (!configuration && options.prod) {
      configuration = 'production';
    }

    const overrides = { ...options };
    delete overrides.project;
    delete overrides.configuration;
    delete overrides.prod;

    return this.runArchitectTarget({
      project: options.project,
      target: this.target,
      configuration,
      overrides
    });
  }
}
