import {NgCliWebpackConfig} from '../models/webpack-config'
import {webpackOutputOptions} from '../models/';
import {ServeTaskOptions} from '../commands/serve';
import * as rimraf from 'rimraf';
import * as path from 'path';

var Task              = require('ember-cli/lib/models/task');
const webpack         = require('webpack');
const ProgressPlugin  = require('webpack/lib/ProgressPlugin');


let lastHash: any = null;

module.exports = Task.extend({
  run: function(runTaskOptions: ServeTaskOptions) {

    var project = this.cliProject;

    rimraf.sync(path.resolve(project.root, runTaskOptions.outputPath));

    const config = new NgCliWebpackConfig(project, runTaskOptions.environment).config;
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
