import * as rimraf from 'rimraf';
import * as path from 'path';
const Task = require('../ember-cli/lib/models/task');
import * as webpack from 'webpack';
import { BuildOptions } from '../commands/build';
import { NgCliWebpackConfig } from '../models/webpack-config';
import { getWebpackStatsConfig } from '../models/';
import { CliConfig } from '../models/config';


// Configure build and output;
let lastHash: any = null;

export default <any>Task.extend({
  run: function (runTaskOptions: BuildOptions) {

    const project = this.cliProject;

    const outputDir = runTaskOptions.outputPath || CliConfig.fromProject().config.apps[0].outDir;
    rimraf.sync(path.resolve(project.root, outputDir));
    const config = new NgCliWebpackConfig(
      project,
      runTaskOptions.target,
      runTaskOptions.environment,
      outputDir,
      runTaskOptions.baseHref,
      runTaskOptions.aot,
      runTaskOptions.sourcemap,
      runTaskOptions.vendorChunk,
      runTaskOptions.verbose,
      runTaskOptions.progress
    ).config;

    const webpackCompiler: any = webpack(config);

    const statsConfig = getWebpackStatsConfig(runTaskOptions.verbose);

    return new Promise((resolve, reject) => {
      webpackCompiler.run((err: any, stats: any) => {
        if (err) {
          return reject(err);
        }

        // Don't keep cache
        // TODO: Make conditional if using --watch
        webpackCompiler.purgeInputFileSystem();

        if (stats.hash !== lastHash) {
          lastHash = stats.hash;
          process.stdout.write(stats.toString(statsConfig) + '\n');
        }

        if (stats.hasErrors()) {
          reject();
        } else {
          resolve();
        }
      });
    })
    .catch((err: Error) => {
      if (err) {
        this.ui.writeError('\nAn error occured during the build:\n' + ((err && err.stack) || err));
      }
      throw err;
    });
  }
});
