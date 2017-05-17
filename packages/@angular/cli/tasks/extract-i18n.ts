import * as webpack from 'webpack';
import { XI18nWebpackConfig } from '../models/webpack-xi18n-config';
import { getAppFromConfig } from '../utilities/app-utils';

const Task = require('../ember-cli/lib/models/task');
const MemoryFS = require('memory-fs');


export const Extracti18nTask = Task.extend({
  run: function (runTaskOptions: any) {
    const appConfig = getAppFromConfig(runTaskOptions.app);

    const config = new XI18nWebpackConfig({
      genDir: runTaskOptions.outputPath || appConfig.root,
      buildDir: '.tmp',
      i18nFormat: runTaskOptions.i18nFormat,
      locale: runTaskOptions.locale,
      outFile: runTaskOptions.outFile,
      verbose: runTaskOptions.verbose,
      progress: runTaskOptions.progress,
      app: runTaskOptions.app,
    }, appConfig).buildConfig();

    const webpackCompiler = webpack(config);
    webpackCompiler.outputFileSystem = new MemoryFS();

    return new Promise((resolve, reject) => {
      const callback: webpack.compiler.CompilerCallback = (err, stats) => {
        if (err) {
          return reject(err);
        }

        if (stats.hasErrors()) {
          reject();
        } else {
          resolve();
        }
      };

      webpackCompiler.run(callback);
    })
    .catch((err: Error) => {
      if (err) {
        this.ui.writeError('\nAn error occured during the i18n extraction:\n'
          + ((err && err.stack) || err));
      }
    });
  }
});
