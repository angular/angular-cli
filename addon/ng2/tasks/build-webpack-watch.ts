import * as rimraf from 'rimraf';
import * as path from 'path';
import * as Task from 'ember-cli/lib/models/task';
import * as webpack from 'webpack';
import * as ProgressPlugin from 'webpack/lib/ProgressPlugin';
import { NgCliWebpackConfig } from '../models/webpack-config';
import { webpackOutputOptions } from '../models/';
import { ServeTaskOptions } from '../commands/serve';

let lastHash: any = null;

module.exports = Task.extend({
  run: function(runTaskOptions: ServeTaskOptions) {

    const project = this.cliProject;

    rimraf.sync(path.resolve(project.root, runTaskOptions.outputPath));

    const config = new NgCliWebpackConfig(project, runTaskOptions.target, runTaskOptions.environment).config;
    const webpackCompiler = webpack(config);

    webpackCompiler.apply(new ProgressPlugin({
      profile: true
    }));

    return new Promise( (resolve, reject) => {
      webpackCompiler.watch({}, (err, stats) => {
        if (err) {
          lastHash = null;
          console.error(err.stack || err);
          if(err.details) console.error(err.details);
            reject(err.details);
        }

        if(stats.hash !== lastHash) {
          lastHash = stats.hash;
          process.stdout.write(stats.toString(webpackOutputOptions) + "\n");
        }
      })
    })
  }
});
