import { Command, CommandScope } from '../models/command';
import { BuildOptions } from '../models/build-options';
import { Version } from '../upgrade/version';
import { ServeTaskOptions } from './serve';

// const Command = require('../ember-cli/lib/models/command');

export interface ServeTaskOptions extends BuildOptions {
  port?: number;
  host?: string;
  proxyConfig?: string;
  liveReload?: boolean;
  publicHost?: string;
  disableHostCheck?: boolean;
  ssl?: boolean;
  sslKey?: string;
  sslCert?: string;
  open?: boolean;
  hmr?: boolean;
  servePath?: string;
}

// Expose options unrelated to live-reload to other commands that need to run serve
export const baseServeCommandOptions: any = [];

export default class ServeCommand extends Command {
  public readonly name = 'serve';
  public readonly description = 'Builds and serves your app, rebuilding on file changes.';
  public static aliases = ['server', 's'];
  public readonly scope = CommandScope.inProject;
  public readonly arguments: string[] = [];
  public readonly options = baseServeCommandOptions;

  public validate(_options: ServeTaskOptions) {
    // Check Angular and TypeScript versions.
    Version.assertAngularVersionIs2_3_1OrHigher(this.project.root);
    Version.assertTypescriptVersion(this.project.root);
    return true;
  }

  public async run(options: ServeTaskOptions) {
    const ServeTask = require('../tasks/serve').default;

    const serve = new ServeTask({
      ui: this.ui,
      project: this.project,
    });

    return await serve.run(options);
  }
}
