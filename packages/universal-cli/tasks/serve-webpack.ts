import * as fs from 'fs';
import * as path from 'path';
import * as chalk from 'chalk';
const SilentError = require('silent-error');
const Task = require('../ember-cli/lib/models/task');
import * as webpack from 'webpack';
const WebpackDevServer = require('webpack-dev-server');
const ProgressPlugin = require('webpack/lib/ProgressPlugin');
import { webpackDevServerOutputOptions } from '../models/';
import { NgCliWebpackConfig } from '../models/webpack-config';
import { ServeTaskOptions } from '../commands/serve';
import { CliConfig } from '../models/config';
import { oneLine } from 'common-tags';
import { UniversalDevServer } from './server/universal-dev-server';
import * as url from 'url';
const opn = require('opn');

export default Task.extend({
  run: function (commandOptions: ServeTaskOptions) {
    const ui = this.ui;

    let webpackCompiler: any;

    let configs = new NgCliWebpackConfig(
      this.project,
      commandOptions.target,
      commandOptions.environment,
      undefined,
      undefined,
      commandOptions.aot,
      commandOptions.sourcemap
    ).configs;

    const appConfig = CliConfig.fromProject().config.apps[0];

    // This allows for live reload of page when changes are made to repo.
    // https://webpack.github.io/docs/webpack-dev-server.html#inline-mode
    if (appConfig.universal === false) {
      configs[0].entry['main']
        .unshift(`webpack-dev-server/client?http://${commandOptions.host}:${commandOptions.port}/`);
    }

    webpackCompiler = webpack(configs);

    webpackCompiler.apply(new ProgressPlugin({
      profile: true,
      colors: true
    }));

    let proxyConfig = {};
    if (commandOptions.proxyConfig) {
      const proxyPath = path.resolve(this.project.root, commandOptions.proxyConfig);
      if (fs.existsSync(proxyPath)) {
        proxyConfig = require(proxyPath);
      } else {
        const message = 'Proxy config file ' + proxyPath + ' does not exist.';
        return Promise.reject(new SilentError(message));
      }
    }

    let sslKey: string = null;
    let sslCert: string = null;
    if (commandOptions.ssl) {
      const keyPath = path.resolve(this.project.root, commandOptions.sslKey);
      if (fs.existsSync(keyPath)) {
        sslKey = fs.readFileSync(keyPath, 'utf-8');
      }
      const certPath = path.resolve(this.project.root, commandOptions.sslCert);
      if (fs.existsSync(certPath)) {
        sslCert = fs.readFileSync(certPath, 'utf-8');
      }
    }

    const webpackDevServerConfiguration: IWebpackDevServerConfigurationOptions = {
      contentBase: path.resolve(
        this.project.root,
        `./${appConfig.root}`
      ),
      headers: { 'Access-Control-Allow-Origin': '*' },
      historyApiFallback: {
        disableDotRule: true,
        htmlAcceptHeaders: ['text/html', 'application/xhtml+xml']
      },
      stats: webpackDevServerOutputOptions,
      inline: true,
      proxy: proxyConfig,
      compress: commandOptions.target === 'production',
      watchOptions: {
        poll: CliConfig.fromProject().config.defaults.poll
      },
      https: commandOptions.ssl
    };

    if (sslKey != null && sslCert != null) {
      webpackDevServerConfiguration.key = sslKey;
      webpackDevServerConfiguration.cert = sslCert;
    }


    let server: any;
    if (appConfig.universal === true) {
      ui.writeLine(chalk.green(oneLine`
      **
      Universal-cli Development Server is running on
      http${commandOptions.ssl ? 's' : ''}://${commandOptions.host}:${commandOptions.port}.
      **
    `));
      webpackDevServerConfiguration.filename = appConfig.nodeMain;
      server = new UniversalDevServer(webpackCompiler, webpackDevServerConfiguration);
    } else {
      ui.writeLine(chalk.green(oneLine`
      **
      NG Live Development Server is running on
      http${commandOptions.ssl ? 's' : ''}://${commandOptions.host}:${commandOptions.port}.
      **
    `));
      server = new WebpackDevServer(webpackCompiler, webpackDevServerConfiguration);
    }

    return new Promise((resolve, reject) => {
      server.listen(commandOptions.port, `${commandOptions.host}`, function (err: any, stats: any) {
        if (err) {
          console.error(err.stack || err);
          if (err.details) { console.error(err.details); }
          reject(err.details);
        } else {
          const { open, host, port } = commandOptions;
          if (open) {
            opn(url.format({ protocol: 'http', hostname: host, port: port.toString() }));
          }
        }
      });
    });
  }
});
