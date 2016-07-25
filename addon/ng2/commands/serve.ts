import * as assign from 'lodash/assign';
import * as Command from 'ember-cli/lib/models/command';
import * as Promise from 'ember-cli/lib/ext/promise';
import * as SilentError from 'silent-error';
import * as PortFinder from 'portfinder';
import * as EOL from 'os';
import * as ServeWebpackTask from '../tasks/serve-webpack.ts';

PortFinder.basePort = 49152;

const getPort = Promise.denodeify(PortFinder.getPort);
const defaultPort = process.env.PORT || 4200;

export interface ServeTaskOptions {
  port?: number;
  host?: string;
  proxy?: string;
  insecureProxy?: boolean;
  watcher?: string;
  liveReload?: boolean;
  liveReloadHost?: string;
  liveReloadPort?: number;
  liveReloadBaseUrl?: string;
  liveReloadLiveCss?: boolean;
  target?: string;
  environment?: string;
  outputPath?: string;
  ssl?: boolean;
  sslKey?: string;
  sslCert?: string;
}

module.exports = Command.extend({
  name: 'serve',
  description: 'Builds and serves your app, rebuilding on file changes.',
  aliases: ['server', 's'],

  availableOptions: [
    { name: 'port',                 type: Number,  default: defaultPort,   aliases: ['p'] },
    { name: 'host',                 type: String,  default: 'localhost',   aliases: ['H'],     description: 'Listens on all interfaces by default' },
    { name: 'proxy',                type: String,                          aliases: ['pr', 'pxy'] },
    { name: 'insecure-proxy',       type: Boolean, default: false,         aliases: ['inspr'], description: 'Set false to proxy self-signed SSL certificates' },
    { name: 'watcher',              type: String,  default: 'events',      aliases: ['w'] },
    { name: 'live-reload',          type: Boolean, default: true,          aliases: ['lr'] },
    { name: 'live-reload-host',     type: String,                          aliases: ['lrh'],   description: 'Defaults to host' },
    { name: 'live-reload-base-url', type: String,                          aliases: ['lrbu'],  description: 'Defaults to baseURL' },
    { name: 'live-reload-port',     type: Number,                          aliases: ['lrp'],   description: '(Defaults to port number within [49152...65535])' },
    { name: 'live-reload-live-css', type: Boolean, default: true,                              description: 'Whether to live reload CSS (default true)' },
    { name: 'target',               type: String,  default: 'development', aliases: ['t', { 'dev': 'development' }, { 'prod': 'production' }] },
    { name: 'environment',          type: String,  default: '', aliases: ['e'] },
    { name: 'output-path',          type: 'Path',  default: 'dist/',       aliases: ['op', 'out'] },
    { name: 'ssl',                  type: Boolean, default: false },
    { name: 'ssl-key',              type: String,  default: 'ssl/server.key' },
    { name: 'ssl-cert',             type: String,  default: 'ssl/server.crt' }
  ],

  run: function(commandOptions: ServeTaskOptions) {
    if (commandOptions.environment === ''){
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
      .then((commandOptions: ServeTaskOptions) => {
        commandOptions = assign({}, commandOptions, {
          baseURL: this.project.config(commandOptions.target).baseURL || '/'
        });

        if (commandOptions.proxy) {
          if (!commandOptions.proxy.match(/^(http:|https:)/)) {
            var message = 'You need to include a protocol with the proxy URL.' + EOL + 'Try --proxy http://' + commandOptions.proxy;

            return Promise.reject(new SilentError(message));
          }
        }

        var serve = new ServeWebpackTask({
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
          var message = 'Port ' + commandOptions.port + ' is already in use.';
          return Promise.reject(new SilentError(message));
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

module.exports.overrideCore = true;
