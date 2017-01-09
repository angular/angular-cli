import { BuildOptions } from '../models/webpack-config';
import { BaseBuildCommandOptions } from './build';
import { CliConfig } from '../models/config';
const PortFinder = require('portfinder');
const Command = require('../ember-cli/lib/models/command');
const config = CliConfig.fromProject() || CliConfig.fromGlobal();

PortFinder.basePort = 49152;

const defaultPort = process.env.PORT || config.get('defaults.serve.port');
const defaultHost = config.get('defaults.serve.host');

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

  availableOptions: BaseBuildCommandOptions.concat([
    { name: 'port',                 type: Number,  default: defaultPort,   aliases: ['p'] },
    {
      name: 'host',
      type: String,
      default: defaultHost,
      aliases: ['H'],
      description: `Listens only on ${defaultHost} by default`
    },
    { name: 'proxy-config',         type: 'Path',                          aliases: ['pc'] },
    { name: 'live-reload',          type: Boolean, default: true,          aliases: ['lr'] },
    {
      name: 'live-reload-host',
      type: String,
      aliases: ['lrh'],
      description: 'Defaults to host'
    },
    {
      name: 'live-reload-base-url',
      type: String,
      aliases: ['lrbu'],
      description: 'Defaults to baseURL'
    },
    {
      name: 'live-reload-port',
      type: Number,
      aliases: ['lrp'],
      description: '(Defaults to port number within [49152...65535])'
    },
    {
      name: 'live-reload-live-css',
      type: Boolean,
      default: true,
      description: 'Whether to live reload CSS (default true)'
    },
    { name: 'ssl',                  type: Boolean, default: false },
    { name: 'ssl-key',              type: String,  default: 'ssl/server.key' },
    { name: 'ssl-cert',             type: String,  default: 'ssl/server.crt' },
    {
      name: 'open',
      type: Boolean,
      default: false,
      aliases: ['o'],
      description: 'Opens the url in default browser',
    },
    {
      name: 'hmr',
      type: Boolean,
      default: false,
      description: 'Enable hot module replacement',
    }
  ]),

  run: function(commandOptions: ServeTaskOptions) {
    return require('./serve.run').default.call(this, commandOptions);
  }
});

export default ServeCommand;
