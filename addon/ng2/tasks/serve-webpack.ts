import {webpackDevServerOutputOptions} from '../models/';
import {NgCliWebpackConfig} from '../models/webpack-config';
import {ServeTaskOptions} from '../commands/serve';

const path = require('path');
const chalk = require('chalk');


const Task              = require('ember-cli/lib/models/task');
const webpack           = require('webpack');
const WebpackDevServer  = require('webpack-dev-server');
const ProgressPlugin    = require('webpack/lib/ProgressPlugin');



let lastHash = null;

module.exports = Task.extend({
  run: function(commandOptions: ServeTaskOptions) {

    let webpackCompiler: any;

    var config: NgCliWebpackConfig = new NgCliWebpackConfig(this.project, commandOptions.environment).config;
    webpackCompiler = webpack(config);


    webpackCompiler.apply(new ProgressPlugin({
      profile: true,
      colors: true
    }));

    const webpackDevServerConfiguration: IWebpackDevServerConfigurationOptions = {
      contentBase: path.resolve(this.project.root, './src'),
      historyApiFallback: true,
      stats: webpackDevServerOutputOptions,
      inline: true
    };

    const serveMessage:string = chalk.green(`\n*\n*\n NG Live Development Server is running on http://localhost:${commandOptions.port}.\n*\n*`);
    const server = new WebpackDevServer(webpackCompiler, webpackDevServerConfiguration);

    return new Promise((resolve, reject) => {
      server.listen(commandOptions.port, "localhost", function(err, stats) {
        if(err) {
          lastHash = null;
          console.error(err.stack || err);
          if(err.details) console.error(err.details);
            reject(err.details);
        }

        if(stats && stats.hash && stats.hash !== lastHash) {
          lastHash = stats.hash;
          process.stdout.write(stats.toString(webpackOutputOptions) + "\n" + serveMessage + "\n");
        }

        process.stdout.write(serveMessage);
      });
    })
  }
});




