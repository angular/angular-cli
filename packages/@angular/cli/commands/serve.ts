import { CommandScope, Option } from '../models/command';
import { Version } from '../upgrade/version';
import { ArchitectCommand } from '../models/architect-command';

export interface Options {
  project?: string;
  configuration?: string;
  prod: boolean;
}

export default class ServeCommand extends ArchitectCommand {
  public readonly name = 'serve';
  public readonly target = 'serve';
  public readonly description = 'Builds and serves your app, rebuilding on file changes.';
  public static aliases = ['server', 's'];
  public readonly scope = CommandScope.inProject;
  public readonly options: Option[] = [
    this.prodOption,
    this.configurationOption
  ];

  public validate(_options: Options) {
    // Check Angular and TypeScript versions.
    Version.assertCompatibleAngularVersion(this.project.root);
    Version.assertTypescriptVersion(this.project.root);
    return true;
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
