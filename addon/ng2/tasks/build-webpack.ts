import * as rimraf from 'rimraf';
import * as path from 'path';
import * as Task from 'ember-cli/lib/models/task';
import * as webpack from 'webpack';
import { BuildOptions } from '../commands/build';
import { NgCliWebpackConfig } from '../models/webpack-config';
import { webpackOutputOptions } from '../models/';

// Configure build and output;
let lastHash: any = null;

module.exports = Task.extend({
  // Options: String outputPath
  run: function (runTaskOptions: BuildOptions) {

    const project = this.cliProject;

    rimraf.sync(path.resolve(project.root, runTaskOptions.outputPath));
    const config = new NgCliWebpackConfig(
      project,
      runTaskOptions.target,
      runTaskOptions.environment,
      runTaskOptions.outputPath,
      runTaskOptions.baseHref
    ).config;

    const webpackCompiler = webpack(config);

    const ProgressPlugin  = require('webpack/lib/ProgressPlugin');

    webpackCompiler.apply(new ProgressPlugin({
      profile: true
    }));

    return new Promise((resolve, reject) => {
      webpackCompiler.run((err, stats) => {
        // Don't keep cache
        // TODO: Make conditional if using --watch
        webpackCompiler.purgeInputFileSystem();

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
        resolve();
      });
    });
  }
});
