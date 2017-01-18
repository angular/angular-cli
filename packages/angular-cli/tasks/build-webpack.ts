import * as rimraf from 'rimraf';
import * as path from 'path';
const Task = require('../ember-cli/lib/models/task');
import * as webpack from 'webpack';
import { BuildOptions } from '../commands/build';
import { NgCliWebpackConfig } from '../models/webpack-config';
import { getWebpackStatsConfig } from '../models/';
import { CliConfig } from '../models/config';


export default Task.extend({
  run: function (runTaskOptions: BuildOptions) {

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
      deployUrl,
      runTaskOptions.outputHashing,
      runTaskOptions.extractCss,
    ).config;

    const webpackCompiler = webpack(config);
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

        if (stats.hasErrors()) {
          reject();
        } else {
          resolve();
        }
      };

      if (runTaskOptions.watch) {
        webpackCompiler.watch({}, callback);
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
