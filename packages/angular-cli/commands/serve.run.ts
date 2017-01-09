import * as denodeify from 'denodeify';
const SilentError = require('silent-error');
const PortFinder = require('portfinder');
import ServeWebpackTask from '../tasks/serve-webpack';
import { Version } from '../upgrade/version';
import { ServeTaskOptions } from './serve';

PortFinder.basePort = 49152;

const getPort = <any>denodeify(PortFinder.getPort);

export default function serveRun(commandOptions: ServeTaskOptions) {
  if (!commandOptions.environment) {
    if (commandOptions.target === 'development') {
      commandOptions.environment = 'dev';
    }
    if (commandOptions.target === 'production') {
      commandOptions.environment = 'prod';
    }
  }

  // Check angular version.
  Version.assertAngularVersionIs2_3_1OrHigher(this.project.root);

  return checkExpressPort(commandOptions)
    .then((opts: ServeTaskOptions) => {
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
