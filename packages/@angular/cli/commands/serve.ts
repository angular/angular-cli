import * as denodeify from 'denodeify';
import { BuildOptions } from '../models/build-options';
import { BaseBuildCommandOptions } from './build';
import { CliConfig } from '../models/config';
import { Version } from '../upgrade/version';
import { ServeTaskOptions } from './serve';

const SilentError = require('silent-error');
const PortFinder = require('portfinder');
const Command = require('../ember-cli/lib/models/command');
const getPort = <any>denodeify(PortFinder.getPort);

PortFinder.basePort = 49152;

const config = CliConfig.fromProject() || CliConfig.fromGlobal();
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
    { name: 'port', type: Number, default: defaultPort, aliases: ['p'] },
    {
      name: 'host',
      type: String,
      default: defaultHost,
      aliases: ['H'],
      description: `Listens only on ${defaultHost} by default`
    },
    { name: 'proxy-config', type: 'Path', aliases: ['pc'] },
    { name: 'live-reload', type: Boolean, default: true, aliases: ['lr'] },
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
    { name: 'ssl', type: Boolean, default: false },
    { name: 'ssl-key', type: String, default: 'ssl/server.key' },
    { name: 'ssl-cert', type: String, default: 'ssl/server.crt' },
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

  run: function (commandOptions: ServeTaskOptions) {
    const ServeTask = require('../tasks/serve').default;

    Version.assertAngularVersionIs2_3_1OrHigher(this.project.root);
    commandOptions.liveReloadHost = commandOptions.liveReloadHost || commandOptions.host;

    return checkExpressPort(commandOptions)
      .then(() => autoFindLiveReloadPort(commandOptions))
      .then((opts: ServeTaskOptions) => {
        const serve = new ServeTask({
          ui: this.ui,
          project: this.project,
        });

        return serve.run(opts);
      });
  }
});

function checkExpressPort(commandOptions: ServeTaskOptions) {
  return getPort({ port: commandOptions.port, host: commandOptions.host })
    .then((foundPort: number) => {

      if (commandOptions.port !== foundPort && commandOptions.port !== 0) {
        throw new SilentError(
          `Port ${commandOptions.port} is already in use. Use '--port' to specify a different port.`
        );
      }

      // otherwise, our found port is good
      commandOptions.port = foundPort;
      return commandOptions;

    });
}

function autoFindLiveReloadPort(commandOptions: ServeTaskOptions) {
  return getPort({ port: commandOptions.liveReloadPort, host: commandOptions.liveReloadHost })
    .then((foundPort: number) => {

      // if live reload port matches express port, try one higher
      if (foundPort === commandOptions.port) {
        commandOptions.liveReloadPort = foundPort + 1;
        return autoFindLiveReloadPort(commandOptions);
      }

      // port was already open
      if (foundPort === commandOptions.liveReloadPort) {
        return commandOptions;
      }

      // use found port as live reload port
      commandOptions.liveReloadPort = foundPort;
      return commandOptions;

    });
}

export default ServeCommand;
