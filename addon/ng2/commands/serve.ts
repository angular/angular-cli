import * as assign from 'lodash/assign';
import * as Command from 'ember-cli/lib/models/command';
import * as Serve from '../tasks/serve';
import * as Promise from 'ember-cli/lib/ext/promise');
import * as SilentError from 'silent-error';
import * as PortFinder from 'portfinder';
import * as win from 'ember-cli/lib/utilities/windows-admin';
import * as EOL from 'os'.EOL;

PortFinder.basePort = 49152;

let getPort = Promise.denodeify(PortFinder.getPort);
let defaultPort = process.env.PORT || 4200;

const ServeCommand = Command.extend({
  name: 'serve',
  description: 'Builds and serves your Angular2 app, rebuilding on file changes.',
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
    { name: 'environment',          type: String,  default: 'development', aliases: ['e', { 'dev': 'development' }, { 'prod': 'production' }] },
    { name: 'output-path',          type: 'Path',  default: 'dist/',       aliases: ['op', 'out'] },
    { name: 'ssl',                  type: Boolean, default: false },
    { name: 'ssl-key',              type: String,  default: 'ssl/server.key' },
    { name: 'ssl-cert',             type: String,  default: 'ssl/server.crt' }
  ],

  run: function(commandOptions) {
    commandOptions.liveReloadHost = commandOptions.liveReloadHost || commandOptions.host;

    return this._checkExpressPort(commandOptions)
      .then(this._autoFindLiveReloadPort.bind(this))
      .then(function(commandOptions) {
        commandOptions = assign({}, commandOptions, {
          baseURL: this.project.config(commandOptions.environment).baseURL || '/'
        });

        if (commandOptions.proxy) {
          if (!commandOptions.proxy.match(/^(http:|https:)/)) {
            var message = 'You need to include a protocol with the proxy URL.' + EOL + 'Try --proxy http://' + commandOptions.proxy;

            return Promise.reject(new SilentError(message));
          }
        }

        var ServeTask = Serve;
        var serve = new ServeTask({
          ui: this.ui,
          analytics: this.analytics,
          project: this.project
        });

        return win.checkWindowsElevation(this.ui).then(function() {
          return serve.run(commandOptions);
        });
      }.bind(this));
  },

  _checkExpressPort: function(commandOptions) {
    return getPort({ port: commandOptions.port, host: commandOptions.host })
      .then(function(foundPort) {

        if (commandOptions.port !== foundPort && commandOptions.port !== 0) {
          var message = 'Port ' + commandOptions.port + ' is already in use.';
          return Promise.reject(new SilentError(message));
        }

        commandOptions.port = foundPort;
        return commandOptions;

      }.bind(this));
  },

  _autoFindLiveReloadPort: function(commandOptions) {
    return getPort({ port: commandOptions.liveReloadPort, host: commandOptions.liveReloadHost })
      .then(function(foundPort) {

        if (foundPort === commandOptions.port) {
          commandOptions.liveReloadPort = foundPort + 1;
          return this._autoFindLiveReloadPort(commandOptions);
        }

        if (foundPort === commandOptions.liveReloadPort) {
          return commandOptions;
        }

        commandOptions.liveReloadPort = foundPort;
        return commandOptions;

      }.bind(this));
  }

});

module.exports = ServeCommand;
module.exports.overrideCore = true;
