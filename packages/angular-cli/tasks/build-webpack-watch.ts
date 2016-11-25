import * as rimraf from 'rimraf';
import * as path from 'path';
const Task = require('../ember-cli/lib/models/task');
import * as webpack from 'webpack';
import { NgCliWebpackConfig } from '../models/webpack-config';
import { getWebpackStatsConfig } from '../models/';
import { BuildOptions } from '../commands/build';
import { CliConfig } from '../models/config';

let lastHash: any = null;

export default Task.extend({
  run: function(runTaskOptions: BuildOptions) {

    const project = this.cliProject;

    const outputDir = runTaskOptions.outputPath || CliConfig.fromProject().config.apps[0].outDir;
    const deployUrl = runTaskOptions.deployUrl ||
                       CliConfig.fromProject().config.apps[0].deployUrl;
    rimraf.sync(path.resolve(project.root, outputDir));

    const config = new NgCliWebpackConfig(
      project,
      runTaskOptions.target,
      runTaskOptions.environment,
      outputDir,
      runTaskOptions.baseHref,
      runTaskOptions.i18nFile,
      runTaskOptions.i18nFormat,
      runTaskOptions.locale,
      runTaskOptions.aot,
      runTaskOptions.sourcemap,
      runTaskOptions.vendorChunk,
      runTaskOptions.verbose,
      runTaskOptions.progress,
      deployUrl
    ).config;
    const webpackCompiler: any = webpack(config);

    const statsConfig = getWebpackStatsConfig(runTaskOptions.verbose);

    return new Promise((resolve, reject) => {
      webpackCompiler.watch({}, (err: any, stats: any) => {
        if (err) {
          lastHash = null;
          console.error(err.stack || err);
          if (err.details) { console.error(err.details); }
            reject(err.details);
        }

        if (stats.hash !== lastHash) {
          lastHash = stats.hash;
          process.stdout.write(stats.toString(statsConfig) + '\n');
        }
      });
    });
  }
});
