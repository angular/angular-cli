import * as fs from 'fs';
import * as path from 'path';
import * as chalk from 'chalk';
const SilentError = require('silent-error');
const Task = require('../ember-cli/lib/models/task');
import * as webpack from 'webpack';
const WebpackDevServer = require('webpack-dev-server');
const ProgressPlugin = require('webpack/lib/ProgressPlugin');
import { getWebpackStatsConfig } from '../models/';
import { NgCliWebpackConfig } from '../models/webpack-config';
import { ServeTaskOptions } from '../commands/serve';
import { CliConfig } from '../models/config';
import { oneLine } from 'common-tags';
import * as url from 'url';
const opn = require('opn');

export default Task.extend({
  run: function(serveTaskOptions: ServeTaskOptions) {
    const ui = this.ui;

    let webpackCompiler: any;

    let config = new NgCliWebpackConfig(
      this.project,
      serveTaskOptions.target,
      serveTaskOptions.environment,
      undefined,
      undefined,
      serveTaskOptions.aot,
      serveTaskOptions.sourcemap,
      serveTaskOptions.vendorChunk,
      serveTaskOptions.verbose
    ).config;

    // This allows for live reload of page when changes are made to repo.
    // https://webpack.github.io/docs/webpack-dev-server.html#inline-mode
    config.entry.main.unshift(
      `webpack-dev-server/client?http://${serveTaskOptions.host}:${serveTaskOptions.port}/`
    );
    webpackCompiler = webpack(config);

    const statsConfig = getWebpackStatsConfig(serveTaskOptions.verbose);

    if (serveTaskOptions.progress) {
      webpackCompiler.apply(new ProgressPlugin({
        profile: serveTaskOptions.verbose,
        colors: true
      }));
    }

    let proxyConfig = {};
    if (serveTaskOptions.proxyConfig) {
      const proxyPath = path.resolve(this.project.root, serveTaskOptions.proxyConfig);
      if (fs.existsSync(proxyPath)) {
        proxyConfig = require(proxyPath);
      } else {
        const message = 'Proxy config file ' + proxyPath + ' does not exist.';
        return Promise.reject(new SilentError(message));
      }
    }

    let sslKey: string = null;
    let sslCert: string = null;
    if (serveTaskOptions.ssl) {
      const keyPath = path.resolve(this.project.root, serveTaskOptions.sslKey);
      if (fs.existsSync(keyPath)) {
        sslKey = fs.readFileSync(keyPath, 'utf-8');
      }
      const certPath = path.resolve(this.project.root, serveTaskOptions.sslCert);
      if (fs.existsSync(certPath)) {
        sslCert = fs.readFileSync(certPath, 'utf-8');
      }
    }

    const webpackDevServerConfiguration: IWebpackDevServerConfigurationOptions = {
      contentBase: path.resolve(
        this.project.root,
        `./${CliConfig.fromProject().config.apps[0].root}`
      ),
      headers: { 'Access-Control-Allow-Origin': '*' },
      historyApiFallback: {
        disableDotRule: true,
        htmlAcceptHeaders: ['text/html', 'application/xhtml+xml']
      },
      stats: statsConfig,
      inline: true,
      proxy: proxyConfig,
      compress: serveTaskOptions.target === 'production',
      watchOptions: {
        poll: CliConfig.fromProject().config.defaults.poll
      },
      https: serveTaskOptions.ssl
    };

    if (sslKey != null && sslCert != null) {
      webpackDevServerConfiguration.key = sslKey;
      webpackDevServerConfiguration.cert = sslCert;
    }

    ui.writeLine(chalk.green(oneLine`
      **
      NG Live Development Server is running on
      http${serveTaskOptions.ssl ? 's' : ''}://${serveTaskOptions.host}:${serveTaskOptions.port}.
      **
    `));

    const server = new WebpackDevServer(webpackCompiler, webpackDevServerConfiguration);
    return new Promise((resolve, reject) => {
      server.listen(serveTaskOptions.port,
                    `${serveTaskOptions.host}`,
                    function(err: any, stats: any) {
        if (err) {
          console.error(err.stack || err);
          if (err.details) { console.error(err.details); }
          reject(err.details);
        } else {
          const { open, host, port } = serveTaskOptions;
          if (open) {
            opn(url.format({ protocol: 'http', hostname: host, port: port.toString() }));
          }
        }
      });
    });
  }
});
