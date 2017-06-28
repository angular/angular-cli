import * as fs from 'fs-extra';
import * as path from 'path';
import * as webpack from 'webpack';

import { getAppFromConfig } from '../utilities/app-utils';
import { BuildTaskOptions } from '../commands/build';
import { NgCliWebpackConfig } from '../models/webpack-config';
import { getWebpackStatsConfig } from '../models/webpack-configs/utils';
import { CliConfig } from '../models/config';

const Task = require('../ember-cli/lib/models/task');
const SilentError = require('silent-error');


export default Task.extend({
  run: function (runTaskOptions: BuildTaskOptions) {
    const config = CliConfig.fromProject().config;

    const app = getAppFromConfig(runTaskOptions.app);

    const outputPath = runTaskOptions.outputPath || app.outDir;
    if (this.project.root === path.resolve(outputPath)) {
      throw new SilentError('Output path MUST not be project root directory!');
    }
    if (config.project && config.project.ejected) {
      throw new SilentError('An ejected project cannot use the build command anymore.');
    }
    if (runTaskOptions.deleteOutputPath) {
      fs.removeSync(path.resolve(this.project.root, outputPath));
    }

    const webpackConfig = new NgCliWebpackConfig(runTaskOptions, app).buildConfig();
    const webpackCompiler = webpack(webpackConfig);
    const statsConfig = getWebpackStatsConfig(runTaskOptions.verbose);

    return new Promise((resolve, reject) => {
      const callback: webpack.compiler.CompilerCallback = (err, stats) => {
        if (err) {
          return reject(err);
        }

        this.ui.writeLine(stats.toString(statsConfig));

        if (runTaskOptions.watch) {
          return;
        }

        if (!runTaskOptions.watch && runTaskOptions.statsJson) {
          const jsonStats = stats.toJson('verbose');

          fs.writeFileSync(
            path.resolve(this.project.root, outputPath, 'stats.json'),
            JSON.stringify(jsonStats, null, 2)
          );
        }

        if (stats.hasErrors()) {
          reject();
        } else {
          resolve();
        }
      };

      if (runTaskOptions.watch) {
        webpackCompiler.watch({ poll: runTaskOptions.poll }, callback);
      } else {
        webpackCompiler.run(callback);
      }
    })
    .catch((err: Error) => {
      if (err) {
        this.ui.writeError('\nAn error occured during the build:\n' + ((err && err.stack) || err));
      }
      throw err;
    });
  }
});
