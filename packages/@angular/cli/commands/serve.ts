import * as denodeify from 'denodeify';
import { BuildOptions } from '../models/build-options';
import { Version } from '../upgrade/version';
import { availableOptions } from './serve.options';

const SilentError = require('silent-error');
const PortFinder = require('portfinder');
const Command = require('../ember-cli/lib/models/command');
const getPort = <any>denodeify(PortFinder.getPort);

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
};

const ServeCommand = Command.extend({
  name: 'serve',
  description: 'Builds and serves your app, rebuilding on file changes.',
  aliases: ['server', 's'],

  availableOptions: availableOptions,

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
