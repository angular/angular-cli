import * as fs from 'fs-extra';
import * as path from 'path';
import * as chalk from 'chalk';
import * as webpack from 'webpack';
import * as url from 'url';
import { oneLine, stripIndents } from 'common-tags';
import { getWebpackStatsConfig } from '../models/webpack-configs/utils';
import { NgCliWebpackConfig } from '../models/webpack-config';
import { ServeTaskOptions } from '../commands/serve';
import { CliConfig } from '../models/config';
import { getAppFromConfig } from '../utilities/app-utils';

const WebpackDevServer = require('webpack-dev-server');
const Task = require('../ember-cli/lib/models/task');
const SilentError = require('silent-error');
const opn = require('opn');
const yellow = require('chalk').yellow;

export default Task.extend({
  run: function (serveTaskOptions: ServeTaskOptions, rebuildDoneCb: any) {
    const ui = this.ui;

    let webpackCompiler: any;
    const projectConfig = CliConfig.fromProject().config;
    const appConfig = getAppFromConfig(serveTaskOptions.app);

    const outputPath = serveTaskOptions.outputPath || appConfig.outDir;
    if (this.project.root === path.resolve(outputPath)) {
      throw new SilentError('Output path MUST not be project root directory!');
    }
    if (projectConfig.project && projectConfig.project.ejected) {
      throw new SilentError('An ejected project cannot use the build command anymore.');
    }
    if (serveTaskOptions.deleteOutputPath) {
      fs.removeSync(path.resolve(this.project.root, outputPath));
    }

    const serveDefaults = {
      // default deployUrl to '' on serve to prevent the default from .angular-cli.json
      deployUrl: ''
    };

    serveTaskOptions = Object.assign({}, serveDefaults, serveTaskOptions);

    let webpackConfig = new NgCliWebpackConfig(serveTaskOptions, appConfig).buildConfig();

    const serverAddress = url.format({
      protocol: serveTaskOptions.ssl ? 'https' : 'http',
      hostname: serveTaskOptions.host === '0.0.0.0' ? 'localhost' : serveTaskOptions.host,
      port: serveTaskOptions.port.toString()
    });

    if (serveTaskOptions.disableHostCheck) {
      ui.writeLine(oneLine`
          ${yellow('WARNING')} Running a server with --disable-host-check is a security risk.
          See https://medium.com/webpack/webpack-dev-server-middleware-security-issues-1489d950874a
          for more information.
        `);
    }

    let clientAddress = serverAddress;
    if (serveTaskOptions.publicHost) {
      let publicHost = serveTaskOptions.publicHost;
      if (!/^\w+:\/\//.test(publicHost)) {
        publicHost = `${serveTaskOptions.ssl ? 'https' : 'http'}://${publicHost}`;
      }
      const clientUrl = url.parse(publicHost);
      serveTaskOptions.publicHost = clientUrl.host;
      clientAddress = url.format(clientUrl);
    }

    if (serveTaskOptions.liveReload) {
      // This allows for live reload of page when changes are made to repo.
      // https://webpack.github.io/docs/webpack-dev-server.html#inline-mode
      let entryPoints = [
        `webpack-dev-server/client?${clientAddress}`
      ];
      if (serveTaskOptions.hmr) {
        const webpackHmrLink = 'https://webpack.github.io/docs/hot-module-replacement.html';

        ui.writeLine(oneLine`
          ${yellow('NOTICE')} Hot Module Replacement (HMR) is enabled for the dev server.
        `);

        const showWarning = CliConfig.fromGlobal().get('warnings.hmrWarning');
        if (showWarning) {
          ui.writeLine('  The project will still live reload when HMR is enabled,');
          ui.writeLine('  but to take advantage of HMR additional application code is required');
          ui.writeLine('  (not included in an Angular CLI project by default).');
          ui.writeLine(`  See ${chalk.blue(webpackHmrLink)}`);
          ui.writeLine('  for information on working with HMR for Webpack.');
          ui.writeLine(oneLine`
            ${yellow('To disable this warning use "ng set --global warnings.hmrWarning=false"')}
          `);
        }
        entryPoints.push('webpack/hot/dev-server');
        webpackConfig.plugins.push(new webpack.HotModuleReplacementPlugin());
        if (serveTaskOptions.extractCss) {
          ui.writeLine(oneLine`
            ${yellow('NOTICE')} (HMR) does not allow for CSS hot reload when used
            together with '--extract-css'.
          `);
        }
      }
      if (!webpackConfig.entry.main) { webpackConfig.entry.main = []; }
      webpackConfig.entry.main.unshift(...entryPoints);
    } else if (serveTaskOptions.hmr) {
      ui.writeLine(yellow('Live reload is disabled. HMR option ignored.'));
    }

    if (!serveTaskOptions.watch) {
      // There's no option to turn off file watching in webpack-dev-server, but
      // we can override the file watcher instead.
      webpackConfig.plugins.unshift({
        apply: (compiler: any) => {
          compiler.plugin('after-environment', () => {
            compiler.watchFileSystem = { watch: () => { } };
          });
        }
      });
    }

    webpackCompiler = webpack(webpackConfig);

    if (rebuildDoneCb) {
      webpackCompiler.plugin('done', rebuildDoneCb);
    }

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
        poll: serveTaskOptions.poll
      },
      https: serveTaskOptions.ssl,
      overlay: {
        errors: serveTaskOptions.target === 'development',
        warnings: false
      },
      contentBase: false,
      public: serveTaskOptions.publicHost,
      disableHostCheck: serveTaskOptions.disableHostCheck
    };

    if (sslKey != null && sslCert != null) {
      webpackDevServerConfiguration.key = sslKey;
      webpackDevServerConfiguration.cert = sslCert;
    }

    webpackDevServerConfiguration.hot = serveTaskOptions.hmr;

    // set publicPath property to be sent on webpack server config
    if (serveTaskOptions.deployUrl) {
      webpackDevServerConfiguration.publicPath = serveTaskOptions.deployUrl;
      (webpackDevServerConfiguration.historyApiFallback as any).index =
        serveTaskOptions.deployUrl + `/${appConfig.index}`;
    }

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
      NG Live Development Server is listening on ${serveTaskOptions.host}:${serveTaskOptions.port},
      open your browser on ${serverAddress}
      **
    `));

    const server = new WebpackDevServer(webpackCompiler, webpackDevServerConfiguration);
    return new Promise((_resolve, reject) => {
      server.listen(serveTaskOptions.port, serveTaskOptions.host, (err: any, _stats: any) => {
        if (err) {
          return reject(err);
        }
        if (serveTaskOptions.open) {
          opn(serverAddress);
        }
      });
    })
    .catch((err: Error) => {
      if (err) {
        this.ui.writeError('\nAn error occured during the build:\n' + ((err && err.stack) || err));
      }
      throw err;
    });
  }
});
