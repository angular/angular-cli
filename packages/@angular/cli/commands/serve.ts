import { BuildOptions } from '../models/build-options';
import { Version } from '../upgrade/version';
import { ServeTaskOptions } from './serve';

const Command = require('../ember-cli/lib/models/command');

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

const ServeCommand = Command.extend({
  name: 'serve',
  description: 'Builds and serves your app, rebuilding on file changes.',
  aliases: ['server', 's'],

  availableOptions: baseServeCommandOptions,

  run: function (commandOptions: ServeTaskOptions) {
    const ServeTask = require('../tasks/serve').default;

    // Check Angular and TypeScript versions.
    Version.assertAngularVersionIs2_3_1OrHigher(this.project.root);
    Version.assertTypescriptVersion(this.project.root);

    const serve = new ServeTask({
      ui: this.ui,
      project: this.project,
    });

    return serve.run(commandOptions);
  }
});

export default ServeCommand;
