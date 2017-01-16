import * as denodeify from 'denodeify';
const assign = require('lodash/assign');
const SilentError = require('silent-error');
const PortFinder = require('portfinder');
import ServeWebpackTask from '../tasks/serve-webpack';
import { Version } from '../upgrade/version';
import { ServeTaskOptions } from './serve';

PortFinder.basePort = 49152;

const getPort = <any>denodeify(PortFinder.getPort);

export default function serveRun(commandOptions: ServeTaskOptions) {
  if (commandOptions.environment === '') {
    if (commandOptions.target === 'development') {
      commandOptions.environment = 'dev';
    }
    if (commandOptions.target === 'production') {
      commandOptions.environment = 'prod';
    }
  }

  // default to extractCss to true on prod target
  if (typeof commandOptions.extractCss === 'undefined') {
    commandOptions.extractCss = commandOptions.target === 'production';
  }

  // Check angular version.
  Version.assertAngularVersionIs2_3_1OrHigher(this.project.root);
  commandOptions.liveReloadHost = commandOptions.liveReloadHost || commandOptions.host;

  return checkExpressPort(commandOptions)
    .then(() => autoFindLiveReloadPort(commandOptions))
    .then((opts: ServeTaskOptions) => {
      commandOptions = assign({}, opts, {
        baseURL: this.project.config(commandOptions.target).baseURL || '/'
      });

      const serve = new ServeWebpackTask({
        ui: this.ui,
        project: this.project,
      });

      return serve.run(commandOptions);
    });
}

function checkExpressPort(commandOptions: ServeTaskOptions) {
  return getPort({ port: commandOptions.port, host: commandOptions.host })
    .then((foundPort: number) => {

      if (commandOptions.port !== foundPort && commandOptions.port !== 0) {
        throw new SilentError(`Port ${commandOptions.port} is already in use.`);
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
