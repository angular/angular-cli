const assign      = require('lodash/assign');
const Command     = require('ember-cli/lib/models/command');
const Promise     = require('ember-cli/lib/ext/promise');
const SilentError = require('silent-error');
const PortFinder  = require('portfinder');
const win         = require('ember-cli/lib/utilities/windows-admin');
const EOL         = require('os').EOL;


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
    { name: 'host',                 type: String,                          aliases: ['H'],     description: 'Listens on all interfaces by default' },
    { name: 'proxy',                type: String,                          aliases: ['pr', 'pxy'] },
    { name: 'insecure-proxy',       type: Boolean, default: false,         aliases: ['inspr'], description: 'Set false to proxy self-signed SSL certificates' },
    { name: 'watcher',              type: String,  default: 'events',      aliases: ['w'] },
    { name: 'live-reload',          type: Boolean, default: true,          aliases: ['lr'] },
    { name: 'live-reload-host',     type: String,                          aliases: ['lrh'],   description: 'Defaults to host' },
    { name: 'live-reload-base-url', type: String,                          aliases: ['lrbu'],  description: 'Defaults to baseURL' },
    { name: 'live-reload-port',     type: Number,                          aliases: ['lrp'],   description: '(Defaults to port number within [49152...65535])' },
    { name: 'live-reload-live-css', type: Boolean, default: true,                              description: 'Whether to live reload CSS (default true)' },
    { name: 'environment',          type: String,  default: 'development', aliases: ['e', { 'dev': 'development' }, { 'mat': 'material'},  { 'prod': 'production' }] },
    { name: 'output-path',          type: 'Path',  default: 'dist/',       aliases: ['op', 'out'] },
    { name: 'ssl',                  type: Boolean, default: false },
    { name: 'ssl-key',              type: String,  default: 'ssl/server.key' },
    { name: 'ssl-cert',             type: String,  default: 'ssl/server.crt' }
  ],

  run: function(commandOptions: ServeTaskOptions) {


    commandOptions.liveReloadHost = commandOptions.liveReloadHost || commandOptions.host;

    return this._checkExpressPort(commandOptions)
      .then(this._autoFindLiveReloadPort.bind(this))
      .then(function(commandOptions: ServeTaskOptions) {
        commandOptions = assign({}, commandOptions, {
          baseURL: this.project.config(commandOptions.environment).baseURL || '/'
        });

        if (commandOptions.proxy) {
          if (!commandOptions.proxy.match(/^(http:|https:)/)) {
            var message = 'You need to include a protocol with the proxy URL.' + EOL + 'Try --proxy http://' + commandOptions.proxy;

            return Promise.reject(new SilentError(message));
          }
        }

        const ServeWebpackTask = (require('../tasks/serve-webpack.ts'))

        var serve = new ServeWebpackTask({
          ui: this.ui,
          analytics: this.analytics,
          project: this.project,
        });

        return win.checkWindowsElevation(this.ui).then(function() {
          return serve.run(commandOptions);
        });
      }.bind(this));
  },

  _checkExpressPort: function(commandOptions: ServeTaskOptions) {
    return getPort({ port: commandOptions.port, host: commandOptions.host })
      .then(function(foundPort: number) {

        if (commandOptions.port !== foundPort && commandOptions.port !== 0) {
          var message = 'Port ' + commandOptions.port + ' is already in use.';
          return Promise.reject(new SilentError(message));
        }

        // otherwise, our found port is good
        commandOptions.port = foundPort;
        return commandOptions;

      }.bind(this));
  },

  _autoFindLiveReloadPort: function(commandOptions: ServeTaskOptions) {
    return getPort({ port: commandOptions.liveReloadPort, host: commandOptions.liveReloadHost })
      .then(function(foundPort: number) {

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

      }.bind(this));
  }
});

module.exports.overrideCore = true;
