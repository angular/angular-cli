import * as denodeify from 'denodeify';
import { BuildOptions } from '../models/build-options';
import { baseBuildCommandOptions } from './build';
import { CliConfig } from '../models/config';
import { Version } from '../upgrade/version';
import { ServeTaskOptions } from './serve';
import { overrideOptions } from '../utilities/override-options';

const SilentError = require('silent-error');
const PortFinder = require('portfinder');
const Command = require('../ember-cli/lib/models/command');
const getPort = denodeify<{ host: string, port: number }, number>(PortFinder.getPort);

const config = CliConfig.fromProject() || CliConfig.fromGlobal();
const defaultPort = process.env.PORT || config.get('defaults.serve.port');
const defaultHost = config.get('defaults.serve.host');
PortFinder.basePort = defaultPort;

export interface ServeTaskOptions extends BuildOptions {
  port?: number;
  host?: string;
  proxyConfig?: string;
  liveReload?: boolean;
  liveReloadClient?: string;
  ssl?: boolean;
  sslKey?: string;
  sslCert?: string;
  open?: boolean;
  hmr?: boolean;
}

// Expose options unrelated to live-reload to other commands that need to run serve
export const baseServeCommandOptions: any = overrideOptions(
  baseBuildCommandOptions.concat([
    { name: 'port', type: Number, default: defaultPort, aliases: ['p'] },
    {
      name: 'host',
      type: String,
      default: defaultHost,
      aliases: ['H'],
      description: `Listens only on ${defaultHost} by default`
    },
    { name: 'proxy-config', type: 'Path', aliases: ['pc'] },
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
    { name: 'live-reload', type: Boolean, default: true, aliases: ['lr'] },
    {
      name: 'live-reload-client',
      type: String,
      description: 'specify the URL that the live reload browser client will use'
    },
    {
      name: 'hmr',
      type: Boolean,
      default: false,
      description: 'Enable hot module replacement',
    }
  ]), [
    { name: 'watch', default: true },
  ]
);

const ServeCommand = Command.extend({
  name: 'serve',
  description: 'Builds and serves your app, rebuilding on file changes.',
  aliases: ['server', 's'],

  availableOptions: baseServeCommandOptions,

  run: function (commandOptions: ServeTaskOptions) {
    const ServeTask = require('../tasks/serve').default;

    Version.assertAngularVersionIs2_3_1OrHigher(this.project.root);

    return checkExpressPort(commandOptions)
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

export default ServeCommand;
