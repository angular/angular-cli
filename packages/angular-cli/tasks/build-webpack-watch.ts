import * as rimraf from 'rimraf';
import * as path from 'path';
const Task = require('ember-cli/lib/models/task');
import * as webpack from 'webpack';
const ProgressPlugin = require('webpack/lib/ProgressPlugin');
import { NgCliWebpackConfig } from '../models/webpack-config';
import { webpackOutputOptions } from '../models/';
import { BuildOptions } from '../commands/build';
import { CliConfig } from '../models/config';

let lastHash: any = null;

export default Task.extend({
  run: function(runTaskOptions: BuildOptions) {

    const project = this.cliProject;

    const outputDir = runTaskOptions.outputPath || CliConfig.fromProject().config.apps[0].outDir;
    rimraf.sync(path.resolve(project.root, outputDir));

    const config = new NgCliWebpackConfig(
      project,
      runTaskOptions.target,
      runTaskOptions.environment,
      outputDir,
      runTaskOptions.baseHref,
      runTaskOptions.aot
    ).config;
    const webpackCompiler: any = webpack(config);

    webpackCompiler.apply(new ProgressPlugin({
      profile: true
    }));

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
          process.stdout.write(stats.toString(webpackOutputOptions) + '\n');
        }
      });
    });
  }
});
