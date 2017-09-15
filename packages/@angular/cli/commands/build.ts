import { CliConfig } from '../models/config';
import { BuildOptions } from '../models/build-options';
import { Version } from '../upgrade/version';
import { oneLine } from 'common-tags';
import { getAppFromConfig } from '../utilities/app-utils';
import { join } from 'path';
import { RenderUniversalTaskOptions } from '../tasks/render-universal';

const Command = require('../ember-cli/lib/models/command');


const config = CliConfig.fromProject() || CliConfig.fromGlobal();
const buildConfigDefaults = config.getPaths('defaults.build', [
  'sourcemaps', 'baseHref', 'progress', 'poll', 'deleteOutputPath', 'preserveSymlinks',
  'showCircularDependencies', 'commonChunk', 'namedChunks'
]);

// defaults for BuildOptions
export const baseBuildCommandOptions: any = [
  {
    name: 'target',
    type: String,
    default: 'development',
    aliases: ['t', { 'dev': 'development' }, { 'prod': 'production' }],
    description: 'Defines the build target.'
  },
  {
    name: 'environment',
    type: String,
    aliases: ['e'],
    description: 'Defines the build environment.'
  },
  {
    name: 'output-path',
    type: 'Path',
    aliases: ['op'],
    description: 'Path where output will be placed.'
  },
  {
    name: 'aot',
    type: Boolean,
    description: 'Build using Ahead of Time compilation.'
  },
  {
    name: 'sourcemaps',
    type: Boolean,
    aliases: ['sm', 'sourcemap'],
    description: 'Output sourcemaps.',
    default: buildConfigDefaults['sourcemaps']
  },
  {
    name: 'vendor-chunk',
    type: Boolean,
    aliases: ['vc'],
    description: 'Use a separate bundle containing only vendor libraries.'
  },
  {
    name: 'common-chunk',
    type: Boolean,
    default: buildConfigDefaults['commonChunk'],
    aliases: ['cc'],
    description: 'Use a separate bundle containing code used across multiple bundles.'
  },
  {
    name: 'base-href',
    type: String,
    aliases: ['bh'],
    description: 'Base url for the application being built.',
    default: buildConfigDefaults['baseHref']
  },
  {
    name: 'deploy-url',
    type: String,
    aliases: ['d'],
    description: 'URL where files will be deployed.'
  },
  {
    name: 'verbose',
    type: Boolean,
    default: false,
    aliases: ['v'],
    description: 'Adds more details to output logging.'
  },
  {
    name: 'progress',
    type: Boolean,
    aliases: ['pr'],
    description: 'Log progress to the console while building.',
    default: typeof buildConfigDefaults['progress'] !== 'undefined'
      ? buildConfigDefaults['progress']
      : process.stdout.isTTY === true
  },
  {
    name: 'i18n-file',
    type: String,
    description: 'Localization file to use for i18n.'
  },
  {
    name: 'i18n-format',
    type: String,
    description: 'Format of the localization file specified with --i18n-file.'
  },
  {
    name: 'locale',
    type: String,
    description: 'Locale to use for i18n.'
  },
  {
    name: 'missing-translation',
    type: String,
    description: 'How to handle missing translations for i18n.'
  },
  {
    name: 'extract-css',
    type: Boolean,
    aliases: ['ec'],
    description: 'Extract css from global styles onto css files instead of js ones.'
  },
  {
    name: 'watch',
    type: Boolean,
    default: false,
    aliases: ['w'],
    description: 'Run build when files change.'
  },
  {
    name: 'output-hashing',
    type: String,
    values: ['none', 'all', 'media', 'bundles'],
    description: 'Define the output filename cache-busting hashing mode.',
    aliases: ['oh']
  },
  {
    name: 'poll',
    type: Number,
    description: 'Enable and define the file watching poll time period (milliseconds).',
    default: buildConfigDefaults['poll']
  },
  {
    name: 'app',
    type: String,
    aliases: ['a'],
    description: 'Specifies app name or index to use.'
  },
  {
    name: 'delete-output-path',
    type: Boolean,
    aliases: ['dop'],
    description: 'Delete output path before build.',
    default: buildConfigDefaults['deleteOutputPath'],
  },
  {
    name: 'preserve-symlinks',
    type: Boolean,
    description: 'Do not use the real path when resolving modules.',
    default: buildConfigDefaults['preserveSymlinks']
  },
  {
    name: 'extract-licenses',
    type: Boolean,
    default: true,
    description: 'Extract all licenses in a separate file, in the case of production builds only.'
  },
  {
    name: 'show-circular-dependencies',
    type: Boolean,
    aliases: ['scd'],
    description: 'Show circular dependency warnings on builds.',
    default: buildConfigDefaults['showCircularDependencies']
  },
  {
    name: 'build-optimizer',
    type: Boolean,
    description: 'Enables @angular-devkit/build-optimizer optimizations when using `--aot`.'
  },
  {
    name: 'named-chunks',
    type: Boolean,
    aliases: ['nc'],
    description: 'Use file name for lazy loaded chunks.',
    default: buildConfigDefaults['namedChunks']
  },
  {
    name: 'subresource-integrity',
    type: Boolean,
    default: false,
    aliases: ['sri'],
    description: 'Enables the use of subresource integrity validation.'
  },
  {
    name: 'bundle-dependencies',
    type: ['none', 'all'],
    default: 'none',
    description: 'Available on server platform only. Which external dependencies to bundle into '
               + 'the module. By default, all of node_modules will be kept as requires.'
  },
  {
    name: 'service-worker',
    type: Boolean,
    default: true,
    aliases: ['sw'],
    description: 'Generates a service worker config for production builds, if the app has '
               + 'service worker enabled.'
  },
  {
    name: 'skip-app-shell',
    type: Boolean,
    description: 'Flag to prevent building an app shell',
    default: false
  }
];

export interface BuildTaskOptions extends BuildOptions {
  statsJson?: boolean;
}

const BuildCommand = Command.extend({
  name: 'build',
  description: 'Builds your app and places it into the output path (dist/ by default).',
  aliases: ['b'],

  availableOptions: baseBuildCommandOptions.concat([
    {
      name: 'stats-json',
      type: Boolean,
      default: false,
      description: oneLine`Generates a \`stats.json\` file which can be analyzed using tools
       such as: \`webpack-bundle-analyzer\` or https://webpack.github.io/analyse.`
    }
  ]),

  run: function (commandOptions: BuildTaskOptions) {
    // Check Angular and TypeScript versions.
    Version.assertAngularVersionIs2_3_1OrHigher(this.project.root);
    Version.assertTypescriptVersion(this.project.root);

    // Force commonjs module format for TS on dev watch builds.
    if (commandOptions.target === 'development' && commandOptions.watch === true) {
      commandOptions.forceTsCommonjs = true;
    }

    const BuildTask = require('../tasks/build').default;

    const buildTask = new BuildTask({
      project: this.project,
      ui: this.ui,
    });


    const buildPromise = buildTask.run(commandOptions);


    const clientApp = getAppFromConfig(commandOptions.app);

    const doAppShell = commandOptions.target === 'production' &&
      (commandOptions.aot === undefined || commandOptions.aot === true) &&
      !commandOptions.skipAppShell;
    if (!clientApp.appShell || !doAppShell) {
      return buildPromise;
    }
    const serverApp = getAppFromConfig(clientApp.appShell.app);

    return buildPromise
      .then(() => {

        const serverOptions = {
          ...commandOptions,
          app: clientApp.appShell.app
        };
        return buildTask.run(serverOptions);
      })
      .then(() => {
        const RenderUniversalTask = require('../tasks/render-universal').default;

        const renderUniversalTask = new RenderUniversalTask({
          project: this.project,
          ui: this.ui,
        });
        const renderUniversalOptions: RenderUniversalTaskOptions = {
          inputIndexPath: join(this.project.root, clientApp.outDir, clientApp.index),
          route: clientApp.appShell.route,
          serverOutDir: join(this.project.root, serverApp.outDir),
          outputIndexPath: join(this.project.root, clientApp.outDir, clientApp.index)
        };

        return renderUniversalTask.run(renderUniversalOptions);
      });
  }
});


BuildCommand.overrideCore = true;
export default BuildCommand;
