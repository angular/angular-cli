import * as denodeify from 'denodeify';
const assign = require('lodash/assign');
const SilentError = require('silent-error');
const PortFinder = require('portfinder');
import ServeTask from '../tasks/serve';
import { Version } from '../upgrade/version';
import { ServeTaskOptions } from './serve';

PortFinder.basePort = 49152;

const getPort = <any>denodeify(PortFinder.getPort);

export default function serveRun(commandOptions: ServeTaskOptions) {
  // Check angular version.
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
