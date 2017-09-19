import { BuildOptions } from '../models/build-options';
import { baseBuildCommandOptions } from './build';
import { CliConfig } from '../models/config';
import { Version } from '../upgrade/version';
import { ServeTaskOptions } from './serve';
import { checkPort } from '../utilities/check-port';
import { overrideOptions } from '../utilities/override-options';

const Command = require('../ember-cli/lib/models/command');

const config = CliConfig.fromProject() || CliConfig.fromGlobal();
const serveConfigDefaults = config.getPaths('defaults.serve', [
  'port', 'host'
]);
const defaultPort = process.env.PORT || serveConfigDefaults['port'];

export interface ServeTaskOptions extends BuildOptions {
  port?: number;
  host?: string;
}

// Expose options unrelated to live-reload to other commands that need to run serve
export const baseServeCommandOptions: any = overrideOptions([
  ...baseBuildCommandOptions,
  {
    name: 'port',
    type: Number,
    default: defaultPort,
    aliases: ['p'],
    description: 'Port to listen to for serving.'
  },
  {
    name: 'host',
    type: String,
    default: serveConfigDefaults['host'],
    aliases: ['H'],
    description: `Listens only on ${serveConfigDefaults['host']} by default.`
  }
], [
  {
    name: 'watch',
    default: true,
    description: 'Rebuild on change.'
  }
]);

const ServeCommand = Command.extend({
  name: 'serve',
  description: 'Builds and serves your app, rebuilding on file changes.',
  aliases: ['server', 's'],

  availableOptions: baseServeCommandOptions,

  run: function (commandOptions: ServeTaskOptions, rawArgs: string[]) {
    const ServeTask = require('../tasks/serve').default;

    Version.assertAngularVersionIs2_3_1OrHigher(this.project.root);

    const app = (rawArgs.length > 0 && !rawArgs[0].startsWith('-')) ?
      rawArgs[0] : commandOptions.app;

    return checkPort(commandOptions.port, commandOptions.host, defaultPort)
      .then(port => {
        commandOptions.port = port;

        const serve = new ServeTask({
          ui: this.ui,
          project: this.project,
          app
        });

        return serve.run(commandOptions);
      });
  }
});

export default ServeCommand;
