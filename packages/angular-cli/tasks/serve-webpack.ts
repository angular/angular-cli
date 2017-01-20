import * as fs from 'fs';
import * as path from 'path';
import * as chalk from 'chalk';
const SilentError = require('silent-error');
const Task = require('../ember-cli/lib/models/task');
import * as webpack from 'webpack';
const WebpackDevServer = require('webpack-dev-server');
import { getWebpackStatsConfig } from '../models/';
import { NgCliWebpackConfig } from '../models/webpack-config';
import { ServeTaskOptions } from '../commands/serve';
import { CliConfig } from '../models/config';
import { oneLine } from 'common-tags';
import * as url from 'url';
import {stripIndents} from 'common-tags';
const opn = require('opn');

export default Task.extend({
  run: function(serveTaskOptions: ServeTaskOptions) {
    const ui = this.ui;

    let webpackCompiler: any;
    const projectConfig = CliConfig.fromProject().config;
    const appConfig = projectConfig.apps[0];

    let config = new NgCliWebpackConfig(
      this.project,
      serveTaskOptions.target,
      serveTaskOptions.environment,
      undefined,
      undefined,
      serveTaskOptions.i18nFile,
      serveTaskOptions.i18nFormat,
      serveTaskOptions.locale,
      serveTaskOptions.aot,
      serveTaskOptions.sourcemap,
      serveTaskOptions.vendorChunk,
      serveTaskOptions.verbose,
      serveTaskOptions.progress,
      undefined,
      undefined,
      serveTaskOptions.extractCss
    ).config;

    // This allows for live reload of page when changes are made to repo.
    // https://webpack.github.io/docs/webpack-dev-server.html#inline-mode
    let entryPoints = [
      `webpack-dev-server/client?http://${serveTaskOptions.host}:${serveTaskOptions.port}/`
    ];
    if (serveTaskOptions.hmr) {
      const webpackHmrLink = 'https://webpack.github.io/docs/hot-module-replacement.html';
      ui.writeLine(oneLine`
        ${chalk.yellow('NOTICE')} Hot Module Replacement (HMR) is enabled for the dev server.
      `);
      ui.writeLine('  The project will still live reload when HMR is enabled,');
      ui.writeLine('  but to take advantage of HMR additional application code is required');
      ui.writeLine('  (not included in an angular-cli project by default).');
      ui.writeLine(`  See ${chalk.blue(webpackHmrLink)}`);
      ui.writeLine('  for information on working with HMR for Webpack.');
      entryPoints.push('webpack/hot/dev-server');
      config.plugins.push(new webpack.HotModuleReplacementPlugin());
      config.plugins.push(new webpack.NamedModulesPlugin());
      if (serveTaskOptions.extractCss) {
        ui.writeLine(oneLine`
          ${chalk.yellow('NOTICE')} (HMR) does not allow for CSS hot reload when used
          together with '--extract-css'.
        `);
      }
    }
    if (!config.entry.main) { config.entry.main = []; }
    config.entry.main.unshift(...entryPoints);
    webpackCompiler = webpack(config);

    const statsConfig = getWebpackStatsConfig(serveTaskOptions.verbose);

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
      contentBase: path.join(this.project.root, `./${appConfig.root}`),
      headers: { 'Access-Control-Allow-Origin': '*' },
      historyApiFallback: {
        index: `/${appConfig.index}`,
        disableDotRule: true,
        htmlAcceptHeaders: ['text/html', 'application/xhtml+xml']
      },
      stats: statsConfig,
      inline: true,
      proxy: proxyConfig,
      compress: serveTaskOptions.target === 'production',
      watchOptions: {
        poll: projectConfig.defaults && projectConfig.defaults.poll
      },
      https: serveTaskOptions.ssl
    };

    if (sslKey != null && sslCert != null) {
      webpackDevServerConfiguration.key = sslKey;
      webpackDevServerConfiguration.cert = sslCert;
    }

    webpackDevServerConfiguration.hot = serveTaskOptions.hmr;

    if (serveTaskOptions.target === 'production') {
      ui.writeLine(chalk.red(stripIndents`
        ****************************************************************************************
        This is a simple server for use in testing or debugging Angular applications locally.
        It hasn't been reviewed for security issues.

        DON'T USE IT FOR PRODUCTION USE!
        ****************************************************************************************
      `));
    }

    ui.writeLine(chalk.green(oneLine`
      **
      NG Live Development Server is running on
      http${serveTaskOptions.ssl ? 's' : ''}://${serveTaskOptions.host}:${serveTaskOptions.port}.
      **
    `));

    const server = new WebpackDevServer(webpackCompiler, webpackDevServerConfiguration);
    return new Promise((resolve, reject) => {
      server.listen(serveTaskOptions.port, `${serveTaskOptions.host}`, (err: any, stats: any) => {
        if (err) {
          console.error(err.stack || err);
          if (err.details) { console.error(err.details); }
          reject(err.details);
        } else {
          const { open, ssl, host, port } = serveTaskOptions;
          if (open) {
            let protocol = ssl ? 'https' : 'http';
            opn(url.format({ protocol: protocol, hostname: host, port: port.toString() }));
          }
        }
      });
    });
  }
});
