import { BuildOptions } from '../models/webpack-config';
import { BaseBuildCommandOptions } from './build';
import { availableOptions } from './serve.options';

const Command = require('../ember-cli/lib/models/command');

export interface ServeTaskOptions extends BuildOptions {
  port?: number;
  host?: string;
  proxyConfig?: string;
  liveReload?: boolean;
  liveReloadHost?: string;
  liveReloadPort?: number;
  liveReloadBaseUrl?: string;
  liveReloadLiveCss?: boolean;
  ssl?: boolean;
  sslKey?: string;
  sslCert?: string;
  open?: boolean;
  hmr?: boolean;
}

const ServeCommand = Command.extend({
  name: 'serve',
  description: 'Builds and serves your app, rebuilding on file changes.',
  aliases: ['server', 's'],

  availableOptions: availableOptions,

  run: function(commandOptions: ServeTaskOptions) {
    return require('./serve.run').default.call(this, commandOptions);
  }
});

export default ServeCommand;
