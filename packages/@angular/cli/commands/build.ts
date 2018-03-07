import { ArchitectCommand } from '../models/architect-command';
import { Option, CommandScope } from '../models/command';
import { Version } from '../upgrade/version';

export interface Options {
  app?: string;
  configuration?: string;
  prod: boolean;
}

export default class BuildCommand extends ArchitectCommand {
  public readonly name = 'build';
  public readonly target = 'browser';
  public readonly description =
    'Builds your app and places it into the output path (dist/ by default).';
  public static aliases = ['b'];
  public scope = CommandScope.inProject;
  public arguments: string[] = ['app'];
  public options: Option[] = [
    this.prodOption,
    this.configurationOption
  ];

  public validate(_options: Options) {
    Version.assertAngularVersionIs2_3_1OrHigher(this.project.root);
    Version.assertTypescriptVersion(this.project.root);
    return true;
  }

  public async run(options: Options) {
    let configuration = options.configuration;
    if (!configuration && options.prod) {
      configuration = 'production';
    }
    const overrides = {...options};
    delete overrides.app;
    delete overrides.prod;
    return this.runArchitect({
      app: options.app,
      configuration,
      overrides
    });
  }
}
