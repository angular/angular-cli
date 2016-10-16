import * as assign from 'lodash/assign';
import * as denodeify from 'denodeify';
const Command = require('ember-cli/lib/models/command');
const SilentError = require('silent-error');
const PortFinder = require('portfinder');
import ServeWebpackTask from '../tasks/serve-webpack';

PortFinder.basePort = 49152;

const getPort = <any>denodeify(PortFinder.getPort);
const defaultPort = process.env.PORT || 4200;

export interface ServeTaskOptions {
  port?: number;
  host?: string;
  proxyConfig?: string;
  watcher?: string;
  liveReload?: boolean;
  liveReloadHost?: string;
  liveReloadPort?: number;
  liveReloadBaseUrl?: string;
  liveReloadLiveCss?: boolean;
  target?: string;
  environment?: string;
  ssl?: boolean;
  sslKey?: string;
  sslCert?: string;
  aot?: boolean;
  open?: boolean;
}

const ServeCommand = Command.extend({
  name: 'serve',
  description: 'Builds and serves your app, rebuilding on file changes.',
  aliases: ['server', 's'],

  availableOptions: [
    { name: 'port',                 type: Number,  default: defaultPort,   aliases: ['p'] },
    {
      name: 'host',
      type: String,
      default: 'localhost',
      aliases: ['H'],
      description: 'Listens on all interfaces by default'
    },
    { name: 'proxy-config',         type: 'Path',                          aliases: ['pc'] },
    { name: 'watcher',              type: String,  default: 'events',      aliases: ['w'] },
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
    {
      name: 'target',
      type: String,
      default: 'development',
      aliases: ['t', { 'dev': 'development' }, { 'prod': 'production' }]
    },
    { name: 'environment',          type: String,  default: '', aliases: ['e'] },
    { name: 'ssl',                  type: Boolean, default: false },
    { name: 'ssl-key',              type: String,  default: 'ssl/server.key' },
    { name: 'ssl-cert',             type: String,  default: 'ssl/server.crt' },
    { name: 'aot',                  type: Boolean, default: false },
    {
      name: 'open',
      type: Boolean,
      default: false,
      aliases: ['o'],
      description: 'Opens the url in default browser',
    },
  ],

  run: function(commandOptions: ServeTaskOptions) {
    if (commandOptions.environment === '') {
      if (commandOptions.target === 'development') {
        commandOptions.environment = 'dev';
      }
      if (commandOptions.target === 'production') {
        commandOptions.environment = 'prod';
      }
    }

    commandOptions.liveReloadHost = commandOptions.liveReloadHost || commandOptions.host;

    return this._checkExpressPort(commandOptions)
      .then(this._autoFindLiveReloadPort.bind(this))
      .then((opts: ServeTaskOptions) => {
        commandOptions = assign({}, opts, {
          baseURL: this.project.config(commandOptions.target).baseURL || '/'
        });

        const serve = new ServeWebpackTask({
          ui: this.ui,
          analytics: this.analytics,
          project: this.project,
        });

        return serve.run(commandOptions);
      });
  },

  _checkExpressPort: function(commandOptions: ServeTaskOptions) {
    return getPort({ port: commandOptions.port, host: commandOptions.host })
      .then((foundPort: number) => {

        if (commandOptions.port !== foundPort && commandOptions.port !== 0) {
          throw new SilentError(`Port ${commandOptions.port} is already in use.`);
        }

        // otherwise, our found port is good
        commandOptions.port = foundPort;
        return commandOptions;

      });
  },

  _autoFindLiveReloadPort: function(commandOptions: ServeTaskOptions) {
    return getPort({ port: commandOptions.liveReloadPort, host: commandOptions.liveReloadHost })
      .then((foundPort: number) => {

        // if live reload port matches express port, try one higher
        if (foundPort === commandOptions.port) {
          commandOptions.liveReloadPort = foundPort + 1;
          return this._autoFindLiveReloadPort(commandOptions);
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
});

ServeCommand.overrideCore = true;
export default ServeCommand;
