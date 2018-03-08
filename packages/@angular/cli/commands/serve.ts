import { CommandScope, Option } from '../models/command';
import { Version } from '../upgrade/version';
import { ArchitectCommand } from '../models/architect-command';

// Expose options unrelated to live-reload to other commands that need to run serve
export const baseServeCommandOptions: any = [];

export interface Options {
  app?: string;
  configuration?: string;
  prod: boolean;
}

export default class ServeCommand extends ArchitectCommand {
  public readonly name = 'serve';
  public readonly target = 'dev-server';
  public readonly description = 'Builds and serves your app, rebuilding on file changes.';
  public static aliases = ['server', 's'];
  public readonly scope = CommandScope.inProject;
  public readonly arguments: string[] = [];
  public readonly options: Option[] = [
    this.prodOption,
    this.configurationOption
  ];

  public validate(_options: Options) {
    // Check Angular and TypeScript versions.
    Version.assertAngularVersionIs2_3_1OrHigher(this.project.root);
    Version.assertTypescriptVersion(this.project.root);
    return true;
  }

  public async run(options: Options) {
    let configuration = options.configuration;
    if (options.prod) {
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
